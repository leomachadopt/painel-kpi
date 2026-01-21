# ⚠️ Limitação: Google Business Profile Reviews API

## 🚨 Problema

A funcionalidade de **avaliações (reviews)** do Google Business Profile **NÃO está disponível** para novos projetos.

### Por quê?

1. **API legada deprecada**: A API `mybusiness.googleapis.com/v4` que continha o endpoint de reviews foi **deprecada** e **não pode mais ser habilitada** em novos projetos do Google Cloud.

2. **APIs novas incompletas**: As novas APIs que substituíram a v4 **ainda não implementaram** a funcionalidade de reviews:
   - ❌ `mybusinessaccountmanagement.googleapis.com` - Não tem reviews
   - ❌ `mybusinessbusinessinformation.googleapis.com` - Não tem reviews
   - ❌ `businessprofileperformance.googleapis.com` - Não tem reviews

3. **Situação atual**: Google ainda não migrou reviews para as novas APIs.

---

## ✅ O Que Funciona

Seu sistema **coleta com sucesso** as seguintes métricas do Google Business Profile:

### Métricas de Performance (businessprofileperformance API)
- ✅ **Visualizações do perfil** (Maps + Busca)
- ✅ **Buscas diretas** (pelo nome da clínica)
- ✅ **Buscas indiretas** (por categoria/serviço)
- ✅ **Cliques no site**
- ✅ **Ligações telefônicas**
- ✅ **Solicitações de rota**
- ✅ **Visualizações de fotos**
- ✅ **Visualizações de posts**

### Informações de Localização (mybusinessbusinessinformation API)
- ✅ **Dados da localização**
- ✅ **Endereço**
- ✅ **Horários de funcionamento**

---

## ❌ O Que NÃO Funciona

### Avaliações (Reviews)
- ❌ Total de avaliações
- ❌ Novas avaliações
- ❌ Média de estrelas (rating)
- ❌ Conteúdo das avaliações
- ❌ Respostas às avaliações

**Status no código**: Desabilitado temporariamente em `server/marketing/run.ts` (linhas 143-160)

---

## 🔍 Alternativas para Coletar Reviews

### 1. Google Places API (Recomendado)

**API**: Google Places API - Place Details
**Endpoint**: `https://maps.googleapis.com/maps/api/place/details/json`

**Vantagens:**
- ✅ Funciona em novos projetos
- ✅ Retorna reviews públicas
- ✅ Inclui rating médio

**Desvantagens:**
- ❌ Quotas e preços diferentes (pago por uso)
- ❌ Limite de 5 reviews mais recentes por padrão
- ❌ Não permite responder reviews via API

**Custo**: $17 USD por 1000 requisições (Place Details - Contact Data)

**Documentação**: https://developers.google.com/maps/documentation/places/web-service/details

**Como implementar:**
```typescript
const placeId = 'ChIJ...' // Place ID do Google Maps
const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=reviews,rating,user_ratings_total&key=${API_KEY}`
```

---

### 2. Aguardar atualização do Google

**Status**: Sem previsão

A Google pode:
- Adicionar reviews às novas APIs (mybusinessbusinessinformation)
- Reabilitar a API v4 para reviews
- Criar nova API específica para reviews

**Recomendação**: Monitore:
- https://developers.google.com/my-business/content/review-data
- Google Business Profile API changelog

---

### 3. Web Scraping (Não Recomendado)

**⚠️ Contra os Termos de Serviço do Google**

Não implemente soluções que:
- Fazem scraping do site do Google
- Usam automação de navegador (Puppeteer, Selenium)
- Violam os ToS do Google

**Risco**: Bloqueio de IP, suspensão da conta Google Business Profile

---

### 4. Third-Party APIs

Serviços que agregam reviews de múltiplas plataformas:

**Opções:**
- **Trustpilot API** - Reviews de múltiplas fontes
- **Yotpo** - Gerenciamento de reviews
- **ReviewTrackers** - Agregador de reviews
- **BirdEye** - Gerenciamento de reputação

**Desvantagens:**
- 💰 Serviços pagos
- 🔌 Requer integração adicional

---

## 🛠️ Implementando Google Places API (Solução Recomendada)

### Passo 1: Habilitar Google Places API

1. Acesse: https://console.cloud.google.com/apis/library/places-backend.googleapis.com
2. Clique em **"Ativar"**
3. Configure faturamento (necessário para Places API)

### Passo 2: Criar API Key

1. Vá para: https://console.cloud.google.com/apis/credentials
2. Clique em **"Criar credenciais" > "Chave de API"**
3. Restrinja a chave:
   - **Restrições de aplicativo**: HTTP referrers ou IP addresses
   - **Restrições de API**: Apenas "Places API"

### Passo 3: Encontrar o Place ID

O Place ID é um identificador único da localização no Google Maps.

**Como encontrar:**

**Opção A: Via Google Business Profile**
```typescript
// Use o endpoint de locations que você já tem
const locations = await listGbpLocations(accessToken)
// O placeId pode estar em location.metadata.placeId
```

**Opção B: Via Places API Search**
```
https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Nome+da+Clinica&inputtype=textquery&fields=place_id&key=YOUR_API_KEY
```

### Passo 4: Adicionar ao código

```typescript
// server/marketing/google-places.ts (novo arquivo)

