# Guia de Integração - Meta (Facebook/Instagram) e Google My Business

## Integração com Meta (Facebook/Instagram)

### 1. Criar um App no Meta for Developers

1. Acesse https://developers.facebook.com/apps/
2. Clique em **"Criar App"**
3. Selecione o tipo de app: **"Consumidor"** ou **"Empresa"**
4. Preencha as informações:
   - **Nome do App**: Nome da sua aplicação
   - **Email de contato**: Seu email
   - **Categoria**: Escolha "Business and Pages"

### 2. Configurar o App

Após criar o app, você precisará configurar:

#### A. Adicionar Produtos
1. No dashboard do app, clique em **"Adicionar produto"**
2. Adicione os seguintes produtos:
   - **Facebook Login**
   - **Instagram Basic Display** (se for usar Instagram)

#### B. Configurar Facebook Login
1. No menu lateral, clique em **"Facebook Login" > "Configurações"**
2. Em **"URIs de redirecionamento do OAuth válidos"**, adicione:
   ```
   http://localhost:3001/api/marketing/oauth/meta/callback
   ```

   **IMPORTANTE**: Para produção, você precisará adicionar também:
   ```
   https://seu-dominio.com/api/marketing/oauth/meta/callback
   ```

#### C. Obter as Credenciais
1. No menu lateral, clique em **"Configurações" > "Básico"**
2. Copie:
   - **ID do aplicativo** → Este é o `META_APP_ID`
   - **Chave secreta do aplicativo** → Este é o `META_APP_SECRET`

### 3. Configurar Permissões

1. No dashboard, vá em **"Casos de Uso"** ou **"Permissões e Recursos"**
2. Solicite as seguintes permissões:
   - `pages_show_list` - Listar páginas
   - `pages_read_engagement` - Ler engajamento das páginas
   - `instagram_basic` - Acesso básico ao Instagram
   - `instagram_manage_insights` - Insights do Instagram

**Nota**: Algumas permissões podem exigir revisão do Meta.

### 4. Atualizar o arquivo .env

Abra o arquivo `.env` e substitua os valores placeholders:

```env
META_APP_ID=cole_seu_app_id_aqui
META_APP_SECRET=cole_sua_app_secret_aqui
META_REDIRECT_URI=http://localhost:3001/api/marketing/oauth/meta/callback
```

### 5. Modo de Desenvolvimento vs Produção

- **Desenvolvimento**: O app estará em modo de desenvolvimento por padrão. Apenas você e testadores adicionados no dashboard poderão usar a integração.
- **Produção**: Para liberar para todos os usuários:
  1. Complete todos os requisitos do Meta
  2. Envie o app para revisão
  3. Aguarde aprovação (pode levar alguns dias)

---

## Integração com Google My Business

### 1. Criar um Projeto no Google Cloud Console

1. Acesse https://console.cloud.google.com/
2. Crie um novo projeto ou selecione um existente
3. Dê um nome ao projeto (ex: "Painel KPI")

### 2. Ativar as APIs necessárias

1. No menu lateral, vá em **"APIs e Serviços" > "Biblioteca"**
2. Procure e ative as seguintes APIs:
   - **Google My Business API**
   - **Google My Business Account Management API**

### 3. Configurar OAuth 2.0

1. No menu lateral, clique em **"APIs e Serviços" > "Credenciais"**
2. Clique em **"Criar credenciais" > "ID do cliente OAuth"**
3. Escolha **"Aplicativo da Web"**
4. Configure:
   - **Nome**: Nome da sua aplicação
   - **Origens JavaScript autorizadas**:
     ```
     http://localhost:8080
     http://localhost:3001
     ```
   - **URIs de redirecionamento autorizados**:
     ```
     http://localhost:3001/api/marketing/oauth/google/callback
     ```

### 4. Obter as Credenciais

Após criar, você verá:
- **ID do cliente** → Este é o `GOOGLE_CLIENT_ID`
- **Chave secreta do cliente** → Este é o `GOOGLE_CLIENT_SECRET`

### 5. Atualizar o arquivo .env

```env
GOOGLE_CLIENT_ID=cole_seu_client_id_aqui
GOOGLE_CLIENT_SECRET=cole_seu_client_secret_aqui
GOOGLE_REDIRECT_URI=http://localhost:3001/api/marketing/oauth/google/callback
```

### 6. Configurar Tela de Consentimento OAuth

1. Vá em **"APIs e Serviços" > "Tela de consentimento OAuth"**
2. Escolha **"Externo"** (ou "Interno" se for Google Workspace)
3. Preencha as informações obrigatórias:
   - Nome do aplicativo
   - Email de suporte do usuário
   - Domínio da página inicial (pode ser http://localhost:8080 para testes)
   - Email de contato do desenvolvedor
4. Em **"Escopos"**, adicione os escopos necessários para Google My Business
5. Adicione usuários de teste (seus emails) enquanto o app estiver em desenvolvimento

---

## Testando as Integrações

### 1. Reinicie o servidor
```bash
# Pare o servidor atual (Ctrl+C)
# Reinicie:
npm run dev
# ou
pnpm dev
```

### 2. Teste no navegador
1. Acesse http://localhost:8080/configuracoes
2. Na seção de integrações, você deverá ver os botões:
   - **Conectar com Meta**
   - **Conectar com Google**
3. Clique para testar o fluxo OAuth

---

## Troubleshooting

### Erro: "redirect_uri_mismatch"
- Verifique se a URI de redirecionamento no .env corresponde EXATAMENTE à configurada no Meta/Google
- Certifique-se de não ter espaços extras ou caracteres especiais

### Erro: "invalid_client"
- Verifique se o `CLIENT_ID` e `CLIENT_SECRET` estão corretos
- Certifique-se de que não há espaços antes ou depois das credenciais

### Meta: "App Not Setup"
- Certifique-se de ter adicionado o produto "Facebook Login"
- Verifique se configurou as URIs de redirecionamento válidas

### Google: "Access Blocked"
- Adicione seu email como usuário de teste na tela de consentimento OAuth
- Certifique-se de ter ativado as APIs necessárias

---

## Produção

Quando for para produção, você precisará:

### Meta:
1. Adicionar domínio de produção em **"Domínios do App"**
2. Atualizar URI de redirecionamento para produção
3. Enviar app para revisão se precisar de permissões avançadas
4. Atualizar variáveis de ambiente no servidor de produção

### Google:
1. Publicar o app (sair do modo de teste)
2. Adicionar domínio de produção nas origens autorizadas
3. Atualizar URI de redirecionamento para produção
4. Verificar domínio no Google Search Console (pode ser necessário)
5. Atualizar variáveis de ambiente no servidor de produção

---

## Variáveis de Ambiente Completas

Seu arquivo `.env` deve ter:

```env
# Meta/Facebook OAuth
META_APP_ID=seu_app_id
META_APP_SECRET=sua_app_secret
META_REDIRECT_URI=http://localhost:3001/api/marketing/oauth/meta/callback
META_API_VERSION=v21.0
META_SCOPES=pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights

# Google OAuth
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/marketing/oauth/google/callback
```
