// @ts-nocheck
import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'
import { v4 as uuidv4 } from 'uuid'
import pool from '../db.js'
import { authRequired } from '../middleware/auth.js'
// pdf-to-img importado dinamicamente apenas quando necessário para evitar erros em ambiente serverless

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configure multer for PDF uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/insurance-pdfs')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true)
    } else {
      cb(new Error('Apenas arquivos PDF são permitidos'))
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
})

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

/**
 * POST /api/insurance/:providerId/upload-pdf
 * Upload and process PDF to extract procedures
 */
router.post('/:providerId/upload-pdf', authRequired, upload.single('pdf'), async (req, res) => {
  const client = await pool.connect()

  try {
    const { providerId } = req.params
    const { clinicId } = req.body
    const uploadedFile = req.file

    console.log('📤 Upload PDF iniciado:', { providerId, clinicId, file: uploadedFile?.originalname })

    if (!uploadedFile) {
      return res.status(400).json({ error: 'Nenhum arquivo PDF enviado' })
    }

    if (!clinicId) {
      return res.status(400).json({ error: 'clinicId é obrigatório' })
    }

    // Verify provider belongs to clinic
    const providerCheck = await client.query(
      'SELECT id, name FROM insurance_providers WHERE id = $1 AND clinic_id = $2',
      [providerId, clinicId]
    )

    if (providerCheck.rows.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(uploadedFile.path)
      return res.status(404).json({ error: 'Operadora não encontrada' })
    }

    const provider = providerCheck.rows[0]

    // Create document record
    const documentId = uuidv4()
    console.log('📝 Criando registro de documento:', documentId)

    await client.query(
      `INSERT INTO insurance_provider_documents (
        id, insurance_provider_id, file_name, file_path, file_size, mime_type,
        processed, processing_status, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, false, 'PROCESSING', $7)`,
      [
        documentId,
        providerId,
        uploadedFile.originalname,
        uploadedFile.path,
        uploadedFile.size,
        uploadedFile.mimetype,
        req.user.id
      ]
    )

    console.log('✅ Documento registrado, iniciando processamento em background')

    // Process PDF in background
    processPDFDocument(documentId, uploadedFile.path, providerId, clinicId, provider.name)
      .catch(err => {
        console.error('❌ Error processing PDF:', err)
      })

    res.json({
      success: true,
      documentId,
      message: 'PDF enviado com sucesso. Processamento iniciado.'
    })

  } catch (error) {
    console.error('Error uploading PDF:', error)

    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (err) {
        console.error('Error deleting file:', err)
      }
    }

    res.status(500).json({ error: 'Erro ao fazer upload do PDF' })
  } finally {
    client.release()
  }
})

/**
 * Process PDF document with OpenAI
 */
