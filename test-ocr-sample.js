import Tesseract from 'tesseract.js';
import { pdfToPng } from 'pdf-to-png-converter';
import fs from 'fs';

// Get the latest PDF from uploads
const uploadsDir = './public/uploads/insurance-pdfs';

(async () => {
  try {
    // Find the latest PDF file
    const files = fs.readdirSync(uploadsDir)
      .filter(f => f.endsWith('.pdf'))
      .map(f => ({
        name: f,
        path: `${uploadsDir}/${f}`,
        mtime: fs.statSync(`${uploadsDir}/${f}`).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      console.log('❌ Nenhum PDF encontrado em', uploadsDir);
      return;
    }

    const latestPDF = files[0];
    console.log('📄 Testando PDF:', latestPDF.name);
    console.log('📅 Data:', latestPDF.mtime);

    // Convert PDF to images
    const pdfBuffer = fs.readFileSync(latestPDF.path);
    const pngPages = await pdfToPng(pdfBuffer, {
      disableFontFace: false,
      useSystemFonts: false,
      viewportScale: 3.0,
      outputFileMask: 'page'
    });

    console.log(`\n✅ PDF convertido: ${pngPages.length} páginas\n`);

    // Test OCR on first page with content
    for (let i = 0; i < Math.min(3, pngPages.length); i++) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📄 PÁGINA ${i + 1}:`);
      console.log('='.repeat(80));

      const { data: { text } } = await Tesseract.recognize(pngPages[i].content, 'por', {
        logger: () => {}
      });

      console.log(`\n✅ OCR extraiu ${text.length} caracteres`);
      console.log('\n📝 TEXTO COMPLETO DA PÁGINA:\n');
      console.log(text);
      console.log('\n' + '='.repeat(80));

      // Check for procedure codes
      const codePattern = /A\s*\d+\.\d+\.\d+\.\d+/gi;
      const codes = text.match(codePattern);
      console.log(`\n🔍 Códigos encontrados: ${codes ? codes.length : 0}`);
      if (codes) {
        console.log('Códigos:', codes.slice(0, 10));
      }
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
  }
})();
