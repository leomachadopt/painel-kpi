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
      viewportScale: 2.0, // Higher resolution for better text recognition
      outputFileMask: 'page'
    })

    console.log(`✅ PDF convertido: ${pngPages.length} páginas`)
    await updateProgress(documentId, 20, 'EXTRACTING')

    // Create temporary assistant with specific Python extraction code
    console.log('🤖 Criando assistente temporário...')
    const assistant = await openai.beta.assistants.create({
      name: 'Dental Procedure Extractor',
      instructions: `VOCÊ É UM EXTRATOR DE PROCEDIMENTOS ODONTOLÓGICOS QUE USA PYTHON.

MÉTODO OBRIGATÓRIO (USE ESTE CÓDIGO PYTHON):

\`\`\`python
import pdfplumber
import json
import re
import os

procedures = []

# Encontrar o arquivo PDF em /mnt/data/
pdf_files = [f for f in os.listdir('/mnt/data/') if f.endswith('.pdf')]
if not pdf_files:
    print("Erro: Nenhum arquivo PDF encontrado em /mnt/data/")
    print(json.dumps({"procedures": [], "error": "No PDF found"}))
else:
    pdf_path = os.path.join('/mnt/data/', pdf_files[0])
    print(f"Processando arquivo: {pdf_path}")

    # Abrir o PDF
    with pdfplumber.open(pdf_path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"Processando página {page_num}...")

            # Extrair tabelas da página
            tables = page.extract_tables()

            for table in tables:
                if not table:
                    continue

                for row in table:
                    if not row or len(row) < 2:
                        continue

                    # Procurar código de procedimento (ex: A1.01.01.01)
                    code = None
                    desc = None
                    value = None

                    for cell in row:
                        if not cell:
                            continue
                        cell_clean = str(cell).strip()

                        # Detectar código (formato: A + números e pontos)
                        if re.match(r'^A\\d+\\.', cell_clean):
                            code = cell_clean
                        # Detectar valor (número com vírgula ou ponto)
                        elif re.search(r'\\d+[,\\.]\\d{2}', cell_clean):
                            # Extrair apenas o número
                            value_match = re.search(r'(\\d+)[,\\.](\\d{2})', cell_clean)
                            if value_match:
                                value = float(f"{value_match.group(1)}.{value_match.group(2)}")
                        # Resto é descrição
                        elif not code and len(cell_clean) > 3:
                            desc = cell_clean

                    # Se encontrou código e descrição, adicionar
                    if code and desc:
                        procedures.append({
                            "code": code,
                            "description": desc,
                            "value": value
                        })

    print(f"\\nTotal extraído: {len(procedures)} procedimentos")

    # Retornar JSON
    print(json.dumps({"procedures": procedures}, ensure_ascii=False))
\`\`\`

IMPORTANTE:
1. Execute o código Python acima
2. Retorne APENAS o JSON final (última linha do output)
3. NÃO adicione texto extra`,
      model: 'gpt-4o',
      tools: [{ type: 'code_interpreter' }]
    })

    // Create thread with the file
    console.log('💬 Criando thread com arquivo...')
    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: `Execute o código Python fornecido nas instruções para extrair TODOS os procedimentos do PDF anexado.

O PDF tem uma tabela de procedimentos odontológicos com colunas: Código, Descrição, Valor.

Execute o código Python completamente e retorne APENAS o JSON final com todos os procedimentos.`,
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

    // Save raw response for debugging before processing
    await client.query(
      `UPDATE insurance_provider_documents
       SET extracted_data = $1
       WHERE id = $2`,
      [JSON.stringify({
        debug: 'Raw AI response',
        responseLength: responseText?.length,
        responsePreview: responseText?.substring(0, 2000)
      }), documentId]
    )

    // Clean up
    console.log('🧹 Limpando recursos temporários...')
    await openai.beta.assistants.delete(assistant.id)
    await openai.files.delete(file.id)
    console.log('✅ Recursos limpos')

    // Extract JSON from response (might be wrapped in markdown code blocks or extra text)
    let jsonText = responseText.trim()

    console.log('🔍 Resposta da IA (primeiros 500 chars):', jsonText.substring(0, 500))
    console.log('📏 Tamanho da resposta:', jsonText.length)

    // Remove markdown code blocks
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')

    // Remove common Portuguese/English phrases that AI might add
    const phrasesToRemove = [
      /^Aqui está.*?:\s*/i,
      /^Aqui estão.*?:\s*/i,
      /^Segue.*?:\s*/i,
      /^Here is.*?:\s*/i,
      /^Here are.*?:\s*/i,
      /^Below is.*?:\s*/i,
      /^Based on.*?:\s*/i,
      /^The extracted.*?:\s*/i,
    ]

    for (const phrase of phrasesToRemove) {
      jsonText = jsonText.replace(phrase, '')
    }

    // Try multiple strategies to find JSON
    // Look for the LAST occurrence of {"procedures" (in case there are prints before)
    let firstBrace = jsonText.lastIndexOf('{"procedures"')
    if (firstBrace === -1) {
      // Try looking for first occurrence if last not found
      firstBrace = jsonText.indexOf('{"procedures"')
    }
    if (firstBrace === -1) {
      firstBrace = jsonText.indexOf('{')
    }

    // Find the matching closing brace from the position we found
    let lastBrace = jsonText.indexOf('}', firstBrace)
    if (lastBrace !== -1) {
      // Find the actual last closing brace (for the procedures array)
      let braceCount = 1
      let pos = firstBrace + 1
      while (pos < jsonText.length && braceCount > 0) {
        if (jsonText[pos] === '{') braceCount++
        else if (jsonText[pos] === '}') braceCount--
        if (braceCount === 0) {
          lastBrace = pos
          break
        }
        pos++
      }
    }
    if (lastBrace === -1) {
      lastBrace = jsonText.lastIndexOf('}')
    }

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      console.error('❌ Não foi possível encontrar JSON válido na resposta')
      console.error('📄 Resposta completa (primeiros 2000 chars):', jsonText.substring(0, 2000))

      // Save raw response for debugging
      await client.query(
        `UPDATE insurance_provider_documents
         SET extracted_data = $1
         WHERE id = $2`,
        [JSON.stringify({
          error: 'No JSON found in AI response',
          rawResponse: jsonText.substring(0, 3000)
        }), documentId]
      )

      throw new Error('Resposta da IA não contém JSON válido')
    }

    jsonText = jsonText.substring(firstBrace, lastBrace + 1)
    jsonText = jsonText.trim()

    // Remove JavaScript-style comments that AI might add
    jsonText = jsonText.replace(/\/\/[^\n]*/g, '')
    jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '')
    // Clean up any trailing commas before ] or }
    jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1')

    jsonText = jsonText.trim()

    console.log('✅ JSON extraído (primeiros 500 chars):', jsonText.substring(0, 500))
    console.log('📏 Tamanho do JSON extraído:', jsonText.length)

    let extractedData
    try {
      // Try to fix common JSON issues before parsing
      let cleanedJson = jsonText

      // Fix: Remove newlines inside strings (but keep the structure)
      cleanedJson = cleanedJson.replace(/"\s*\n\s*"/g, '" "')

      // Fix: Remove trailing commas before closing brackets/braces
      cleanedJson = cleanedJson.replace(/,(\s*[}\]])/g, '$1')

      // Fix: Add missing commas between array elements (common AI mistake)
      cleanedJson = cleanedJson.replace(/}(\s*)(\{)/g, '},$1$2')

      extractedData = JSON.parse(cleanedJson)
      console.log(`📊 Procedimentos extraídos: ${extractedData.procedures?.length || 0}`)

      if (extractedData.procedures?.length === 0) {
        console.log('⚠️ AVISO: Nenhum procedimento foi extraído!')
        console.log('💡 Possíveis causas:')
        console.log('  - O PDF não contém tabelas de procedimentos odontológicos')
        console.log('  - O formato da tabela não foi reconhecido pela IA')
        console.log('  - As imagens estão muito escuras/borradas')
      } else if (extractedData.procedures?.length < 100) {
        console.log(`⚠️ AVISO: Apenas ${extractedData.procedures.length} procedimentos extraídos.`)
        console.log('   Se o PDF tem mais procedimentos, a IA pode ter parado prematuramente.')
        console.log('   Últimos códigos extraídos:',
          extractedData.procedures.slice(-3).map(p => p.code).join(', '))
      }
    } catch (parseError: any) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError.message)
      console.log('🔧 Tentando extrair procedimentos com regex...')

      // Fallback: Try to extract procedure objects with regex
      try {
        const procedureRegex = /\{\s*"code"\s*:\s*"([^"]+)"\s*,\s*"description"\s*:\s*"([^"]+)"\s*,\s*"value"\s*:\s*([\d.]+|null)\s*\}/g
        const matches = [...jsonText.matchAll(procedureRegex)]

        if (matches.length > 0) {
          console.log(`✅ Extraídos ${matches.length} procedimentos via regex`)
          extractedData = {
            procedures: matches.map(match => ({
              code: match[1],
              description: match[2],
              value: match[3] === 'null' ? null : parseFloat(match[3])
            }))
          }
        } else {
          throw new Error('Nenhum procedimento encontrado via regex')
        }
      } catch (regexError) {
        // Save the problematic JSON to database for debugging
        const errorPos = parseInt(parseError.message.match(/\d+/)?.[0] || '0')
        const start = Math.max(0, errorPos - 100)
        const end = Math.min(jsonText.length, errorPos + 100)

        console.log('📄 Contexto do erro:', jsonText.substring(start, end))

        await client.query(
          `UPDATE insurance_provider_documents
           SET extracted_data = $1
           WHERE id = $2`,
          [JSON.stringify({
            error: `JSON Parse Error: ${parseError.message}`,
            problematicJson: jsonText.substring(0, 2000),
            errorPosition: errorPos
          }), documentId]
        )

        throw new Error(`Falha ao parsear resposta da IA: ${parseError.message}`)
      }
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

    // AI-powered procedure classification (periciable and adults_only)
    console.log('🤖 Iniciando classificação automática por IA (periciável e adults_only)...')
    console.log(`📊 Total de procedimentos a classificar: ${extractedData.procedures?.length || 0}`)
    await updateProgress(documentId, 70, 'CLASSIFYING')

    const classifiedProcedures = await classifyProceduresWithAI(extractedData.procedures)
    console.log('✅ Classificação por IA concluída')
    console.log(`📊 Total de procedimentos classificados: ${classifiedProcedures?.length || 0}`)
    await updateProgress(documentId, 85, 'CLASSIFYING')

    // Create procedure mappings
    console.log('💾 Salvando mapeamentos de procedimentos...')
    await updateProgress(documentId, 90, 'SAVING')
    if (classifiedProcedures && Array.isArray(classifiedProcedures)) {
      let autoClassifiedCount = 0
      let manualCount = 0
      let highConfidenceCount = 0

      for (const proc of classifiedProcedures) {
        const mappingId = uuidv4()

        const periciableConfidence = proc.aiPericiableConfidence || 0
        const adultsOnlyConfidence = proc.aiAdultsOnlyConfidence || 0
        const avgConfidence = (periciableConfidence + adultsOnlyConfidence) / 2

        const isHighConfidence = avgConfidence >= 0.8
        const needsManualReview = avgConfidence < 0.7

        if (isHighConfidence) {
          highConfidenceCount++
          autoClassifiedCount++
        } else if (!needsManualReview) {
          autoClassifiedCount++
        } else {
          manualCount++
        }

        await client.query(
          `INSERT INTO procedure_mappings (
            id, document_id, extracted_procedure_code, extracted_description,
            extracted_is_periciable, extracted_adults_only, extracted_value,
            ai_periciable_confidence, ai_adults_only_confidence,
            mapped_procedure_base_id, confidence_score, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
          [
            mappingId,
            documentId,
            proc.code,
            proc.description,
            proc.isPericiable !== undefined ? proc.isPericiable : false,
            proc.adultsOnly !== undefined ? proc.adultsOnly : false,
            proc.value || null,
            periciableConfidence,
            adultsOnlyConfidence,
            null, // No automatic pairing with procedure_base
            avgConfidence,
            needsManualReview ? 'MANUAL' : 'PENDING',
            proc.reasoning || null
          ]
        )
      }

      console.log(`✅ ${classifiedProcedures.length} procedimentos salvos:`)
      console.log(`   • ${highConfidenceCount} com alta confiança (≥80%)`)
      console.log(`   • ${autoClassifiedCount - highConfidenceCount} com confiança média (70-79%)`)
      console.log(`   • ${manualCount} requerem revisão manual (<70%)`)
    }

    await updateProgress(documentId, 100, 'COMPLETED')
    console.log(`✅ PDF processed successfully: ${documentId}`)

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
