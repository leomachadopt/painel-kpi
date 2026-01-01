# Sistema de Pacientes com Código de 6 Dígitos

Este documento explica o novo sistema de gerenciamento de pacientes com código de 6 dígitos e auto-preenchimento.

## 📋 Funcionalidades

### 1. Código de 6 Dígitos
- Cada paciente tem um código único de **exatamente 6 dígitos**
- O código é único por clínica
- Formato: `000000` a `999999`

### 2. Auto-Preenchimento Inteligente

Quando você digita um código de 6 dígitos em qualquer formulário:

**Se o código JÁ EXISTE:**
- ✅ O nome do paciente é automaticamente preenchido
- ✅ O campo de nome fica desabilitado (não pode ser editado)
- ✅ Um ícone de verificação verde aparece

**Se o código NÃO EXISTE:**
- 📝 Um diálogo aparece para cadastrar novo paciente
- 📝 Você pode preencher: Nome (obrigatório), Email, Telefone
- 📝 O paciente é criado automaticamente
- ✅ O nome é preenchido após a criação

### 3. Listagem de Pacientes na Sidebar

Na sidebar lateral, você encontra:
- 👥 **Botão "Pacientes"** - Clique para expandir/recolher a lista
- 🔍 **Campo de busca** - Busca por nome ou código
- 📋 **Lista completa** - Todos os pacientes da clínica
- 📧 **Informações** - Email e telefone quando disponíveis

## 🎯 Como Usar

### Cadastrar Novo Paciente (Via Formulário)

1. Abra qualquer formulário de entrada diária (Financeiro, Consultas, etc.)
2. Digite um código de 6 dígitos que não existe
3. O sistema abrirá automaticamente o diálogo de cadastro
4. Preencha o nome do paciente (obrigatório)
5. Opcionalmente, adicione email e telefone
6. Clique em "Criar Paciente"
7. Pronto! O nome será preenchido automaticamente

### Usar Paciente Existente

1. Digite o código de 6 dígitos do paciente
2. O nome será preenchido automaticamente
3. Continue preenchendo o resto do formulário

### Ver Lista de Pacientes

1. Na sidebar, clique no botão "👥 Pacientes"
2. A lista será expandida mostrando todos os pacientes
3. Use a busca para filtrar por nome ou código
4. Clique em qualquer paciente para ver detalhes

## 🔧 Componentes Disponíveis

### PatientCodeInput

Componente reutilizável para formulários:

```tsx
import { PatientCodeInput } from '@/components/PatientCodeInput'

function MyForm() {
  const [code, setCode] = useState('')
  const [name, setName] = useState('')

  return (
    <PatientCodeInput
      clinicId={clinicId}
      value={code}
      onCodeChange={setCode}
      patientName={name}
      onPatientNameChange={setName}
      label="Código do Paciente"
      required
    />
  )
}
```

### PatientList

Componente de listagem para sidebar:

```tsx
import { PatientList } from '@/components/PatientList'

<PatientList clinicId={clinicId} />
```

### usePatientLookup Hook

Hook para lógica de busca e criação:

```tsx
import { usePatientLookup } from '@/hooks/usePatientLookup'

function MyComponent() {
  const { patient, loading, error, lookupByCode, createPatient } = usePatientLookup()

  const handleLookup = async () => {
    const found = await lookupByCode(clinicId, '123456')
    if (!found) {
      // Paciente não encontrado, criar novo
      await createPatient(clinicId, {
        code: '123456',
        name: 'João Silva',
        email: 'joao@exemplo.com'
      })
    }
  }
}
```

## 📡 APIs Disponíveis

### GET /api/patients/:clinicId
Listar todos os pacientes de uma clínica

**Query Parameters:**
- `search` - Filtrar por nome ou código (opcional)

**Exemplo:**
```bash
curl http://localhost:3001/api/patients/clinic-1?search=silva
```

### GET /api/patients/:clinicId/code/:code
Buscar paciente por código de 6 dígitos

**Exemplo:**
```bash
curl http://localhost:3001/api/patients/clinic-1/code/123456
```

### POST /api/patients/:clinicId
Criar novo paciente

**Body:**
```json
{
  "code": "123456",
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "phone": "+351 900 000 000"
}
```

### PUT /api/patients/:clinicId/:patientId
Atualizar dados do paciente

**Body:**
```json
{
  "name": "João da Silva",
  "email": "joao.silva@exemplo.com",
  "phone": "+351 900 000 001"
}
```

### DELETE /api/patients/:clinicId/:patientId
Remover paciente

## 🗄️ Estrutura do Banco de Dados

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES clinics(id),
  code VARCHAR(6) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  birth_date DATE,
  notes TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  UNIQUE(clinic_id, code)
);
```

## 🎨 Exemplo de Integração em Formulários

Aqui está um exemplo de como integrar em seus formulários existentes:

```tsx
import { useState } from 'react'
import { PatientCodeInput } from '@/components/PatientCodeInput'
import { Button } from '@/components/ui/button'

export function DailyFinancialForm({ clinicId }: { clinicId: string }) {
  const [code, setCode] = useState('')
  const [patientName, setPatientName] = useState('')
  const [value, setValue] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Aqui você já tem:
    // - code: código de 6 dígitos
    // - patientName: nome preenchido automaticamente

    await api.dailyEntries.financial.create(clinicId, {
      date: new Date().toISOString().split('T')[0],
      code,
      patientName,
      value: parseFloat(value),
      // ... outros campos
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <PatientCodeInput
        clinicId={clinicId}
        value={code}
        onCodeChange={setCode}
        patientName={patientName}
        onPatientNameChange={setPatientName}
        required
      />

      <input
        type="number"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Valor"
        required
      />

      <Button type="submit">Salvar</Button>
    </form>
  )
}
```

## ✅ Validações

O sistema inclui as seguintes validações:

- ✅ Código deve ter exatamente 6 dígitos numéricos
- ✅ Código é único por clínica
- ✅ Nome é obrigatório ao criar paciente
- ✅ Email é validado se fornecido
- ✅ Não permite criar paciente com código duplicado

## 🚀 Próximos Passos

Para usar este sistema em seu aplicativo:

1. **Migrar formulários existentes** - Substitua os campos de código e nome por `<PatientCodeInput>`
2. **Testar fluxos** - Teste criação de novos pacientes e busca de existentes
3. **Ajustar validações** - Adicione validações específicas conforme necessário
4. **Personalizar UI** - Ajuste estilos e mensagens conforme identidade visual

## 📝 Notas Importantes

- O código do paciente **não pode ser alterado** após criação
- Pacientes são vinculados à clínica específica
- A busca é case-insensitive
- O sistema suporta busca parcial (ex: "silva" encontra "João Silva")
