import fs from 'fs';

const filePath = 'src/components/team/CollaboratorsTab.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Change function name
content = content.replace(
  'export default function Collaborators()',
  'export default function CollaboratorsTab()'
);

// 2. Add import for permission profiles at top after other imports
const importLine = "import { PERMISSION_PROFILES } from '@/lib/permissionProfiles'\nimport { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'";
content = content.replace(
  "import { useTranslation } from '@/hooks/useTranslation'",
  `import { useTranslation } from '@/hooks/useTranslation'\n${importLine}`
);

// 3. Add filter for collaborators only (after loadCollaborators line)
content = content.replace(
  'const data = await collaboratorsApi.list()\n      setCollaborators(data)',
  `const data = await collaboratorsApi.list()
      // Filter only non-doctor collaborators (role === 'COLABORADOR')
      const nonDoctorCollaborators = data.filter((c: any) => c.role === 'COLABORADOR')
      setCollaborators(nonDoctorCollaborators)`
);

// 4. Add selected profile state after createForm state
content = content.replace(
  "const [createForm, setCreateForm] = useState({\n    name: '',\n    email: '',\n    whatsapp: '',\n    password: '',\n  })",
  `const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    password: '',
  })

  // Selected permission profile
  const [selectedProfile, setSelectedProfile] = useState<string>('')`
);

// 5. Remove the "if (!isGestor())" block
const gestorCheckStart = content.indexOf('if (!isGestor()) {');
if (gestorCheckStart !== -1) {
  const gestorCheckEnd = content.indexOf('return (', gestorCheckStart);
  const returnStart = gestorCheckEnd;
  let braceCount = 1;
  let returnEnd = returnStart + 'return ('.length;

  while (braceCount > 0 && returnEnd < content.length) {
    if (content[returnEnd] === '(') braceCount++;
    if (content[returnEnd] === ')') braceCount--;
    returnEnd++;
  }

  // Skip closing brace and any whitespace
  while (returnEnd < content.length && content[returnEnd].match(/[\s}]/)) {
    returnEnd++;
  }

  content = content.substring(0, gestorCheckStart) + content.substring(returnEnd);
}

// 6. Remove page wrapper divs (className="p-8")
content = content.replace(
  '<div className="p-8">',
  '<>'
);
content = content.replace(
  '</div>\n\n      {/* Create Collaborator Modal',
  '</>\n\n      {/* Create Collaborator Modal'
);

// 7. Remove title section
const titleStart = content.indexOf('<div className="mb-6 flex items-center justify-between">');
const titleEnd = content.indexOf('</div>\n\n      <Card>', titleStart) + '</div>'.length;
content = content.substring(0, titleStart) +
  '<div className="mb-6 flex justify-end">\n        <Button onClick={() => setShowCreateModal(true)}>\n          <Plus className="mr-2 h-4 w-4" />\n          {t(\'collaborators.newCollaborator\')}\n        </Button>\n      </div>\n\n      <Card>' +
  content.substring(titleEnd);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ CollaboratorsTab modified successfully');
