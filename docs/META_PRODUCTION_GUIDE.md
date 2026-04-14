# Guia: Migrar App Meta/Facebook para Produção

## 📋 Visão Geral

Para usar tokens permanentes e disponibilizar sua integração para todas as clínicas, você precisa passar pelo **App Review** do Meta/Facebook.

---

## 🔍 Passo 1: Verificar Configurações Atuais

### 1.1 Acesse o Facebook Developers Console
- URL: https://developers.facebook.com/apps/
- Selecione seu app (ID: `842506878871048`)

### 1.2 Verifique o Status Atual
- **Modo Atual**: Development (apenas você e testadores podem usar)
- **Objetivo**: Mudar para Production (qualquer pessoa pode autorizar)

---

## ✅ Passo 2: Preparar o App para Produção

### 2.1 Completar Informações Básicas

No painel do app, vá em **Settings > Basic**:

- [ ] **App Name**: Nome claro e profissional
- [ ] **App Icon**: Logo da empresa (1024x1024 px)
- [ ] **Privacy Policy URL**: URL da política de privacidade
- [ ] **Terms of Service URL**: URL dos termos de uso
- [ ] **Category**: Escolher categoria apropriada (Business)
- [ ] **Contact Email**: Email válido para suporte

**Exemplo de URLs**:
```
Privacy Policy: https://seu-dominio.com/privacy
Terms of Service: https://seu-dominio.com/terms
```

### 2.2 Adicionar Política de Privacidade

Sua política de privacidade deve incluir:
- ✅ Quais dados você coleta (posts, stories, audiência, métricas)
- ✅ Como você usa esses dados (análise de marketing)
- ✅ Como os dados são armazenados (banco de dados seguro)
- ✅ Quem tem acesso aos dados (apenas a clínica)
- ✅ Como usuários podem solicitar exclusão de dados

**Template mínimo**: Criar arquivo em `docs/PRIVACY_POLICY.md`

---

## 🔐 Passo 3: Configurar Domínios e URLs

### 3.1 Adicionar Domínios Autorizados

Em **Settings > Basic > App Domains**:

```
seu-dominio.com
painel.seu-dominio.com
```

### 3.2 Configurar OAuth Redirect URIs

Em **Facebook Login > Settings**:

```
# Produção
https://api.seu-dominio.com/api/marketing/oauth/meta/callback

# Staging (opcional)
https://staging-api.seu-dominio.com/api/marketing/oauth/meta/callback
```

### 3.3 Atualizar variáveis de ambiente

`.env`:
```bash
# Produção
META_REDIRECT_URI=https://api.seu-dominio.com/api/marketing/oauth/meta/callback
FRONTEND_URL=https://painel.seu-dominio.com
```

---

## 📝 Passo 4: Solicitar Permissões Avançadas (App Review)

### 4.1 Permissões que você está usando

Atualmente você usa:
- ✅ `pages_show_list` - Listar páginas (básica, não precisa review)
- ✅ `pages_read_engagement` - Ler métricas de posts
- ✅ `instagram_basic` - Informações básicas do Instagram
- ✅ `instagram_manage_insights` - Ler insights do Instagram

### 4.2 Permissões que precisam de App Review

Para **produção**, você precisa solicitar:

#### **1. pages_read_engagement**
- **Por quê**: Ler métricas de posts do Facebook/Instagram
- **Caso de uso**: "Permitir que clínicas de odontologia vejam métricas de seus posts do Instagram (curtidas, comentários, alcance) em um dashboard centralizado"

#### **2. instagram_manage_insights**
- **Por quê**: Ler insights detalhados (stories, audiência)
- **Caso de uso**: "Permitir que clínicas analisem métricas de stories do Instagram antes que expirem (24h), incluindo impressões, alcance e interações"

#### **3. instagram_basic** (geralmente aprovado automaticamente)
- **Por quê**: Informações básicas da conta
- **Caso de uso**: "Exibir nome de usuário e foto de perfil da conta Instagram Business da clínica"

### 4.3 Como Fazer o Request

1. Acesse **App Review > Permissions and Features**
2. Para cada permissão, clique em **Request**
3. Preencha o formulário:

**Perguntas comuns**:

