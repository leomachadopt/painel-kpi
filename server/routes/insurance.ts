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

// Configure multer for JSON uploads
const uploadJSON = multer({
  storage: isServerless
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = path.join(__dirname, '../../public/uploads/insurance-json')
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true })
          }
          cb(null, uploadDir)
        },
        filename: (req, file, cb) => {
          const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`
          cb(null, uniqueName)
        }
      }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
      cb(null, true)
    } else {
      cb(new Error('Apenas arquivos JSON são permitidos'))
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
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
 * POST /api/insurance/:providerId/upload-json
 * Upload JSON file with extracted procedures
 */
router.post('/:providerId/upload-json', authRequired, uploadJSON.single('json'), async (req, res) => {
  const client = await pool.connect()

  try {
    const { providerId } = req.params
    const { clinicId } = req.body
    const uploadedFile = req.file

    console.log('📤 Upload JSON iniciado:', { providerId, clinicId, file: uploadedFile?.originalname })

    if (!uploadedFile) {
      return res.status(400).json({ error: 'Nenhum arquivo JSON enviado' })
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

    // Read and parse JSON file
    let jsonData: any
    try {
      const fileContent = uploadedFile.buffer 
        ? uploadedFile.buffer.toString('utf-8')
        : fs.readFileSync(uploadedFile.path, 'utf-8')
      
      jsonData = JSON.parse(fileContent)
      console.log('✅ JSON parseado com sucesso')
    } catch (parseError: any) {
      console.error('❌ Erro ao parsear JSON:', parseError.message)
      
      // Clean up uploaded file
      if (uploadedFile.path) {
        try {
          fs.unlinkSync(uploadedFile.path)
        } catch (err) {
          console.error('Error deleting file:', err)
        }
      }
      
      return res.status(400).json({ 
        error: 'Arquivo JSON inválido', 
        details: parseError.message 
      })
    }

    // Validate JSON structure
    if (!jsonData.procedures || !Array.isArray(jsonData.procedures)) {
      return res.status(400).json({ 
        error: 'Formato JSON inválido. Esperado: { "procedures": [...] }' 
      })
    }

    // Validate each procedure has required fields
    const invalidProcedures = jsonData.procedures.filter((p: any) => !p.code)
    if (invalidProcedures.length > 0) {
      return res.status(400).json({ 
        error: `${invalidProcedures.length} procedimento(s) sem código obrigatório` 
      })
    }

    console.log(`📊 JSON contém ${jsonData.procedures.length} procedimentos`)

    // Create document record
    const documentId = uuidv4()
    console.log('📝 Criando registro de documento:', documentId)

    // Deduplicate procedures by code
    const procedureMap = new Map()
    for (const proc of jsonData.procedures) {
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
    console.log(`🔍 Após deduplicação: ${uniqueProcedures.length} procedimentos únicos (removidos ${jsonData.procedures.length - uniqueProcedures.length} duplicados)`)

    const extractedData = { procedures: uniqueProcedures }

    // Save document with extracted data
    await client.query(
      `INSERT INTO insurance_provider_documents (
        id, insurance_provider_id, file_name, file_path, file_size, mime_type,
        processed, processing_status, processing_progress, extracted_data, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, true, 'COMPLETED', 100, $7, $8)`,
      [
        documentId,
        providerId,
        uploadedFile.originalname,
        uploadedFile.path || 'memory',
        uploadedFile.size,
        uploadedFile.mimetype || 'application/json',
        JSON.stringify(extractedData),
        req.user.id
      ]
    )

    console.log(`✅ Documento JSON salvo com sucesso: ${documentId}`)
    console.log(`📊 ${uniqueProcedures.length} procedimentos salvos`)

    // Auto-pair procedures with procedure_base_table (100% confidence only)
    console.log(`🔗 Iniciando pareamento automático com tabela base...`)
    let autoPairedCount = 0
    let autoApprovedCount = 0
    let unpariedCount = 0

    try {
      await client.query('BEGIN')

      for (const proc of uniqueProcedures) {
        const match = await matchProcedureBase(proc, clinicId)
        
        if (match) {
          // Create procedure_mapping with 100% confidence
          const mappingId = uuidv4()
          
          // Se encontrou match na tabela base, significa que foi aprovado anteriormente
          // Então vamos criar o mapping e aprovar automaticamente
          const procedureId = uuidv4()
          
          // Criar insurance_provider_procedure diretamente (auto-aprovação)
          await client.query(
            `INSERT INTO insurance_provider_procedures (
              id, insurance_provider_id, procedure_base_id, provider_code,
              provider_description, is_periciable, max_value, active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
            [
              procedureId,
              providerId,
              match.baseId, // Link to base table
              proc.code,
              proc.description || '',
              match.isPericiable,
              proc.value || null
            ]
          )
          
          // Criar procedure_mapping com status APPROVED
          await client.query(
            `INSERT INTO procedure_mappings (
              id, document_id, extracted_procedure_code, extracted_description,
              extracted_is_periciable, extracted_adults_only, extracted_value,
              mapped_procedure_base_id, mapped_provider_procedure_id, confidence_score, status, notes, reviewed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, CURRENT_TIMESTAMP)`,
            [
              mappingId,
              documentId,
              proc.code,
              proc.description || '',
              match.isPericiable,
              match.adultsOnly,
              proc.value || null,
              match.baseId, // Paired with base table
              procedureId, // Link to insurance_provider_procedure
              1.0, // 100% confidence
              'APPROVED', // Auto-approved because it was already in base table
              'Pareamento e aprovação automática (100% confiança - procedimento já aprovado anteriormente)'
            ]
          )
          
          autoPairedCount++
          autoApprovedCount++
        } else {
          unpariedCount++
        }
      }

      await client.query('COMMIT')

      console.log(`✅ Pareamento automático concluído:`)
      console.log(`   • ${autoPairedCount} procedimentos pareados automaticamente (100% confiança)`)
      console.log(`   • ${autoApprovedCount} procedimentos aprovados automaticamente (já estavam na tabela base)`)
      console.log(`   • ${unpariedCount} procedimentos não pareados (requerem IA ou pareamento manual)`)
    } catch (pairingError: any) {
      await client.query('ROLLBACK').catch(() => {})
      console.error('❌ Erro no pareamento automático:', pairingError)
      // Continue anyway - document is saved, just no automatic pairing
      console.log('⚠️ Documento salvo, mas pareamento automático falhou. Procedimentos podem ser pareados manualmente.')
    }

    res.json({
      success: true,
      documentId,
      proceduresCount: uniqueProcedures.length,
      autoPairedCount,
      autoApprovedCount,
      unpariedCount,
      message: `JSON carregado com sucesso. ${uniqueProcedures.length} procedimentos importados. ${autoPairedCount} pareados automaticamente, ${autoApprovedCount} aprovados automaticamente.`
    })

  } catch (error: any) {
    console.error('Error uploading JSON:', error)

    // Clean up uploaded file on error (only if using disk storage)
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (err) {
        console.error('Error deleting file:', err)
      }
    }

    res.status(500).json({ 
      error: 'Erro ao fazer upload do JSON',
      details: error.message 
    })
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
 * Extract table as structured text (CSV-like format)
 * This avoids GPT inventing data by asking it to just copy what it sees
 */
async function extractTableAsStructuredText(imageBuffer: Buffer, pageNum: number): Promise<string> {
  const base64Image = imageBuffer.toString('base64')
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Analise esta imagem de uma tabela de procedimentos odontológicos.

SUA TAREFA: Extrair a tabela COMPLETA como texto estruturado, linha por linha.

FORMATO DE SAÍDA (CSV-like, uma linha por procedimento):
CÓDIGO|DESCRIÇÃO COMPLETA|VALOR

REGRAS ABSOLUTAS:
1. Copie EXATAMENTE o que você vê, sem modificar, sem inventar, sem resumir
2. Uma linha por procedimento da tabela
3. Use | como separador entre colunas
4. Se uma descrição é "CONSULTA ODONTO-ESTOMATOLOGICA", copie exatamente isso, não "CONSULTA"
5. Se um valor é "15,75 €", copie "15,75" na coluna VALOR (mantenha vírgula, remova símbolo €)
6. Extraia TODAS as linhas da tabela, sem pular nenhuma
7. Se uma linha tem código mas não tem descrição visível, use o código como descrição temporária
8. Se uma linha tem código mas não tem valor visível, deixe a coluna VALOR vazia

COLUNAS ESPERADAS:
- CÓDIGO: O código do procedimento (pode ser numérico como 61851 ou formato A1.01.01.01)
- DESCRIÇÃO COMPLETA: O texto completo da descrição do procedimento (copie TUDO, não resuma)
- VALOR: O valor monetário da coluna "ENCARGO ADSE" ou "VALOR" (se houver múltiplos valores, use o da coluna "ENCARGO ADSE")

Exemplo de saída esperada:
61851|CONSULTA ODONTO-ESTOMATOLOGICA|15,75
61852|RESTAURAÇÃO|19,69
61853|ENDODONTIA 1ª SESSÃO|15,75
61854|ENDODONTIA COM OBTURAÇÃO DE CANAIS|27,56

⚠️ CRÍTICO: 
- Retorne APENAS o texto estruturado, sem explicações, sem JSON, sem markdown
- NÃO invente descrições, NÃO resuma, NÃO modifique
- Copie LITERALMENTE o que você vê na tabela
- Se a tabela tem 20 linhas, retorne 20 linhas
- Se a tabela tem 50 linhas, retorne 50 linhas
- Use EXATAMENTE o formato: CÓDIGO|DESCRIÇÃO|VALOR (uma linha por procedimento)
- NÃO adicione cabeçalhos, NÃO adicione explicações, APENAS as linhas de dados`
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${base64Image}` }
          }
        ]
      }
    ],
    temperature: 0.0,
    max_tokens: 16000
  })
  
  return response.choices[0].message.content || ''
}

/**
 * Parse structured text (CSV-like) into procedure objects
 * Validates and filters out generic descriptions
 */
