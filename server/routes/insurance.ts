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
import { pdfToPng } from 'pdf-to-png-converter'
import Tesseract from 'tesseract.js'
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
 * Process PDF document with OpenAI Vision API
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
    await updateProgress(documentId, 5, 'CONVERTING')

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

    // Convert PDF to images (one per page)
    console.log('📄 Convertendo PDF para imagens...')
    await updateProgress(documentId, 10, 'CONVERTING')

    const pdfBuffer = Buffer.isBuffer(fileData) ? fileData : fs.readFileSync(fileData)

    const pngPages = await pdfToPng(pdfBuffer, {
      disableFontFace: false,
      useSystemFonts: false,
      viewportScale: 3.0, // Higher resolution for better text recognition (increased from 2.0)
      outputFileMask: 'page'
    })

    console.log(`✅ PDF convertido: ${pngPages.length} páginas`)
    await updateProgress(documentId, 20, 'EXTRACTING')

    // Process each page with OCR + GPT
    console.log('🔍 Processando páginas com OCR + GPT...')
    const allProcedures: any[] = []

    for (let i = 0; i < pngPages.length; i++) {
      const pageNum = i + 1
      const progressPercent = 20 + Math.floor((i / pngPages.length) * 60)
      await updateProgress(documentId, progressPercent, 'EXTRACTING')

      console.log(`📄 Processando página ${pageNum}/${pngPages.length}...`)

      // Step 1: Extract text with OCR
      const imageBuffer = pngPages[i].content
      console.log(`   🔤 Extraindo texto com OCR...`)

      const { data: { text } } = await Tesseract.recognize(imageBuffer, 'por', {
        logger: () => {} // Silent logger
      })

      if (!text || text.trim().length < 50) {
        console.log(`   ⚠️ Página ${pageNum}: Texto insuficiente extraído por OCR`)
        continue
      }

      console.log(`   ✅ OCR extraiu ${text.length} caracteres`)
      console.log(`   📝 Primeiros 300 chars do OCR: ${text.substring(0, 300)}`)

      // Step 2: Use GPT to parse the extracted text
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um parser especializado em tabelas de procedimentos odontológicos. Extraia dados estruturados do texto fornecido SEM inventar informações.'
          },
          {
            role: 'user',
            content: `Analise este texto extraído por OCR de uma tabela de procedimentos odontológicos e retorne um JSON estruturado.

TEXTO EXTRAÍDO:
${text}

INSTRUÇÕES:
1. Encontre códigos que começam com "A" seguido de dígitos e pontos (ex: A1.01.01.01, A2.02.01.01, A10.05.05.01)
   - Os códigos podem estar em formatos variados: "A1.01.01.01", "A 1.01.01.01", "A1 01 01 01"
2. Para cada código encontrado, extraia:
   - code: O código normalizado (ex: A1.01.01.01)
   - description: O texto que vem APÓS o código na mesma linha
   - value: O número que representa valor monetário (pode ter € ou R$). Se não houver número ou for "Sem CP", use null
3. **IMPORTANTE**: Use APENAS dados presentes no texto. Não invente códigos ou descrições.
4. Se uma linha tem código mas não consegue identificar descrição, use o código como descrição temporária
5. Retorne APENAS JSON válido no formato:

{
  "procedures": [
    {"code": "A1.01.01.01", "description": "Descrição exata", "value": 130.00},
    {"code": "A1.01.01.02", "description": "Outra descrição", "value": null}
  ]
}

Se não encontrar procedimentos válidos, retorne {"procedures": []}`
          }
        ],
        temperature: 0.0,
        response_format: { type: 'json_object' }
      })

      const pageResponse = response.choices[0].message.content || ''

      // Extract JSON from response
      try {
        const pageData = JSON.parse(pageResponse)
        if (pageData.procedures && Array.isArray(pageData.procedures)) {
          console.log(`   ✅ Extraídos ${pageData.procedures.length} procedimentos`)
          allProcedures.push(...pageData.procedures)
        }
      } catch (parseError) {
        console.error(`   ❌ Erro ao parsear JSON da página ${pageNum}:`, parseError.message)
      }
    }

    console.log(`\n✅ Total extraído: ${allProcedures.length} procedimentos de ${pngPages.length} páginas`)

    // Deduplicate procedures by code (keep the one with highest combined confidence)
    const procedureMap = new Map()
    for (const proc of allProcedures) {
      const existing = procedureMap.get(proc.code)
      if (!existing) {
        procedureMap.set(proc.code, proc)
      } else {
        // Keep procedure with better description length and value (more complete)
        const existingScore = (existing.description?.length || 0) + (existing.value ? 1000 : 0)
        const newScore = (proc.description?.length || 0) + (proc.value ? 1000 : 0)
        if (newScore > existingScore) {
          procedureMap.set(proc.code, proc)
        }
      }
    }

    const uniqueProcedures = Array.from(procedureMap.values())
    console.log(`🔍 Após deduplicação: ${uniqueProcedures.length} procedimentos únicos (removidos ${allProcedures.length - uniqueProcedures.length} duplicados)`)

    const extractedData = { procedures: uniqueProcedures }

    // Update document with extracted data (NO classification, NO mappings)
    await client.query(
      `UPDATE insurance_provider_documents
       SET processed = true,
           processed_at = CURRENT_TIMESTAMP,
           processing_status = 'COMPLETED',
           processing_progress = 100,
           extracted_data = $1
       WHERE id = $2`,
      [JSON.stringify(extractedData), documentId]
    )

    console.log(`✅ PDF processado com sucesso: ${documentId}`)
    console.log(`📊 ${uniqueProcedures.length} procedimentos extraídos e salvos`)
    console.log(`⏭️ Próximo passo: Usuário fará pareamento manual dos procedimentos`)

  } catch (error) {
    console.error('❌ Error in processPDFDocument:', error)
    console.error('Error stack:', error.stack)

    // Update document status to failed with error details
    await updateProgress(documentId, 0, 'FAILED')
    await client.query(
      `UPDATE insurance_provider_documents
       SET processing_status = 'FAILED',
           processed_at = CURRENT_TIMESTAMP,
           extracted_data = $1
       WHERE id = $2`,
      [JSON.stringify({
        error: error.message || 'Unknown error',
        stack: error.stack || '',
        timestamp: new Date().toISOString()
      }), documentId]
    )
  } finally {
    client.release()
  }
}

