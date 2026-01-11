import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';

const testImagePath = './test-pdf-debug-output/page-1.png';

(async () => {
  try {
    if (!fs.existsSync(testImagePath)) {
      console.log('❌ Imagem não encontrada:', testImagePath);
      console.log('💡 Execute primeiro: node test-pdf-debug-detailed.js');
      return;
    }

    console.log('📄 Testando OCR diretamente na imagem:', testImagePath);
    console.log('📏 Tamanho da imagem:', (fs.statSync(testImagePath).size / 1024).toFixed(2), 'KB\n');

    const imageBuffer = fs.readFileSync(testImagePath);

    console.log('🔤 Iniciando OCR com diferentes configurações...\n');

    // Teste 1: Português padrão
    console.log('='.repeat(80));
    console.log('Teste 1: Português (por)');
    console.log('='.repeat(80));
    try {
      const result1 = await Tesseract.recognize(imageBuffer, 'por', {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            process.stdout.write(`\r   Progresso: ${Math.round(info.progress * 100)}%`);
          }
        }
      });
      console.log('\n');
      console.log(`   ✅ Caracteres extraídos: ${result1.data.text.length}`);
      console.log(`   🎯 Confiança: ${result1.data.confidence?.toFixed(2) || 'N/A'}%`);
      if (result1.data.text.length > 0) {
        console.log(`   📝 Primeiros 500 caracteres:`);
        console.log(`   ${result1.data.text.substring(0, 500).replace(/\n/g, '\n   ')}`);
      }
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}`);
    }

    // Teste 2: Inglês (às vezes funciona melhor)
    console.log('\n' + '='.repeat(80));
    console.log('Teste 2: Inglês (eng)');
    console.log('='.repeat(80));
    try {
      const result2 = await Tesseract.recognize(imageBuffer, 'eng', {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            process.stdout.write(`\r   Progresso: ${Math.round(info.progress * 100)}%`);
          }
        }
      });
      console.log('\n');
      console.log(`   ✅ Caracteres extraídos: ${result2.data.text.length}`);
      console.log(`   🎯 Confiança: ${result2.data.confidence?.toFixed(2) || 'N/A'}%`);
      if (result2.data.text.length > 0) {
        console.log(`   📝 Primeiros 500 caracteres:`);
        console.log(`   ${result2.data.text.substring(0, 500).replace(/\n/g, '\n   ')}`);
      }
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}`);
    }

    // Teste 3: Português + Inglês (multilíngue)
    console.log('\n' + '='.repeat(80));
    console.log('Teste 3: Português + Inglês (por+eng)');
    console.log('='.repeat(80));
    try {
      const result3 = await Tesseract.recognize(imageBuffer, 'por+eng', {
        logger: (info) => {
          if (info.status === 'recognizing text') {
            process.stdout.write(`\r   Progresso: ${Math.round(info.progress * 100)}%`);
          }
        }
      });
      console.log('\n');
      console.log(`   ✅ Caracteres extraídos: ${result3.data.text.length}`);
      console.log(`   🎯 Confiança: ${result3.data.confidence?.toFixed(2) || 'N/A'}%`);
      if (result3.data.text.length > 0) {
        console.log(`   📝 Primeiros 500 caracteres:`);
        console.log(`   ${result3.data.text.substring(0, 500).replace(/\n/g, '\n   ')}`);
      }
    } catch (error) {
      console.error(`   ❌ Erro: ${error.message}`);
    }

    // Verificar se há códigos numéricos no texto extraído
    console.log('\n' + '='.repeat(80));
    console.log('🔍 Verificando códigos numéricos nos resultados...');
    console.log('='.repeat(80));
    
    const results = [
      { name: 'Português', text: result1?.data?.text || '' },
      { name: 'Inglês', text: result2?.data?.text || '' },
      { name: 'Português+Inglês', text: result3?.data?.text || '' }
    ];

    for (const result of results) {
      if (result.text.length > 0) {
        const numericCodes = result.text.match(/\b\d{4,6}\b/g);
        const codesA = result.text.match(/A\s*\d+\.\d+\.\d+\.\d+/gi);
        console.log(`\n${result.name}:`);
        if (numericCodes) {
          console.log(`   ✅ Códigos numéricos encontrados: ${numericCodes.length}`);
          console.log(`   📋 Exemplos: ${numericCodes.slice(0, 10).join(', ')}`);
        }
        if (codesA) {
          console.log(`   ✅ Códigos formato A encontrados: ${codesA.length}`);
          console.log(`   📋 Exemplos: ${codesA.slice(0, 5).join(', ')}`);
        }
        if (!numericCodes && !codesA) {
          console.log(`   ⚠️ Nenhum código encontrado`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();

