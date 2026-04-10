import fs from 'fs';
import path from 'path';

const files = [
  'src/pages/Reports.tsx',
  'src/pages/Inputs.tsx',
  'src/hooks/usePermissions.ts',
  'src/pages/Dashboard.tsx',
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
    /role === ['"]COLABORADOR['"]/g,
    "(role === 'COLABORADOR' || role === 'MEDICO')"
  );

  // 2. "user.role === 'COLABORADOR'" with "(user.role === 'COLABORADOR' || user.role === 'MEDICO')"
  content = content.replace(
    /user\.role === ['"]COLABORADOR['"]/g,
    "(user.role === 'COLABORADOR' || user.role === 'MEDICO')"
  );

  // 3. "user?.role === 'COLABORADOR'" with "(user?.role === 'COLABORADOR' || user?.role === 'MEDICO')"
  content = content.replace(
    /user\?\.role === ['"]COLABORADOR['"]/g,
    "(user?.role === 'COLABORADOR' || user?.role === 'MEDICO')"
  );

  if (content !== originalContent) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
  } else {
    console.log(`ℹ️  No changes needed: ${filePath}`);
  }
});

console.log('\n✅ All frontend files updated!');
