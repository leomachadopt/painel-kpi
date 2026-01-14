import { pdfToPng } from 'pdf-to-png-converter';
import fs from 'fs';
import path from 'path';

const uploadsDir = './public/uploads/insurance-pdfs';

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

    const targetPDF = files.find(f => f.name.includes('ADSE') || f.name.includes('7b07095e')) || files[0];
    
    console.log('📄 PDF selecionado:', targetPDF.name);
    console.log('📊 Tamanho:', (fs.statSync(targetPDF.path).size / 1024).toFixed(2), 'KB\n');

    // Verificar se o PDF é válido
    const pdfBuffer = fs.readFileSync(targetPDF.path);
    console.log(`✅ PDF lido: ${pdfBuffer.length} bytes\n`);

    // Converter PDF para imagens PNG
    console.log('🔄 Convertendo PDF para imagens PNG...');
    const pngPages = await pdfToPng(pdfBuffer, {
      disableFontFace: false,
      useSystemFonts: false,
      viewportScale: 3.0,
      outputFileMask: 'page'
    });

    console.log(`✅ PDF convertido: ${pngPages.length} páginas\n`);

    // Salvar imagens para inspeção
    const outputDir = './test-pdf-debug-output';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (let i = 0; i < pngPages.length; i++) {
      const pageNum = i + 1;
      const imageBuffer = pngPages[i].content;
      const outputPath = path.join(outputDir, `page-${pageNum}.png`);
      
      fs.writeFileSync(outputPath, imageBuffer);
      console.log(`💾 Página ${pageNum} salva: ${outputPath}`);
      console.log(`   📏 Tamanho da imagem: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`   📐 Dimensões: ${pngPages[i].width || 'N/A'} x ${pngPages[i].height || 'N/A'}\n`);
    }

    // Verificar se as imagens são válidas
    console.log('🔍 Verificando se as imagens são válidas...');
    for (let i = 0; i < pngPages.length; i++) {
      const imageBuffer = pngPages[i].content;
      const isValidPNG = imageBuffer[0] === 0x89 && 
                         imageBuffer[1] === 0x50 && 
                         imageBuffer[2] === 0x4E && 
                         imageBuffer[3] === 0x47;
      
      console.log(`   Página ${i + 1}: ${isValidPNG ? '✅ PNG válido' : '❌ PNG inválido'}`);
      console.log(`   Primeiros bytes: ${imageBuffer.slice(0, 8).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
    }

    console.log(`\n✅ Imagens salvas em: ${outputDir}`);
    console.log(`💡 Você pode abrir essas imagens para verificar se o conteúdo está visível`);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
})();