function parseStructuredText(structuredText: string, pageNum: number): any[] {
  const procedures: any[] = []
  
  // Log texto completo para debug
  console.log(`   📄 Texto estruturado recebido (${structuredText.length} chars):`)
  console.log(`   ${structuredText.substring(0, 500).split('\n').map(l => `      ${l}`).join('\n')}`)
  
  const lines = structuredText.split('\n').filter(line => {
    const trimmed = line.trim()
    // Ignorar linhas vazias, cabeçalhos
    if (trimmed.length === 0) return false
    if (trimmed.toUpperCase().startsWith('CÓDIGO') || trimmed.toUpperCase().startsWith('CODE')) return false
    
    // Aceitar linhas com | (separador) OU linhas que parecem ter código (números ou A seguido de números)
    return trimmed.includes('|') || /^\s*[A\d]/.test(trimmed)
  })
  
  console.log(`   📊 Linhas encontradas após filtro: ${lines.length}`)
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let parts: string[] = []
    
    // Tentar separar por | primeiro
    if (line.includes('|')) {
      parts = line.split('|').map(p => p.trim())
    } else {
      // Se não tem |, tentar separar por espaços múltiplos ou tabs
      parts = line.split(/\s{2,}|\t/).map(p => p.trim()).filter(p => p.length > 0)
    }
    
    if (parts.length < 2) {
      console.log(`   ⚠️ Linha ${i + 1} ignorada (formato inválido, ${parts.length} partes): ${line.substring(0, 80)}`)
      continue
    }
    
    const code = parts[0]
    const description = parts[1] || code // Se não tem descrição, usa o código
    let value = null
    
    // Tentar extrair valor da terceira coluna ou procurar em outras colunas
    if (parts.length >= 3 && parts[2]) {
      // Converter vírgula para ponto e remover símbolos, mas manter números
      const valueStr = parts[2].replace(',', '.').replace(/[^\d.]/g, '')
      const parsedValue = parseFloat(valueStr)
      if (!isNaN(parsedValue) && parsedValue > 0) {
        value = parsedValue
      }
    } else {
      // Tentar encontrar valor em outras colunas
      for (let j = 2; j < parts.length; j++) {
        const part = parts[j]
        // Procurar por padrão de número (pode ter vírgula ou ponto)
        const valueMatch = part.match(/(\d+)[,.](\d{2})/)
        if (valueMatch) {
          value = parseFloat(`${valueMatch[1]}.${valueMatch[2]}`)
          break
        }
      }
    }
    
    // Validar código não vazio e que parece um código válido
    if (!code || code.length === 0) {
      console.log(`   ⚠️ Linha ${i + 1} ignorada (sem código): ${line.substring(0, 50)}`)
      continue
    }
    
    // Validar que o código parece válido (números ou A seguido de números)
    const isValidCode = /^[A\d]/.test(code.trim())
    if (!isValidCode) {
      console.log(`   ⚠️ Linha ${i + 1} ignorada (código inválido): ${code} - ${line.substring(0, 50)}`)
      continue
    }
    
    // Aceitar TODAS as descrições - não rejeitar nada (o usuário pode revisar depois)
    // Apenas logar se for muito genérica para informação
    const descriptionUpper = description.toUpperCase().trim()
    const veryGenericSingleWords = ['CONSULTA', 'PROCEDIMENTO', 'TRATAMENTO', 'SERVIÇO']
    const isVeryGeneric = veryGenericSingleWords.some(g => 
      descriptionUpper === g && description.length < 12)
    
    if (isVeryGeneric) {
      console.log(`   ⚠️ Linha ${i + 1} tem descrição genérica (mas será mantida): ${code} - "${description}"`)
    }
    
    // Adicionar sempre - melhor ter dados do que não ter nada
    procedures.push({ code: code.trim(), description: description.trim(), value })
  }
  
  console.log(`   ✅ Total de procedimentos parseados: ${procedures.length}`)
  
  return procedures
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

      // Step 1: Try OCR first, fallback to Vision API if OCR fails
      const imageBuffer = pngPages[i].content
      console.log(`   🔤 Tentando extrair texto com OCR...`)

      let text = ''
      let ocrConfidence = 0
      let useVisionAPI = false
      
      try {
        const ocrResult = await Tesseract.recognize(imageBuffer, 'por', {
          logger: (info) => {
            if (info.status === 'recognizing text') {
              // Log progress for long operations
              if (info.progress % 0.25 < 0.01) { // Log every 25%
                console.log(`   📊 Progresso OCR: ${Math.round(info.progress * 100)}%`)
              }
            }
          }
        })
        text = ocrResult.data.text || ''
        ocrConfidence = ocrResult.data.confidence || 0
        console.log(`   ✅ OCR concluído - Confiança: ${ocrConfidence.toFixed(2)}%`)
      } catch (ocrError) {
        console.error(`   ❌ Erro no OCR da página ${pageNum}:`, ocrError.message)
        useVisionAPI = true
      }

      // Se OCR falhou ou extraiu pouco texto, usar Vision API como fallback
      // Reduzir limite para 10 caracteres para capturar mais páginas
      if (!text || text.trim().length < 10) {
        if (text.length > 0) {
          console.log(`   ⚠️ OCR extraiu pouco texto (${text.length} chars, confiança: ${ocrConfidence.toFixed(2)}%)`)
          console.log(`   📝 Texto extraído (primeiros 200 chars): "${text.substring(0, 200)}"`)
        } else {
          console.log(`   ⚠️ OCR não extraiu texto, usando Vision API como fallback...`)
        }
        
        // Fallback: Use two-step approach - extract as structured text, then parse
        try {
          console.log(`   🔄 Usando abordagem em dois passos (extração estruturada + parsing)...`)
          
          // Passo 1: Extrair tabela como texto estruturado
          const structuredText = await extractTableAsStructuredText(imageBuffer, pageNum)
          console.log(`   ✅ Texto estruturado extraído (${structuredText.length} caracteres)`)
          
          if (structuredText.length < 10) {
            console.log(`   ⚠️ Texto estruturado muito curto, pode estar vazio`)
            continue
          }
          
          // Mostrar primeiras linhas para debug
          const previewLines = structuredText.split('\n').slice(0, 5).join('\n')
          console.log(`   📝 Primeiras linhas extraídas:\n${previewLines.split('\n').map(l => `      ${l}`).join('\n')}`)
          
          // Passo 2: Fazer parsing do texto estruturado
          const pageProcedures = parseStructuredText(structuredText, pageNum)
          console.log(`   ✅ Parsing concluído: ${pageProcedures.length} procedimentos extraídos da página ${pageNum}`)
          
          if (pageProcedures.length > 0) {
            console.log(`   📋 Exemplos: ${pageProcedures.slice(0, 5).map(p => `${p.code} - ${p.description?.substring(0, 30) || 'sem desc'}`).join(', ')}`)
            allProcedures.push(...pageProcedures)
          } else {
            console.log(`   ⚠️ Nenhum procedimento válido extraído do texto estruturado`)
            console.log(`   📄 Texto completo (primeiros 1000 chars): ${structuredText.substring(0, 1000)}`)
          }
          
          continue // Skip to next page
        } catch (visionError) {
          console.error(`   ❌ Erro na extração estruturada:`, visionError.message)
          console.error(`   Stack:`, visionError.stack)
        }
        
        // Se chegou aqui, nem OCR nem Vision API funcionaram
        continue
      }

      console.log(`   ✅ OCR extraiu ${text.length} caracteres (confiança: ${ocrConfidence.toFixed(2)}%)`)
      console.log(`   📝 Primeiros 500 chars do OCR: ${text.substring(0, 500)}`)
      
      // Verificar se há códigos de procedimentos no texto bruto (formato A1.01.01.01 ou numérico)
      const codePatternA = /A\s*\d+\.\d+\.\d+\.\d+/gi
      const codePatternNumeric = /\b\d{4,6}\b/g // Códigos numéricos de 4 a 6 dígitos
      const rawCodesA = text.match(codePatternA) || []
      const rawCodesNumeric = text.match(codePatternNumeric) || []
      
      if (rawCodesA.length > 0 || rawCodesNumeric.length > 0) {
        const totalCodes = rawCodesA.length + rawCodesNumeric.length
        const examples = [...rawCodesA.slice(0, 3), ...rawCodesNumeric.slice(0, 3)]
        console.log(`   🔍 Códigos encontrados no OCR bruto: ${totalCodes} (A: ${rawCodesA.length}, Numéricos: ${rawCodesNumeric.length})`)
        console.log(`   📋 Exemplos: ${examples.slice(0, 5).join(', ')}`)
      } else {
        console.log(`   ⚠️ Nenhum código de procedimento encontrado (padrões: A1.01.01.01 ou numéricos 4-6 dígitos)`)
      }

      // Step 2: Use two-step approach - ask GPT to structure the text first, then parse
      console.log(`   🔄 Usando abordagem em dois passos (estruturação + parsing)...`)
      
      const structureResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'Você é um parser especializado em tabelas. Sua tarefa é estruturar texto de tabelas em formato CSV-like, copiando EXATAMENTE o que está escrito, sem inventar ou modificar.'
          },
          {
            role: 'user',
            content: `Analise este texto extraído por OCR de uma tabela de procedimentos odontológicos.

SUA TAREFA: Estruturar o texto em formato CSV-like, linha por linha.

FORMATO DE SAÍDA (CSV-like, uma linha por procedimento):
CÓDIGO|DESCRIÇÃO COMPLETA|VALOR

REGRAS ABSOLUTAS:
1. Copie EXATAMENTE o que está escrito no texto, sem modificar, sem inventar, sem resumir
2. Uma linha por procedimento da tabela
3. Use | como separador entre colunas
4. Se o texto diz "CONSULTA ODONTO-ESTOMATOLOGICA", copie exatamente isso, não "CONSULTA"
5. Se o texto tem "15,75", copie "15,75" na coluna VALOR (mantenha vírgula)
6. Extraia TODAS as linhas da tabela que você consegue identificar no texto
7. Se uma linha tem código mas não tem descrição visível, use o código como descrição temporária
8. Se uma linha tem código mas não tem valor visível, deixe a coluna VALOR vazia

TEXTO EXTRAÍDO:
${text}

Retorne APENAS o texto estruturado, sem explicações, sem JSON, sem markdown.
Use EXATAMENTE o formato: CÓDIGO|DESCRIÇÃO|VALOR (uma linha por procedimento).
NÃO adicione cabeçalhos, NÃO adicione explicações, APENAS as linhas de dados.`
          }
        ],
        temperature: 0.0,
        max_tokens: 16000
      })

      const structuredText = structureResponse.choices[0].message.content || ''
      console.log(`   ✅ Texto estruturado criado (${structuredText.length} caracteres)`)
      
      if (structuredText.length < 10) {
        console.log(`   ⚠️ Texto estruturado muito curto, pode estar vazio`)
        continue
      }
      
      // Mostrar primeiras linhas para debug
      const previewLines = structuredText.split('\n').slice(0, 5).join('\n')
      console.log(`   📝 Primeiras linhas estruturadas:\n${previewLines.split('\n').map(l => `      ${l}`).join('\n')}`)
      
      // Passo 3: Fazer parsing do texto estruturado
      const pageProcedures = parseStructuredText(structuredText, pageNum)
      console.log(`   ✅ Parsing concluído: ${pageProcedures.length} procedimentos extraídos da página ${pageNum}`)
      
      if (pageProcedures.length > 0) {
        console.log(`   📋 Exemplos: ${pageProcedures.slice(0, 5).map(p => `${p.code} - ${p.description?.substring(0, 30) || 'sem desc'}`).join(', ')}`)
        allProcedures.push(...pageProcedures)
      } else {
        console.log(`   ⚠️ Nenhum procedimento válido extraído do texto estruturado`)
        console.log(`   📄 Texto estruturado completo (primeiros 1000 chars): ${structuredText.substring(0, 1000)}`)
      }
    }

    console.log(`\n${'='.repeat(80)}`)
    console.log(`📊 RESUMO DA EXTRAÇÃO`)
    console.log('='.repeat(80))
    console.log(`✅ Total extraído: ${allProcedures.length} procedimentos de ${pngPages.length} páginas`)
    
    if (allProcedures.length === 0) {
      console.log(`\n⚠️ ATENÇÃO: Nenhum procedimento foi extraído!`)
      console.log(`\n💡 Possíveis causas:`)
      console.log(`   1. OCR não conseguiu extrair texto suficiente das imagens`)
      console.log(`   2. Vision API não conseguiu identificar procedimentos nas imagens`)
      console.log(`   3. O PDF pode estar corrompido ou em formato não suportado`)
      console.log(`   4. As imagens geradas podem estar vazias ou ilegíveis`)
      console.log(`\n🔍 Verifique os logs acima para mais detalhes sobre cada página processada`)
    } else {
      console.log(`\n📋 Distribuição por página:`)
      // Nota: Não temos como rastrear por página facilmente, mas podemos mostrar exemplos
      if (allProcedures.length > 0) {
        console.log(`   • Primeiros códigos extraídos: ${allProcedures.slice(0, 10).map(p => p.code).join(', ')}`)
      }
    }

    // Log estatísticas de formatos (sem remover - aceitar qualquer formato)
    const numericCodes = allProcedures.filter(p => /^\d{4,6}$/.test(String(p.code).trim()))
    const formatACodes = allProcedures.filter(p => /^A\s*\d+\.\d+\.\d+\.\d+$/i.test(String(p.code).trim()))
    const otherCodes = allProcedures.filter(p => {
      const code = String(p.code).trim()
      return !/^\d{4,6}$/.test(code) && !/^A\s*\d+\.\d+\.\d+\.\d+$/i.test(code)
    })
    
    console.log(`📊 Estatísticas de formatos:`)
    console.log(`   • Numéricos (4-6 dígitos): ${numericCodes.length}`)
    console.log(`   • Formato A (A1.01.01.01): ${formatACodes.length}`)
    console.log(`   • Outros formatos: ${otherCodes.length}`)
    if (otherCodes.length > 0) {
      console.log(`   📋 Exemplos de outros formatos: ${otherCodes.slice(0, 5).map(p => p.code).join(', ')}`)
    }
    
    // Não remover nenhum formato - aceitar todos os códigos extraídos

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
    
    // Validação final: verificar se há dados suspeitos (valores muito diferentes, descrições genéricas demais)
    const suspiciousProcedures = uniqueProcedures.filter(p => {
      // Verificar se a descrição é muito genérica ou parece inventada
      const genericDescriptions = ['CONSULTA', 'PROCEDIMENTO', 'TRATAMENTO', 'SERVIÇO']
      const isGeneric = genericDescriptions.some(g => p.description?.toUpperCase() === g || 
        (p.description?.length || 0) < 5)
      
      // Verificar se o valor é muito alto ou muito baixo (pode ser inventado)
      const value = parseFloat(p.value) || 0
      const isSuspiciousValue = value > 10000 || (value > 0 && value < 0.01)
      
      return isGeneric || isSuspiciousValue
    })
    
    if (suspiciousProcedures.length > 0) {
      console.log(`\n⚠️ ATENÇÃO: ${suspiciousProcedures.length} procedimentos com dados suspeitos (podem ser inventados):`)
      suspiciousProcedures.slice(0, 5).forEach(p => {
        console.log(`   - ${p.code}: "${p.description}" (valor: ${p.value})`)
      })
      console.log(`   ℹ️ Estes procedimentos serão mantidos, mas revise manualmente`)
    }

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
 * Normalize text for pattern matching (uppercase, no accents)
 */
