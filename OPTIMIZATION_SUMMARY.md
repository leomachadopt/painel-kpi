# 🚀 OTIMIZAÇÕES IMPLEMENTADAS - FASE 1

**Data:** 23 de Janeiro de 2026
**Objetivo:** Reduzir invocações no Vercel de ~7M/23 dias para menos de 3M/23 dias (~60% de redução)

---

## ✅ MUDANÇAS IMPLEMENTADAS

### 1. **Endpoint Consolidado do Sidebar** (83% de redução)

**Problema:**
- 5 endpoints separados chamados a cada 30s
- **10 requests/min por usuário** = 600 req/hora

**Solução:**
- Novo endpoint `GET /api/sidebar/counts/:clinicId` que retorna TODOS os contadores em uma única chamada
- Intervalo aumentado de 30s → 60s
- **1 request/min por usuário** = 60 req/hora

**Arquivos modificados:**
- ✅ `server/routes/sidebar.ts` (NOVO)
- ✅ `server/app.ts` (registrar rota)
- ✅ `src/services/api.ts` (adicionar função)
- ✅ `src/components/AppSidebar.tsx` (refatorado)

**Redução estimada:** **83% menos requests do sidebar**

---

### 2. **ProcessingProgressIndicator Otimizado** (40-60% de redução)

**Problema:**
- Polling fixo a cada 2s = 30 req/min
- Sem timeout de segurança (pode rodar indefinidamente)

**Solução:**
- Backoff progressivo adaptativo:
  - 0-20% progresso: 5s
  - 20-80% progresso: 3s
  - 80-100% progresso: 2s
- Timeout máximo de 5 minutos
- Retry com intervalo maior em caso de erro

**Arquivo modificado:**
- ✅ `src/components/advances/ProcessingProgressIndicator.tsx`

**Redução estimada:** **40-60% menos requests durante processamento**

---

### 3. **Debounce no Search de Pacientes** (~90% de redução)

**Problema:**
- API call a cada caractere digitado
- Usuário digita "João Silva" = 11 chamadas

**Solução:**
- Hook `useDebouncedValue` com delay de 500ms
- Apenas 1 chamada após o usuário parar de digitar

**Arquivos modificados:**
- ✅ `src/hooks/useDebouncedValue.ts` (NOVO)
- ✅ `src/pages/Patients.tsx`

**Redução estimada:** **~90% menos requests em buscas**

---

### 4. **Cache HTTP em Endpoints Críticos**

**Problema:**
- Nenhum endpoint tinha `Cache-Control` configurado
- Toda requisição atingia o servidor

**Solução:**
Cache implementado em:

#### **GET /api/clinics** e **GET /api/clinics/:id**
```
Cache-Control: max-age=3600, s-maxage=3600, stale-while-revalidate=300
```
- Cache de 1 hora (configurações mudam raramente)
- CDN pode cachear por 1 hora
- Pode servir cache stale por mais 5min enquanto revalida

#### **GET /api/monthly-data/:clinicId/:year/:month**
```
Cache-Control: max-age=86400, s-maxage=86400, immutable
```
- Cache de 24 horas (dados históricos NUNCA mudam)
- `immutable`: navegador pode cachear indefinidamente

#### **GET /api/targets/:clinicId** e **GET /api/targets/:clinicId/:year/:month**
```
Cache-Control: max-age=3600, s-maxage=3600, stale-while-revalidate=300
```
- Cache de 1 hora (metas mensais mudam raramente)

#### **GET /api/sidebar/counts/:clinicId**
```
Cache-Control: max-age=60, s-maxage=120, stale-while-revalidate=30
```
- Cache de 60s no cliente, 120s no edge
- Dados podem ficar stale por 30s enquanto revalida

**Arquivos modificados:**
- ✅ `server/routes/clinics.ts`
- ✅ `server/routes/monthlyData.ts`
- ✅ `server/routes/targets.ts`
- ✅ `server/routes/sidebar.ts`

**Redução estimada:** **30-50% menos requests cacheadas pelo Vercel Edge**

---

## 📊 IMPACTO TOTAL ESTIMADO

### Antes das Otimizações
| Fonte | Requests/Dia (50 usuários) |
|-------|---------------------------|
| Sidebar polling | 360.000 |
| PDF processing | 43.200 |
| Mount/Navigation | 100.000 |
| Search | 20.000 |
| **TOTAL** | **523.200** |
| **23 dias** | **~12 milhões** |

### Depois das Otimizações (Fase 1)
| Fonte | Requests/Dia (50 usuários) | Redução |
|-------|---------------------------|---------|
| Sidebar polling | 72.000 | -80% |
| PDF processing | 25.920 | -40% |
| Mount/Navigation | 70.000 | -30% (cache) |
| Search | 2.000 | -90% |
| **TOTAL** | **~170.000** | **-67%** |
| **23 dias** | **~3.9 milhões** | **-67%** |

---

## 🧪 COMO TESTAR

### 1. Testar Endpoint Consolidado do Sidebar

```bash
# Iniciar servidor backend
npm run server

# Iniciar frontend
npm run dev

# Abrir DevTools > Network
# Fazer login e observar:
# ANTES: 5 requests a cada 30s (ordem/pending-count, payment-pending-count, etc.)
# DEPOIS: 1 request a cada 60s (/sidebar/counts)
```

**Validação:**
- ✅ Apenas 1 request `/api/sidebar/counts/:clinicId` no Network tab
- ✅ Badges do sidebar atualizam corretamente
- ✅ Intervalo de 60s entre requests (não 30s)

---

### 2. Testar Cache HTTP

```bash
# Verificar headers de cache
curl -I http://localhost:3001/api/clinics

# Deve retornar:
# Cache-Control: max-age=3600, s-maxage=3600, stale-while-revalidate=300
```

