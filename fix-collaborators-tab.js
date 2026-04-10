import fs from 'fs';

const filePath = 'src/components/team/CollaboratorsTab.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Remove duplicate Card opening tag (line 255)
content = content.replace(
  '      <Card>\n\n      <Card>',
  '      <Card>'
);

// Fix closing tag (change </div> to </>)
content = content.replace(
  '    </div>\n  )\n}',
  '    </>\n  )\n}'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Fixed CollaboratorsTab');