function normalizeText(text: string): string {
  if (!text) return ''
  return text
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .trim()
}

/**
 * Match extracted procedure with procedure_base_table (100% confidence only)
 * Returns base procedure ID if exact match found, null otherwise
 */
async function matchProcedureBase(
  procedure: any,
  clinicId: string
): Promise<{ baseId: string; isPericiable: boolean; adultsOnly: boolean } | null> {
  const client = await pool.connect()
  
  try {
    // Step 1: Try exact code match (100% confidence)
    if (procedure.code) {
      // Try clinic-specific first, then global
      const codeMatch = await client.query(
        `SELECT id, is_periciable, adults_only 
         FROM procedure_base_table 
         WHERE active = true 
           AND code = $1 
           AND (clinic_id = $2 OR clinic_id IS NULL)
         ORDER BY CASE WHEN clinic_id = $2 THEN 0 ELSE 1 END
         LIMIT 1`,
        [procedure.code, clinicId]
      )
      
      if (codeMatch.rows.length > 0) {
        const base = codeMatch.rows[0]
        console.log(`   ✅ Match por código exato: ${procedure.code} → ${base.id}`)
        return {
          baseId: base.id,
          isPericiable: base.is_periciable || false,
          adultsOnly: base.adults_only || false
        }
      }
    }
    
    // Step 2: Try exact description match (normalized, 100% confidence)
    if (procedure.description) {
      const normalizedDesc = normalizeText(procedure.description)
      
      // Get all active procedures for clinic (global + clinic-specific)
      const allBaseProcedures = await client.query(
        `SELECT id, description, is_periciable, adults_only, clinic_id
         FROM procedure_base_table 
         WHERE active = true 
           AND (clinic_id = $1 OR clinic_id IS NULL)
         ORDER BY CASE WHEN clinic_id = $1 THEN 0 ELSE 1 END`,
        [clinicId]
      )
      
      // Compare normalized descriptions
      for (const base of allBaseProcedures.rows) {
        const baseNormalized = normalizeText(base.description || '')
        if (baseNormalized === normalizedDesc) {
          console.log(`   ✅ Match por descrição exata: "${procedure.description}" → ${base.id}`)
          return {
            baseId: base.id,
            isPericiable: base.is_periciable || false,
            adultsOnly: base.adults_only || false
          }
        }
      }
    }
    
    // No match found (confidence < 100%)
    return null
  } catch (error) {
    console.error('Error matching procedure base:', error)
    return null
  } finally {
    client.release()
  }
}

/**
 * Extract keywords from text for pattern matching
 */
function extractKeywords(text: string): string[] {
  if (!text) return []
  
  const words = text
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3) // Only words longer than 3 chars
    .filter(w => !['para', 'com', 'sem', 'por', 'que', 'dos', 'das', 'uma', 'uns', 'uma', 'uns'].includes(w)) // Remove common words
    .map(w => w.replace(/[^\w]/g, '')) // Remove punctuation
    .filter(w => w.length > 0)
  
  return [...new Set(words)] // Remove duplicates
}

/**
 * Match procedure against learned patterns (0 cost)
 */
