import Tesseract from 'tesseract.js';
import { pdfToPng } from 'pdf-to-png-converter';
import fs from 'fs';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const uploadsDir = './public/uploads/insurance-pdfs';

// Inicializar OpenAI
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });
} else {
  console.error('❌ OPENAI_API_KEY não configurada no .env');
  process.exit(1);
}

(async () => {
  try {
    // Encontrar o PDF mais recente
    const files = fs.readdirSync(uploadsDir)
      .filter(f => f.endsWith('.pdf'))
      .map(f => {
        const filePath = `${uploadsDir}/${f}`;
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          mtime: stats.mtime
        };
      })
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      console.log('❌ Nenhum PDF encontrado');
      return;
    }

    // Procurar especificamente por ADSE ou o mais recente
    const targetPDF = files.find(f => f.name.includes('ADSE')) || files[0];
    
    console.log('📄 PDF selecionado:', targetPDF.name);
    console.log('📅 Data:', targetPDF.mtime);
    console.log('📊 Tamanho:', (fs.statSync(targetPDF.path).size / 1024).toFixed(2), 'KB\n');

    // Converter PDF para imagens PNG
    console.log('🔄 Convertendo PDF para imagens PNG...');
    const pdfBuffer = fs.readFileSync(targetPDF.path);
    const pngPages = await pdfToPng(pdfBuffer, {
      disableFontFace: false,
      useSystemFonts: false,
      viewportScale: 3.0,
      outputFileMask: 'page'
    });

    console.log(`✅ PDF convertido: ${pngPages.length} páginas\n`);

    // Processar as primeiras 3 páginas
    const maxPages = Math.min(3, pngPages.length);
    console.log(`🔍 Processando ${maxPages} páginas com OCR + GPT...\n`);
    const allProcedures = [];

    for (let i = 0; i < maxPages; i++) {
      const pageNum = i + 1;
      console.log(`${'='.repeat(80)}`);
      console.log(`📄 Processando página ${pageNum}/${pngPages.length}...`);
      console.log('='.repeat(80));

      // Extrair texto com OCR
      const imageBuffer = pngPages[i].content;
      console.log(`   🔤 Extraindo texto com OCR...`);

      const { data: { text, confidence } } = await Tesseract.recognize(imageBuffer, 'por', {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            process.stdout.write(`\r   📊 Progresso OCR: ${Math.round(info.progress * 100)}%`);
          }
        }
      });

      console.log('\n'); // Nova linha após progresso
      console.log(`   ✅ OCR concluído - Confiança: ${confidence?.toFixed(2) || 'N/A'}%`);
      console.log(`   📝 Caracteres extraídos: ${text.length}`);

      if (!text || text.trim().length < 20) {
        console.log(`   ⚠️ Página ${pageNum}: Texto insuficiente extraído por OCR`);
        console.log(`   📄 Texto extraído: "${text.substring(0, 100)}"`);
        console.log(`   ⏭️ Pulando página...\n`);
        continue;
      }

      console.log(`   📝 Primeiros 500 chars do OCR:`);
      console.log(`   ${'─'.repeat(70)}`);
      console.log(`   ${text.substring(0, 500).replace(/\n/g, '\n   ')}`);
      console.log(`   ${'─'.repeat(70)}`);

      // Verificar se há códigos de procedimentos no texto bruto
      const codePattern = /A\s*\d+\.\d+\.\d+\.\d+/gi;
      const rawCodes = text.match(codePattern);
      if (rawCodes) {
        console.log(`   🔍 Códigos encontrados no OCR bruto: ${rawCodes.length}`);
        console.log(`   📋 Exemplos: ${rawCodes.slice(0, 5).join(', ')}`);
      } else {
        console.log(`   ⚠️ Nenhum código de procedimento encontrado no padrão A1.01.01.01`);
      }

      // Usar GPT para parsear o texto extraído
      console.log(`\n   🤖 Enviando para GPT-4o para extrair procedimentos...`);

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
      });

      const pageResponse = response.choices[0].message.content || '';

      // Extrair JSON da resposta
      try {
        const pageData = JSON.parse(pageResponse);
        if (pageData.procedures && Array.isArray(pageData.procedures)) {
          console.log(`   ✅ Extraídos ${pageData.procedures.length} procedimentos da página ${pageNum}`);
          
          if (pageData.procedures.length > 0) {
            console.log(`   📋 Exemplos:`);
            pageData.procedures.slice(0, 5).forEach((proc, idx) => {
              console.log(`      ${idx + 1}. ${proc.code} - ${proc.description?.substring(0, 50) || 'Sem descrição'}... (${proc.value ? `R$ ${proc.value}` : 'Sem valor'})`);
            });
          }
          
          allProcedures.push(...pageData.procedures);
        } else {
          console.log(`   ⚠️ Nenhum procedimento encontrado na página ${pageNum}`);
          console.log(`   📄 Resposta do GPT (primeiros 500 chars): ${pageResponse.substring(0, 500)}`);
        }
      } catch (parseError) {
        console.error(`   ❌ Erro ao parsear JSON da página ${pageNum}:`, parseError.message);
        console.error(`   📄 Resposta recebida (primeiros 500 chars):`, pageResponse.substring(0, 500));
      }

      console.log(''); // Linha em branco entre páginas
    }

    console.log(`${'='.repeat(80)}`);
    console.log('📊 RESULTADOS FINAIS');
    console.log('='.repeat(80));
    console.log(`📄 PDF: ${targetPDF.name}`);
    console.log(`📑 Páginas processadas: ${maxPages} de ${pngPages.length}`);
    console.log(`🔢 Total de procedimentos extraídos: ${allProcedures.length}`);
    
    if (allProcedures.length > 0) {
      console.log(`\n📋 Exemplos de procedimentos:`);
      allProcedures.slice(0, 10).forEach((proc, idx) => {
        console.log(`   ${idx + 1}. ${proc.code} - ${proc.description || 'Sem descrição'} (${proc.value ? `R$ ${proc.value}` : 'Sem valor'})`);
      });
    } else {
      console.log(`\n⚠️ NENHUM PROCEDIMENTO FOI EXTRAÍDO`);
      console.log(`\n💡 Possíveis causas:`);
      console.log(`   1. O OCR não está extraindo texto suficiente ou de qualidade`);
      console.log(`   2. O PDF não contém códigos de procedimentos no formato esperado`);
      console.log(`   3. O GPT não está conseguindo identificar os procedimentos no texto extraído`);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();

