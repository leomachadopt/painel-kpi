# Configuração das APIs do Google Business Profile

Você está recebendo o erro de quota porque as APIs necessárias não foram habilitadas no Google Cloud Console.

## ⚠️ Erro Atual

```
Quota exceeded for quota metric 'Requests' and limit 'Requests per minute'
of service 'mybusinessaccountmanagement.googleapis.com'
quota_limit_value: 0
```

**Causa**: A API não está habilitada no projeto do Google Cloud, ou o projeto está usando as credenciais erradas.

---

## 📋 APIs Necessárias

Você precisa habilitar as seguintes APIs no Google Cloud Console:

1. **Google My Business API** (v4)
2. **Business Profile Performance API**
3. **My Business Account Management API**
4. **My Business Business Information API**

---

## 🔧 Passo a Passo para Habilitar as APIs

### 1. Acesse o Google Cloud Console

1. Vá para: https://console.cloud.google.com/
2. Selecione o projeto onde você criou as credenciais OAuth
   - Você pode ver o número do projeto nas credenciais: `71969479388`
   - O Client ID é: `71969479388-upfmkh0esl1fgrs9pft7sa0b98k59att.apps.googleusercontent.com`

### 2. Habilite as APIs

#### Opção A: Via Biblioteca de APIs (Recomendado)

1. No menu lateral, clique em **"APIs e Serviços" > "Biblioteca"**
2. Procure e habilite cada uma das seguintes APIs:

   **a) My Business Account Management API**
   - Pesquise: "My Business Account Management API"
   - Clique em **"Ativar"**

   **b) My Business Business Information API**
   - Pesquise: "My Business Business Information API"
   - Clique em **"Ativar"**

   **c) Business Profile Performance API**
   - Pesquise: "Business Profile Performance API"
   - Clique em **"Ativar"**

   **d) Google My Business API** (Legacy, mas ainda útil)
   - Pesquise: "Google My Business API"
   - Clique em **"Ativar"**

#### Opção B: Via Links Diretos

Acesse diretamente e clique em "Ativar":

1. https://console.cloud.google.com/apis/library/mybusinessaccountmanagement.googleapis.com
2. https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com
3. https://console.cloud.google.com/apis/library/businessprofileperformance.googleapis.com
4. https://console.cloud.google.com/apis/library/mybusiness.googleapis.com

### 3. Verifique as APIs Habilitadas

1. Vá para: **"APIs e Serviços" > "APIs e serviços ativados"**
2. Confirme que todas as APIs estão listadas

### 4. Verifique as Quotas

1. Vá para: **"APIs e Serviços" > "Quotas e limites do sistema"**
2. Procure por: `mybusinessaccountmanagement.googleapis.com`
3. Verifique se há quotas ativas (não deve ser 0)

---

## 🔐 Atualizar os Escopos OAuth

Depois de habilitar as APIs, você precisa **reconectar a integração** para obter os escopos corretos:

### 1. No arquivo `.env`, verifique os escopos:

```env
GOOGLE_SCOPES=https://www.googleapis.com/auth/business.manage,https://www.googleapis.com/auth/userinfo.email
```

**Escopos recomendados:**
```env
GOOGLE_SCOPES=https://www.googleapis.com/auth/business.manage,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/plus.business.manage
```

### 2. Reconecte a integração:

1. Acesse: http://localhost:8080/configuracoes
2. **Desconecte** a integração do Google (se estiver conectada)
3. **Reconecte** clicando em "Conectar com Google"
4. Autorize todas as permissões solicitadas

---

## ✅ Testando a Configuração

Após habilitar as APIs e reconectar, execute:

```bash
# 1. Liste as localizações disponíveis
npx tsx server/select-gbp-location.ts

# 2. Teste a coleta de dados
npx tsx server/test-gbp-collection.ts
```

---

## 🚨 Problemas Comuns

### Erro: "Project does not have access to this API"

**Causa**: A API não está habilitada no projeto.

**Solução**: Siga os passos acima para habilitar as APIs.

### Erro: "Insufficient permissions"

**Causa**: O escopo OAuth não inclui permissões para acessar o Google Business Profile.

**Solução**:
1. Adicione os escopos corretos no `.env`
2. Reconecte a integração

### Erro: "Location not found"

**Causa**: A conta Google conectada não tem acesso a nenhum perfil do Google Meu Negócio.

**Solução**:
1. Certifique-se de que você tem um perfil criado em: https://business.google.com/
2. A conta Google conectada deve ser a mesma que gerencia o perfil

### Erro: "Access token expired"

**Causa**: O token expirou e o refresh token não está funcionando.

**Solução**: Reconecte a integração nas configurações.

---

## 📊 Métricas Disponíveis

Depois de configurar corretamente, você terá acesso a:

### Google Business Profile Performance
- **QUERIES_DIRECT**: Buscas diretas pelo nome
- **QUERIES_INDIRECT**: Buscas por categoria/serviço
- **VIEWS_MAPS**: Visualizações no Google Maps
- **VIEWS_SEARCH**: Visualizações na Busca do Google
- **ACTIONS_WEBSITE**: Cliques no site
- **ACTIONS_PHONE**: Cliques para ligar
- **ACTIONS_DRIVING_DIRECTIONS**: Solicitações de rota

### Avaliações
- Total de avaliações
- Média de classificação (estrelas)
- Novas avaliações por dia

---

## 🆘 Suporte Adicional

Se continuar com problemas:

1. **Documentação oficial do Google**: https://developers.google.com/my-business
2. **Console de APIs**: https://console.cloud.google.com/apis
3. **Suporte do Google Cloud**: https://cloud.google.com/support

---

## ⏭️ Próximos Passos

Depois de configurar tudo:

1. ✅ Habilitar as APIs no Google Cloud Console
2. ✅ Reconectar a integração
3. ✅ Selecionar uma localização: `npx tsx server/select-gbp-location.ts`
4. ✅ Testar a coleta: `npx tsx server/test-gbp-collection.ts`
5. ✅ Visualizar no painel: http://localhost:8080/relatorios