async function processPDFDocument(documentId: string, filePath: string, providerId: string, clinicId: string, providerName: string) {
  const client = await pool.connect()

  try {
    console.log('🔄 Iniciando processamento do PDF:', { documentId, providerId, providerName })

    // Upload PDF to OpenAI
    console.log('📤 Enviando PDF para OpenAI...')
    const fileStream = fs.createReadStream(filePath)

    const file = await openai.files.create({
      file: fileStream,
      purpose: 'assistants'
    })

    console.log(`✅ PDF enviado para OpenAI: ${file.id}`)

    // Get procedure base for comparison
    console.log('📋 Carregando tabela base de procedimentos...')
    const procedureBaseResult = await client.query(
      `SELECT id, code, description, is_periciable, adults_only
       FROM procedure_base_table
       WHERE active = true
       ORDER BY code`
    )
    const procedureBase = procedureBaseResult.rows
    console.log(`✅ ${procedureBase.length} procedimentos carregados da tabela base`)

    // Create temporary assistant
    console.log('🤖 Criando assistente temporário...')
    const assistant = await openai.beta.assistants.create({
      name: 'Dental Procedure Extractor',
      instructions: `Você é um especialista em extrair dados de tabelas de procedimentos odontológicos de operadoras de saúde.

Analise o documento PDF anexado da operadora "${providerName}" e extraia TODOS os procedimentos odontológicos encontrados.

Para cada procedimento, identifique:
1. Código TUSS (código do procedimento)
2. Descrição completa do procedimento
3. Valor em Reais (se disponível)
4. Se é periciável (procedimentos que geralmente requerem perícia/auditoria: próteses, implantes, ortodontia, cirurgias complexas)

TABELA BASE DE REFERÊNCIA (para fazer match):
${procedureBase.map(p => `${p.code} - ${p.description} (Periciável: ${p.is_periciable ? 'Sim' : 'Não'}, Adultos: ${p.adults_only ? 'Apenas adultos' : 'Todas idades'})`).join('\n')}

IMPORTANTE:
- Retorne APENAS um JSON válido, sem texto adicional
- Se não encontrar valor, use null
- Se não tiver certeza se é periciável, use false
- Tente fazer match com a tabela base pelo código TUSS

Retorne um JSON no seguinte formato:
{
  "procedures": [
    {
      "code": "código TUSS",
      "description": "descrição do procedimento",
      "value": 123.45,
      "isPericiable": true/false,
      "matchedProcedureBaseId": "id do procedimento da tabela base (se houver match por código)",
      "confidence": 0.95
    }
  ]
}`,
      model: 'gpt-4o',
      tools: [{ type: 'file_search' }]
    })

    // Create thread with the file
    console.log('💬 Criando thread com arquivo...')
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: 'Analise o PDF anexado e extraia todos os procedimentos odontológicos conforme as instruções.',
          attachments: [
            {
              file_id: file.id,
              tools: [{ type: 'file_search' }]
            }
          ]
        }
      ]
    })

    // Run assistant
    console.log('⚙️ Executando assistente...')
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    })

    if (run.status !== 'completed') {
      throw new Error(`Assistente falhou com status: ${run.status}`)
    }

    // Get response
    const messages = await openai.beta.threads.messages.list(thread.id)
    const responseMessage = messages.data[0]

    let responseText = ''
    for (const content of responseMessage.content) {
      if (content.type === 'text') {
        responseText += content.text.value
      }
    }

    // Clean up
    console.log('🧹 Limpando recursos temporários...')
    await openai.beta.assistants.del(assistant.id)
    await openai.files.del(file.id)

    console.log('✅ Resposta recebida da OpenAI')
    console.log('📝 Resposta completa:', responseText?.substring(0, 500))

    // Extract JSON from response (might be wrapped in markdown code blocks)
    let jsonText = responseText.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7)
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.substring(3)
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.substring(0, jsonText.length - 3)
    }
    jsonText = jsonText.trim()

    const extractedData = JSON.parse(jsonText)
    console.log(`📊 Procedimentos extraídos: ${extractedData.procedures?.length || 0}`)

    if (extractedData.procedures?.length === 0) {
      console.log('⚠️ AVISO: Nenhum procedimento foi extraído!')
      console.log('💡 Possíveis causas:')
      console.log('  - O PDF não contém tabelas de procedimentos odontológicos')
      console.log('  - O formato da tabela não foi reconhecido pela IA')
      console.log('  - As imagens estão muito escuras/borradas')
    }

    // Update document with extracted data
    await client.query(
      `UPDATE insurance_provider_documents
       SET processed = true,
           processed_at = CURRENT_TIMESTAMP,
           processing_status = 'COMPLETED',
           extracted_data = $1
       WHERE id = $2`,
      [JSON.stringify(extractedData), documentId]
    )

    // Create procedure mappings
    console.log('💾 Salvando mapeamentos de procedimentos...')
    if (extractedData.procedures && Array.isArray(extractedData.procedures)) {
      let matchedCount = 0
      let manualCount = 0

      for (const proc of extractedData.procedures) {
        const mappingId = uuidv4()

        // Try to find matching procedure base
        let matchedProcedureBaseId = proc.matchedProcedureBaseId || null

        if (!matchedProcedureBaseId) {
          // Try exact code match
          const exactMatch = procedureBase.find(p => p.code === proc.code)
          if (exactMatch) {
            matchedProcedureBaseId = exactMatch.id
            matchedCount++
          } else {
            manualCount++
          }
        }

        await client.query(
          `INSERT INTO procedure_mappings (
            id, document_id, extracted_procedure_code, extracted_description,
            extracted_is_periciable, extracted_value, mapped_procedure_base_id,
            confidence_score, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            mappingId,
            documentId,
            proc.code,
            proc.description,
            proc.isPericiable || false,
            proc.value || null,
            matchedProcedureBaseId,
            proc.confidence || 0.8,
            matchedProcedureBaseId ? 'PENDING' : 'MANUAL'
          ]
        )
      }

      console.log(`✅ ${extractedData.procedures.length} mapeamentos salvos: ${matchedCount} com match automático, ${manualCount} para revisão manual`)
    }

    console.log(`✅ PDF processed successfully: ${documentId}`)

  } catch (error) {
    console.error('❌ Error in processPDFDocument:', error)
    console.error('Error stack:', error.stack)

    // Update document status to failed
    await client.query(
      `UPDATE insurance_provider_documents
       SET processing_status = 'FAILED',
           processed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [documentId]
    )
  } finally {
    client.release()
  }
}

