# Respostas para o App Review do Meta — Dental KPI

## Sobre o Token para o Screencast

Sim, você pode usar o **token temporário de teste** para gravar o screencast. O Meta aceita demonstrações gravadas em modo Development. O importante é mostrar o fluxo completo funcionando com dados reais.

**Dica:** Gere um token de teste no Graph API Explorer (https://developers.facebook.com/tools/explorer/) com as permissões necessárias, conecte ao dashboard, e grave o screencast mostrando tudo funcionando.

---

## Descrições de Uso (copie e cole para cada permissão)

### 1. instagram_business_basic

**Describe how your app uses this permission:**

> Dental KPI is a marketing analytics dashboard designed for dental clinics. We use the instagram_business_basic permission to retrieve basic profile information from the clinic's Instagram Business account, including the account username, profile picture, and account ID. This information is displayed in the dashboard header so clinic managers can confirm which Instagram account is connected and view their profile details alongside their marketing metrics. Only the clinic owner or authorized manager can connect their Instagram account through our secure OAuth flow. The data is used exclusively for display purposes within the clinic's own private dashboard.

---

### 2. instagram_manage_insights

**Describe how your app uses this permission:**

> Dental KPI uses instagram_manage_insights to collect and display performance metrics from the clinic's Instagram Business account. Specifically, we retrieve: post-level metrics (impressions, reach, engagement, likes, comments, shares), story metrics (impressions, reach, replies, exits — collected before the 24-hour expiration), and audience demographics (age range, gender, location of followers). These metrics are displayed in charts and tables within the clinic's private dashboard, enabling dental clinic managers to track marketing performance, identify top-performing content, and make data-driven decisions about their social media strategy. Data is refreshed automatically via scheduled API calls and is accessible only to the authenticated clinic owner.

---

### 3. instagram_basic

**Describe how your app uses this permission:**

> Dental KPI uses instagram_basic to read basic media content and profile information from the clinic's Instagram account connected via Facebook Page. This permission allows us to retrieve the list of recent posts (images, videos, carousels) along with their captions and timestamps, which are displayed in the dashboard's content feed. Clinic managers use this view to see their published content alongside engagement metrics, providing a unified view of their Instagram marketing activity. The data is read-only and displayed exclusively within the clinic's private, authenticated dashboard.

---

### 4. read_insights

**Describe how your app uses this permission:**

> Dental KPI uses read_insights to access performance analytics for the clinic's Facebook Page. We retrieve page-level metrics including page views, page likes/follows over time, post reach, and engagement rates. These metrics are combined with Instagram insights to provide clinic managers with a comprehensive cross-platform marketing dashboard. The data is displayed in time-series charts and summary cards, helping dental clinics understand their overall social media performance. All data is accessible only to the authenticated clinic owner within their private dashboard.

---

### 5. pages_read_engagement

**Describe how your app uses this permission:**

> Dental KPI uses pages_read_engagement to read content and engagement data from the dental clinic's Facebook Page. This includes reading posts published on the Page, their associated engagement metrics (likes, comments, shares, reactions), and follower information. The data is displayed in the clinic's marketing dashboard alongside Instagram metrics, giving managers a complete view of their social media performance. We only read publicly visible content from the Page — we do not modify, create, or delete any content. Access is restricted to the authenticated clinic owner.

---

### 6. pages_show_list

**Describe how your app uses this permission:**

> Dental KPI uses pages_show_list to retrieve the list of Facebook Pages managed by the clinic owner during the OAuth connection flow. When a clinic manager connects their account, we display the list of their Pages so they can select which Page (and linked Instagram Business account) to connect to their dashboard. This is a one-time step during the initial setup. After selection, we store the Page ID and access token to retrieve metrics on an ongoing basis. The Page list is not stored or displayed beyond the connection flow.

---

### 7. business_management

**Describe how your app uses this permission:**

> Dental KPI uses business_management to access the Business Manager associated with the clinic's Facebook Page and Instagram account. This allows us to properly identify and connect the correct Instagram Business account that is linked to the clinic's Facebook Page through their Business Manager. We use this permission during the OAuth flow to retrieve the business assets (Pages and Instagram accounts) available to the user, ensuring we connect to the correct accounts. This is essential for clinics that manage multiple Pages or Instagram accounts through a single Business Manager.

---

### 8. public_profile

> (Geralmente só pede concordância com o uso permitido — sem descrição necessária)

---

## Roteiro para o Screencast (1-2 minutos)

Grave um vídeo de tela mostrando o fluxo completo. Pode usar Loom, OBS, ou QuickTime.

### Script do vídeo:

**[0:00 - 0:10] Login**
- Mostrar a tela de login do Dental KPI
- Fazer login com credenciais de teste

**[0:10 - 0:25] Navegar até Marketing**
- Clicar na seção "Marketing" do dashboard
- Mostrar que não há conta conectada ainda

**[0:25 - 0:45] Conectar Instagram**
- Clicar no botão "Conectar Instagram"
- Mostrar o redirecionamento para o Facebook OAuth
- Autorizar as permissões
- Mostrar o retorno ao dashboard

**[0:45 - 1:10] Dashboard com Métricas**
- Mostrar o dashboard com as métricas carregadas
- Navegar pelos gráficos de posts (impressões, alcance, engajamento)
- Mostrar as métricas de stories (se disponível)
- Mostrar dados de audiência (idade, localização)

**[1:10 - 1:25] Conteúdo e Engajamento**
- Mostrar a lista de posts recentes com métricas
- Clicar em um post para ver detalhes

**[1:25 - 1:40] Segurança**
- Mostrar que apenas o gestor autenticado tem acesso
- (Opcional) Mostrar a opção de desconectar a conta

### Dicas para o vídeo:
- Resolução mínima: 720p
- Sem narração necessária (mas pode adicionar se quiser)
- Hospedar no YouTube (Unlisted) ou Loom
- Máximo 2 minutos

---

## Respostas para "Tratamento de Dados" (seção seguinte)

O Meta provavelmente vai perguntar:

**Como você armazena os dados?**
> We store data in a secure PostgreSQL database hosted on a cloud provider with encrypted connections (SSL/TLS). Access tokens are stored encrypted. Only the clinic owner can access their own data through authenticated API endpoints.

**Quem tem acesso aos dados?**
> Only the authenticated clinic owner/manager has access to their data. Our development team has access to the database for maintenance purposes only. We do not share data with any third parties.

**Como os dados são excluídos?**
> Users can disconnect their Instagram account at any time, which immediately revokes our access. Upon disconnection, we delete all stored metrics data within 30 days. Users can also request data deletion through our data deletion page at https://www.dentalkpi.com/data-deletion.

**Você compartilha dados com terceiros?**
> No. We do not sell, share, or transfer user data to any third parties. Data is used exclusively to display metrics within the clinic's own private dashboard.
