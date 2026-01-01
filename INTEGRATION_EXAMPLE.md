# Exemplo de Integração do PatientCodeInput

Este documento mostra como integrar o novo sistema de pacientes nos formulários existentes.

## 📋 Exemplo: DailyFinancials.tsx

### ❌ ANTES (Código Antigo)

```tsx
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'

export function DailyFinancials({ clinic }: { clinic: Clinic }) {
  const form = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      patientName: '',  // ❌ Campo manual
      code: '',          // ❌ Campo manual
      categoryId: '',
      value: 0,
    },
  })

  return (
    <Form {...form}>
      {/* ❌ Campos separados sem validação */}
      <FormField
        control={form.control}
        name="code"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Código</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="patientName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Nome do Paciente</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Outros campos... */}
    </Form>
  )
}
```

### ✅ DEPOIS (Código Novo com PatientCodeInput)

```tsx
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { PatientCodeInput } from '@/components/PatientCodeInput'  // ✅ Novo componente
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'

export function DailyFinancials({ clinic }: { clinic: Clinic }) {
  // ✅ Estados para o PatientCodeInput
  const [patientCode, setPatientCode] = useState('')
  const [patientName, setPatientName] = useState('')

  const form = useForm({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
      value: 0,
    },
  })

  const onSubmit = (data: any) => {
    // ✅ Usar patientCode e patientName dos estados
    addFinancialEntry(clinic.id, {
      id: Math.random().toString(36),
      date: data.date,
      patientName: patientName,  // ✅ Do estado
      code: patientCode,          // ✅ Do estado
      categoryId: data.categoryId,
      value: data.value,
      cabinetId: data.cabinetId,
    })

    // ✅ Limpar estados após envio
    setPatientCode('')
    setPatientName('')
    form.reset()
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* ✅ Componente PatientCodeInput integrado */}
        <PatientCodeInput
          clinicId={clinic.id}
          value={patientCode}
          onCodeChange={setPatientCode}
          patientName={patientName}
          onPatientNameChange={setPatientName}
          label="Paciente"
          required
        />

        {/* Outros campos continuam normais */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* ... outros campos ... */}
      </form>
    </Form>
  )
}
```

## 🎯 Mudanças Principais

### 1. **Importações**
```tsx
// ✅ Adicionar
import { useState } from 'react'
import { PatientCodeInput } from '@/components/PatientCodeInput'
```

### 2. **Estados para Código e Nome**
```tsx
// ✅ Adicionar no início do componente
const [patientCode, setPatientCode] = useState('')
const [patientName, setPatientName] = useState('')
```

### 3. **Remover campos do schema**
```tsx
// ❌ REMOVER do schema do react-hook-form
const schema = z.object({
  // code: z.string().min(1),        // ❌ Remover
  // patientName: z.string().min(1), // ❌ Remover
  // ... manter outros campos
})
```

### 4. **Substituir inputs por PatientCodeInput**
```tsx
// ❌ REMOVER os FormFields de code e patientName

// ✅ ADICIONAR o componente PatientCodeInput
<PatientCodeInput
  clinicId={clinic.id}
  value={patientCode}
  onCodeChange={setPatientCode}
  patientName={patientName}
  onPatientNameChange={setPatientName}
  required
/>
```

### 5. **Usar estados no onSubmit**
```tsx
const onSubmit = (data: any) => {
  addFinancialEntry(clinic.id, {
    // ... outros campos de data
    code: patientCode,      // ✅ Do estado
    patientName: patientName, // ✅ Do estado
  })

  // ✅ Limpar estados
  setPatientCode('')
  setPatientName('')
}
```

## 📝 Checklist de Integração

Para cada formulário que precisa do sistema de pacientes:

- [ ] Importar `PatientCodeInput` e `useState`
- [ ] Criar estados `patientCode` e `patientName`
- [ ] Remover campos de `code` e `patientName` do schema
- [ ] Substituir FormFields por `<PatientCodeInput />`
- [ ] Atualizar `onSubmit` para usar os estados
- [ ] Adicionar reset dos estados após submit
- [ ] Testar criação de novo paciente
- [ ] Testar busca de paciente existente

## 🎨 Customizações Disponíveis

### Props do PatientCodeInput

```tsx
interface PatientCodeInputProps {
  clinicId: string              // ✅ Obrigatório
  value: string                 // ✅ Obrigatório
  onCodeChange: (code: string) => void  // ✅ Obrigatório
  patientName: string           // ✅ Obrigatório
  onPatientNameChange: (name: string) => void  // ✅ Obrigatório
  label?: string                // ⚙️ Opcional (padrão: "Código do Paciente")
  required?: boolean            // ⚙️ Opcional (padrão: true)
}
```

### Exemplo com Props Customizadas

```tsx
<PatientCodeInput
  clinicId={clinic.id}
  value={code}
  onCodeChange={setCode}
  patientName={name}
  onPatientNameChange={setName}
  label="Identificação do Paciente"  // ⚙️ Label customizado
  required={false}                   // ⚙️ Opcional
/>
```

## ✅ Benefícios

Ao migrar para o novo sistema:

1. ✅ **Auto-preenchimento** - Nome preenchido automaticamente
2. ✅ **Validação automática** - Código sempre com 6 dígitos
3. ✅ **Cadastro inline** - Criar paciente sem sair do formulário
4. ✅ **Busca inteligente** - Encontra paciente pelo código
5. ✅ **UX melhorado** - Feedback visual instantâneo
6. ✅ **Menos erros** - Impossível digitar nome errado de paciente existente
7. ✅ **Gestão centralizada** - Todos pacientes numa única tabela

## 🚀 Próximos Formulários a Migrar

Migre os seguintes componentes na ordem sugerida:

1. ✅ **DailyFinancials** (exemplo acima)
2. [ ] **DailyConsultations** - Similar ao DailyFinancials
3. [ ] **DailyServiceTime** - Mesmo padrão
4. [ ] **DailySources** - Mesmo padrão

Todos seguem o mesmo padrão de integração mostrado acima.
