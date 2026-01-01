# Integração com Neon PostgreSQL

Este documento descreve como foi configurada a integração do Painel KPI com o banco de dados Neon PostgreSQL.

## 📋 Estrutura do Projeto

```
painel-kpi/
├── server/                    # Backend Express + PostgreSQL
│   ├── db.ts                 # Configuração da conexão com Neon
│   ├── index.ts              # Servidor Express principal
│   ├── migrate.ts            # Script de migração do schema
│   ├── seed.ts               # Script de seed de dados iniciais
│   ├── schema.sql            # Schema completo do banco de dados
│   ├── tsconfig.json         # Config TypeScript do servidor
│   └── routes/
│       ├── auth.ts           # Rotas de autenticação
│       ├── clinics.ts        # Rotas de clínicas
│       ├── monthlyData.ts    # Rotas de dados mensais
│       └── dailyEntries.ts   # Rotas de entradas diárias
├── src/                      # Frontend React (existente)
└── .env                      # Variáveis de ambiente

```

## 🗄️ Schema do Banco de Dados

O schema foi criado com base nos tipos TypeScript existentes e inclui as seguintes tabelas:

### Tabelas Principais
- **users** - Usuários do sistema (MENTORA, GESTOR_CLINICA)
- **clinics** - Clínicas com configurações e metas
- **monthly_data** - Dados mensais agregados
- **monthly_cabinet_data** - Dados de gabinetes por mês

### Tabelas de Configuração
- **clinic_categories** - Categorias de serviços
- **clinic_cabinets** - Gabinetes da clínica
- **clinic_doctors** - Médicos da clínica
- **clinic_sources** - Fontes de pacientes
- **clinic_campaigns** - Campanhas de marketing

### Tabelas de Entradas Diárias
- **daily_financial_entries** - Entradas financeiras diárias
- **daily_consultation_entries** - Consultas diárias
- **daily_prospecting_entries** - Prospecção diária
- **daily_cabinet_usage_entries** - Uso de gabinetes diário
- **daily_service_time_entries** - Tempo de atendimento diário
- **daily_source_entries** - Fontes de pacientes diárias

## 🚀 Como Usar

### 1. Configuração Inicial

As variáveis de ambiente já foram configuradas no arquivo `.env`:

```bash
DATABASE_URL=postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:8080
```

### 2. Migração e Seed

Execute o setup completo do banco de dados (já foi executado):

```bash
npm run db:setup
```

Ou execute os comandos separadamente:

```bash
# Apenas migração (cria as tabelas)
npm run db:migrate

# Apenas seed (popula dados iniciais)
npm run db:seed
```

### 3. Iniciar o Servidor

```bash
# Modo desenvolvimento (com hot reload)
npm run server

# Ou com nodemon
npm run server:dev
```

O servidor estará disponível em `http://localhost:3001`

### 4. Iniciar o Frontend

Em outro terminal:

```bash
npm run dev
```

O frontend estará disponível em `http://localhost:8080`

## 📡 Endpoints da API

### Autenticação
- `POST /api/auth/login` - Login de usuário
- `POST /api/auth/logout` - Logout

### Clínicas
- `GET /api/clinics` - Listar todas as clínicas
- `GET /api/clinics/:id` - Obter detalhes de uma clínica

### Dados Mensais
- `GET /api/monthly-data/:clinicId/:year/:month` - Dados de um mês específico
- `GET /api/monthly-data/:clinicId/:year` - Dados de todo o ano

### Entradas Diárias

#### Financeiras
- `GET /api/daily-entries/financial/:clinicId` - Listar entradas
- `POST /api/daily-entries/financial/:clinicId` - Criar entrada

#### Consultas
- `GET /api/daily-entries/consultation/:clinicId` - Listar consultas
- `POST /api/daily-entries/consultation/:clinicId` - Criar consulta

#### Prospecção
- `GET /api/daily-entries/prospecting/:clinicId/:date` - Obter por data
- `POST /api/daily-entries/prospecting/:clinicId` - Criar/atualizar

#### Uso de Gabinetes
- `GET /api/daily-entries/cabinet/:clinicId` - Listar entradas
- `POST /api/daily-entries/cabinet/:clinicId` - Criar entrada

#### Tempo de Atendimento
- `GET /api/daily-entries/service-time/:clinicId` - Listar entradas
- `POST /api/daily-entries/service-time/:clinicId` - Criar entrada

#### Fontes
- `GET /api/daily-entries/source/:clinicId` - Listar entradas
- `POST /api/daily-entries/source/:clinicId` - Criar entrada

## 👥 Usuários de Teste

O seed cria dois usuários de teste:

**Mentora:**
- Email: `mentor@kpipanel.com`
- Senha: `mentor123`

**Gestor de Clínica:**
- Email: `clinica@kpipanel.com`
- Senha: `clinica123`

## 🔧 Próximos Passos

Para completar a integração, você precisa:

1. **Atualizar os stores do frontend** (`src/stores/useDataStore.tsx` e `useAuthStore.tsx`) para fazer chamadas HTTP às APIs ao invés de usar dados mockados

2. **Criar um serviço de API** no frontend (ex: `src/services/api.ts`) para centralizar as chamadas HTTP

3. **Implementar tratamento de erros** e loading states no frontend

4. **Adicionar autenticação real** com JWT ou sessões (atualmente usa comparação simples de senha)

5. **Implementar agregação automática** de dados diários para dados mensais

## 🔒 Segurança

**IMPORTANTE:**
- O arquivo `.env` contém credenciais sensíveis e já está no `.gitignore`
- Em produção, use variáveis de ambiente adequadas
- Implemente autenticação adequada (JWT, bcrypt para senhas, etc.)
- Considere adicionar rate limiting e validação de dados

## 📊 Estrutura de Dados

Todos os dados seguem os mesmos tipos definidos em `src/lib/types.ts`, garantindo consistência entre frontend e backend.

## 🐛 Troubleshooting

**Erro de conexão com o banco:**
- Verifique se a `DATABASE_URL` está correta no `.env`
- Confirme que o Neon permite conexões do seu IP

**Porta 3001 já em uso:**
- Altere a porta no `.env` (`PORT=3002`)
- Ou mate o processo que está usando a porta: `lsof -ti:3001 | xargs kill`

**Erro nas migrações:**
- Delete todas as tabelas e execute novamente: `npm run db:migrate`

## 📝 Notas Adicionais

- O banco usa UUID para IDs (gerados automaticamente)
- Timestamps são gerenciados automaticamente (`created_at`, `updated_at`)
- Dados JSONB são usados para flexibilidade em agregações
- Índices foram criados para otimizar consultas frequentes
