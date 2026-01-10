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
// Use memory storage for serverless (Vercel) compatibility
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

const storage = isServerless
  ? multer.memoryStorage()
  : multer.diskStorage({
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

// Initialize OpenAI (only if API key is available)
let openai: OpenAI | null = null
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  } else {
    console.warn('⚠️ OPENAI_API_KEY not configured. PDF processing will not be available.')
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error)
}

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
      // Clean up uploaded file (only if using disk storage)
      if (uploadedFile.path) {
        try {
          fs.unlinkSync(uploadedFile.path)
        } catch (err) {
          console.error('Error deleting file:', err)
        }
      }
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
        uploadedFile.path || 'memory',
        uploadedFile.size,
        uploadedFile.mimetype,
        req.user.id
      ]
    )

    console.log('✅ Documento registrado, iniciando processamento em background')

    // Process PDF in background
    // Pass buffer if using memory storage, path if using disk storage
    const fileData = uploadedFile.buffer || uploadedFile.path
    processPDFDocument(documentId, fileData, providerId, clinicId, provider.name, uploadedFile.originalname)
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

    // Clean up uploaded file on error (only if using disk storage)
    if (req.file && req.file.path) {
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
 * Update processing progress
 */
async function updateProgress(documentId: string, progress: number, stage: string) {
  try {
    await pool.query(
      `UPDATE insurance_provider_documents
       SET processing_progress = $1, processing_stage = $2
       WHERE id = $3`,
      [progress, stage, documentId]
    )
  } catch (error) {
    console.error('Error updating progress:', error)
  }
}

/**
 * Process PDF document with OpenAI
 */
async function processPDFDocument(
  documentId: string,
  fileData: Buffer | string,
  providerId: string,
  clinicId: string,
  providerName: string,
  fileName: string
) {
  const client = await pool.connect()

  try {
    console.log('🔄 Iniciando processamento do PDF:', { documentId, providerId, providerName })
    await updateProgress(documentId, 5, 'UPLOADING')

    // Check if OpenAI is available
    if (!openai) {
      console.error('❌ OpenAI client not initialized (missing API key)')
      await client.query(
        `UPDATE insurance_provider_documents
         SET processing_status = 'FAILED',
             processed_at = CURRENT_TIMESTAMP,
             extracted_data = $1
         WHERE id = $2`,
        [JSON.stringify({
          error: 'OpenAI API key not configured. Please contact system administrator.'
        }), documentId]
      )
      return
    }

    // Upload PDF to OpenAI
    console.log('📤 Enviando PDF para OpenAI...')
    await updateProgress(documentId, 10, 'UPLOADING')

    // Create file for upload - OpenAI SDK accepts Buffer or ReadStream
    const fileToUpload = Buffer.isBuffer(fileData)
      ? fileData
      : fs.createReadStream(fileData)

    const file = await openai.files.create({
      file: fileToUpload as any,
      purpose: 'assistants'
    })

    console.log(`✅ PDF enviado para OpenAI: ${file.id}`)
    await updateProgress(documentId, 20, 'EXTRACTING')

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
      instructions: `VOCÊ É UM EXTRATOR COMPLETO DE PROCEDIMENTOS ODONTOLÓGICOS.

OBJETIVO: Extrair 100% dos procedimentos - NUNCA retorne apenas uma amostra.

INSTRUÇÕES OBRIGATÓRIAS:
1. Use code_interpreter para LER TODO O PDF (todas as páginas)
2. Use pandas ou similar para PROCESSAR TODAS AS LINHAS das tabelas
3. Procure tabelas com colunas: Código, Descrição, Valor
4. EXTRAIA CADA LINHA - não pare após 5, 10 ou 20 procedimentos
5. Se o PDF tem 50+ procedimentos, RETORNE TODOS os 50+

FORMATO DE SAÍDA (cada procedimento):
- code: código (ex: "A1.01.01.01")
- description: descrição
- value: número ou null
- isPericiable: false
- matchedProcedureBaseId: null
- confidence: 0.9

VALIDAÇÃO FINAL:
Antes de retornar, conte quantas linhas a tabela tem. Se você retornar menos de 80% das linhas, ESTÁ ERRADO. Reprocesse até extrair TUDO.

RETORNO (JSON puro, sem markdown):
{"procedures":[...LISTA COMPLETA...]}

ERROS PROIBIDOS:
❌ Retornar apenas primeiros procedimentos
❌ Usar "..." para indicar que há mais
❌ Parar arbitrariamente
✅ Retornar 100% dos procedimentos encontrados`,
      model: 'gpt-4o',
      tools: [{ type: 'code_interpreter' }]
    })

    // Create thread with the file
    console.log('💬 Criando thread com arquivo...')
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: `EXTRAIA TODOS OS PROCEDIMENTOS ODONTOLÓGICOS CLÍNICOS DO PDF - SEM EXCEÇÃO!

INSTRUÇÕES CRÍTICAS:
1. Use code_interpreter para processar TODO o PDF (todas as páginas)
2. FOCO: Procedimentos ODONTOLÓGICOS CLÍNICOS (consultas, radiografias, restaurações, extrações, endodontias, próteses, implantes, periodontia, ortodontia, cirurgias)
3. IGNORE: Procedimentos puramente administrativos (desinfecções genéricas, atestados, medições de risco)
4. PROCURE especificamente tabelas com códigos como: A1.x, A2.x, A3.x, A12.x, etc.
5. EXTRAIA TUDO - se há 50+ procedimentos clínicos, retorne TODOS os 50+

VALIDAÇÃO:
Antes de retornar, verifique:
- Você extraiu procedimentos ODONTOLÓGICOS? (dentes, gengivas, radiografias, etc.)
- Você processou TODAS as páginas do PDF?
- A quantidade faz sentido? (tabelas de seguros têm tipicamente 40-100+ procedimentos)

RETORNE APENAS:
JSON puro: {"procedures":[...LISTA COMPLETA DE PROCEDIMENTOS ODONTOLÓGICOS...]}

NÃO PARE ATÉ PROCESSAR TODO O PDF!`,
          attachments: [
            {
              file_id: file.id,
              tools: [{ type: 'code_interpreter' }]
            }
          ]
        }
      ]
    })

    // Run assistant
    console.log('⚙️ Executando assistente...')
    await updateProgress(documentId, 30, 'EXTRACTING')

    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    })

    console.log(`⚙️ Status do assistente: ${run.status}`)
    await updateProgress(documentId, 60, 'EXTRACTING')

    if (run.status !== 'completed') {
      console.error(`❌ Assistente não completou. Status: ${run.status}`)
      if (run.last_error) {
        console.error('❌ Erro do assistente:', JSON.stringify(run.last_error, null, 2))
      }
      throw new Error(`Assistente falhou com status: ${run.status}`)
    }

    // Get response
    console.log('📥 Obtendo resposta do assistente...')
    const messages = await openai.beta.threads.messages.list(thread.id)
    console.log(`📨 Total de mensagens: ${messages.data.length}`)

    const responseMessage = messages.data[0]
    console.log('📨 Tipo de conteúdo:', responseMessage.content.map(c => c.type).join(', '))

    let responseText = ''
    for (const content of responseMessage.content) {
      if (content.type === 'text') {
        responseText += content.text.value
      }
    }

    console.log('✅ Resposta recebida da OpenAI')
    console.log('📝 Resposta completa (primeiros 500 chars):', responseText?.substring(0, 500))
    console.log('📏 Tamanho total da resposta:', responseText?.length, 'caracteres')

    // Clean up
    console.log('🧹 Limpando recursos temporários...')
    await openai.beta.assistants.delete(assistant.id)
    await openai.files.delete(file.id)
    console.log('✅ Recursos limpos')

    // Extract JSON from response (might be wrapped in markdown code blocks or extra text)
    let jsonText = responseText.trim()

    // Remove markdown code blocks
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')

    // Find the first { and last } to extract only the JSON object
    const firstBrace = jsonText.indexOf('{')
    const lastBrace = jsonText.lastIndexOf('}')

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1)
    }

    jsonText = jsonText.trim()

    // Remove JavaScript-style comments that AI might add
    // Remove single-line comments (// ...)
    jsonText = jsonText.replace(/\/\/[^\n]*/g, '')
    // Remove multi-line comments (/* ... */)
    jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '')
    // Clean up any trailing commas before ] or }
    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1')

    jsonText = jsonText.trim()

    let extractedData
    try {
      extractedData = JSON.parse(jsonText)
      console.log(`📊 Procedimentos extraídos: ${extractedData.procedures?.length || 0}`)

      if (extractedData.procedures?.length === 0) {
        console.log('⚠️ AVISO: Nenhum procedimento foi extraído!')
        console.log('💡 Possíveis causas:')
        console.log('  - O PDF não contém tabelas de procedimentos odontológicos')
        console.log('  - O formato da tabela não foi reconhecido pela IA')
        console.log('  - As imagens estão muito escuras/borradas')
        console.log('📄 JSON recebido:', jsonText.substring(0, 1000))
      }
    } catch (parseError: any) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError.message)
      console.log('📄 Texto que tentou parsear:', jsonText.substring(0, 1000))
      throw new Error(`Falha ao parsear resposta da IA: ${parseError.message}`)
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

    // AI-powered procedure matching
    console.log('🤖 Iniciando pareamento automático por IA...')
    await updateProgress(documentId, 70, 'MATCHING')

    const matchedProcedures = await matchProceduresWithAI(extractedData.procedures, procedureBase)
    console.log('✅ Pareamento por IA concluído')
    await updateProgress(documentId, 85, 'MATCHING')

    // Create procedure mappings
    console.log('💾 Salvando mapeamentos de procedimentos...')
    await updateProgress(documentId, 90, 'SAVING')
    if (matchedProcedures && Array.isArray(matchedProcedures)) {
      let autoMatchedCount = 0
      let manualCount = 0
      let highConfidenceCount = 0

      for (const proc of matchedProcedures) {
        const mappingId = uuidv4()

        const hasMatch = proc.matchedProcedureBaseId !== null
        const isHighConfidence = proc.confidenceScore >= 0.8

        if (hasMatch && isHighConfidence) {
          highConfidenceCount++
          autoMatchedCount++
        } else if (hasMatch) {
          autoMatchedCount++
        } else {
          manualCount++
        }

        await client.query(
          `INSERT INTO procedure_mappings (
            id, document_id, extracted_procedure_code, extracted_description,
            extracted_is_periciable, extracted_value, mapped_procedure_base_id,
            confidence_score, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            mappingId,
            documentId,
            proc.code,
            proc.description,
            proc.isPericiable || false,
            proc.value || null,
            proc.matchedProcedureBaseId,
            proc.confidenceScore || 0,
            proc.matchedProcedureBaseId && isHighConfidence ? 'PENDING' : 'MANUAL',
            proc.reasoning || null
          ]
        )
      }

      console.log(`✅ ${matchedProcedures.length} mapeamentos salvos:`)
      console.log(`   • ${highConfidenceCount} com alta confiança (≥80%)`)
      console.log(`   • ${autoMatchedCount - highConfidenceCount} com confiança média`)
      console.log(`   • ${manualCount} requerem revisão manual`)
    }

    await updateProgress(documentId, 100, 'COMPLETED')
    console.log(`✅ PDF processed successfully: ${documentId}`)

  } catch (error) {
    console.error('❌ Error in processPDFDocument:', error)
    console.error('Error stack:', error.stack)

    // Update document status to failed
    await updateProgress(documentId, 0, 'FAILED')
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
 * Match extracted procedures with base table using AI
 */
async function matchProceduresWithAI(
  extractedProcedures: any[],
  procedureBase: any[]
): Promise<any[]> {
  if (!openai) {
    console.warn('⚠️ OpenAI not available, skipping AI matching')
    return extractedProcedures.map(proc => ({
      ...proc,
      matchedProcedureBaseId: null,
      confidenceScore: 0,
      reasoning: 'OpenAI not configured'
    }))
  }

  if (!extractedProcedures || extractedProcedures.length === 0) {
    return []
  }

  try {
    console.log(`🔍 Analisando ${extractedProcedures.length} procedimentos extraídos contra ${procedureBase.length} procedimentos da tabela base`)

    // Prepare simplified base table for AI
    const simplifiedBase = procedureBase.map(p => ({
      id: p.id,
      code: p.code,
      description: p.description,
      is_periciable: p.is_periciable,
      adults_only: p.adults_only
    }))

    // Process in batches of 50 to avoid token limits
    const BATCH_SIZE = 50
    const allMatches: any[] = []

    for (let i = 0; i < extractedProcedures.length; i += BATCH_SIZE) {
      const batch = extractedProcedures.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(extractedProcedures.length / BATCH_SIZE)

      console.log(`🔄 Processando lote ${batchNumber}/${totalBatches} (${batch.length} procedimentos)`)

      const prompt = `Você é um especialista em procedimentos odontológicos portugueses. Sua tarefa é fazer o pareamento inteligente entre procedimentos extraídos de um PDF de seguro e a tabela base de procedimentos da clínica.

PROCEDIMENTOS EXTRAÍDOS DO PDF:
${JSON.stringify(batch, null, 2)}

TABELA BASE DE PROCEDIMENTOS:
${JSON.stringify(simplifiedBase.slice(0, 100), null, 2)}

INSTRUÇÕES:
1. Para cada procedimento extraído, encontre o melhor match na tabela base
2. Compare principalmente as DESCRIÇÕES (não apenas códigos)
3. Considere sinônimos odontológicos comuns (ex: "restauração" = "obturação", "exodontia" = "extração")
4. Considere variações de escrita e abreviações
5. Atribua um score de confiança:
   - 0.95-1.0: Match perfeito (descrições praticamente idênticas)
   - 0.85-0.94: Match muito bom (mesmo procedimento, pequenas variações)
   - 0.70-0.84: Match razoável (procedimentos similares)
   - 0.50-0.69: Match duvidoso (requer revisão manual)
   - <0.50: Sem match confiável (use null)

6. Se o score for < 0.70, retorne null para matchedProcedureBaseId

RETORNE APENAS JSON PURO (sem markdown, sem comentários) no formato:
- matches: array com ${batch.length} elementos
- cada elemento deve ter: extractedCode, matchedProcedureBaseId, confidenceScore, reasoning

IMPORTANTE: O array "matches" DEVE ter exatamente ${batch.length} elementos, na mesma ordem dos procedimentos extraídos.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em procedimentos odontológicos. Sempre retorne JSON válido sem markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      })

      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }

      // Parse and clean JSON
      let jsonText = content.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      jsonText = jsonText.replace(/\/\/[^\n]*/g, '')
      jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '')
      jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1')

      const result = JSON.parse(jsonText)

      if (!result.matches || !Array.isArray(result.matches)) {
        throw new Error('Invalid response format from AI')
      }

      console.log(`✅ Lote ${batchNumber}/${totalBatches}: ${result.matches.length} procedimentos analisados`)
      allMatches.push(...result.matches)
    }

    console.log(`✅ IA analisou todos os ${allMatches.length} procedimentos`)

    // Merge AI matches with extracted procedures
    const matchedProcedures = extractedProcedures.map((proc, index) => {
      const aiMatch = allMatches[index]

      if (!aiMatch) {
        return {
          ...proc,
          matchedProcedureBaseId: null,
          confidenceScore: 0,
          reasoning: 'Sem correspondência da IA'
        }
      }

      return {
        ...proc,
        matchedProcedureBaseId: aiMatch.matchedProcedureBaseId,
        confidenceScore: aiMatch.confidenceScore || 0,
        reasoning: aiMatch.reasoning || 'Match automático por IA'
      }
    })

    // Log statistics
    const highConfidence = matchedProcedures.filter(p => p.confidenceScore >= 0.8 && p.matchedProcedureBaseId).length
    const mediumConfidence = matchedProcedures.filter(p => p.confidenceScore >= 0.5 && p.confidenceScore < 0.8 && p.matchedProcedureBaseId).length
    const noMatch = matchedProcedures.filter(p => !p.matchedProcedureBaseId).length

    console.log('📊 Resultados do pareamento:')
    console.log(`   • ${highConfidence} matches de alta confiança (≥80%)`)
    console.log(`   • ${mediumConfidence} matches de confiança média (50-79%)`)
    console.log(`   • ${noMatch} sem match confiável`)

    return matchedProcedures

  } catch (error) {
    console.error('❌ Erro no pareamento por IA:', error)
    console.error('Stack:', error.stack)

    // Fallback: return procedures without AI matching
    return extractedProcedures.map(proc => ({
      ...proc,
      matchedProcedureBaseId: null,
      confidenceScore: 0,
      reasoning: `Erro no pareamento: ${error.message}`
    }))
  }
}

