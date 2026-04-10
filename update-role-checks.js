import fs from 'fs';
import path from 'path';

const files = [
  'server/routes/dailyEntries.ts',
  'server/routes/patients.ts',
  'server/routes/planProcedures.ts',
  'server/routes/pendingTreatments.ts',
  'server/routes/revenueForecast.ts',
  'server/routes/advances.ts',
  'server/routes/tickets.ts',
];

files.forEach(filePath => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Replace patterns:
  // 1. "role === 'COLABORADOR'" with "(role === 'COLABORADOR' || role === 'MEDICO')"
  content = content.replace(
    /if \(role === ['"]COLABORADOR['"]\)/g,
    "if (role === 'COLABORADOR' || role === 'MEDICO')"
  );

  // 2. Comments "// COLABORADOR needs" with "// MEDICO and COLABORADOR need"
  content = content.replace(
    /\/\/ COLABORADOR needs? /g,
    '// MEDICO and COLABORADOR need '
  );

  // 3. "// Verificar se usuário tem acesso à clínica" checks
  content = content.replace(
    /\/\/ Verificar se usuário tem acesso à clínica\n(\s+)if \(role === ['"]COLABORADOR['"]\) \{/g,
    '// Verificar se usuário tem acesso à clínica\n$1if (role === \'COLABORADOR\' || role === \'MEDICO\') {'
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
  }
});

console.log('\n✅ All files updated!');
