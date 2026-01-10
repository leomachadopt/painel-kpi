import pg from 'pg';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

// OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testPDFExtraction() {
  const client = await pool.connect();

  try {
    console.log('🔍 Buscando último documento PDF...');

    // Get the most recent document
    const result = await client.query(`
      SELECT id, file_name, file_path, processing_status, extracted_data
      FROM insurance_provider_documents
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ Nenhum documento encontrado');
      return;
    }

    const doc = result.rows[0];
    console.log('📄 Documento encontrado:', doc.file_name);
    console.log('📁 Caminho:', doc.file_path);
    console.log('📊 Status:', doc.processing_status);

    // Check if file exists - file_path is already absolute
    let filePath = doc.file_path;
    if (!fs.existsSync(filePath)) {
      console.log('❌ Arquivo não existe:', filePath);
      console.log('Tentando caminho relativo...');

      // Try relative path
      const relativePath = path.join(__dirname, 'public', 'uploads', 'insurance-pdfs', path.basename(doc.file_path));
      if (fs.existsSync(relativePath)) {
        console.log('✅ Arquivo encontrado em:', relativePath);
        filePath = relativePath;
      } else {
        console.log('❌ Arquivo também não existe em:', relativePath);
        return;
      }
    }

    console.log('✅ Arquivo existe, tamanho:', fs.statSync(filePath).size, 'bytes');

    // Upload to OpenAI
    console.log('\n📤 Enviando para OpenAI...');
    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'assistants'
    });

    console.log('✅ Arquivo enviado:', file.id);

    // Create assistant with Python extraction code
    console.log('\n🤖 Criando assistente...');
    const assistant = await openai.beta.assistants.create({
      name: 'Test PDF Extractor',
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
        print(f"Total de páginas: {len(pdf.pages)}")

        for page_num, page in enumerate(pdf.pages, 1):
            print(f"Processando página {page_num}...")

            # Extrair tabelas da página
            tables = page.extract_tables()
            print(f"  Tabelas encontradas: {len(tables)}")

            for table_idx, table in enumerate(tables):
                if not table:
                    continue

                print(f"  Processando tabela {table_idx + 1} com {len(table)} linhas")

                for row_idx, row in enumerate(table):
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

    # Mostrar primeiros 5 procedimentos como exemplo
    print("\\nPrimeiros 5 procedimentos:")
    for i, proc in enumerate(procedures[:5]):
        print(f"  {i+1}. {proc['code']} - {proc['description'][:50]}... - {proc['value']}")

    # Retornar JSON
    print("\\n=== JSON FINAL ===")
    print(json.dumps({"procedures": procedures}, ensure_ascii=False))
\`\`\`

IMPORTANTE:
1. Execute o código Python acima COMPLETAMENTE
2. Retorne APENAS o JSON final (última linha do output)
3. NÃO adicione texto extra`,
      model: 'gpt-4o',
      tools: [{ type: 'code_interpreter' }]
    });

    // Create thread
    console.log('\n💬 Criando thread...');
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
    });

    // Run assistant
    console.log('\n⚙️ Executando assistente (pode demorar 1-2 minutos)...');
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });

    console.log(`\n⚙️ Status final: ${run.status}`);

    if (run.status !== 'completed') {
      console.error('❌ Assistente não completou:', run.status);
      if (run.last_error) {
        console.error('Erro:', JSON.stringify(run.last_error, null, 2));
      }
      return;
    }

    // Get response
    console.log('\n📥 Obtendo resposta...');
    const messages = await openai.beta.threads.messages.list(thread.id);
    const responseMessage = messages.data[0];

    let responseText = '';
    for (const content of responseMessage.content) {
      if (content.type === 'text') {
        responseText += content.text.value;
      }
    }

    console.log('\n📝 Resposta completa (primeiros 1000 chars):');
    console.log(responseText.substring(0, 1000));
    console.log('\n📏 Tamanho total:', responseText.length, 'caracteres');

    // Try to extract JSON
    let jsonText = responseText.trim();

    // Look for the LAST occurrence of {"procedures"
    let firstBrace = jsonText.lastIndexOf('{"procedures"');
    if (firstBrace === -1) {
      firstBrace = jsonText.indexOf('{"procedures"');
    }
    if (firstBrace === -1) {
      firstBrace = jsonText.indexOf('{');
    }

    // Find matching closing brace
    let lastBrace = jsonText.indexOf('}', firstBrace);
    if (lastBrace !== -1) {
      let braceCount = 1;
      let pos = firstBrace + 1;
      while (pos < jsonText.length && braceCount > 0) {
        if (jsonText[pos] === '{') braceCount++;
        else if (jsonText[pos] === '}') braceCount--;
        if (braceCount === 0) {
          lastBrace = pos;
          break;
        }
        pos++;
      }
    }

    if (firstBrace === -1 || lastBrace === -1) {
      console.log('\n❌ Não foi possível encontrar JSON na resposta');
      return;
    }

    jsonText = jsonText.substring(firstBrace, lastBrace + 1);

    console.log('\n✅ JSON extraído (primeiros 500 chars):');
    console.log(jsonText.substring(0, 500));

    // Parse JSON
    try {
      const data = JSON.parse(jsonText);
      console.log('\n📊 RESULTADO:');
      console.log(`   Total de procedimentos: ${data.procedures?.length || 0}`);

      if (data.procedures && data.procedures.length > 0) {
        console.log('\n   Primeiros 5 procedimentos:');
        data.procedures.slice(0, 5).forEach((proc, idx) => {
          console.log(`   ${idx + 1}. ${proc.code} - ${proc.description} - €${proc.value}`);
        });

        console.log('\n   Últimos 5 procedimentos:');
        data.procedures.slice(-5).forEach((proc, idx) => {
          console.log(`   ${idx + 1}. ${proc.code} - ${proc.description} - €${proc.value}`);
        });

        // Check values
        const values = data.procedures.filter(p => p.value).map(p => p.value);
        console.log('\n   Estatísticas de valores:');
        console.log(`   Valores encontrados: ${values.length}`);
        console.log(`   Menor valor: €${Math.min(...values)}`);
        console.log(`   Maior valor: €${Math.max(...values)}`);
        console.log(`   Média: €${(values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)}`);
      } else {
        console.log('\n❌ Array de procedimentos vazio!');
      }
    } catch (parseError) {
      console.error('\n❌ Erro ao fazer parse do JSON:', parseError.message);
    }

    // Cleanup
    console.log('\n🧹 Limpando recursos...');
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(file.id);
    console.log('✅ Recursos limpos');

  } catch (error) {
    console.error('❌ Erro:', error);
    console.error('Stack:', error.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

testPDFExtraction();