export async function fetchPlacesReviews(placeId: string, apiKey: string) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json')
  url.searchParams.set('place_id', placeId)
  url.searchParams.set('fields', 'reviews,rating,user_ratings_total')
  url.searchParams.set('key', apiKey)

  const res = await fetch(url.toString())

  if (!res.ok) {
    throw new Error(`Places API error: ${res.status}`)
  }

  const data = await res.json()

  return {
    reviews: data.result?.reviews || [],
    rating: data.result?.rating || null,
    totalReviews: data.result?.user_ratings_total || 0,
  }
}
```

### Passo 5: Armazenar Place ID no banco

```sql
-- Adicionar coluna à tabela clinic_integrations
ALTER TABLE clinic_integrations
ADD COLUMN google_place_id VARCHAR(255);

-- Ou armazenar no campo metadata (JSONB)
UPDATE clinic_integrations
SET metadata = metadata || '{"googlePlaceId": "ChIJ..."}'::jsonb
WHERE clinic_id = 'clinic-xxx' AND provider = 'GBP';
```

---

## 📊 Comparação de Soluções

| Solução | Custo | Disponibilidade | Reviews | Responder | Atualização |
|---------|-------|----------------|---------|-----------|-------------|
| **GBP API v4** | ❌ Grátis | ❌ Deprecada | ❌ Não funciona | ❌ | ❌ Indisponível |
| **GBP novas APIs** | ✅ Grátis | ✅ Disponível | ❌ Sem reviews | ❌ | ⏳ Futuro |
| **Google Places API** | 💰 Pago | ✅ Disponível | ✅ Últimas 5 | ❌ | ✅ Tempo real |
| **Third-party** | 💰💰 Caro | ✅ Disponível | ✅ Todas | ✅ | ✅ Tempo real |
| **Web Scraping** | ❌ ToS | ⚠️ Arriscado | ⚠️ Limitado | ❌ | ⚠️ Instável |

---

## ✅ Recomendação Final

### Para Produção Imediata:
1. ✅ **Mantenha** a coleta de métricas de performance (já funciona)
2. ✅ **Implemente** Google Places API para reviews (custo razoável)
3. ⏳ **Aguarde** Google adicionar reviews às novas APIs

### Para MVP/Testes:
1. ✅ Use apenas as métricas de performance
2. ⏸️ Reviews podem ser adicionados manualmente ou importados via CSV
3. 📊 Foque nas métricas que geram mais valor (cliques, ligações, rotas)

---

## 📝 Status Atual no Código

### Arquivos Afetados:

1. **`server/marketing/google.ts:340`**
   - Função `fetchGbpReviews()` existe mas está marcada como `@deprecated`
   - Não pode ser usada em projetos novos

2. **`server/marketing/run.ts:143-160`**
   - Coleta de reviews **desabilitada** com comentário explicativo
   - Código comentado para referência futura

3. **`server/migrations/002_add_marketing.sql`**
   - Campos de reviews existem na tabela `social_daily_metrics`:
     - `reviews_total`
     - `reviews_new`
     - `rating_avg`
   - Campos ficam como `NULL` até implementar solução alternativa

### Para Reativar Reviews (no futuro):

1. **Se Google adicionar às novas APIs:**
   - Descomentar código em `run.ts`
   - Atualizar URL do endpoint
   - Testar e validar

2. **Se implementar Places API:**
   - Criar `server/marketing/google-places.ts`
   - Adicionar `GOOGLE_PLACES_API_KEY` ao `.env`
   - Armazenar `google_place_id` no banco
   - Integrar ao `run.ts`

---

## 🆘 Suporte

- **Documentação oficial**: https://developers.google.com/my-business
- **Places API**: https://developers.google.com/maps/documentation/places
- **Stack Overflow**: https://stackoverflow.com/questions/tagged/google-business-api

---

**Atualizado**: Janeiro 2026
**Status**: Reviews indisponíveis via GBP API para novos projetos