/**
 * GET /api/insurance/:providerId/documents
 * Get all documents for a provider
 */
router.get('/:providerId/documents', authRequired, async (req, res) => {
  try {
    const { providerId } = req.params
    const { clinicId } = req.query

    const result = await pool.query(
      `SELECT
        ipd.*,
        u.name as uploaded_by_name
       FROM insurance_provider_documents ipd
       LEFT JOIN users u ON ipd.created_by = u.id
       WHERE ipd.insurance_provider_id = $1
       ORDER BY ipd.created_at DESC`,
      [providerId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching documents:', error)
    res.status(500).json({ error: 'Erro ao buscar documentos' })
  }
})

/**
 * GET /api/insurance/documents/:documentId/mappings
 * Get procedure mappings for a document
 */
router.get('/documents/:documentId/mappings', authRequired, async (req, res) => {
  try {
    const { documentId } = req.params

    const result = await pool.query(
      `SELECT
        pm.*,
        pbt.code as base_code,
        pbt.description as base_description,
        pbt.is_periciable as base_is_periciable,
        pbt.adults_only as base_adults_only,
        u.name as reviewed_by_name
       FROM procedure_mappings pm
       LEFT JOIN procedure_base_table pbt ON pm.mapped_procedure_base_id = pbt.id
       LEFT JOIN users u ON pm.reviewed_by = u.id
       WHERE pm.document_id = $1
       ORDER BY pm.extracted_procedure_code`,
      [documentId]
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Error fetching mappings:', error)
    res.status(500).json({ error: 'Erro ao buscar mapeamentos' })
  }
})

/**
 * POST /api/insurance/mappings/:mappingId/approve
 * Approve a procedure mapping and create insurance provider procedure
 */
router.post('/mappings/:mappingId/approve', authRequired, async (req, res) => {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { mappingId } = req.params
    const { providerId } = req.body

    // Get mapping details
    const mappingResult = await client.query(
      'SELECT * FROM procedure_mappings WHERE id = $1',
      [mappingId]
    )

    if (mappingResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Mapeamento não encontrado' })
    }

    const mapping = mappingResult.rows[0]

    // Create insurance provider procedure
    const procedureId = uuidv4()
    await client.query(
      `INSERT INTO insurance_provider_procedures (
        id, insurance_provider_id, procedure_base_id, provider_code,
        provider_description, is_periciable, max_value, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        procedureId,
        providerId,
        mapping.mapped_procedure_base_id,
        mapping.extracted_procedure_code,
        mapping.extracted_description,
        mapping.extracted_is_periciable,
        mapping.extracted_value
      ]
    )

    // Update mapping status
    await client.query(
      `UPDATE procedure_mappings
       SET status = 'APPROVED',
           mapped_provider_procedure_id = $1,
           reviewed_by = $2,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [procedureId, req.user.id, mappingId]
    )

    await client.query('COMMIT')

    res.json({ success: true, procedureId })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error approving mapping:', error)
    res.status(500).json({ error: 'Erro ao aprovar mapeamento' })
  } finally {
    client.release()
  }
})

/**
 * POST /api/insurance/mappings/:mappingId/update
 * Update a procedure mapping
 */
router.post('/mappings/:mappingId/update', authRequired, async (req, res) => {
  try {
    const { mappingId } = req.params
    const { mappedProcedureBaseId, status, notes } = req.body

    await pool.query(
      `UPDATE procedure_mappings
       SET mapped_procedure_base_id = $1,
           status = $2,
           notes = $3,
           reviewed_by = $4,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [mappedProcedureBaseId, status || 'PENDING', notes || null, req.user.id, mappingId]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating mapping:', error)
    res.status(500).json({ error: 'Erro ao atualizar mapeamento' })
  }
})

export default router
