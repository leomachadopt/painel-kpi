import Tesseract from 'tesseract.js';
import { pdfToPng } from 'pdf-to-png-converter';
import fs from 'fs';
import OpenAI from 'openai';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
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
    console.log('🔍 Procurando PDF mais recente...\n');

    // Encontrar o PDF maior (provavelmente tem mais conteúdo)
    const files = fs.readdirSync(uploadsDir)
      .filter(f => f.endsWith('.pdf'))
      .map(f => {
        const filePath = `${uploadsDir}/${f}`;
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          size: stats.size,
          mtime: stats.mtime
        };
      })
      .sort((a, b) => b.size - a.size); // Ordenar por tamanho (maior primeiro)

    if (files.length === 0) {
      console.log('❌ Nenhum PDF encontrado em', uploadsDir);
      return;
    }

    const latestPDF = files[0];
    console.log('📄 PDF selecionado:', latestPDF.name);
    console.log('📅 Data de modificação:', latestPDF.mtime);
    console.log('📊 Tamanho:', (fs.statSync(latestPDF.path).size / 1024).toFixed(2), 'KB\n');

    // Passo 1: Converter PDF para imagens PNG
    console.log('🔄 Passo 1: Convertendo PDF para imagens PNG...');
    const pdfBuffer = fs.readFileSync(latestPDF.path);
    const pngPages = await pdfToPng(pdfBuffer, {
      disableFontFace: false,
      useSystemFonts: false,
      viewportScale: 3.0,
      outputFileMask: 'page'
    });

    console.log(`✅ PDF convertido: ${pngPages.length} páginas\n`);

    // Passo 2: Processar cada página com OCR + GPT
    // Limitar a 5 páginas para teste inicial
    const maxPages = Math.min(5, pngPages.length);
    console.log(`🔍 Passo 2: Processando ${maxPages} páginas (de ${pngPages.length} total) com OCR + GPT...\n`);
    const allProcedures = [];

    for (let i = 0; i < maxPages; i++) {
      const pageNum = i + 1;
      console.log(`${'='.repeat(80)}`);
      console.log(`📄 Processando página ${pageNum}/${pngPages.length}...`);
      console.log('='.repeat(80));

      // Step 2.1: Extrair texto com OCR
      const imageBuffer = pngPages[i].content;
      console.log(`   🔤 Extraindo texto com OCR...`);

      const { data: { text } } = await Tesseract.recognize(imageBuffer, 'por', {
        logger: () => {} // Silent logger
      });

      // Ser mais tolerante - aceitar texto com pelo menos 20 caracteres
      if (!text || text.trim().length < 20) {
        console.log(`   ⚠️ Página ${pageNum}: Texto insuficiente extraído por OCR (${text?.length || 0} chars)`);
        console.log(`   ⏭️ Pulando página...\n`);
        continue;
      }

      console.log(`   ✅ OCR extraiu ${text.length} caracteres`);
      console.log(`   📝 Primeiros 500 chars do OCR: ${text.substring(0, 500)}...`);
      
      // Verificar se há códigos de procedimentos no texto bruto
      const codePattern = /A\s*\d+\.\d+\.\d+\.\d+/gi;
      const rawCodes = text.match(codePattern);
      if (rawCodes) {
        console.log(`   🔍 Códigos encontrados no OCR bruto: ${rawCodes.length} (exemplos: ${rawCodes.slice(0, 5).join(', ')})`);
      }

      // Step 2.2: Usar GPT para parsear o texto extraído
      console.log(`   🤖 Enviando para GPT-4o para extrair procedimentos...`);

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
          
          // Mostrar alguns exemplos
          if (pageData.procedures.length > 0) {
            console.log(`   📋 Exemplos:`);
            pageData.procedures.slice(0, 3).forEach((proc, idx) => {
              console.log(`      ${idx + 1}. ${proc.code} - ${proc.description?.substring(0, 50) || 'Sem descrição'}... (${proc.value ? `R$ ${proc.value}` : 'Sem valor'})`);
            });
          }
          
          allProcedures.push(...pageData.procedures);
        } else {
          console.log(`   ⚠️ Nenhum procedimento encontrado na página ${pageNum}`);
        }
      } catch (parseError) {
        console.error(`   ❌ Erro ao parsear JSON da página ${pageNum}:`, parseError.message);
        console.error(`   📄 Resposta recebida (primeiros 500 chars):`, pageResponse.substring(0, 500));
      }

      console.log(''); // Linha em branco entre páginas
    }

    // Passo 3: Deduplicar procedimentos
    console.log(`${'='.repeat(80)}`);
    console.log('🔍 Passo 3: Deduplicando procedimentos...');
    console.log('='.repeat(80));

    const procedureMap = new Map();
    for (const proc of allProcedures) {
      const existing = procedureMap.get(proc.code);
      if (!existing) {
        procedureMap.set(proc.code, proc);
      } else {
        // Manter o procedimento com melhor descrição e valor (mais completo)
        const existingScore = (existing.description?.length || 0) + (existing.value ? 1000 : 0);
        const newScore = (proc.description?.length || 0) + (proc.value ? 1000 : 0);
        if (newScore > existingScore) {
          procedureMap.set(proc.code, proc);
        }
      }
    }

    const uniqueProcedures = Array.from(procedureMap.values());
    console.log(`✅ Total extraído: ${allProcedures.length} procedimentos`);
    console.log(`🔍 Após deduplicação: ${uniqueProcedures.length} procedimentos únicos`);
    console.log(`📊 Duplicados removidos: ${allProcedures.length - uniqueProcedures.length}\n`);

    // Passo 4: Estatísticas finais
    console.log(`${'='.repeat(80)}`);
    console.log('📊 ESTATÍSTICAS FINAIS');
    console.log('='.repeat(80));
    console.log(`📄 PDF: ${latestPDF.name}`);
    console.log(`📑 Páginas processadas: ${pngPages.length}`);
    console.log(`🔢 Total de procedimentos extraídos: ${uniqueProcedures.length}`);
    console.log(`💰 Procedimentos com valor: ${uniqueProcedures.filter(p => p.value !== null && p.value !== undefined).length}`);
    console.log(`❓ Procedimentos sem valor: ${uniqueProcedures.filter(p => p.value === null || p.value === undefined).length}`);
    
    // Mostrar alguns exemplos de procedimentos extraídos
    if (uniqueProcedures.length > 0) {
      console.log(`\n📋 Exemplos de procedimentos extraídos:`);
      uniqueProcedures.slice(0, 10).forEach((proc, idx) => {
        console.log(`   ${idx + 1}. ${proc.code} - ${proc.description || 'Sem descrição'} (${proc.value ? `R$ ${proc.value}` : 'Sem valor'})`);
      });
    }

    // Salvar resultados em arquivo JSON para análise
    const outputFile = `test-extraction-results-${Date.now()}.json`;
    const results = {
      pdf: latestPDF.name,
      pages: pngPages.length,
      totalProcedures: uniqueProcedures.length,
      procedures: uniqueProcedures
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n💾 Resultados salvos em: ${outputFile}`);

    console.log(`\n✅ Teste de extração concluído com sucesso!`);

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();