async function matchProcedurePattern(
  procedure: any,
  clinicId: string,
  providerId?: string
): Promise<any | null> {
  const client = await pool.connect()
  
  try {
    // Normalize description for matching
    const normalizedDesc = normalizeText(procedure.description || '')
    const keywords = extractKeywords(procedure.description || '')
    
    if (!procedure.code && keywords.length === 0) {
      return null
    }
    
    // Try exact code match first
    let query = `
      SELECT * FROM procedure_patterns
      WHERE clinic_id = $1
    `
    const params: any[] = [clinicId]
    let paramIndex = 2
    
    // Add code matching
    if (procedure.code) {
      query += ` AND (code_pattern = $${paramIndex} OR code_pattern LIKE $${paramIndex + 1})`
      params.push(procedure.code)
      params.push(procedure.code.substring(0, Math.max(4, procedure.code.length - 1)) + '%')
      paramIndex += 2
    }
    
    // Add description/keyword matching
    if (keywords.length > 0) {
      query += ` AND ($${paramIndex}::text[] && description_keywords OR description_normalized = $${paramIndex + 1})`
      params.push(keywords)
      params.push(normalizedDesc)
      paramIndex += 2
    }
    
    query += ` ORDER BY match_count DESC, confidence DESC LIMIT 1`
    
    const result = await client.query(query, params)
    
    if (result.rows.length > 0) {
      const pattern = result.rows[0]
      
      // Update match count
      await client.query(
        `UPDATE procedure_patterns
         SET match_count = match_count + 1,
             last_matched_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [pattern.id]
      )
      
      return pattern
    }
    
    return null
  } catch (error) {
    console.error('Error matching procedure pattern:', error)
    return null
  } finally {
    client.release()
  }
}

/**
 * Classify by keyword rules (0 cost)
 */
function classifyByKeywords(procedure: any): any {
  const desc = (procedure.description || '').toLowerCase()
  
  // Keywords for ADULTS_ONLY (high confidence)
  const ADULTS_ONLY_KEYWORDS = [
    'implante', 'implantes', 'implantologia', 'implantar',
    'prótese total', 'próteses totais', 'dentadura', 'dentaduras',
    'prótese parcial', 'próteses parciais',
    'facetas', 'lentes de contato dental', 'lentes de contato',
    'siso', 'dente do siso', 'terceiro molar', 'terceiros molares',
    'enxerto ósseo', 'enxerto gengival', 'enxertos',
    'cirurgia periodontal avançada', 'cirurgia periodontal',
    'reabilitação oral completa'
  ]
  
  // Keywords for PERICIÁVEL (high confidence)
  const PERICIABLE_KEYWORDS = [
    'implante', 'implantes', 'implantologia',
    'prótese total', 'próteses totais',
    'ortodontia completa', 'aparelho fixo completo',
    'facetas', 'lentes de contato',
    'clareamento profissional',
    'reabilitação oral completa',
    'enxerto ósseo', 'enxerto gengival',
    'cirurgia periodontal avançada'
  ]
  
  // Keywords for NOT PERICIÁVEL (high confidence)
  const NOT_PERICIABLE_KEYWORDS = [
    'consulta', 'exame', 'radiografia', 'radiografias',
    'limpeza', 'profilaxia', 'tartarectomia',
    'restauração simples', 'obturação', 'obturações',
    'extração simples', 'selante', 'selantes',
    'aplicação de flúor'
  ]
  
  // Check adults_only keywords
  const hasAdultsOnlyKeyword = ADULTS_ONLY_KEYWORDS.some(kw => desc.includes(kw))
  const adultsOnlyConfidence = hasAdultsOnlyKeyword ? 0.95 : 0
  
  // Check periciable keywords
  const hasPericiableKeyword = PERICIABLE_KEYWORDS.some(kw => desc.includes(kw))
  const hasNotPericiableKeyword = NOT_PERICIABLE_KEYWORDS.some(kw => desc.includes(kw))
  
  let isPericiable = false
  let periciableConfidence = 0
  let reasoning = ''
  
  if (hasPericiableKeyword && !hasNotPericiableKeyword) {
    isPericiable = true
    periciableConfidence = 0.9
    reasoning = 'Palavra-chave periciável encontrada'
  } else if (hasNotPericiableKeyword) {
    isPericiable = false
    periciableConfidence = 0.9
    reasoning = 'Palavra-chave não-periciável encontrada'
  } else {
    // Ambiguous - needs AI or pattern matching
    return {
      isPericiable: false,
      adultsOnly: false,
      aiPericiableConfidence: 0,
      aiAdultsOnlyConfidence: 0,
      confidence: 0,
      reasoning: 'Não encontrado em regras'
    }
  }
  
  return {
    isPericiable,
    adultsOnly: hasAdultsOnlyKeyword,
    aiPericiableConfidence: periciableConfidence,
    aiAdultsOnlyConfidence: adultsOnlyConfidence,
    confidence: Math.max(periciableConfidence, adultsOnlyConfidence),
    reasoning
  }
}

/**
 * Batch AI classification using cheaper model (GPT-3.5-turbo)
 */
async function classifyProceduresBatch(procedures: any[]): Promise<any[]> {
  if (!openai || procedures.length === 0) {
    return procedures.map(p => ({
      ...p,
      isPericiable: false,
      adultsOnly: false,
      aiPericiableConfidence: 0,
      aiAdultsOnlyConfidence: 0,
      reasoning: 'IA não disponível',
      source: 'fallback'
    }))
  }
  
  // Process in batches of 20 (GPT-3.5-turbo can handle more)
  const BATCH_SIZE = 20
  const allClassifications: any[] = []
  
  for (let i = 0; i < procedures.length; i += BATCH_SIZE) {
    const batch = procedures.slice(i, i + BATCH_SIZE)
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(procedures.length / BATCH_SIZE)
    
    console.log(`   🤖 Processando lote ${batchNumber}/${totalBatches} com IA (${batch.length} procedimentos)`)
    
    try {
      const prompt = `Classifique os seguintes procedimentos odontológicos.

Para cada procedimento, determine:
1. isPericiable: true se requer perícia/avaliação prévia, false caso contrário
2. adultsOnly: true se APENAS para adultos (certeza absoluta), false caso contrário
3. Confiança (0.0 a 1.0) para cada classificação

REGRAS:
- PERICIÁVEL: implantes, próteses totais, ortodontia completa, facetas, cirurgias complexas
- NÃO PERICIÁVEL: consultas, radiografias, limpezas, restaurações simples, extrações simples
- ADULTS_ONLY: implantes, próteses totais, facetas, dentes do siso, enxertos ósseos (certeza absoluta)
- NÃO ADULTS_ONLY: consultas, radiografias, restaurações, extrações, ortodontia (podem ser para crianças)

PROCEDIMENTOS:
${batch.map((p, idx) => `${idx + 1}. Código: ${p.code || 'N/A'}, Descrição: ${p.description || 'Sem descrição'}`).join('\n')}

Retorne JSON no formato:
{
  "classifications": [
    {"index": 0, "isPericiable": true, "periciableConfidence": 0.9, "adultsOnly": false, "adultsOnlyConfidence": 0.95, "reasoning": "..."},
    ...
  ]
}

IMPORTANTE: O array "classifications" DEVE ter exatamente ${batch.length} elementos, na mesma ordem.`

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Cheaper model
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em procedimentos odontológicos. Retorne apenas JSON válido sem markdown.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
        max_tokens: 3000 // Enough for 20 procedures
      })
      
      const content = response.choices[0].message.content
      if (!content) {
        throw new Error('Empty response from OpenAI')
      }
      
      // Parse JSON
      let jsonText = content.trim()
      jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
      
      const firstBrace = jsonText.indexOf('{')
      const lastBrace = jsonText.lastIndexOf('}')
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonText = jsonText.substring(firstBrace, lastBrace + 1)
      }
      
      const result = JSON.parse(jsonText)
      
      // Map results back to procedures
      batch.forEach((proc, idx) => {
        const classification = result.classifications?.find((c: any) => c.index === idx)
        allClassifications.push({
          ...proc,
          isPericiable: classification?.isPericiable || false,
          adultsOnly: classification?.adultsOnly || false,
          aiPericiableConfidence: classification?.periciableConfidence || 0,
          aiAdultsOnlyConfidence: classification?.adultsOnlyConfidence || 0,
          reasoning: classification?.reasoning || 'Classificação por IA em lote',
          source: 'ai_batch'
        })
      })
    } catch (error: any) {
      console.error(`   ⚠️ Erro no lote ${batchNumber}:`, error.message)
      // Fallback: add procedures without classification
      batch.forEach(proc => {
        allClassifications.push({
          ...proc,
          isPericiable: false,
          adultsOnly: false,
          aiPericiableConfidence: 0,
          aiAdultsOnlyConfidence: 0,
          reasoning: `Erro na classificação em lote: ${error.message}`,
          source: 'fallback'
        })
      })
    }
  }
  
  return allClassifications
}

/**
 * Classify procedures using hybrid approach: patterns -> rules -> AI (batch)
 */
async function classifyProceduresHybrid(
  extractedProcedures: any[],
  clinicId: string,
  providerId?: string
): Promise<any[]> {
  
  if (!extractedProcedures || extractedProcedures.length === 0) {
    return []
  }
  
  const classifiedProcedures: any[] = []
  const needsAI: any[] = []
  let patternMatches = 0
  let ruleMatches = 0
  
  console.log(`🔍 Classificando ${extractedProcedures.length} procedimentos com sistema híbrido`)
  
  // Step 1: Try to match against learned patterns (0 cost)
  for (const proc of extractedProcedures) {
    const patternMatch = await matchProcedurePattern(proc, clinicId, providerId)
    
    if (patternMatch && parseFloat(patternMatch.confidence) >= 0.8) {
      // High confidence pattern match - use it directly
      patternMatches++
      classifiedProcedures.push({
        ...proc,
        isPericiable: patternMatch.is_periciable,
        adultsOnly: patternMatch.adults_only,
        aiPericiableConfidence: parseFloat(patternMatch.confidence),
        aiAdultsOnlyConfidence: parseFloat(patternMatch.confidence),
        reasoning: `Padrão aprendido (${patternMatch.match_count}x confirmado)`,
        source: 'pattern'
      })
    } else {
      // Step 2: Try keyword-based rules (0 cost)
      const ruleMatch = classifyByKeywords(proc)
      
      if (ruleMatch.confidence >= 0.8) {
        ruleMatches++
        classifiedProcedures.push({
          ...proc,
          ...ruleMatch,
          reasoning: `Regra baseada em palavras-chave: ${ruleMatch.reasoning}`,
          source: 'rule'
        })
      } else {
        // Step 3: Needs AI classification (add to batch)
        needsAI.push(proc)
      }
    }
  }
  
  console.log(`   📊 Resultados da classificação híbrida:`)
  console.log(`   • ${patternMatches} classificados por padrões aprendidos (0 custo)`)
  console.log(`   • ${ruleMatches} classificados por regras de palavras-chave (0 custo)`)
  console.log(`   • ${needsAI.length} requerem análise por IA (custo reduzido)`)
  
  // Step 4: Batch AI classification for ambiguous cases only
  if (needsAI.length > 0) {
    const aiClassifications = await classifyProceduresBatch(needsAI)
    classifiedProcedures.push(...aiClassifications)
  }
  
  return classifiedProcedures
}

/**
 * Save learned pattern when procedure is approved
 */
async function saveProcedurePattern(
  procedure: any,
  clinicId: string,
  providerId: string | null,
  isPericiable: boolean,
  adultsOnly: boolean
) {
  const client = await pool.connect()
  
  try {
    const normalizedDesc = normalizeText(procedure.description || '')
    const keywords = extractKeywords(procedure.description || '')
    
    if (!procedure.code && keywords.length === 0) {
      return // Can't create pattern without code or keywords
    }
    
    // Check if pattern already exists
    const existing = await client.query(
      `SELECT * FROM procedure_patterns
       WHERE clinic_id = $1
         AND code_pattern = $2
         AND description_normalized = $3
       LIMIT 1`,
      [clinicId, procedure.code || '', normalizedDesc]
    )
    
    if (existing.rows.length > 0) {
      // Update existing pattern (increase confidence)
      await client.query(
        `UPDATE procedure_patterns
         SET match_count = match_count + 1,
             confidence = LEAST(1.0, confidence + 0.1),
             is_periciable = $1,
             adults_only = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [isPericiable, adultsOnly, existing.rows[0].id]
      )
    } else {
      // Create new pattern
      const patternId = uuidv4()
      await client.query(
        `INSERT INTO procedure_patterns (
          id, clinic_id, insurance_provider_id, code_pattern,
          description_keywords, description_normalized,
          is_periciable, adults_only, confidence, match_count
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1)`,
        [
          patternId,
          clinicId,
          providerId,
          procedure.code || null,
          keywords.length > 0 ? keywords : null,
          normalizedDesc || null,
          isPericiable,
          adultsOnly,
          0.8 // Initial confidence
        ]
      )
    }
  } catch (error) {
    console.error('Error saving procedure pattern:', error)
    // Don't throw - pattern saving is not critical
  } finally {
    client.release()
  }
}

/**
 * Classify a single procedure with deep analysis
 * This provides better accuracy than batch processing
 */
