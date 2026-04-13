# Marketing Hub - Documentação Completa

## 🎯 Visão Geral

O Marketing Hub é um módulo completo de análise e gestão de marketing digital integrado ao sistema de gestão de clínicas. Ele conecta-se à API do Instagram/Facebook (Meta) para coletar, armazenar e analisar métricas de redes sociais.

## ✅ Funcionalidades Implementadas

### 1. **Visão Geral** (Totalmente Funcional)
- **KPI Cards em tempo real:**
  - Impressões totais
  - Alcance único
  - Engajamento total
  - Contagem de seguidores

- **Gráficos históricos:**
  - Evolução de impressões (gráfico de área)
  - Evolução de alcance (gráfico de área)
  - Evolução de engajamento (gráfico de linha)
  - Evolução de seguidores (gráfico de área)

- **Sistema de coleta automática:**
  - Scheduler que roda às 00:05 diariamente
  - Salva métricas em `marketing_metrics_daily`
  - Histórico ilimitado (90+ dias, sem limite da API Instagram)

### 2. **Análise de Posts** (Totalmente Funcional)
- **Endpoints:**
  - `GET /api/marketing/meta/posts` - Lista posts com métricas
  - `POST /api/marketing/meta/collect-posts` - Coleta manual de métricas
- **Funcionalidades:**
  - Lista dos últimos 25 posts do Instagram
  - Métricas individuais por post:
    - Alcance, Impressões, Engajamento
    - Curtidas, Comentários, Salvos
    - Taxa de engajamento calculada
  - Top 3 posts com melhor performance
  - Tabela completa com link direto para posts
  - Diferenciação visual entre vídeos e imagens
  - Taxa de engajamento destacada (verde se > 5%)
  - **Sistema de preservação histórica de métricas:**
    - Coleta automática diária (via scheduler às 00:05)
    - Salva snapshots em `marketing_posts_metrics` antes de expirarem
    - Merge inteligente: dados históricos (DB) + dados atualizados (API)
    - Resolve limitação da API (insights disponíveis apenas 24-48h)

### 3. **Demografia da Audiência** (Totalmente Funcional)
- **Endpoint:** `GET /api/marketing/meta/audience`
- **Funcionalidades:**
  - **Gráfico de pizza:** Distribuição por gênero (M/F/Não especificado)
  - **Gráfico de barras:** Distribuição por faixa etária
  - **Top 10 cidades:** Lista ranking com contagem de seguidores
  - **Top 10 países:** Lista ranking com contagem de seguidores
  - Dados processados e agregados do Instagram
- **Implementação técnica:**
  - 3 requisições separadas para `follower_demographics`:
    1. `breakdown=age,gender` → distribuição por gênero e idade
    2. `breakdown=city` → top cidades
    3. `breakdown=country` → top países
  - Processa `total_value.breakdowns` da API v21.0
  - Consolida em estrutura unificada para o frontend

### 4. **Conversões** (Totalmente Funcional)
- **Endpoint:** `GET /api/marketing/conversions`
- **Funcionalidades:**
  - **Campo `source`** adicionado em `patients` e `appointments`
  - **KPI Cards:**
    - Total de pacientes com origem rastreada
    - Total de agendamentos com origem rastreada
    - Taxa de conversão (Agendamentos → Pacientes)
  - **Gráficos:**
    - Pacientes por origem (barra)
    - Agendamentos por origem (barra)
  - **Rankings:**
    - Top fontes de pacientes
    - Top fontes de agendamentos
  - **Tracking de origem:** INSTAGRAM, FACEBOOK, GOOGLE, REFERRAL, DIRECT, WEBSITE

### 5. **Leads via DM** (Estrutura Criada)
- **Tabela:** `marketing_leads` criada
- **Campos:** source, name, phone, email, message, instagram_user_id, status, assigned_to
- **Status:** NEW, CONTACTED, QUALIFIED, CONVERTED, LOST
- **UI:** Preview com explicação do recurso e requisitos técnicos
- **Próximos passos:** Implementar webhook Meta para captura automática

### 6. **Análise de Stories** (Preview)
- **UI:** Descrição completa de métricas disponíveis
- **Métricas planejadas:**
  - Visualizações totais, taxa de conclusão, alcance único
  - Cliques em links e stickers, compartilhamentos
  - Insights de melhor horário e tipo de conteúdo
- **Próximos passos:** Endpoint `/meta/stories` com insights da API