**Validação no Browser:**
1. Abrir DevTools > Network
2. Navegar para Dashboard
3. Verificar request de `/api/clinics`
4. **Response Headers** deve conter `Cache-Control`
5. Segunda navegação deve mostrar `(from disk cache)` ou `(from memory cache)`

---

### 3. Testar Debounce no Search

**Passos:**
1. Ir para página Pacientes
2. Abrir DevTools > Network
3. Digitar "João Silva" no campo de busca
4. **ANTES:** ~11 requests (uma por caractere)
5. **DEPOIS:** 1 request (após 500ms de pausa)

**Validação:**
- ✅ Apenas 1 request `/api/patients/:clinicId?search=João Silva`
- ✅ Request só aparece após parar de digitar

---

### 4. Testar Timeout do ProcessingProgressIndicator

**Passos:**
1. Ir para módulo de Advances/Seguradoras
2. Fazer upload de um PDF
3. Observar polling no Network tab
4. **ANTES:** Requests a cada 2s indefinidamente
5. **DEPOIS:** Requests variam (2-5s) e param após 5 minutos se travar

**Validação:**
- ✅ Intervalo adaptativo (5s início, 3s meio, 2s final)
- ✅ Timeout de 5 minutos funciona
- ✅ Toast de erro aparece se exceder tempo

---

## 🔍 MONITORAMENTO

### No Vercel Dashboard

Acessar: https://vercel.com/[seu-projeto]/analytics

**Métricas a observar:**
- **Function Invocations:** Deve cair ~60-70%
- **Edge Requests:** Deve aumentar (cache está funcionando)
- **Bandwidth:** Deve diminuir levemente

### Comparação Esperada (7 dias)

| Métrica | Antes | Depois | Variação |
|---------|-------|--------|----------|
| Invocations/dia | ~304.000 | ~100.000 | -67% |
| Invocations/semana | 2.1M | 700K | -67% |
| Edge Cache Hit Rate | 0% | 30-40% | +40% |

---

## ⚠️ POSSÍVEIS PROBLEMAS E SOLUÇÕES

### 1. Sidebar não atualiza contadores

**Causa:** Endpoint `/api/sidebar/counts` retornando erro

**Debug:**
```bash
# Ver logs do servidor
npm run server

# Verificar response no Network tab
# Deve retornar estrutura:
{
  "orders": { "pending": 5, "paymentPending": 2, "invoicePending": 1 },
  "tickets": { "assignedToMe": 3, "others": 1 },
  "accountsPayable": { "overdue": 2, "today": 1, "week": 3 }
}
```

**Solução:**
- Verificar se migration do banco está atualizada
- Verificar se queries no `server/routes/sidebar.ts` estão corretas

---

### 2. Cache muito agressivo (dados desatualizados)

**Causa:** Cache de 1 hora pode ser muito longo para alguns casos

**Solução:**
```typescript
// Ajustar tempo de cache em server/routes/[route].ts
res.setHeader('Cache-Control', 'max-age=600, s-maxage=1200, stale-while-revalidate=60')
// 10 minutos em vez de 1 hora
```

---

### 3. Debounce muito lento (UX ruim)

**Causa:** 500ms pode parecer lento para alguns usuários

**Solução:**
```typescript
// Em src/pages/Patients.tsx
const debouncedSearchTerm = useDebouncedValue(searchTerm, 300) // 300ms em vez de 500ms
```

---

## 🎯 PRÓXIMOS PASSOS (FASE 2)

Após validar Fase 1 em produção, implementar:

### 1. React Query
- Cache automático de requisições
- Deduplicate de requests idênticos
- Invalidação inteligente

**Estimativa:** -20% adicional de requests

### 2. Endpoint Agregado de Daily Entries
- Consolidar 10 endpoints em 1
- Reduz waterfall no mount

**Estimativa:** -15% adicional de requests

### 3. Pré-cálculo de KPIs
- Tabela `monthly_kpis_cache`
- Trigger para atualização automática

**Estimativa:** -10% adicional de requests

---

## 📝 ROLLBACK

Se algo der errado, reverter em ordem:

### Rollback Completo
```bash
git log --oneline  # Ver commits
git revert <commit-hash>  # Reverter último commit
git push origin main
```

### Rollback Parcial - Apenas Sidebar
```bash
# Comentar linha em server/app.ts
# app.use('/api/sidebar', sidebarRoutes)

# Reverter import em AppSidebar.tsx
# import { dailyEntriesApi, ticketsApi } from '@/services/api'
```

### Rollback Parcial - Apenas Cache
```bash
# Remover headers em server/routes/*.ts
# res.setHeader('Cache-Control', ...)
```

---

## ✅ CHECKLIST DE VALIDAÇÃO

Antes de fazer merge/deploy:

- [ ] Servidor inicia sem erros (`npm run server`)
- [ ] Frontend builda sem erros (`npm run build`)
- [ ] Endpoint `/api/sidebar/counts/:clinicId` retorna dados corretos
- [ ] Sidebar atualiza badges corretamente
- [ ] Search de pacientes funciona com debounce
- [ ] Upload de PDF tem timeout de 5 min
- [ ] Cache headers aparecem no Network tab
- [ ] TypeScript sem erros (`npx tsc --noEmit`)

---

## 📞 SUPORTE

Se encontrar problemas:

1. Verificar logs do servidor (`npm run server`)
2. Verificar console do browser (F12 > Console)
3. Verificar Network tab (F12 > Network)
4. Verificar este documento (OPTIMIZATION_SUMMARY.md)

---

**Implementado por:** Claude Code
**Revisão recomendada:** Testar em ambiente de staging primeiro
**Estimativa de impacto:** Redução de 60-70% nas invocações do Vercel
