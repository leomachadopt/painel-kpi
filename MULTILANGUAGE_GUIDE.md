# Guia de Internacionalização (i18n)

Este documento descreve como o sistema multi-idioma foi implementado e como usá-lo.

## Idiomas Suportados

O sistema suporta 6 idiomas:
- **Português (Brasil)** - `pt-BR` (padrão)
- **Português (Portugal)** - `pt-PT`
- **Italiano** - `it`
- **Espanhol** - `es`
- **Inglês** - `en`
- **Francês** - `fr`

## Arquitetura

### 1. Banco de Dados

**Migration:** `server/migrations/063_add_language_support.sql`

Campos adicionados:
- `clinics.language` - Idioma padrão da clínica
- `users.language` - Idioma pessoal do usuário (opcional)

### 2. Backend (API)

**Endpoints:**

- `PUT /api/auth/language` - Atualizar idioma do usuário
  ```json
  { "language": "pt-BR" | "pt-PT" | "it" | "es" | "en" | "fr" | null }
  ```

- `PUT /api/auth/profile` - Atualizar perfil (incluindo idioma)
  ```json
  { "name": "...", "email": "...", "language": "..." }
  ```

- `PUT /api/clinics/:id` - Atualizar clínica (incluindo idioma)
  ```json
  { "language": "pt-BR" | "pt-PT" | "it" | "es" | "en" | "fr" }
  ```

### 3. Frontend

**Bibliotecas:**
- `i18next` - Core de tradução
- `react-i18next` - Integração com React
- `i18next-browser-languagedetector` - Detecção automática de idioma

**Arquivos principais:**
- `src/lib/i18n.ts` - Configuração do i18next
- `src/hooks/useLanguage.ts` - Hook para gerenciar idioma do usuário/clínica (auto-inicialização)
- `src/hooks/useTranslation.ts` - Hook de tradução (wrapper do i18next com compatibilidade)
- `src/components/LanguageSelector.tsx` - Componente de seleção de idioma
- `src/components/settings/LanguageSettings.tsx` - Página de configurações de idioma

**Arquivos de tradução:**
```
src/locales/
├── pt-BR/
│   └── common.json
├── pt-PT/
│   └── common.json
├── it/
│   └── common.json
├── es/
│   └── common.json
├── en/
│   └── common.json
└── fr/
    └── common.json
```

## Hierarquia de Idiomas

O sistema segue esta ordem de prioridade:

1. **Idioma Pessoal do Usuário** (`users.language`)
   - Se o usuário definiu um idioma específico, este será usado

2. **Idioma da Clínica** (`clinics.language`)
   - Se o usuário não definiu idioma pessoal, usa o idioma da clínica

3. **Idioma do Navegador**
   - Detectado automaticamente se não houver configuração

4. **Idioma Padrão** (`pt-BR`)
   - Fallback final

## Como Usar

### 1. Em Componentes React

**IMPORTANTE:** Use o hook `useTranslation` de `@/hooks/useTranslation` (não de `react-i18next` diretamente):

```tsx
import { useTranslation } from '@/hooks/useTranslation'

function MyComponent() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t('common.save')}</h1>
      <p>{t('auth.loginTitle')}</p>
    </div>
  )
}
```

**Por quê?** O hook customizado é um wrapper do i18next que:
- Mantém compatibilidade com o código legado
- Adiciona funções de formatação (formatCurrency, formatDate, etc.)
- Integra com o sistema de hierarquia de idiomas
- Usa o i18next internamente para suportar os 6 idiomas

### 2. Hook de Idioma

```tsx
import { useLanguage } from '@/hooks/useLanguage'

function LanguageInfo() {
  const {
    language,              // Idioma atual
    effectiveLanguage,     // Idioma efetivo (usuário ou clínica)
    userLanguage,          // Idioma do usuário
    clinicLanguage,        // Idioma da clínica
    changeLanguage,        // Função para mudar idioma
    isLanguageFromUser,    // Se está usando idioma do usuário
    isLanguageFromClinic   // Se está usando idioma da clínica
  } = useLanguage()

  return (
    <div>
      <p>Idioma atual: {language}</p>
      <button onClick={() => changeLanguage('en')}>
        Mudar para Inglês
      </button>
    </div>
  )
}
```

### 3. Componente de Seleção de Idioma

```tsx
import { LanguageSelector } from '@/components/LanguageSelector'

function MySettings() {
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('pt-BR')

  return (
    <LanguageSelector
      value={selectedLanguage}
      onChange={setSelectedLanguage}
      showLabel={true}
      showClearOption={true}
      clearOptionLabel="Usar idioma da clínica"
    />
  )
}
```

## Adicionar Novas Traduções

### 1. Adicionar nova chave de tradução