### 7. **Relatórios Executivos** (Preview)
- **UI:** Sistema de relatórios explicado
- **Funcionalidades planejadas:**
  - Geração automática mensal em PDF
  - Resumo executivo com todos os KPIs
  - Comparação mês a mês
  - Envio automático por email
  - Alertas de queda de performance
- **Próximos passos:** Implementar geração de PDF com jsPDF

## 🗄️ Estrutura de Banco de Dados

### Tabelas Criadas:

1. **`marketing_metrics_daily`**
   ```sql
   - clinic_id, provider, metric_date
   - impressions, reach, engagement, followers_count, profile_views
   - Histórico diário ilimitado
   ```

2. **`marketing_posts_metrics`** ✨ NOVO
   ```sql
   - clinic_id, provider, post_id, metric_date
   - post_type, caption, permalink, posted_at
   - reach, impressions, engagement, like_count, comments_count, saved
   - UNIQUE(clinic_id, provider, post_id, metric_date)
   - Preserva insights históricos além da janela de 24-48h da API
   ```

3. **`marketing_leads`**
   ```sql
   - clinic_id, source, name, phone, email, message
   - instagram_user_id, instagram_username, conversation_id
   - status, assigned_to, notes, metadata
   ```

4. **`patients` e `appointments`** (campos adicionados)
   ```sql
   - source VARCHAR(100) -- Tracking de origem
   ```

## 🔌 Endpoints da API

### OAuth & Status
- `GET /api/marketing/oauth/meta/start` - Inicia OAuth flow
- `GET /api/marketing/oauth/meta/callback` - Callback OAuth
- `GET /api/marketing/meta/status` - Verifica conexão
- `DELETE /api/marketing/oauth/meta/disconnect` - Desconecta

### Métricas
- `GET /api/marketing/meta/history` - Histórico de métricas do banco
- `GET /api/marketing/meta/insights` - Métricas em tempo real da API (legado)
- `POST /api/marketing/meta/collect` - Coleta manual de métricas

### Análises
- `GET /api/marketing/meta/posts` - Lista posts com insights (merge DB + API)
- `POST /api/marketing/meta/collect-posts` - Coleta manual de métricas de posts ✨ NOVO
- `GET /api/marketing/meta/audience` - Demografia da audiência
- `GET /api/marketing/conversions` - Dados de conversão por fonte

## 🤖 Schedulers Automáticos

### 1. **Meta Metrics Scheduler**
- **Arquivo:** `server/metaMetricsScheduler.ts`
- **Horário:** 00:05 diariamente (configurável via env)
- **Função:**
  - Coleta métricas diárias (reach, engagement, followers) de todas as clínicas
  - **Coleta métricas de posts recentes** (últimos 7 dias) ✨ NOVO
  - Salva snapshots em `marketing_posts_metrics` antes de expirarem (24-48h)
  - Preserva histórico completo de alcance, impressões, engajamento por post
- **Variáveis de ambiente:**
  ```
  META_METRICS_SCHEDULER_ENABLED=true
  META_METRICS_SCHEDULER_HOUR=0
  META_METRICS_SCHEDULER_MINUTES=5
  ```

## 🎨 Interface do Usuário

### Navegação por Abas:
1. **Visão Geral** - Dashboard principal com gráficos
2. **Posts** - Análise individual de publicações
3. **Audiência** - Demografia completa
4. **Conversões** - ROI e tracking de origem
5. **Leads** - Gestão de DMs (preview)
6. **Stories** - Análise de stories (preview)
7. **Relatórios** - PDFs automatizados (preview)

### Componentes:
- Filtros de período: 7, 30, 90 dias
- Botões "Atualizar" em cada aba
- Gráficos responsivos (Recharts)
- Tabelas interativas com hover
- Cards de KPIs destacados
- Loading states consistentes

## 📊 Métricas da API Instagram

### Disponíveis:
✅ `reach` - Alcance único
✅ `impressions` - Impressões (usando reach como proxy)
✅ `accounts_engaged` - Contas engajadas
✅ `profile_views` - Visualizações de perfil
✅ `followers_count` - Contagem de seguidores
✅ `like_count` - Curtidas por post
✅ `comments_count` - Comentários por post
✅ `saved` - Salvos por post
✅ `follower_demographics` - Demografia de seguidores (gênero, idade, cidade, país)

### Limitações da API:
⚠️ Máximo 30 dias por requisição (resolvido salvando diariamente)
⚠️ Necessário Instagram Business Account
⚠️ Token expira em ~60 dias (implementado long-lived token)