**Q: How will your app use this permission?**
```
Nossa aplicação é um painel de KPIs para clínicas odontológicas.
Usamos esta permissão para coletar e exibir métricas de marketing
do Instagram Business da clínica, incluindo:
- Impressões e alcance de posts
- Métricas de stories (antes de expirarem em 24h)
- Dados de audiência (idade, localização)
- Engajamento (curtidas, comentários, compartilhamentos)

Apenas o proprietário da clínica pode autorizar o acesso, e os dados
são usados exclusivamente para análise interna da própria clínica.
```

**Q: Provide a detailed step-by-step explanation**
```
1. Clínica faz login no painel (apenas gestores autorizados)
2. Clínica navega para a seção "Marketing"
3. Clica em "Conectar Instagram"
4. É redirecionado para OAuth do Facebook
5. Autoriza acesso às métricas da conta Instagram Business
6. Dashboard exibe métricas em gráficos e tabelas
7. Dados são atualizados automaticamente via API do Meta
```

### 4.4 Materiais Necessários para Review

Você precisará fornecer:

#### **Screenshots da funcionalidade**
- [ ] Tela de login do dashboard
- [ ] Botão "Conectar Instagram"
- [ ] Tela de autorização do Facebook
- [ ] Dashboard com métricas exibidas
- [ ] Tela de stories metrics
- [ ] Gráficos de audiência

#### **Vídeo de demonstração** (recomendado)
- Gravação de tela mostrando o fluxo completo (1-2 minutos)
- Mostrar onde o usuário clica para autorizar
- Mostrar os dados sendo exibidos no dashboard
- **Ferramenta**: Loom, OBS Studio, QuickTime

#### **Credenciais de teste**
- Email: `test@suaclinica.com`
- Senha: `Test123!`
- Ou usar uma conta Instagram Business de teste

---

## 🎬 Passo 5: Criar Vídeo de Demonstração

### Template de Script

```
[0:00-0:10] Mostrar login no painel
[0:10-0:20] Navegar para Marketing > Configurações
[0:20-0:40] Clicar em "Conectar Instagram" e fazer OAuth
[0:40-1:00] Mostrar dashboard com métricas carregadas
[1:00-1:20] Mostrar aba Stories com dados
[1:20-1:30] Mostrar que apenas o gestor da clínica tem acesso
```

### Hospedagem do Vídeo
- YouTube (Unlisted)
- Loom
- Vimeo

---

## 🚀 Passo 6: Enviar para Review

### 6.1 Preparação Final

- [ ] App Icon configurado
- [ ] Privacy Policy publicada
- [ ] Terms of Service publicados
- [ ] Screenshots preparados
- [ ] Vídeo de demo gravado
- [ ] Credenciais de teste criadas

### 6.2 Submissão

1. Vá em **App Review > Permissions and Features**
2. Clique em **Submit for Review**
3. Preencha todos os campos obrigatórios
4. Adicione screenshots e vídeo
5. Clique em **Submit**

### 6.3 Tempo de Revisão

- ⏱️ **Tempo médio**: 3-7 dias úteis
- ⚠️ **Pode ser rejeitado**: Revisar feedback e reenviar

---

## 🔄 Passo 7: Tokens de Longa Duração

### 7.1 Após Aprovação

Quando o app for aprovado, os **User Access Tokens** automaticamente:
- ✅ Duram **60 dias** (renováveis)
- ✅ Podem ser renovados automaticamente antes de expirar

### 7.2 Implementar Renovação Automática

Adicionar job para renovar tokens antes de expirar:

**Arquivo**: `server/marketing/refreshTokens.ts`