Edite cada arquivo de idioma em `src/locales/*/common.json`:

```json
{
  "myFeature": {
    "title": "Meu Recurso",
    "description": "Descrição do recurso",
    "action": "Fazer algo"
  }
}
```

### 2. Usar no componente

```tsx
const { t } = useTranslation()

<h1>{t('myFeature.title')}</h1>
<p>{t('myFeature.description')}</p>
<button>{t('myFeature.action')}</button>
```

## Adicionar Novos Idiomas

### 1. Atualizar Migration

Edite `server/migrations/063_add_language_support.sql`:

```sql
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'pt-BR'
CHECK (language IN ('pt-BR', 'pt-PT', 'it', 'es', 'en', 'fr', 'de')); -- Adicionar 'de'
```

### 2. Criar arquivo de tradução

Crie `src/locales/de/common.json` com todas as traduções.

### 3. Atualizar configuração i18n

Edite `src/lib/i18n.ts`:

```ts
import deCommon from '@/locales/de/common.json'

export const LANGUAGES = ['pt-BR', 'pt-PT', 'it', 'es', 'en', 'fr', 'de'] as const

// ...

i18n.init({
  resources: {
    // ...
    de: { common: deCommon }
  }
})
```

### 4. Adicionar nome do idioma

Em cada arquivo `common.json`, adicione:

```json
{
  "languages": {
    "de": "Alemão" // ou "Deutsch" em alemão
  }
}
```

## Configuração de Idioma

### Para Usuários

1. Acesse **Configurações** → Aba **Idioma**
2. Selecione seu idioma preferido em **Idioma Pessoal**
3. Ou escolha "Usar idioma da clínica" para herdar da clínica
4. Clique em **Salvar**

### Para Administradores (MENTOR)

1. Acesse **Configurações** → Aba **Idioma**
2. Configure o **Idioma da Clínica** (padrão para todos os colaboradores)
3. Clique em **Salvar**

## Boas Práticas

1. **Sempre use chaves de tradução** ao invés de texto fixo
2. **Organize as chaves** em namespaces lógicos (common, auth, settings, etc.)
3. **Mantenha consistência** entre idiomas
4. **Teste todos os idiomas** antes de fazer deploy
5. **Use interpolação** para valores dinâmicos:
   ```tsx
   t('welcome.message', { name: user.name })
   ```
6. **Pluralização** quando necessário:
   ```json
   {
     "items": {
       "zero": "Nenhum item",
       "one": "{{count}} item",
       "other": "{{count}} itens"
     }
   }
   ```

## Exemplo Completo

```tsx
import { useTranslation } from 'react-i18next'
import { useLanguage } from '@/hooks/useLanguage'
import { LanguageSelector } from '@/components/LanguageSelector'

function ProfileSettings() {
  const { t } = useTranslation()
  const { userLanguage, changeLanguage } = useLanguage()
  const [language, setLanguage] = useState(userLanguage)

  const handleSave = async () => {
    await changeLanguage(language)
    toast.success(t('success.saved'))
  }

  return (
    <div>
      <h1>{t('settings.title')}</h1>
      <p>{t('settings.languageDescription')}</p>

      <LanguageSelector
        value={language}
        onChange={setLanguage}
        showClearOption
      />

      <button onClick={handleSave}>
        {t('common.save')}
      </button>
    </div>
  )
}
```

## Debugging

### Ver idioma atual

```tsx
import { useTranslation } from 'react-i18next'

function Debug() {
  const { i18n } = useTranslation()

  return <div>Current language: {i18n.language}</div>
}
```

### Forçar mudança de idioma (para testes)

```tsx
import i18n from '@/lib/i18n'

// Em qualquer lugar do código
i18n.changeLanguage('en')
```

### Verificar traduções faltando

O console mostrará avisos quando uma tradução não for encontrada:
```
Missing translation: myFeature.title for language: en
```

## Troubleshooting

### Idioma não muda após salvar
- Verifique se o endpoint da API está funcionando
- Verifique o localStorage: `localStorage.getItem('i18nextLng')`
- Limpe o cache do navegador
- A página recarrega automaticamente após salvar

### Traduções não aparecem
- Verifique se o arquivo JSON está bem formatado
- Verifique se a chave de tradução está correta
- Verifique se o namespace está correto (padrão: 'common')

### Idioma da clínica não está sendo herdado
- Verifique se o campo `language` existe na tabela `clinics`
- Execute a migration 063 se necessário
- Verifique se o hook `useLanguage` está sendo chamado corretamente

## Suporte

Para questões ou sugestões sobre internacionalização, consulte:
- Documentação do i18next: https://www.i18next.com/
- Documentação do react-i18next: https://react.i18next.com/
