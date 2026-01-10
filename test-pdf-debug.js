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

async function testPDFDebug() {
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
    console.log('✅ Tamanho:', fs.statSync(filePath).size, 'bytes');

    // Upload to OpenAI
    console.log('\n📤 Enviando para OpenAI...');
    const file = await openai.files.create({
      file: fs.createReadStream(filePath),
      purpose: 'assistants'
    });

    console.log('✅ Arquivo enviado:', file.id);

    // Test 1: Simple file listing
    console.log('\n🧪 TESTE 1: Listar arquivos em /mnt/data/');
    const assistant1 = await openai.beta.assistants.create({
      name: 'File Lister',
      instructions: `Execute este código Python:

\`\`\`python
import os
print("Arquivos em /mnt/data/:")
for f in os.listdir('/mnt/data/'):
    print(f"  - {f}")
\`\`\``,
      model: 'gpt-4o',
      tools: [{ type: 'code_interpreter' }]
    });

    const thread1 = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: 'Execute o código Python nas instruções',
          attachments: [{ file_id: file.id, tools: [{ type: 'code_interpreter' }] }]
        }
      ]
    });

    const run1 = await openai.beta.threads.runs.createAndPoll(thread1.id, {
      assistant_id: assistant1.id
    });

    const messages1 = await openai.beta.threads.messages.list(thread1.id);
    let response1 = '';
    for (const content of messages1.data[0].content) {
      if (content.type === 'text') response1 += content.text.value;
    }
    console.log('Resposta:', response1);

    // Test 2: Check if pdfplumber is available
    console.log('\n🧪 TESTE 2: Verificar se pdfplumber está disponível');
    const assistant2 = await openai.beta.assistants.create({
      name: 'Library Checker',
      instructions: `Execute este código Python:

\`\`\`python
try:
    import pdfplumber
    print("✅ pdfplumber está disponível")
    print(f"Versão: {pdfplumber.__version__ if hasattr(pdfplumber, '__version__') else 'desconhecida'}")
except ImportError as e:
    print(f"❌ pdfplumber não está disponível: {e}")

# Tentar importar outras bibliotecas comuns
try:
    import PyPDF2
    print("✅ PyPDF2 está disponível")
except ImportError:
    print("❌ PyPDF2 não está disponível")

try:
    import pypdf
    print("✅ pypdf está disponível")
except ImportError:
    print("❌ pypdf não está disponível")
\`\`\``,
      model: 'gpt-4o',
      tools: [{ type: 'code_interpreter' }]
    });

    const thread2 = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: 'Execute o código Python nas instruções',
          attachments: [{ file_id: file.id, tools: [{ type: 'code_interpreter' }] }]
        }
      ]
    });

    const run2 = await openai.beta.threads.runs.createAndPoll(thread2.id, {
      assistant_id: assistant2.id
    });

    const messages2 = await openai.beta.threads.messages.list(thread2.id);
    let response2 = '';
    for (const content of messages2.data[0].content) {
      if (content.type === 'text') response2 += content.text.value;
    }
    console.log('Resposta:', response2);

    // Test 3: Try to open PDF with available library
    console.log('\n🧪 TESTE 3: Tentar abrir o PDF');
    const assistant3 = await openai.beta.assistants.create({
      name: 'PDF Opener',
      instructions: `Execute este código Python:

\`\`\`python
import os

pdf_file = [f for f in os.listdir('/mnt/data/') if f.endswith('.pdf')][0]
pdf_path = os.path.join('/mnt/data/', pdf_file)

print(f"Arquivo encontrado: {pdf_file}")
print(f"Tamanho: {os.path.getsize(pdf_path)} bytes")

# Try with pypdf (most likely available)
try:
    import pypdf
    reader = pypdf.PdfReader(pdf_path)
    print(f"✅ PDF aberto com pypdf")
    print(f"Páginas: {len(reader.pages)}")
    print(f"Primeira página - primeiros 500 chars:")
    print(reader.pages[0].extract_text()[:500])
except Exception as e:
    print(f"❌ Erro com pypdf: {e}")

# Try with PyPDF2
try:
    import PyPDF2
    with open(pdf_path, 'rb') as f:
        reader = PyPDF2.PdfReader(f)
        print(f"✅ PDF aberto com PyPDF2")
        print(f"Páginas: {len(reader.pages)}")
        print(f"Primeira página - primeiros 500 chars:")
        print(reader.pages[0].extract_text()[:500])
except Exception as e:
    print(f"❌ Erro com PyPDF2: {e}")
\`\`\``,
      model: 'gpt-4o',
      tools: [{ type: 'code_interpreter' }]
    });

    const thread3 = await openai.beta.threads.create({
      messages: [
        {
          role: 'user',
          content: 'Execute o código Python nas instruções',
          attachments: [{ file_id: file.id, tools: [{ type: 'code_interpreter' }] }]
        }
      ]
    });

    const run3 = await openai.beta.threads.runs.createAndPoll(thread3.id, {
      assistant_id: assistant3.id
    });

    const messages3 = await openai.beta.threads.messages.list(thread3.id);
    let response3 = '';
    for (const content of messages3.data[0].content) {
      if (content.type === 'text') response3 += content.text.value;
    }
    console.log('Resposta:', response3);

    // Cleanup
    console.log('\n🧹 Limpando recursos...');
    await openai.beta.assistants.delete(assistant1.id);
    await openai.beta.assistants.delete(assistant2.id);
    await openai.beta.assistants.delete(assistant3.id);
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

testPDFDebug();