/**
 * GET /api/insurance/documents/:documentId/status
 * Get processing status for a document
 */
router.get('/documents/:documentId/status', authRequired, async (req, res) => {
  try {
    const { documentId } = req.params

    const result = await pool.query(
      `SELECT processing_progress, processing_stage, processing_status
       FROM insurance_provider_documents
       WHERE id = $1`,
      [documentId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching document status:', error)
    res.status(500).json({ error: 'Erro ao buscar status do documento' })
  }
})

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

    // Ensure extracted_adults_only is included (for older records it might be null)
    result.rows.forEach(row => {
      if (row.extracted_adults_only === null || row.extracted_adults_only === undefined) {
        // If not set, use the base procedure's adults_only if mapped, otherwise default to false
        row.extracted_adults_only = row.base_adults_only || false
      }
    })

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
    // Note: procedure_base_id can be NULL if no matching was done
    const procedureId = uuidv4()
    await client.query(
      `INSERT INTO insurance_provider_procedures (
        id, insurance_provider_id, procedure_base_id, provider_code,
        provider_description, is_periciable, max_value, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [
        procedureId,
        providerId,
        mapping.mapped_procedure_base_id || null, // Allow NULL
        mapping.extracted_procedure_code,
        mapping.extracted_description,
        mapping.extracted_is_periciable || false,
        mapping.extracted_value || null
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
    const { mappedProcedureBaseId, status, notes, extractedIsPericiable, extractedAdultsOnly } = req.body

    await pool.query(
      `UPDATE procedure_mappings
       SET mapped_procedure_base_id = $1,
           status = $2,
           notes = $3,
           extracted_is_periciable = COALESCE($4, extracted_is_periciable),
           extracted_adults_only = COALESCE($5, extracted_adults_only),
           reviewed_by = $6,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $7`,
      [
        mappedProcedureBaseId,
        status || 'PENDING',
        notes || null,
        extractedIsPericiable !== undefined ? extractedIsPericiable : null,
        extractedAdultsOnly !== undefined ? extractedAdultsOnly : null,
        req.user.id,
        mappingId
      ]
    )

    res.json({ success: true })
  } catch (error) {
    console.error('Error updating mapping:', error)
    res.status(500).json({ error: 'Erro ao atualizar mapeamento' })
  }
})

export default router
