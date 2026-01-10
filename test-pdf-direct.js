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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function testPDFDirect() {
  const client = await pool.connect();

  try {
    console.log('🔍 Buscando último documento PDF...');

    const result = await client.query(`
      SELECT id, file_name, file_path
      FROM insurance_provider_documents
      ORDER BY created_at DESC
      LIMIT 1
    `);

    const doc = result.rows[0];
    let filePath = doc.file_path;
    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, 'public', 'uploads', 'insurance-pdfs', path.basename(doc.file_path));
    }

    console.log('📄 Documento:', doc.file_name);

    // Upload to OpenAI
    console.log('\n📤 Enviando para OpenAI...');
    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'assistants'
    });

    console.log('✅ Arquivo enviado:', file.id);

    // Create simple assistant
    console.log('\n🤖 Criando assistente...');
    const assistant = await openai.beta.assistants.create({
      name: 'Python Executor',
      instructions: 'Você é um assistente que executa código Python. Execute qualquer código Python que o usuário fornecer.',
      model: 'gpt-4o',
      tools: [{ type: 'code_interpreter' }]
    });

    // Put code in user message
    const pythonCode = `import pdfplumber
import os
import json
import re

# Encontrar PDF
pdf_files = [f for f in os.listdir('/mnt/data/') if f.endswith('.pdf')]
pdf_path = os.path.join('/mnt/data/', pdf_files[0])

print(f"📄 Processando: {pdf_files[0]}")

procedures = []

# Abrir com pdfplumber
with pdfplumber.open(pdf_path) as pdf:
    print(f"📚 Total de páginas: {len(pdf.pages)}")

    # Processar TODAS as páginas
    for page_num, page in enumerate(pdf.pages, 1):
        print(f"\\n📄 Página {page_num}/{len(pdf.pages)}")

        # Extrair tabelas
        tables = page.extract_tables()
        print(f"   Tabelas encontradas: {len(tables)}")

        for table_idx, table in enumerate(tables):
            if not table:
                continue

            print(f"   Processando tabela {table_idx + 1} com {len(table)} linhas")

            for row in table:
                if not row or len(row) < 2:
                    continue

                code = None
                desc = None
                value = None

                for cell in row:
                    if not cell:
                        continue
                    cell_clean = str(cell).strip()

                    # Código começa com A seguido de dígitos
                    if re.match(r'^A\\d', cell_clean):
                        code = cell_clean
                    # Valor tem formato numérico com vírgula/ponto
                    elif re.search(r'\\d+[,\\.]\\d{2}', cell_clean):
                        value_match = re.search(r'(\\d+)[,\\.](\\d{2})', cell_clean)
                        if value_match:
                            value = float(f"{value_match.group(1)}.{value_match.group(2)}")
                    # Descrição é texto longo
                    elif len(cell_clean) > 5 and not code:
                        desc = cell_clean

                if code and desc:
                    procedures.append({
                        "code": code,
                        "description": desc,
                        "value": value
                    })

print(f"\\n✅ Total extraído: {len(procedures)} procedimentos")

if len(procedures) > 0:
    print(f"\\n📋 Primeiros 5:")
    for i, p in enumerate(procedures[:5]):
        print(f"   {i+1}. {p['code']} - {p['description'][:40]}... - €{p['value']}")

    print(f"\\n📋 Últimos 5:")
    for i, p in enumerate(procedures[-5:]):
        print(f"   {i+1}. {p['code']} - {p['description'][:40]}... - €{p['value']}")

print("\\n" + "="*80)
print("JSON FINAL:")
print(json.dumps({"procedures": procedures}, ensure_ascii=False))
print("="*80)`;

    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: `Execute este código Python COMPLETO e mostre TODO o output (incluindo prints):

\`\`\`python
${pythonCode}
\`\`\``,
          attachments: [{ file_id: file.id, tools: [{ type: 'code_interpreter' }] }]
        }
      ]
    });

    console.log('⚙️ Executando (pode demorar 2-3 minutos)...');
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });

    console.log(`\n⚙️ Status: ${run.status}`);

    if (run.status !== 'completed') {
      console.error('❌ Falhou:', run.status);
      if (run.last_error) {
        console.error('Erro:', JSON.stringify(run.last_error, null, 2));
      }
      return;
    }

    const messages = await openai.beta.threads.messages.list(thread.id);
    let response = '';
    for (const content of messages.data[0].content) {
      if (content.type === 'text') response += content.text.value;
    }

    console.log('\n📝 RESPOSTA COMPLETA:');
    console.log('='.repeat(80));
    console.log(response);
    console.log('='.repeat(80));

    // Try to extract JSON
    const jsonMatch = response.match(/\{"procedures":\s*\[[\s\S]*?\]\s*\}/);
    if (jsonMatch) {
      try {
        const data = JSON.parse(jsonMatch[0]);
        console.log(`\n✅ JSON encontrado: ${data.procedures.length} procedimentos`);
      } catch (e) {
        console.log('\n❌ Erro ao parsear JSON:', e.message);
      }
    } else {
      console.log('\n⚠️ JSON não encontrado na resposta');
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

testPDFDirect();
