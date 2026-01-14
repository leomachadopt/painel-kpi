import Tesseract from 'tesseract.js';
import { pdfToPng } from 'pdf-to-png-converter';
import fs from 'fs';
import path from 'path';

const uploadsDir = './public/uploads/insurance-pdfs';

(async () => {
  try {
    console.log('🔍 Procurando PDFs...\n');

    // Encontrar PDFs ordenados por tamanho (maiores primeiro, pois provavelmente têm mais conteúdo)
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

    // Testar com os 3 maiores PDFs
    const testPDFs = files.slice(0, 3);
    
    for (const pdf of testPDFs) {
      console.log('\n' + '='.repeat(80));
      console.log(`📄 Testando PDF: ${pdf.name}`);
      console.log(`📊 Tamanho: ${(pdf.size / 1024).toFixed(2)} KB`);
      console.log(`📅 Data: ${pdf.mtime}`);
      console.log('='.repeat(80));

      try {
        // Converter PDF para imagens PNG
        console.log('\n🔄 Convertendo PDF para imagens PNG...');
        const pdfBuffer = fs.readFileSync(pdf.path);
        const pngPages = await pdfToPng(pdfBuffer, {
          disableFontFace: false,
          useSystemFonts: false,
          viewportScale: 3.0,
          outputFileMask: 'page'
        });

        console.log(`✅ PDF convertido: ${pngPages.length} páginas`);

        // Salvar primeira página como imagem para inspeção
        if (pngPages.length > 0) {
          const outputDir = './test-ocr-output';
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          
          const firstPagePath = path.join(outputDir, `${pdf.name.replace('.pdf', '')}-page1.png`);
          fs.writeFileSync(firstPagePath, pngPages[0].content);
          console.log(`💾 Primeira página salva em: ${firstPagePath}`);
          console.log(`📏 Tamanho da imagem: ${(pngPages[0].content.length / 1024).toFixed(2)} KB`);
        }

        // Testar OCR na primeira página
        if (pngPages.length > 0) {
          console.log('\n🔤 Testando OCR na primeira página...');
          const imageBuffer = pngPages[0].content;
          
          console.log('   ⏳ Processando com Tesseract (isso pode demorar alguns segundos)...');
          
          const { data } = await Tesseract.recognize(imageBuffer, 'por', {
            logger: (info) => {
              if (info.status === 'recognizing text') {
                process.stdout.write(`\r   📊 Progresso: ${Math.round(info.progress * 100)}%`);
              }
            }
          });

          console.log('\n'); // Nova linha após o progresso
          
          const text = data.text || '';
          const confidence = data.confidence || 0;
          
          console.log(`   ✅ OCR concluído`);
          console.log(`   📝 Caracteres extraídos: ${text.length}`);
          console.log(`   🎯 Confiança média: ${confidence.toFixed(2)}%`);
          
          if (text.length > 0) {
            console.log(`   📄 Primeiros 500 caracteres:`);
            console.log(`   ${'─'.repeat(70)}`);
            console.log(`   ${text.substring(0, 500).replace(/\n/g, '\n   ')}`);
            console.log(`   ${'─'.repeat(70)}`);
            
            // Procurar códigos de procedimentos
            const codePattern = /A\s*\d+\.\d+\.\d+\.\d+/gi;
            const codes = text.match(codePattern);
            if (codes) {
              console.log(`\n   🔍 Códigos de procedimentos encontrados: ${codes.length}`);
              console.log(`   📋 Primeiros 10 códigos: ${codes.slice(0, 10).join(', ')}`);
            } else {
              console.log(`\n   ⚠️ Nenhum código de procedimento encontrado no padrão A1.01.01.01`);
            }
          } else {
            console.log(`   ⚠️ Nenhum texto extraído pelo OCR`);
            console.log(`   💡 Possíveis causas:`);
            console.log(`      - PDF é uma imagem escaneada de baixa qualidade`);
            console.log(`      - PDF tem proteção ou está corrompido`);
            console.log(`      - Imagem gerada está vazia ou corrompida`);
          }
        }

        // Se encontrou texto, este PDF é bom para teste completo
        if (pngPages.length > 0) {
          const testResult = await Tesseract.recognize(pngPages[0].content, 'por', {
            logger: () => {}
          });
          
          if (testResult.data.text && testResult.data.text.length > 50) {
            console.log(`\n✅ Este PDF parece ser adequado para teste completo!`);
            break; // Parar de testar outros PDFs
          }
        }

      } catch (error) {
        console.error(`\n❌ Erro ao processar ${pdf.name}:`, error.message);
        console.error(error.stack);
      }
    }

    console.log('\n✅ Diagnóstico concluído!');

  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();