```typescript
import { query } from '../db.js'

export async function refreshMetaTokensBeforeExpiry() {
  // Buscar tokens que expiram em menos de 7 dias
  const result = await query(
    `SELECT id, clinic_id, access_token, token_expires_at
     FROM clinic_integrations
     WHERE provider = 'META'
       AND status = 'CONNECTED'
       AND token_expires_at < NOW() + INTERVAL '7 days'`
  )

  for (const integration of result.rows) {
    try {
      // Trocar token antigo por novo de longa duração
      const newToken = await exchangeForLongLivedToken(integration.access_token)

      await query(
        `UPDATE clinic_integrations
         SET access_token = $1,
             token_expires_at = $2
         WHERE id = $3`,
        [newToken.accessToken, newToken.expiresAt, integration.id]
      )

      console.log(`✅ Token renovado para clínica ${integration.clinic_id}`)
    } catch (error) {
      console.error(`❌ Falha ao renovar token para ${integration.clinic_id}:`, error)
    }
  }
}

async function exchangeForLongLivedToken(shortToken: string) {
  const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
  url.searchParams.set('grant_type', 'fb_exchange_token')
  url.searchParams.set('client_id', process.env.META_APP_ID!)
  url.searchParams.set('client_secret', process.env.META_APP_SECRET!)
  url.searchParams.set('fb_exchange_token', shortToken)

  const res = await fetch(url.toString())
  const data = await res.json()

  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + (data.expires_in * 1000))
  }
}
```

**Adicionar ao scheduler**:

```typescript
// server/marketing/scheduler.ts
export function startTokenRefreshScheduler() {
  const enabled = process.env.TOKEN_REFRESH_ENABLED !== 'false'
  if (!enabled) return

  // Rodar todo dia às 2am
  setInterval(async () => {
    await refreshMetaTokensBeforeExpiry()
  }, 24 * 60 * 60 * 1000)
}
```

---

## 📊 Passo 8: Monitoramento em Produção

### 8.1 Configurar Webhooks (opcional, para notificações)

Em **Webhooks > Instagram**:
- Subscribe to: `feed`, `stories`
- Callback URL: `https://api.seu-dominio.com/api/marketing/webhooks/meta`
- Verify Token: Gerar token secreto

### 8.2 Logs e Alertas

Monitorar:
- ❌ Falhas de renovação de token
- ❌ Rate limits da API
- ❌ Tokens expirados
- ✅ Coleta de stories bem-sucedida

---

## 🎯 Checklist Final

### Antes de Submeter
- [ ] Privacy Policy publicada
- [ ] Terms of Service publicados
- [ ] App Icon configurado
- [ ] Screenshots preparados (mínimo 3)
- [ ] Vídeo de demonstração gravado
- [ ] Credenciais de teste funcionando
- [ ] Domínio em produção configurado
- [ ] OAuth redirect em HTTPS

### Após Aprovação
- [ ] Mudar app para modo Live
- [ ] Testar OAuth em produção
- [ ] Implementar renovação automática de tokens
- [ ] Configurar monitoramento
- [ ] Documentar processo para novas clínicas

---

## 🆘 Troubleshooting

### App Review Rejeitado

**Motivo comum**: "Caso de uso não claro"
- **Solução**: Melhorar descrição, adicionar mais screenshots

**Motivo comum**: "Privacy Policy incompleta"
- **Solução**: Adicionar seções sobre dados do Instagram

**Motivo comum**: "Não conseguimos reproduzir o fluxo"
- **Solução**: Verificar credenciais de teste, gravar vídeo mais detalhado

### Token Expirou
```typescript
// Verificar expiração
const integration = await getMetaIntegration(clinicId)
if (new Date(integration.tokenExpiresAt) < new Date()) {
  // Redirecionar para reconectar
  throw new Error('Token expirado. Por favor, reconecte sua conta Instagram.')
}
```

---

## 📚 Recursos Adicionais

- [Meta App Review Documentation](https://developers.facebook.com/docs/app-review)
- [Instagram Basic Display vs Graph API](https://developers.facebook.com/docs/instagram-api)
- [Long-Lived Tokens](https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived)
- [Best Practices](https://developers.facebook.com/docs/development/build-and-test/best-practices)

---

## 💡 Dicas Finais

1. **Seja específico**: Quanto mais detalhado o caso de uso, maior a chance de aprovação
2. **Screenshots de qualidade**: Mostrar exatamente onde os dados aparecem
3. **Vídeo curto**: 1-2 minutos é suficiente, não precisa ser profissional
4. **Testar tudo**: Antes de enviar, teste todo o fluxo várias vezes
5. **Paciência**: A revisão pode demorar, prepare-se para possíveis reenvios

---

**Boa sorte com o App Review! 🚀**
