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

async function testPDFTables() {
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

    // Test table extraction
    console.log('\n🧪 TESTE: Extrair tabelas com pdfplumber');
    const assistant = await openai.beta.assistants.create({
      name: 'Table Extractor',
      instructions: `Execute este código Python para extrair tabelas do PDF:

\`\`\`python
import pdfplumber
import os
import json

# Encontrar PDF
pdf_files = [f for f in os.listdir('/mnt/data/') if f.endswith('.pdf')]
pdf_path = os.path.join('/mnt/data/', pdf_files[0])

print(f"Abrindo: {pdf_files[0]}")

# Abrir com pdfplumber
with pdfplumber.open(pdf_path) as pdf:
    print(f"Total de páginas: {len(pdf.pages)}")

    # Testar apenas as primeiras 3 páginas
    for page_num in range(min(3, len(pdf.pages))):
        page = pdf.pages[page_num]
        print(f"\\n=== PÁGINA {page_num + 1} ===")

        # Extrair tabelas
        tables = page.extract_tables()
        print(f"Tabelas encontradas: {len(tables)}")

        if tables:
            for table_idx, table in enumerate(tables):
                print(f"\\n  Tabela {table_idx + 1}:")
                print(f"    Linhas: {len(table)}")
                print(f"    Colunas: {len(table[0]) if table else 0}")

                # Mostrar primeiras 3 linhas
                print(f"\\n    Primeiras 3 linhas:")
                for row_idx, row in enumerate(table[:3]):
                    print(f"      Linha {row_idx + 1}: {row}")
\`\`\`

Execute este código e mostre TODO o output.`,
      model: 'gpt-4o',
      tools: [{ type: 'code_interpreter' }]
    });

    const thread = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: 'Execute o código Python completo das instruções e mostre TODO o output',
          attachments: [{ file_id: file.id, tools: [{ type: 'code_interpreter' }] }]
        }
      ]
    });

    console.log('⚙️ Executando...');
    const run = await openai.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistant.id
    });

    if (run.status !== 'completed') {
      console.error('❌ Falhou:', run.status);
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

    // Cleanup
    console.log('\n🧹 Limpando recursos...');
    await openai.beta.assistants.delete(assistant.id);
    await openai.files.delete(file.id);
    console.log('✅ Recursos limpos');

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

testPDFTables();