async function classifySingleProcedure(procedure: any): Promise<any> {
  if (!openai) {
    return {
      ...procedure,
      isPericiable: false,
      adultsOnly: false,
      aiPericiableConfidence: 0,
      aiAdultsOnlyConfidence: 0,
      reasoning: 'OpenAI not configured'
    }
  }

  const prompt = `Você é um especialista em procedimentos odontológicos, perícias dentárias e odontopediatria.

Sua tarefa é ANALISAR PROFUNDAMENTE este procedimento odontológico e classificá-lo em duas categorias críticas:

**PROCEDIMENTO A ANALISAR:**
- Código: ${procedure.code}
- Descrição: ${procedure.description || 'Sem descrição'}
- Valor: ${procedure.value ? `€${procedure.value}` : 'Não informado'}

---

## 1. PERICIÁVEL (requer perícia/avaliação prévia pela seguradora)

**SIM (true)** - Procedimentos que TIPICAMENTE requerem perícia:
- Procedimentos complexos e caros (ex: implantes, próteses totais, ortodontia completa)
- Procedimentos estéticos (ex: facetas, clareamento profissional, lentes de contato)
- Cirurgias complexas (ex: enxertos ósseos, cirurgias periodontais avançadas, extrações de dentes do siso impactados)
- Reabilitações orais completas
- Procedimentos que envolvem múltiplas sessões e alto custo

**NÃO (false)** - Procedimentos que NÃO requerem perícia:
- Consultas e exames de rotina
- Procedimentos preventivos (ex: limpezas, aplicação de flúor)
- Procedimentos diagnósticos simples (ex: radiografias periapicais, panorâmicas)
- Procedimentos restauradores simples (ex: restaurações diretas, obturações)
- Extrações simples de dentes permanentes ou decíduos
- Tratamentos endodônticos simples (ex: tratamento de canal de dente anterior)
- Procedimentos emergenciais básicos

---

## 2. ADULTS_ONLY (apenas para adultos - NUNCA para crianças)

⚠️ **CRÍTICO**: Analise com EXTREMA ATENÇÃO. Alguns procedimentos JAMAIS podem ser realizados em crianças.

**SIM (true)** - Procedimentos EXCLUSIVOS para adultos:
- **Implantes dentários** - Impossível em crianças (dentes permanentes ainda não formados)
- **Próteses totais ou parciais** - Crianças não perdem todos os dentes
- **Próteses fixas complexas** - Não aplicável a dentes decíduos
- **Tratamentos periodontais avançados** (ex: enxertos gengivais, cirurgias periodontais) - Doenças periodontais avançadas são raras em crianças
- **Facetas e lentes de contato dentais** - Estética que não se aplica a dentes decíduos
- **Clareamento profissional intensivo** - Dentes decíduos não são clareados
- **Cirurgias de dentes do siso** - Dentes do siso só aparecem na adolescência tardia/idade adulta
- **Reabilitações orais completas** - Não aplicável a crianças
- **Procedimentos relacionados a próteses sobre implantes** - Implantes não são para crianças

**NÃO (false)** - Procedimentos que PODEM ser realizados em qualquer idade:
- Consultas odontológicas (podem ser pediátricas)
- Radiografias (comuns em odontopediatria)
- Limpezas e profilaxias (essenciais para crianças)
- Restaurações e obturações (muito comuns em crianças)
- Extrações (tanto de dentes decíduos quanto permanentes)
- Tratamentos endodônticos (podem ser em dentes decíduos ou permanentes jovens)
- Ortodontia (muito comum em crianças e adolescentes)
- Aplicação de selantes (específico para crianças)
- Tratamento de cáries (muito comum em crianças)
- Pulpotomias e pulpectomias (específicas para dentes decíduos)

---

## INSTRUÇÕES DE ANÁLISE:

1. **Leia a descrição COMPLETAMENTE** - Não faça suposições baseadas apenas no código
2. **Considere o contexto odontológico** - Use seu conhecimento sobre odontologia
3. **Seja CONSERVADOR com ADULTS_ONLY**:
   - Se houver QUALQUER dúvida se pode ser feito em criança, marque como FALSE
   - Apenas marque TRUE se tiver CERTEZA ABSOLUTA que é impossível para crianças
   - Exemplos de certeza: "implante", "prótese total", "facetas", "lentes de contato"
4. **Seja REALISTA com PERICIÁVEL**:
   - Considere o valor do procedimento (procedimentos muito caros geralmente requerem perícia)
   - Considere a complexidade (procedimentos simples não requerem perícia)
5. **Atribua scores de confiança** (0.0 a 1.0):
   - 0.95-1.0: Certeza absoluta (ex: "implante" = adults_only true, confiança 1.0)
   - 0.80-0.94: Alta confiança (ex: "prótese total" = adults_only true, confiança 0.95)
   - 0.70-0.79: Confiança média (ainda aceitável, mas pode precisar revisão)
   - 0.50-0.69: Baixa confiança (requer revisão manual)
   - <0.50: Incerto (requer revisão manual obrigatória)

---

**RETORNE APENAS JSON PURO** (sem markdown, sem comentários, sem explicações adicionais) no formato:

{
  "isPericiable": true/false,
  "periciableConfidence": 0.95,
  "adultsOnly": true/false,
  "adultsOnlyConfidence": 0.90,
  "reasoning": "Breve explicação do raciocínio (máximo 100 caracteres)"
}

**IMPORTANTE**: 
- Se a descrição for muito genérica ou ambígua, use confiança baixa (<0.7)
- Se não conseguir determinar com certeza, marque como false e use confiança baixa
- O campo "reasoning" deve ser conciso e explicar o raciocínio`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em classificação de procedimentos odontológicos. Sempre retorne JSON válido sem markdown. Seja extremamente cuidadoso ao classificar procedimentos como "adults_only" - apenas marque como true se tiver certeza absoluta que é impossível para crianças.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1, // Low temperature for consistency
      response_format: { type: 'json_object' },
      max_tokens: 500
    })

    const content = response.choices[0].message.content
    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    // Parse and clean JSON
    let jsonText = content.trim()
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    
    // Extract JSON object
    const firstBrace = jsonText.indexOf('{')
    const lastBrace = jsonText.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonText = jsonText.substring(firstBrace, lastBrace + 1)
    }

    const result = JSON.parse(jsonText)

    return {
      ...procedure,
      isPericiable: result.isPericiable || false,
      adultsOnly: result.adultsOnly || false,
      aiPericiableConfidence: result.periciableConfidence || 0,
      aiAdultsOnlyConfidence: result.adultsOnlyConfidence || 0,
      reasoning: result.reasoning || 'Classificação automática por IA'
    }
  } catch (error: any) {
    console.error(`   ⚠️ Erro ao classificar procedimento ${procedure.code}:`, error.message)
    // Fallback: return procedure without classification
    return {
      ...procedure,
      isPericiable: false,
      adultsOnly: false,
      aiPericiableConfidence: 0,
      aiAdultsOnlyConfidence: 0,
      reasoning: `Erro na classificação: ${error.message || 'Unknown error'}`
    }
  }
}

/**
 * Classify procedures individually for deeper analysis
 * This provides better accuracy than batch processing
 */