### Métricas Descontinuadas (removidas da API):
❌ `audience_gender_age` → substituída por `follower_demographics`
❌ `audience_city` → substituída por `follower_demographics`
❌ `audience_country` → substituída por `follower_demographics`

## 🔐 Segurança

- Tokens armazenados criptografados no banco
- Middleware `requirePermission('canViewMarketing')`
- OAuth stateless com validação de timestamp (10 min TTL)
- Verificação de expiração de token antes de cada chamada

## 🚀 Como Usar

### 1. Conectar Instagram
```
1. Vá em Configurações
2. Clique em "Conectar Meta"
3. Autorize o aplicativo
4. Aguarde confirmação
```

### 2. Acessar Dashboard
```
1. Menu lateral → Marketing
2. Escolha a aba desejada
3. Clique em "Atualizar" para carregar dados
4. Selecione o período (7/30/90 dias)
```

### 3. Tracking de Conversões
```
1. Ao cadastrar paciente/agendamento, preencha campo "source"
2. Valores: INSTAGRAM, FACEBOOK, GOOGLE, REFERRAL, DIRECT
3. Vá na aba "Conversões" para visualizar ROI
```

## 🛠️ Configuração de Ambiente

### Variáveis Necessárias:
```env
# Meta/Facebook App
META_APP_ID=842506878871048
META_APP_SECRET=xxxxx
META_REDIRECT_URI=http://localhost:3001/api/marketing/oauth/meta/callback
META_API_VERSION=v21.0
META_SCOPES=pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights

# Scheduler
META_METRICS_SCHEDULER_ENABLED=true
META_METRICS_SCHEDULER_HOUR=0
META_METRICS_SCHEDULER_MINUTES=5
```

## 📈 Roadmap - Próximos Passos

### Alta Prioridade:
1. **Webhook para DMs** - Captura automática de leads
2. **Análise de Stories** - Endpoint + UI funcional
3. **Relatórios PDF** - Geração automática mensal

### Média Prioridade:
4. **Sentimento de comentários** - NLP básico
5. **Agendamento de posts** - Criar calendário editorial
6. **Alertas automáticos** - Queda de engajamento

### Baixa Prioridade:
7. **Integração Google Business** - Métricas GMB
8. **Análise de concorrentes** - Benchmarking
9. **A/B Testing** - Comparação de posts

## 🐛 Troubleshooting

### Problema: Métricas aparecem como 0
**Solução:** A conta pode não ter atividade recente. Verifique se há posts nos últimos 30 dias.

### Problema: Token expirado
**Solução:** Desconecte e reconecte a conta em Configurações.

### Problema: Instagram não aparece
**Solução:** Certifique-se de ter Instagram Business Account conectado à Página do Facebook.

### Problema: Permissões negadas
**Solução:** Verifique se o app Meta tem as permissões: `instagram_basic`, `instagram_manage_insights`, `pages_show_list`, `pages_read_engagement`

### Problema: Posts antigos mostram apenas curtidas/comentários (sem alcance/engajamento)
**Explicação:** Instagram API fornece insights detalhados (reach, impressions, engagement) **apenas para posts das últimas 24-48 horas**. Para posts mais antigos, apenas likes e comentários estão disponíveis.

**Solução implementada:**
- Sistema de coleta automática diária (00:05) salva snapshots de métricas antes de expirarem
- Posts publicados **após a implementação** terão histórico completo preservado
- Posts publicados **antes da implementação** só terão likes/comentários (dados disponíveis)
- Coleta manual: `POST /api/marketing/meta/collect-posts` para salvar posts recentes agora

**Para novos posts:**
✅ Alcance, Impressões, Engajamento serão preservados para sempre
✅ Histórico completo em `marketing_posts_metrics`
✅ Dashboard mostrará métricas completas mesmo após meses

## 📝 Notas Técnicas

- Frontend: React 19 + TypeScript + Vite
- Backend: Node.js + Express 5 + TypeScript
- Charts: Recharts (área, linha, barra, pizza)
- Database: PostgreSQL com queries diretas (sem ORM)
- Scheduler: setTimeout recursivo com cálculo de próxima execução
- OAuth: Stateless com state em base64url

## 🎓 Documentação da API Meta

- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api/)
- [Instagram Insights](https://developers.facebook.com/docs/instagram-api/guides/insights)
- [OAuth for Instagram](https://developers.facebook.com/docs/instagram-basic-display-api/overview)

---

**Versão:** 1.0.0
**Data:** Abril 2026
**Status:** Produção (Visão Geral, Posts, Audiência, Conversões) | Preview (Leads, Stories, Relatórios)