/**
 * Classify extracted procedures using AI (periciable and adults_only)
 */
async function classifyProceduresWithAI(extractedProcedures: any[]): Promise<any[]> {
  if (!openai) {
    console.warn('⚠️ OpenAI not available, skipping AI classification')
    return extractedProcedures.map(proc => ({
      ...proc,
      isPericiable: false,
      adultsOnly: false,
      aiPericiableConfidence: 0,
      aiAdultsOnlyConfidence: 0,
      reasoning: 'OpenAI not configured'
    }))
  }

  if (!extractedProcedures || extractedProcedures.length === 0) {
    return []
  }

  try {
    console.log(`🔍 Classificando ${extractedProcedures.length} procedimentos (periciável e adults_only)`)

    // Process in batches of 50 to avoid token limits
    const BATCH_SIZE = 50
    const allClassifications: any[] = []

    for (let i = 0; i < extractedProcedures.length; i += BATCH_SIZE) {
      const batch = extractedProcedures.slice(i, i + BATCH_SIZE)
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1
      const totalBatches = Math.ceil(extractedProcedures.length / BATCH_SIZE)

      console.log(`🔄 Processando lote ${batchNumber}/${totalBatches} (${batch.length} procedimentos)`)

      const prompt = `Você é um especialista em procedimentos odontológicos e perícias dentárias.

Sua tarefa é CLASSIFICAR cada procedimento em duas categorias:

1. **PERICIÁVEL**: Procedimentos que normalmente requerem perícia/avaliação prévia pela seguradora
   - SIM: Procedimentos complexos, caros, estéticos, ou que envolvem próteses, implantes, ortodontia, cirurgias grandes
   - NÃO: Procedimentos simples, preventivos, emergenciais, diagnósticos (consultas, radiografias, limpezas, restaurações simples, extrações simples)

2. **ADULTS_ONLY**: Procedimentos que só podem ser realizados em adultos (não crianças)
   - SIM: Procedimentos exclusivos para adultos (ex: implantes, próteses complexas, tratamentos periodontais avançados)
   - NÃO: Procedimentos que podem ser feitos em qualquer idade (consultas, radiografias, restaurações, extrações, ortodontia)

PROCEDIMENTOS PARA CLASSIFICAR:
${JSON.stringify(batch, null, 2)}

INSTRUÇÕES:
1. Analise CADA procedimento individualmente
2. Classifique como periciável ou não (true/false)
3. Classifique como adults_only ou não (true/false)
4. Atribua um score de confiança para cada classificação (0.0 a 1.0):
   - 0.95-1.0: Certeza absoluta
   - 0.80-0.94: Alta confiança
   - 0.70-0.79: Confiança média (ainda aceitável)
   - 0.50-0.69: Baixa confiança (requer revisão manual)
   - <0.50: Incerto (requer revisão manual)

RETORNE APENAS JSON PURO (sem markdown, sem comentários) no formato:
{
  "classifications": [
    {
      "code": "código do procedimento",
      "isPericiable": true/false,
      "periciableConfidence": 0.95,
      "adultsOnly": true/false,
      "adultsOnlyConfidence": 0.90,
      "reasoning": "breve explicação"
    },
    ...
  ]
}

IMPORTANTE: O array "classifications" DEVE ter exatamente ${batch.length} elementos, na mesma ordem dos procedimentos recebidos.`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em classificação de procedimentos odontológicos. Sempre retorne JSON válido sem markdown.'
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

      // Remove markdown code blocks
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')

      // Remove common phrases
      const phrasesToRemove = [
        /^Aqui está.*?:\s*/i,
        /^Aqui estão.*?:\s*/i,
        /^Segue.*?:\s*/i,
        /^Here is.*?:\s*/i,
        /^Here are.*?:\s*/i,
      ]
      for (const phrase of phrasesToRemove) {
        jsonText = jsonText.replace(phrase, '')
      }

      // Extract JSON object
      const firstBrace = jsonText.indexOf('{')
      const lastBrace = jsonText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1)
      }

      // Remove comments
      jsonText = jsonText.replace(/\/\/[^\n]*/g, '')
      jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '')
      jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1')
      jsonText = jsonText.trim()

      const result = JSON.parse(jsonText)

      if (!result.classifications || !Array.isArray(result.classifications)) {
        throw new Error('Invalid response format from AI')
      }

      console.log(`✅ Lote ${batchNumber}/${totalBatches}: ${result.classifications.length} procedimentos classificados`)
      allClassifications.push(...result.classifications)
    }

    console.log(`✅ IA classificou todos os ${allClassifications.length} procedimentos`)

    // Merge AI classifications with extracted procedures
    const classifiedProcedures = extractedProcedures.map((proc, index) => {
      const aiClassification = allClassifications[index]

      if (!aiClassification) {
        return {
          ...proc,
          isPericiable: false,
          adultsOnly: false,
          aiPericiableConfidence: 0,
          aiAdultsOnlyConfidence: 0,
          reasoning: 'Sem classificação da IA'
        }
      }

      return {
        ...proc,
        isPericiable: aiClassification.isPericiable || false,
        adultsOnly: aiClassification.adultsOnly || false,
        aiPericiableConfidence: aiClassification.periciableConfidence || 0,
        aiAdultsOnlyConfidence: aiClassification.adultsOnlyConfidence || 0,
        reasoning: aiClassification.reasoning || 'Classificação automática por IA'
      }
    })

    // Log statistics
    const periciableCount = classifiedProcedures.filter(p => p.isPericiable).length
    const adultsOnlyCount = classifiedProcedures.filter(p => p.adultsOnly).length
    const highConfidenceCount = classifiedProcedures.filter(p =>
      p.aiPericiableConfidence >= 0.8 && p.aiAdultsOnlyConfidence >= 0.8
    ).length
    const needsReviewCount = classifiedProcedures.filter(p =>
      p.aiPericiableConfidence < 0.7 || p.aiAdultsOnlyConfidence < 0.7
    ).length

    console.log('📊 Resultados da classificação:')
    console.log(`   • ${periciableCount} procedimentos PERICIÁVEIS`)
    console.log(`   • ${adultsOnlyCount} procedimentos ADULTS ONLY`)
    console.log(`   • ${highConfidenceCount} com alta confiança (≥80%)`)
    console.log(`   • ${needsReviewCount} requerem revisão manual (<70%)`)

    return classifiedProcedures

  } catch (error) {
    console.error('❌ Erro na classificação por IA:', error)
    console.error('Stack:', error.stack)
    console.error('Message:', error.message)

    // Fallback: return procedures without AI classification
    console.log('⚠️ Usando classificação padrão (sem IA) devido a erro')
    return extractedProcedures.map(proc => ({
      ...proc,
      isPericiable: false,
      adultsOnly: false,
      aiPericiableConfidence: 0,
      aiAdultsOnlyConfidence: 0,
      reasoning: `Erro na classificação: ${error.message || 'Unknown error'}`
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
 * GET /api/insurance/documents/:documentId
 * Get full document with extracted data
 */
router.get('/documents/:documentId', authRequired, async (req, res) => {
  try {
    const { documentId } = req.params

    const result = await pool.query(
      `SELECT id, insurance_provider_id, file_name, processing_status,
              processing_progress, extracted_data, created_at, processed_at
       FROM insurance_provider_documents
       WHERE id = $1`,
      [documentId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching document:', error)
    res.status(500).json({ error: 'Erro ao buscar documento' })
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
    console.log(`📥 Fetching documents for provider: ${providerId}`)

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

    console.log(`✅ Found ${result.rows.length} documents for provider ${providerId}`)
    if (result.rows.length > 0) {
      console.log(`   Latest document: ${result.rows[0].id} (${result.rows[0].processing_status})`)
    }

    res.json(result.rows)
  } catch (error) {
    console.error('❌ Error fetching documents:', error)
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
    console.log(`📥 Fetching mappings for document: ${documentId}`)

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

    console.log(`✅ Found ${result.rows.length} mappings for document ${documentId}`)

    // Ensure extracted_adults_only is included (for older records it might be null)
    result.rows.forEach(row => {
      if (row.extracted_adults_only === null || row.extracted_adults_only === undefined) {
        // If not set, use the base procedure's adults_only if mapped, otherwise default to false
        row.extracted_adults_only = row.base_adults_only || false
      }
    })

    res.json(result.rows)
  } catch (error) {
    console.error('❌ Error fetching mappings:', error)
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