async function classifyProceduresIndividually(extractedProcedures: any[]): Promise<any[]> {
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
    console.log(`🔍 Classificando ${extractedProcedures.length} procedimentos individualmente (análise profunda)`)

    const classifiedProcedures: any[] = []
    let processedCount = 0

    // Process each procedure individually for deeper analysis
    for (const proc of extractedProcedures) {
      processedCount++
      const progress = ((processedCount / extractedProcedures.length) * 100).toFixed(1)
      
      if (processedCount % 10 === 0 || processedCount === 1) {
        console.log(`   📊 Progresso: ${processedCount}/${extractedProcedures.length} (${progress}%)`)
      }

      try {
        const classification = await classifySingleProcedure(proc)
        classifiedProcedures.push(classification)
      } catch (error: any) {
        console.error(`   ⚠️ Erro ao classificar procedimento ${proc.code}:`, error.message)
        // Fallback: add procedure without classification
        classifiedProcedures.push({
          ...proc,
          isPericiable: false,
          adultsOnly: false,
          aiPericiableConfidence: 0,
          aiAdultsOnlyConfidence: 0,
          reasoning: `Erro na classificação: ${error.message}`
        })
      }

      // Small delay to avoid rate limiting
      if (processedCount % 20 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    console.log(`✅ IA classificou todos os ${classifiedProcedures.length} procedimentos individualmente`)

    // Log statistics
    const periciableCount = classifiedProcedures.filter(p => p.isPericiable).length
    const adultsOnlyCount = classifiedProcedures.filter(p => p.adultsOnly).length
    const highConfidenceCount = classifiedProcedures.filter(p =>
      p.aiPericiableConfidence >= 0.8 && p.aiAdultsOnlyConfidence >= 0.8
    ).length
    const needsReviewCount = classifiedProcedures.filter(p =>
      p.aiPericiableConfidence < 0.7 || p.aiAdultsOnlyConfidence < 0.7
    ).length

    console.log('📊 Resultados da classificação individual:')
    console.log(`   • ${periciableCount} procedimentos PERICIÁVEIS`)
    console.log(`   • ${adultsOnlyCount} procedimentos ADULTS ONLY`)
    console.log(`   • ${highConfidenceCount} com alta confiança (≥80%)`)
    console.log(`   • ${needsReviewCount} requerem revisão manual (<70%)`)

    return classifiedProcedures

  } catch (error) {
    console.error('❌ Erro na classificação individual:', error)
    throw error
  }
}

/**
 * Classify procedures for a document in background
 */
async function classifyProceduresForDocument(documentId: string, procedures: any[]) {
  const client = await pool.connect()
  
  try {
    // Check if mappings already exist
    const existing = await client.query(
      'SELECT COUNT(*) as count FROM procedure_mappings WHERE document_id = $1',
      [documentId]
    )
    
    if (parseInt(existing.rows[0].count) > 0) {
      console.log(`   ℹ️ Pareamento já existe para documento ${documentId}`)
      return
    }

    console.log(`   🔄 Iniciando classificação em background para ${procedures.length} procedimentos...`)
    
    // Get provider and clinic IDs for pattern matching
    const docResult = await client.query(
      'SELECT insurance_provider_id FROM insurance_provider_documents WHERE id = $1',
      [documentId]
    )
    
    let clinicId: string | null = null
    let providerId: string | null = null
    
    if (docResult.rows.length > 0) {
      providerId = docResult.rows[0].insurance_provider_id
      if (providerId) {
        const providerResult = await client.query(
          'SELECT clinic_id FROM insurance_providers WHERE id = $1',
          [providerId]
        )
        if (providerResult.rows.length > 0) {
          clinicId = providerResult.rows[0].clinic_id
        }
      }
    }
    
    // Use hybrid approach if we have clinicId, otherwise fallback to individual
    const classifiedProcedures = clinicId
      ? await classifyProceduresHybrid(procedures, clinicId, providerId || undefined)
      : await classifyProceduresIndividually(procedures)
    
    // Create mappings
    await client.query('BEGIN')
    
    for (const proc of classifiedProcedures) {
      const mappingId = uuidv4()
      const periciableConfidence = proc.aiPericiableConfidence || 0
      const adultsOnlyConfidence = proc.aiAdultsOnlyConfidence || 0
      const avgConfidence = (periciableConfidence + adultsOnlyConfidence) / 2
      const needsManualReview = avgConfidence < 0.7
      
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
          null,
          avgConfidence,
          needsManualReview ? 'MANUAL' : 'PENDING',
          proc.reasoning || null
        ]
      )
    }
    
    await client.query('COMMIT')
    console.log(`   ✅ Classificação em background concluída: ${classifiedProcedures.length} procedimentos`)
    
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('   ❌ Erro na classificação em background:', error)
  } finally {
    client.release()
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
 * POST /api/insurance/documents/:documentId/procedures/save-to-base
 * Save an extracted procedure to procedure_base_table (with dual learning)
 */
router.post('/documents/:documentId/procedures/save-to-base', authRequired, async (req, res) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const { documentId } = req.params
    const { procedureIndex, code, description, value, isPericiable, adultsOnly, saveAsGlobal } = req.body
    
    if (!code || !description) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Código e descrição são obrigatórios' })
    }
    
    // Get document to find clinic_id and provider_id
    const docResult = await client.query(
      `SELECT insurance_provider_id FROM insurance_provider_documents WHERE id = $1`,
      [documentId]
    )
    
    if (docResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Documento não encontrado' })
    }
    
    const providerId = docResult.rows[0].insurance_provider_id
    
    // Get clinic_id from provider
    const providerResult = await client.query(
      'SELECT clinic_id FROM insurance_providers WHERE id = $1',
      [providerId]
    )
    const clinicId = providerResult.rows.length > 0 ? providerResult.rows[0].clinic_id : null
    
    // Check if procedure already exists in base table
    const existingQuery = saveAsGlobal
      ? 'SELECT id FROM procedure_base_table WHERE clinic_id IS NULL AND code = $1'
      : 'SELECT id FROM procedure_base_table WHERE clinic_id = $1 AND code = $2'
    
    const existingParams = saveAsGlobal ? [code] : [clinicId, code]
    const existingResult = await client.query(existingQuery, existingParams)
    
    let baseProcedureId: string
    
    if (existingResult.rows.length > 0) {
      // Update existing procedure
      baseProcedureId = existingResult.rows[0].id
      await client.query(
        `UPDATE procedure_base_table
         SET description = $1, is_periciable = $2, adults_only = $3, default_value = $4, updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [description, isPericiable || false, adultsOnly || false, value || null, baseProcedureId]
      )
    } else {
      // Create new procedure in base table
      baseProcedureId = uuidv4()
      await client.query(
        `INSERT INTO procedure_base_table (
          id, clinic_id, code, description, is_periciable, adults_only, default_value, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [
          baseProcedureId,
          saveAsGlobal ? null : clinicId,
          code,
          description,
          isPericiable || false,
          adultsOnly || false,
          value || null
        ]
      )
    }
    
    // DUAL LEARNING: Save pattern learned for future AI classification (0 cost)
    if (clinicId) {
      await saveProcedurePattern(
        {
          code,
          description
        },
        clinicId,
        providerId,
        isPericiable || false,
        adultsOnly || false
      )
    }
    
    // Update extracted_data to mark this procedure as saved
    const docDataResult = await client.query(
      'SELECT extracted_data FROM insurance_provider_documents WHERE id = $1',
      [documentId]
    )
    
    if (docDataResult.rows.length > 0) {
      const extractedData = docDataResult.rows[0].extracted_data || {}
      const procedures = extractedData.procedures || []
      
      if (procedures[procedureIndex]) {
        procedures[procedureIndex].savedToBase = true
        procedures[procedureIndex].baseId = baseProcedureId
        procedures[procedureIndex].isPericiable = isPericiable || false
        procedures[procedureIndex].adultsOnly = adultsOnly || false
        
        await client.query(
          'UPDATE insurance_provider_documents SET extracted_data = $1 WHERE id = $2',
          [JSON.stringify(extractedData), documentId]
        )
      }
    }
    
    await client.query('COMMIT')
    
    console.log(`✅ Procedimento salvo na tabela base: ${code} (${baseProcedureId})`)
    console.log(`   💾 Padrão aprendido também salvo para classificação futura`)
    
    res.json({
      success: true,
      baseProcedureId,
      message: 'Procedimento salvo na tabela base e padrão aprendido registrado'
    })
    
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Error saving procedure to base table:', error)
    
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Código de procedimento já existe na tabela base' })
    }
    
    res.status(500).json({ error: 'Erro ao salvar procedimento na tabela base' })
  } finally {
    client.release()
  }
})

/**
 * GET /api/insurance/procedures/base
 * Get procedures from base table (for matching/checking)
 */
router.get('/procedures/base', authRequired, async (req, res) => {
  try {
    const { clinicId, code } = req.query
    
    let query = 'SELECT id, code, description, is_periciable, adults_only, default_value FROM procedure_base_table WHERE active = true'
    const params: any[] = []
    
    if (clinicId) {
      query += ' AND (clinic_id = $1 OR clinic_id IS NULL)'
      params.push(clinicId)
    } else {
      query += ' AND clinic_id IS NULL'
    }
    
    if (code) {
      query += ` AND code = $${params.length + 1}`
      params.push(code)
    }
    
    query += ' ORDER BY code'
    
    const result = await pool.query(query, params)
    
    res.json(result.rows.map(row => ({
      id: row.id,
      code: row.code,
      description: row.description,
      isPericiable: row.is_periciable,
      adultsOnly: row.adults_only || false,
      defaultValue: row.default_value ? parseFloat(row.default_value) : null
    })))
  } catch (error) {
    console.error('Error fetching base procedures:', error)
    res.status(500).json({ error: 'Erro ao buscar procedimentos da tabela base' })
  }
})

/**
 * GET /api/insurance/:providerId/procedure-counts
 * Get approved and unapproved procedure counts for an insurance provider
 */
router.get('/:providerId/procedure-counts', authRequired, async (req, res) => {
  const client = await pool.connect()
  
  try {
    const { providerId } = req.params
    
    // Count approved procedures (those in insurance_provider_procedures)
    const approvedResult = await client.query(
      `SELECT COUNT(*) as count 
       FROM insurance_provider_procedures 
       WHERE insurance_provider_id = $1 AND active = true`,
      [providerId]
    )
    const approvedCount = parseInt(approvedResult.rows[0]?.count || '0', 10)
    
    // Count unapproved procedures (those in procedure_mappings with status != 'APPROVED' or unparied)
    // Get all documents for this provider
    const documentsResult = await client.query(
      `SELECT id, extracted_data 
       FROM insurance_provider_documents 
       WHERE insurance_provider_id = $1`,
      [providerId]
    )
    
    let unapprovedCount = 0
    
    for (const doc of documentsResult.rows) {
      // Count mappings that are not approved
      const mappingsResult = await client.query(
        `SELECT COUNT(*) as count 
         FROM procedure_mappings 
         WHERE document_id = $1 AND status != 'APPROVED' AND status != 'REJECTED'`,
        [doc.id]
      )
      unapprovedCount += parseInt(mappingsResult.rows[0]?.count || '0', 10)
      
      // Count unparied procedures (in extracted_data but not in mappings)
      if (doc.extracted_data?.procedures) {
        const extractedCodes = doc.extracted_data.procedures.map((p: any) => p.code)
        if (extractedCodes.length > 0) {
          const existingMappingsResult = await client.query(
            `SELECT extracted_procedure_code 
             FROM procedure_mappings 
             WHERE document_id = $1`,
            [doc.id]
          )
          const mappedCodes = new Set(existingMappingsResult.rows.map((r: any) => r.extracted_procedure_code))
          const unpariedCodes = extractedCodes.filter((code: string) => !mappedCodes.has(code))
          unapprovedCount += unpariedCodes.length
        }
      }
    }
    
    res.json({
      approved: approvedCount,
      unapproved: unapprovedCount,
      total: approvedCount + unapprovedCount
    })
  } catch (error: any) {
    console.error('Error loading procedure counts:', error)
    res.status(500).json({ 
      error: 'Erro ao carregar contagens de procedimentos',
      approved: 0,
      unapproved: 0,
      total: 0
    })
  } finally {
    client.release()
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
 * POST /api/insurance/documents/:documentId/classify
 * Classify and create procedure mappings for extracted procedures
 */
router.post('/documents/:documentId/classify', authRequired, async (req, res) => {
  const client = await pool.connect()

  try {
    const { documentId } = req.params

    // Get document and extracted data
    const docResult = await client.query(
      `SELECT id, insurance_provider_id, extracted_data, processing_status
       FROM insurance_provider_documents
       WHERE id = $1`,
      [documentId]
    )

    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Documento não encontrado' })
    }

    const doc = docResult.rows[0]
    const extractedData = doc.extracted_data || {}
    const procedures = extractedData.procedures || []

    if (procedures.length === 0) {
      return res.status(400).json({ error: 'Nenhum procedimento encontrado no documento' })
    }

    // Get provider ID for pattern matching
    const providerId = doc.insurance_provider_id
    if (!providerId) {
      return res.status(400).json({ error: 'Documento não possui operadora associada' })
    }

    // Check if mappings already exist
    const existingMappings = await client.query(
      'SELECT COUNT(*) as count FROM procedure_mappings WHERE document_id = $1',
      [documentId]
    )

    if (parseInt(existingMappings.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Pareamento já foi realizado para este documento' })
    }

    console.log(`🔍 Iniciando classificação de ${procedures.length} procedimentos para documento ${documentId}`)

    // Get clinic ID from provider
    let clinicId: string | null = null
    const providerResult = await client.query(
      'SELECT clinic_id FROM insurance_providers WHERE id = $1',
      [providerId]
    )
    if (providerResult.rows.length > 0) {
      clinicId = providerResult.rows[0].clinic_id
    }

    // Classify procedures using hybrid approach (patterns -> rules -> AI batch)
    const classifiedProcedures = clinicId 
      ? await classifyProceduresHybrid(procedures, clinicId, providerId)
      : await classifyProceduresIndividually(procedures) // Fallback if no clinicId

    // Create procedure mappings and auto-approve those classified by AI
    let autoClassifiedCount = 0
    let manualCount = 0
    let highConfidenceCount = 0
    let autoApprovedCount = 0
    let notClassifiedCount = 0

    await client.query('BEGIN')

    const mappingIds: string[] = []

    for (const proc of classifiedProcedures) {
      const mappingId = uuidv4()
      mappingIds.push(mappingId)

      const periciableConfidence = proc.aiPericiableConfidence || 0
      const adultsOnlyConfidence = proc.aiAdultsOnlyConfidence || 0
      const avgConfidence = (periciableConfidence + adultsOnlyConfidence) / 2

      const isHighConfidence = avgConfidence >= 0.8
      const needsManualReview = avgConfidence < 0.7
      
      // Check if procedure was classified by AI (has any confidence > 0)
      const hasAIClassification = periciableConfidence > 0 || adultsOnlyConfidence > 0

      if (isHighConfidence) {
        highConfidenceCount++
        autoClassifiedCount++
      } else if (!needsManualReview) {
        autoClassifiedCount++
      } else {
        manualCount++
      }

      if (!hasAIClassification) {
        notClassifiedCount++
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
          hasAIClassification ? 'PENDING' : 'MANUAL', // Will be APPROVED if has AI classification
          proc.reasoning || null
        ]
      )
    }

    // Auto-approve procedures that were classified by AI
    const mappingsToApprove = await client.query(
      `SELECT id, extracted_procedure_code, extracted_description, extracted_is_periciable, 
              extracted_adults_only, extracted_value
       FROM procedure_mappings
       WHERE document_id = $1 
         AND (ai_periciable_confidence > 0 OR ai_adults_only_confidence > 0)
         AND status = 'PENDING'`,
      [documentId]
    )

    for (const mapping of mappingsToApprove.rows) {
      const procedureId = uuidv4()
      
      // Create insurance provider procedure
      await client.query(
        `INSERT INTO insurance_provider_procedures (
          id, insurance_provider_id, procedure_base_id, provider_code,
          provider_description, is_periciable, max_value, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [
          procedureId,
          providerId,
          null, // No automatic pairing with procedure_base
          mapping.extracted_procedure_code,
          mapping.extracted_description,
          mapping.extracted_is_periciable || false,
          mapping.extracted_value || null
        ]
      )

      // Update mapping status to APPROVED
      await client.query(
        `UPDATE procedure_mappings
         SET status = 'APPROVED',
             mapped_provider_procedure_id = $1,
             reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [procedureId, mapping.id]
      )

      // Save learned pattern for future use (0 cost classification)
      if (clinicId) {
        saveProcedurePattern(
          {
            code: mapping.extracted_procedure_code,
            description: mapping.extracted_description
          },
          clinicId,
          providerId,
          mapping.extracted_is_periciable || false,
          mapping.extracted_adults_only || false
        ).catch(err => {
          console.error('Error saving procedure pattern:', err)
          // Don't fail if pattern saving fails
        })
      }

      autoApprovedCount++
    }

    await client.query('COMMIT')

    console.log(`✅ ${classifiedProcedures.length} procedimentos classificados e salvos:`)
    console.log(`   • ${highConfidenceCount} com alta confiança (≥80%)`)
    console.log(`   • ${autoClassifiedCount - highConfidenceCount} com confiança média (70-79%)`)
    console.log(`   • ${autoApprovedCount} aprovados automaticamente (classificados pela IA)`)
    console.log(`   • ${notClassifiedCount} não classificados pela IA (requerem revisão manual)`)

    res.json({
      success: true,
      total: classifiedProcedures.length,
      highConfidence: highConfidenceCount,
      mediumConfidence: autoClassifiedCount - highConfidenceCount,
      autoApproved: autoApprovedCount,
      needsReview: notClassifiedCount,
      message: `Classificação concluída: ${classifiedProcedures.length} procedimentos processados. ${autoApprovedCount} aprovados automaticamente.`
    })

  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('Error classifying procedures:', error)
    res.status(500).json({ 
      error: 'Erro ao classificar procedimentos',
      details: error.message 
    })
  } finally {
    client.release()
  }
})

/**
 * GET /api/insurance/documents/:documentId/mappings
 * Get procedure mappings for a document
 * Includes both existing mappings and unparied procedures from extracted_data
 */
router.get('/documents/:documentId/mappings', authRequired, async (req, res) => {
  try {
    const { documentId } = req.params
    console.log(`📥 Fetching mappings for document: ${documentId}`)

    // Get existing procedure mappings
    const mappingsResult = await pool.query(
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

    // Get extracted procedures from document
    const docResult = await pool.query(
      `SELECT extracted_data FROM insurance_provider_documents WHERE id = $1`,
      [documentId]
    )

    const existingMappings = mappingsResult.rows
    const extractedProcedures = docResult.rows[0]?.extracted_data?.procedures || []

    // Create a map of existing mappings by code for quick lookup
    const mappingsByCode = new Map()
    existingMappings.forEach(m => {
      mappingsByCode.set(m.extracted_procedure_code, m)
    })

    // Find unparied procedures (in extracted_data but not in procedure_mappings)
    const unpariedProcedures: any[] = []
    extractedProcedures.forEach((proc: any) => {
      if (!mappingsByCode.has(proc.code)) {
        // Create virtual mapping for unparied procedure
        unpariedProcedures.push({
          id: `unpaired-${proc.code}`, // Virtual ID
          document_id: documentId,
          extracted_procedure_code: proc.code,
          extracted_description: proc.description || '',
          extracted_is_periciable: proc.isPericiable || false,
          extracted_adults_only: proc.adultsOnly || false,
          extracted_value: proc.value || null,
          mapped_procedure_base_id: null,
          confidence_score: 0,
          ai_periciable_confidence: 0,
          ai_adults_only_confidence: 0,
          status: 'UNPAIRED', // New status for unparied procedures
          reviewed_by: null,
          reviewed_at: null,
          notes: null,
          base_code: null,
          base_description: null,
          base_is_periciable: null,
          base_adults_only: null,
          reviewed_by_name: null,
          is_unpaired: true // Flag to identify virtual mappings
        })
      }
    })

    // Combine existing mappings with unparied procedures
    const allMappings = [...existingMappings, ...unpariedProcedures]

    // Ensure extracted_adults_only is included (for older records it might be null)
    allMappings.forEach(row => {
      if (row.extracted_adults_only === null || row.extracted_adults_only === undefined) {
        // If not set, use the base procedure's adults_only if mapped, otherwise default to false
        row.extracted_adults_only = row.base_adults_only || false
      }
    })

    // Sort by code
    allMappings.sort((a, b) => {
      const codeA = a.extracted_procedure_code || ''
      const codeB = b.extracted_procedure_code || ''
      return codeA.localeCompare(codeB)
    })

    console.log(`✅ Found ${existingMappings.length} mappings and ${unpariedProcedures.length} unparied procedures for document ${documentId}`)

    res.json(allMappings)
  } catch (error) {
    console.error('❌ Error fetching mappings:', error)
    res.status(500).json({ error: 'Erro ao buscar mapeamentos' })
  }
})

/**
 * POST /api/insurance/documents/:documentId/mappings/create
 * Create a procedure mapping for an unparied procedure
 */
router.post('/documents/:documentId/mappings/create', authRequired, async (req, res) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const { documentId } = req.params
    const { code, description, value, isPericiable, adultsOnly } = req.body
    
    if (!code || !description) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Código e descrição são obrigatórios' })
    }
    
    // Check if mapping already exists
    const existing = await client.query(
      'SELECT id FROM procedure_mappings WHERE document_id = $1 AND extracted_procedure_code = $2',
      [documentId, code]
    )
    
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK')
      return res.status(409).json({ error: 'Mapeamento já existe para este procedimento' })
    }
    
    // Create new mapping
    const mappingId = uuidv4()
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
        code,
        description,
        isPericiable || false,
        adultsOnly || false,
        value || null,
        0, // No AI confidence yet
        0, // No AI confidence yet
        null, // No base procedure mapping yet
        0, // No confidence score yet
        'MANUAL', // Manual pairing
        'Pareamento manual'
      ]
    )
    
    await client.query('COMMIT')
    
    console.log(`✅ Mapping criado para procedimento não pareado: ${code} (${mappingId})`)
    
    res.json({
      success: true,
      mappingId,
      message: 'Mapeamento criado com sucesso'
    })
    
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Error creating mapping:', error)
    res.status(500).json({ error: 'Erro ao criar mapeamento' })
  } finally {
    client.release()
  }
})

/**
 * POST /api/insurance/documents/:documentId/mappings/bulk-approve
 * Approve multiple procedure mappings in batch
 */
router.post('/documents/:documentId/mappings/bulk-approve', authRequired, async (req, res) => {
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    const { documentId } = req.params
    const { mappingIds, providerId, changes } = req.body
    
    if (!Array.isArray(mappingIds) || mappingIds.length === 0) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Lista de IDs de mapeamento é obrigatória' })
    }
    
    if (!providerId) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'providerId é obrigatório' })
    }
    
    // Get clinic ID from provider
    const clinicResult = await client.query(
      'SELECT clinic_id FROM insurance_providers WHERE id = $1',
      [providerId]
    )
    
    if (clinicResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Operadora não encontrada' })
    }
    
    const clinicId = clinicResult.rows[0]?.clinic_id
    
    // Get all mappings (including virtual unparied ones)
    const allMappingsResult = await client.query(
      `SELECT * FROM procedure_mappings 
       WHERE document_id = $1`,
      [documentId]
    )
    
    // Also get extracted procedures for unparied ones
    const docResult = await client.query(
      'SELECT extracted_data, insurance_provider_id FROM insurance_provider_documents WHERE id = $1',
      [documentId]
    )
    
    // Validação: verificar se o documento existe
    if (docResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Documento não encontrado' })
    }
    
    // Validação: verificar se o documento pertence à operadora
    if (docResult.rows[0].insurance_provider_id !== providerId) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Documento não pertence à operadora especificada' })
    }
    
    const extractedProcedures = docResult.rows[0]?.extracted_data?.procedures || []
    const mappingsByCode = new Map(allMappingsResult.rows.map((m: any) => [m.extracted_procedure_code, m]))
    
    // Build complete mapping list including virtual unparied
    const allMappings: any[] = [...allMappingsResult.rows]
    extractedProcedures.forEach((proc: any) => {
      if (!mappingsByCode.has(proc.code)) {
        allMappings.push({
          id: `unpaired-${proc.code}`,
          document_id: documentId,
          extracted_procedure_code: proc.code,
          extracted_description: proc.description || '',
          extracted_is_periciable: proc.isPericiable || false,
          extracted_adults_only: proc.adultsOnly || false,
          extracted_value: proc.value || null,
          mapped_procedure_base_id: null,
          confidence_score: 0,
          status: 'UNPAIRED',
          is_unpaired: true
        })
      }
    })
    
    // Filter to only requested mappings
    const requestedMappings = allMappings.filter(m => mappingIds.includes(m.id))
    
    if (requestedMappings.length !== mappingIds.length) {
      console.warn(`⚠️ Alguns mapeamentos não foram encontrados. Esperado: ${mappingIds.length}, Encontrado: ${requestedMappings.length}`)
    }
    
    let approvedCount = 0
    const procedureIds: string[] = []
    
    for (const mapping of requestedMappings) {
      // Skip already approved or rejected
      if (mapping.status === 'APPROVED' || mapping.status === 'REJECTED') {
        continue
      }
      
      // Apply bulk changes if provided
      let finalIsPericiable = mapping.extracted_is_periciable
      let finalAdultsOnly = mapping.extracted_adults_only ?? false
      
      if (changes && changes[mapping.id]) {
        if (changes[mapping.id].isPericiable !== undefined) {
          finalIsPericiable = changes[mapping.id].isPericiable
        }
        if (changes[mapping.id].adultsOnly !== undefined) {
          finalAdultsOnly = changes[mapping.id].adultsOnly
        }
      }
      
      // Handle unparied procedures - create mapping first
      let actualMappingId = mapping.id
      if (mapping.is_unpaired || mapping.id.startsWith('unpaired-')) {
        // Check if mapping already exists
        const existingCheck = await client.query(
          'SELECT id FROM procedure_mappings WHERE document_id = $1 AND extracted_procedure_code = $2',
          [documentId, mapping.extracted_procedure_code]
        )
        
        if (existingCheck.rows.length === 0) {
          // Create real mapping
          actualMappingId = uuidv4()
          await client.query(
            `INSERT INTO procedure_mappings (
              id, document_id, extracted_procedure_code, extracted_description,
              extracted_is_periciable, extracted_adults_only, extracted_value,
              ai_periciable_confidence, ai_adults_only_confidence,
              mapped_procedure_base_id, confidence_score, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [
              actualMappingId,
              documentId,
              mapping.extracted_procedure_code,
              mapping.extracted_description,
              finalIsPericiable,
              finalAdultsOnly,
              mapping.extracted_value,
              0, 0, null, 0, 'MANUAL', 'Pareamento manual em bloco'
            ]
          )
        } else {
          actualMappingId = existingCheck.rows[0].id
        }
      } else {
        // Update existing mapping with new values if changes provided
        if (changes && changes[mapping.id]) {
          await client.query(
            `UPDATE procedure_mappings
             SET extracted_is_periciable = $1, extracted_adults_only = $2
             WHERE id = $3`,
            [finalIsPericiable, finalAdultsOnly, actualMappingId]
          )
        }
      }
      
      // Get updated mapping
      const updatedMappingResult = await client.query(
        'SELECT * FROM procedure_mappings WHERE id = $1',
        [actualMappingId]
      )
      
      if (updatedMappingResult.rows.length === 0) {
        console.warn(`⚠️ Mapping não encontrado após criação: ${actualMappingId}`)
        continue
      }
      
      const updatedMapping = updatedMappingResult.rows[0]
      
      // Save to procedure_base_table if not already there
      let baseProcedureId = updatedMapping.mapped_procedure_base_id
      if (clinicId && !baseProcedureId) {
        const normalizedDesc = normalizeText(updatedMapping.extracted_description || '')
        
        // Try to find existing base procedure by code first
        if (updatedMapping.extracted_procedure_code) {
          const codeMatch = await client.query(
            `SELECT id FROM procedure_base_table 
             WHERE clinic_id = $1 AND code = $2
             LIMIT 1`,
            [clinicId, updatedMapping.extracted_procedure_code]
          )
          
          if (codeMatch.rows.length > 0) {
            baseProcedureId = codeMatch.rows[0].id
          }
        }
        
        // If not found by code, try by normalized description
        if (!baseProcedureId && normalizedDesc) {
          const allBaseProcedures = await client.query(
            `SELECT id, description FROM procedure_base_table 
             WHERE clinic_id = $1`,
            [clinicId]
          )
          
          for (const base of allBaseProcedures.rows) {
            const baseNormalized = normalizeText(base.description || '')
            if (baseNormalized === normalizedDesc) {
              baseProcedureId = base.id
              break
            }
          }
        }
        
        if (!baseProcedureId) {
          // Create new entry in procedure_base_table
          baseProcedureId = uuidv4()
          await client.query(
            `INSERT INTO procedure_base_table (
              id, clinic_id, code, description, is_periciable, adults_only, default_value, active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
            [
              baseProcedureId,
              clinicId,
              updatedMapping.extracted_procedure_code,
              updatedMapping.extracted_description,
              finalIsPericiable,
              finalAdultsOnly,
              updatedMapping.extracted_value || null
            ]
          )
        }
      }
      
      // Validação: garantir que temos código e descrição
      if (!updatedMapping.extracted_procedure_code || !updatedMapping.extracted_description) {
        console.warn(`⚠️ Procedimento sem código ou descrição: ${actualMappingId}`)
        continue
      }
      
      // Create insurance provider procedure
      const procedureId = uuidv4()
      procedureIds.push(procedureId)
      
      await client.query(
        `INSERT INTO insurance_provider_procedures (
          id, insurance_provider_id, procedure_base_id, provider_code,
          provider_description, is_periciable, max_value, active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
        [
          procedureId,
          providerId,
          baseProcedureId,
          updatedMapping.extracted_procedure_code,
          updatedMapping.extracted_description,
          finalIsPericiable,
          updatedMapping.extracted_value || null
        ]
      )
      
      // Update mapping status
      await client.query(
        `UPDATE procedure_mappings
         SET status = 'APPROVED',
             mapped_provider_procedure_id = $1,
             mapped_procedure_base_id = $2,
             reviewed_by = $3,
             reviewed_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [procedureId, baseProcedureId, req.user.id, actualMappingId]
      )
      
      // Update insurance_provider_procedures to reference base procedure
      if (baseProcedureId) {
        await client.query(
          `UPDATE insurance_provider_procedures 
           SET procedure_base_id = $1 
           WHERE id = $2`,
          [baseProcedureId, procedureId]
        )
      }
      
      // Save learned pattern for future use (0 cost classification)
      if (clinicId) {
        saveProcedurePattern(
          {
            code: updatedMapping.extracted_procedure_code,
            description: updatedMapping.extracted_description
          },
          clinicId,
          providerId,
          finalIsPericiable,
          finalAdultsOnly
        ).catch(err => {
          console.error('Error saving procedure pattern:', err)
          // Don't fail if pattern saving fails
        })
      }
      
      approvedCount++
    }
    
    await client.query('COMMIT')
    
    console.log(`✅ ${approvedCount} procedimentos aprovados em bloco`)
    
    res.json({
      success: true,
      approvedCount,
      procedureIds
    })
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {}) // Ignore rollback errors
    console.error('Error bulk approving mappings:', error)
    console.error('Error stack:', error.stack)
    res.status(500).json({ 
      error: 'Erro ao aprovar mapeamentos em bloco', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  } finally {
    client.release()
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

    // Validação: providerId é obrigatório
    if (!providerId) {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'providerId é obrigatório' })
    }

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

    // Check if mapping already has a mapped_provider_procedure_id (already approved)
    if (mapping.mapped_provider_procedure_id) {
      await client.query('ROLLBACK')
      return res.status(400).json({
        error: 'Mapeamento já foi aprovado anteriormente',
        procedureId: mapping.mapped_provider_procedure_id
      })
    }

    // Get clinic ID from provider
    const clinicResult = await client.query(
      'SELECT clinic_id FROM insurance_providers WHERE id = $1',
      [providerId]
    )
    
    // Validação: verificar se a operadora existe
    if (clinicResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Operadora não encontrada' })
    }
    
    const clinicId = clinicResult.rows[0]?.clinic_id

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

    // Save to procedure_base_table if not already there
    let baseProcedureId = mapping.mapped_procedure_base_id
    if (clinicId && !baseProcedureId) {
      // Normalize description for comparison
      const normalizedDesc = normalizeText(mapping.extracted_description || '')
      
      // Check if already exists in base table (by code or normalized description)
      const allBaseProcedures = await client.query(
        `SELECT id, code, description 
         FROM procedure_base_table 
         WHERE active = true
           AND (clinic_id = $1 OR clinic_id IS NULL)
         ORDER BY CASE WHEN clinic_id = $1 THEN 0 ELSE 1 END`,
        [clinicId]
      )
      
      // Find match by code or normalized description
      let existingBase = null
      for (const base of allBaseProcedures.rows) {
        // Match by code (exact)
        if (mapping.extracted_procedure_code && base.code === mapping.extracted_procedure_code) {
          existingBase = base
          break
        }
        // Match by normalized description (exact)
        if (normalizedDesc && base.description) {
          const baseNormalized = normalizeText(base.description)
          if (baseNormalized === normalizedDesc) {
            existingBase = base
            break
          }
        }
      }
      
      if (existingBase) {
        // Use existing base procedure
        baseProcedureId = existingBase.id
        console.log(`   ℹ️ Procedimento já existe na tabela base: ${baseProcedureId}`)
      } else {
        // Create new entry in procedure_base_table
        baseProcedureId = uuidv4()
        await client.query(
          `INSERT INTO procedure_base_table (
            id, clinic_id, code, description, is_periciable, adults_only, default_value, active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
          [
            baseProcedureId,
            clinicId, // Clinic-specific
            mapping.extracted_procedure_code,
            mapping.extracted_description,
            mapping.extracted_is_periciable || false,
            mapping.extracted_adults_only || false,
            mapping.extracted_value || null
          ]
        )
        console.log(`   ✅ Procedimento salvo na tabela base: ${baseProcedureId}`)
      }
    }

    // Update mapping status and base procedure reference
    await client.query(
      `UPDATE procedure_mappings
       SET status = 'APPROVED',
           mapped_provider_procedure_id = $1,
           mapped_procedure_base_id = $2,
           reviewed_by = $3,
           reviewed_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [procedureId, baseProcedureId, req.user.id, mappingId]
    )

    // Update insurance_provider_procedures to reference base procedure
    if (baseProcedureId) {
      await client.query(
        `UPDATE insurance_provider_procedures 
         SET procedure_base_id = $1 
         WHERE id = $2`,
        [baseProcedureId, procedureId]
      )
    }

    // Save learned pattern for future use (0 cost classification)
    if (clinicId) {
      saveProcedurePattern(
        {
          code: mapping.extracted_procedure_code,
          description: mapping.extracted_description
        },
        clinicId,
        providerId,
        mapping.extracted_is_periciable || false,
        mapping.extracted_adults_only || false
      ).catch(err => {
        console.error('Error saving procedure pattern:', err)
        // Don't fail the approval if pattern saving fails
      })
    }

    await client.query('COMMIT')

    res.json({ success: true, procedureId })
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Error approving mapping:', error)
    // Incluir mais detalhes do erro na resposta para debug
    res.status(500).json({ 
      error: 'Erro ao aprovar mapeamento',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
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
