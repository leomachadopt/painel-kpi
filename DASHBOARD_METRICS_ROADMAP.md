# Dashboard de Métricas e Indicadores - Roadmap de Implementação

## Visão Geral

Este documento descreve a implementação completa de novos indicadores e métricas para o Dashboard do sistema DentalKPI, integrando dados de **Agenda**, **Previsão de Receitas**, **Planos de Tratamento** e **Operações**.

### Objetivo
Transformar o dashboard de uma ferramenta de **análise retrospectiva** em uma plataforma de **inteligência preditiva** que:
- Mostra o que aconteceu
- Prevê o que vai acontecer
- Identifica onde agir para melhorar resultados

---

## ROADMAP DE IMPLEMENTAÇÃO

### Fase 1: Saúde Financeira e Previsibilidade (PRIORIDADE MÁXIMA)
**Objetivo**: Dar visibilidade imediata do futuro financeiro da clínica

#### 1.1 Receita Garantida (próximos 30/60/90 dias)
- **Fonte de Dados**:
  - `revenue_installments` (parcelas a receber)
  - `pending_treatments` (tratamentos pendentes)
- **Cálculo**:
  ```sql
  -- Parcelas próximos 30 dias
  SELECT SUM(value) FROM revenue_installments
  WHERE clinic_id = ?
    AND status IN ('A_RECEBER', 'ATRASADO')
    AND due_date <= CURRENT_DATE + INTERVAL '30 days'

  -- Valor pendente de tratamentos (estimativa baseada em histórico de execução)
  SELECT SUM(pending_value) FROM pending_treatments
  WHERE clinic_id = ? AND status != 'CONCLUIDO'
  ```
- **Visualização**:
  - Card KPI principal: "Receita Garantida Próximos 30 Dias"
  - Breakdown: Parcelas + Tratamentos Pendentes
  - Gráfico de barras: 30/60/90 dias
- **Alertas**:
  - Se receita garantida < 50% da meta mensal
  - Se tratamentos pendentes > 3 meses sem execução

#### 1.2 Receitas Atrasadas vs Previstas
- **Fonte de Dados**: `revenue_installments`
- **Cálculo**:
  ```sql
  SELECT
    status,
    COUNT(*) as count,
    SUM(value) as total_value
  FROM revenue_installments
  WHERE clinic_id = ?
  GROUP BY status
  ```
- **Visualização**:
  - Gráfico de barras empilhadas: Atrasadas / A Receber / Recebidas
  - Lista de parcelas atrasadas (top 10 por valor)
- **Alertas**:
  - Se atrasadas > 20% do valor total a receber

#### 1.3 Taxa de Conversão de Planos em Execução
- **Fonte de Dados**: `daily_consultation_entries`
- **Cálculo**:
  ```sql
  -- Planos que saíram de "aguardando" para "em execução" no período
  SELECT
    COUNT(*) FILTER (WHERE in_execution = true) * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE waiting_start = true OR in_execution = true), 0)
    as conversion_rate
  FROM daily_consultation_entries
  WHERE clinic_id = ?
    AND waiting_start_at >= date_trunc('month', CURRENT_DATE)
  ```
- **Visualização**: Card KPI com %
- **Alertas**:
  - Se taxa < 60% no mês
  - Lista de planos "aguardando início" há mais de 7 dias

#### 1.4 Planos em Risco de Abandono
- **Fonte de Dados**: `daily_consultation_entries` + `plan_procedures`
- **Critérios de Risco**:
  - `waiting_start = true` há > 7 dias
  - `in_execution = true` mas sem procedimentos completados nos últimos 30 dias
  - `plan_procedures_completed / plan_procedures_total < 0.2` após 30 dias de início
- **Cálculo**:
  ```sql
  -- Aguardando há muito tempo
  SELECT COUNT(*) FROM daily_consultation_entries
  WHERE clinic_id = ?
    AND waiting_start = true
    AND abandoned = false
    AND waiting_start_at < CURRENT_DATE - INTERVAL '7 days'

  -- Em execução mas estagnado
  SELECT COUNT(*) FROM daily_consultation_entries dce
  WHERE dce.clinic_id = ?
    AND dce.in_execution = true
    AND dce.abandoned = false
    AND NOT EXISTS (
      SELECT 1 FROM plan_procedures pp
      WHERE pp.consultation_entry_id = dce.id
        AND pp.completed = true
        AND pp.completed_at > CURRENT_DATE - INTERVAL '30 days'
    )
  ```
- **Visualização**:
  - Contador de planos em risco
  - Lista detalhada com paciente, dias parado, valor pendente
  - Ação sugerida (agendar, ligar, etc)

---

### Fase 2: Eficiência da Agenda e Operações
**Objetivo**: Otimizar o uso do tempo e recursos da clínica

#### 2.1 Taxa de Ocupação Real da Agenda
- **Fonte de Dados**: `appointments` + `clinic_cabinets`
- **Cálculo**:
  ```sql
  -- Horas efetivamente usadas
  SELECT
    SUM(EXTRACT(EPOCH FROM (actual_end - actual_start))/3600) as hours_used,
    SUM(EXTRACT(EPOCH FROM (scheduled_end - scheduled_start))/3600) as hours_scheduled
  FROM appointments
  WHERE clinic_id = ?
    AND date >= date_trunc('month', CURRENT_DATE)
    AND status = 'completed'
  ```
- **Visualização**:
  - Card KPI: % ocupação real
  - Gráfico comparativo: Agendado vs Real
  - Breakdown por gabinete e médico

#### 2.2 Tempo Médio de Espera do Paciente
- **Fonte de Dados**: `appointments.actual_start` - `appointments.actual_arrival`
- **Cálculo**:
  ```sql
  SELECT
    AVG(EXTRACT(EPOCH FROM (actual_start - actual_arrival))/60) as avg_wait_minutes
  FROM appointments
  WHERE clinic_id = ?
    AND actual_arrival IS NOT NULL
    AND actual_start IS NOT NULL
    AND date >= date_trunc('month', CURRENT_DATE)
  ```
- **Visualização**:
  - Card KPI com meta (ex: < 10 min)
  - Gráfico de tendência diária
  - Breakdown por médico

#### 2.3 Atrasos: Paciente vs Médico
- **Fonte de Dados**: `appointments.delay_reason`
- **Cálculo**:
  ```sql
  SELECT
    delay_reason,
    COUNT(*) as count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
  FROM appointments
  WHERE clinic_id = ?
    AND delay_reason IS NOT NULL
    AND date >= date_trunc('month', CURRENT_DATE)
  GROUP BY delay_reason
  ```
- **Visualização**:
  - Gráfico pizza: Paciente vs Médico
  - Lista de atrasos recorrentes

#### 2.4 Taxa de Conversão Agendamento → Consulta Completa
- **Fonte de Dados**: `appointments` + `daily_consultation_entries`
- **Cálculo**:
  ```sql
  SELECT
    COUNT(*) FILTER (WHERE a.status = 'completed' AND dce.consultation_completed = true) * 100.0 /
    NULLIF(COUNT(*), 0) as conversion_rate
  FROM appointments a
  LEFT JOIN daily_consultation_entries dce ON a.consultation_entry_id = dce.id
  WHERE a.clinic_id = ?
    AND a.date >= date_trunc('month', CURRENT_DATE)
  ```
- **Visualização**: Card KPI
- **Breakdown**: Por médico, tipo de consulta

---

### Fase 3: Performance Comercial Avançada
**Objetivo**: Otimizar o processo de venda e execução de planos

#### 3.1 Ciclo de Venda Completo (Funil com Timings)
- **Fonte de Dados**: `daily_consultation_entries` timestamps
- **Métricas**:
  - Tempo médio: `plan_created_at` → `plan_presented_at`
  - Tempo médio: `plan_presented_at` → `plan_accepted_at`
  - Tempo médio: `plan_accepted_at` → `waiting_start_at`
  - Tempo médio: `waiting_start_at` → `in_execution_at`
  - Taxa de abandono em cada etapa
- **Visualização**:
  - Funil Sankey com tempos médios
  - Lista de casos acima da média em cada etapa

#### 3.2 Valor Médio de Plano por Fase
- **Fonte de Dados**: `daily_consultation_entries`
- **Cálculo**:
  ```sql
  SELECT
    AVG(plan_presented_value) as avg_presented,
    AVG(plan_value) as avg_accepted,
    AVG(plan_presented_value - plan_value) as avg_discount
  FROM daily_consultation_entries
  WHERE clinic_id = ?
    AND plan_created_at >= date_trunc('month', CURRENT_DATE)
  ```
- **Visualização**: Cards comparativos
- **Alertas**: Se desconto médio > 15%

#### 3.3 Taxa de Execução de Procedimentos
- **Fonte de Dados**: `plan_procedures` + `daily_consultation_entries`
- **Cálculo**:
  ```sql
  SELECT
    dce.id,
    dce.patient_name,
    dce.plan_procedures_completed * 100.0 / NULLIF(dce.plan_procedures_total, 0) as completion_rate,
    CURRENT_DATE - dce.plan_accepted_at::date as days_since_accepted
  FROM daily_consultation_entries dce
  WHERE dce.clinic_id = ?
    AND dce.plan_accepted = true
    AND dce.plan_finished = false
    AND dce.abandoned = false
  ORDER BY days_since_accepted DESC
  ```
- **Visualização**:
  - Histograma de distribuição de % completadas
  - Lista de planos com execução lenta
- **Alertas**: Planos < 20% após 30 dias

#### 3.4 Procedimentos Mais Rentáveis
- **Fonte de Dados**: `plan_procedures`
- **Cálculo**:
  ```sql
  SELECT
    procedure_code,
    procedure_description,
    COUNT(*) as volume,
    SUM(price_at_creation) as total_revenue,
    AVG(price_at_creation) as avg_price
  FROM plan_procedures
  WHERE clinic_id = ?
    AND completed = true
    AND completed_at >= date_trunc('month', CURRENT_DATE)
  GROUP BY procedure_code, procedure_description
  ORDER BY total_revenue DESC
  LIMIT 10
  ```
- **Visualização**:
  - Tabela ranking
  - Gráfico de barras

---

### Fase 4: Padrões de No-Show e Remarcações
**Objetivo**: Reduzir faltas e otimizar agendamento

#### 4.1 Padrões de No-Show
- **Fonte de Dados**: `appointments` (status: no_show)
- **Análises**:
  - Por dia da semana
  - Por horário
  - Por médico
  - Por paciente novo vs retorno (`is_new_patient`)
- **Cálculo**:
  ```sql
  SELECT
    EXTRACT(DOW FROM date) as day_of_week,
    EXTRACT(HOUR FROM scheduled_start) as hour,
    doctor_id,
    is_new_patient,
    COUNT(*) as no_show_count,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
  FROM appointments
  WHERE clinic_id = ?
    AND status = 'no_show'
    AND date >= CURRENT_DATE - INTERVAL '3 months'
  GROUP BY day_of_week, hour, doctor_id, is_new_patient
  ```
- **Visualização**:
  - Heatmap: dia da semana x horário
  - Rankings por médico
  - Comparativo novo vs retorno

#### 4.2 Taxa de Remarcação
- **Fonte de Dados**: `appointments` (status: rescheduled + rescheduled_from_id)
- **Cálculo**:
  ```sql
  SELECT
    COUNT(*) FILTER (WHERE status = 'rescheduled') * 100.0 /
    NULLIF(COUNT(*), 0) as rescheduling_rate
  FROM appointments
  WHERE clinic_id = ?
    AND date >= date_trunc('month', CURRENT_DATE)
  ```
- **Visualização**: Card KPI + tendência

#### 4.3 Taxa de Confirmação
- **Fonte de Dados**: `appointments.confirmed_at`
- **Cálculo**:
  ```sql
  SELECT
    COUNT(*) FILTER (WHERE confirmed_at IS NOT NULL) * 100.0 /
    NULLIF(COUNT(*), 0) as confirmation_rate,
    AVG(EXTRACT(EPOCH FROM (confirmed_at - created_at))/3600) as avg_hours_to_confirm
  FROM appointments
  WHERE clinic_id = ?
    AND date >= CURRENT_DATE
  ```
- **Visualização**: Card KPI
- **Alertas**: Se taxa < 80%

---

### Fase 5: Análise de Pacientes e Jornada
**Objetivo**: Entender comportamento e valor dos pacientes

#### 5.1 Lifetime Value por Paciente
- **Fonte de Dados**: `plan_procedures` + `daily_financial_entries`
- **Cálculo**:
  ```sql
  WITH patient_revenue AS (
    SELECT
      patient_code,
      patient_name,
      SUM(pp.price_at_creation) as treatment_value,
      COUNT(DISTINCT dce.id) as num_plans,
      MIN(dce.plan_accepted_at) as first_plan_date,
      MAX(pp.completed_at) as last_activity_date
    FROM daily_consultation_entries dce
    JOIN plan_procedures pp ON pp.consultation_entry_id = dce.id
    WHERE dce.clinic_id = ?
      AND pp.completed = true
    GROUP BY patient_code, patient_name
  )
  SELECT
    patient_code,
    patient_name,
    treatment_value,
    num_plans,
    EXTRACT(EPOCH FROM (last_activity_date - first_plan_date))/86400 as lifetime_days
  FROM patient_revenue
  ORDER BY treatment_value DESC
  ```
- **Visualização**:
  - Top 10% pacientes (VIPs)
  - Distribuição de LTV
  - Segmentação: Alto/Médio/Baixo valor

#### 5.2 Taxa de Abandono de Tratamento
- **Fonte de Dados**: `daily_consultation_entries.abandoned`
- **Cálculo**:
  ```sql
  SELECT
    COUNT(*) FILTER (WHERE abandoned = true) * 100.0 /
    NULLIF(COUNT(*) FILTER (WHERE plan_accepted = true), 0) as abandonment_rate,
    abandoned_reason,
    COUNT(*) as count
  FROM daily_consultation_entries
  WHERE clinic_id = ?
    AND plan_accepted_at >= date_trunc('month', CURRENT_DATE)
  GROUP BY abandoned_reason
  ```
- **Visualização**:
  - Card KPI: Taxa geral
  - Gráfico pizza: Breakdown por motivo
  - Tendência mensal

#### 5.3 Frequência de Retorno
- **Fonte de Dados**: `appointments` por paciente
- **Cálculo**:
  ```sql
  WITH patient_visits AS (
    SELECT
      patient_code,
      date,
      LAG(date) OVER (PARTITION BY patient_code ORDER BY date) as previous_date
    FROM appointments
    WHERE clinic_id = ?
      AND status = 'completed'
  )
  SELECT
    AVG(EXTRACT(EPOCH FROM (date - previous_date))/86400) as avg_days_between_visits
  FROM patient_visits
  WHERE previous_date IS NOT NULL
  ```
- **Visualização**: Card KPI

---

### Fase 6: Operadoras e Contratos (Portugal)
**Objetivo**: Gestão eficiente de contratos e faturação

#### 6.1 Performance por Operadora
- **Fonte de Dados**: `insurance_providers` + `billing_batches`
- **Métricas**:
  - Contratos ativos
  - Valor faturado no mês
  - Taxa de glosa: `glosed_amount / total_amount`
  - Tempo médio de pagamento
- **Cálculo**:
  ```sql
  SELECT
    ip.name as provider_name,
    COUNT(DISTINCT ac.id) as active_contracts,
    SUM(bb.total_amount) as billed_amount,
    SUM(bb.glosed_amount) as glosed_amount,
    SUM(bb.glosed_amount) * 100.0 / NULLIF(SUM(bb.total_amount), 0) as glosa_rate,
    AVG(EXTRACT(EPOCH FROM (bb.paid_at - bb.issued_at))/86400) as avg_payment_days
  FROM insurance_providers ip
  LEFT JOIN advance_contracts ac ON ac.insurance_provider_id = ip.id AND ac.status = 'ACTIVE'
  LEFT JOIN billing_batches bb ON bb.contract_id = ac.id
    AND bb.issued_at >= date_trunc('month', CURRENT_DATE)
  WHERE ip.clinic_id = ?
  GROUP BY ip.id, ip.name
  ```
- **Visualização**: Tabela comparativa

#### 6.2 Lotes em Aberto
- **Fonte de Dados**: `billing_batches`
- **Cálculo**:
  ```sql
  SELECT
    bb.batch_number,
    ac.contract_number,
    ip.name as provider_name,
    bb.total_amount,
    bb.status,
    CURRENT_DATE - bb.issued_at::date as days_open
  FROM billing_batches bb
  JOIN advance_contracts ac ON bb.contract_id = ac.id
  JOIN insurance_providers ip ON ac.insurance_provider_id = ip.id
  WHERE bb.clinic_id = ?
    AND bb.status IN ('ISSUED', 'PARTIALLY_PAID')
  ORDER BY bb.total_amount DESC
  ```
- **Visualização**: Lista ordenada por valor
- **Alertas**: Se lotes > 60 dias em aberto

---

### Fase 7: Médicos - Performance Multidimensional
**Objetivo**: Avaliar performance completa de cada médico

#### 7.1 Ranking de Médicos
- **Fonte de Dados**: Cruzamento múltiplas tabelas
- **Métricas**:
  - Receita gerada (`plan_procedures.completed_by_doctor_id`)
  - Procedimentos executados
  - Taxa de aceitação de planos
  - Pontualidade (atrasos por culpa do médico)
  - No-shows
- **Cálculo**: Queries específicas por métrica
- **Visualização**: Tabela ranking multidimensional

#### 7.2 Médicos por Procedimento
- **Fonte de Dados**: `plan_procedures`
- **Cálculo**:
  ```sql
  SELECT
    cd.name as doctor_name,
    pp.procedure_code,
    COUNT(*) as volume,
    SUM(pp.price_at_creation) as revenue
  FROM plan_procedures pp
  JOIN clinic_doctors cd ON pp.completed_by_doctor_id = cd.id
  WHERE pp.clinic_id = ?
    AND pp.completed = true
    AND pp.completed_at >= date_trunc('month', CURRENT_DATE)
  GROUP BY cd.name, pp.procedure_code
  ```
- **Visualização**: Matriz (heatmap)

---

### Fase 8: Previsões e Inteligência Preditiva
**Objetivo**: Antecipar problemas e oportunidades

#### 8.1 Previsão de Receita (próximos 3 meses)
- **Algoritmo**:
  1. Parcelas confirmadas (`revenue_installments`)
  2. Tratamentos pendentes × taxa média de execução mensal
  3. Pipeline de planos aceitos × taxa histórica de conversão
- **Cálculo**:
  ```sql
  -- Componente 1: Parcelas confirmadas
  SELECT SUM(value) FROM revenue_installments
  WHERE due_date BETWEEN ? AND ?

  -- Componente 2: Tratamentos (baseado em histórico)
  WITH monthly_execution_rate AS (
    SELECT AVG(execution_rate) as avg_rate
    FROM (
      SELECT
        DATE_TRUNC('month', completed_at) as month,
        SUM(price_at_creation) * 1.0 /
        (SELECT SUM(pending_value) FROM pending_treatments WHERE ...) as execution_rate
      FROM plan_procedures
      WHERE completed = true
      GROUP BY month
    ) monthly
  )
  SELECT (SELECT SUM(pending_value) FROM pending_treatments) * avg_rate * 3
  FROM monthly_execution_rate
  ```
- **Visualização**:
  - Gráfico: Histórico + Projeção
  - Breakdown por fonte (parcelas, tratamentos, pipeline)

#### 8.2 Alertas Preditivos
- **Regras**:
  - Pacientes com plano aceito há > 30 dias sem agendamento futuro
  - Planos em execução estagnados (sem avanço em 21+ dias)
  - Gabinetes com ocupação < 50% no mês
  - Médicos com taxa de no-show > 15%
  - Risco de não atingir meta mensal (projeção < 80% da meta)
- **Visualização**: Central de alertas com ações sugeridas

---

## ESTRUTURA TÉCNICA

### 1. Backend - Novos Endpoints

```typescript
// server/routes/dashboardMetrics.ts

// Fase 1
GET /api/clinics/:clinicId/metrics/guaranteed-revenue
GET /api/clinics/:clinicId/metrics/overdue-installments
GET /api/clinics/:clinicId/metrics/plan-conversion-rate
GET /api/clinics/:clinicId/metrics/plans-at-risk

// Fase 2
GET /api/clinics/:clinicId/metrics/schedule-occupancy
GET /api/clinics/:clinicId/metrics/wait-times
GET /api/clinics/:clinicId/metrics/delay-reasons
GET /api/clinics/:clinicId/metrics/appointment-conversion

// Fase 3
GET /api/clinics/:clinicId/metrics/sales-funnel
GET /api/clinics/:clinicId/metrics/plan-values
GET /api/clinics/:clinicId/metrics/procedure-execution
GET /api/clinics/:clinicId/metrics/top-procedures

// ... e assim por diante
```

### 2. Frontend - Componentes

```
src/components/dashboard/
  metrics/
    Phase1/
      GuaranteedRevenue.tsx
      OverdueInstallments.tsx
      PlanConversionRate.tsx
      PlansAtRisk.tsx
    Phase2/
      ScheduleOccupancy.tsx
      WaitTimes.tsx
      DelayReasons.tsx
      AppointmentConversion.tsx
    ...
```

### 3. Tipos TypeScript

```typescript
// src/lib/types/dashboardMetrics.ts

export interface GuaranteedRevenue {
  next30Days: {
    installments: number
    pendingTreatments: number
    total: number
  }
  next60Days: { ... }
  next90Days: { ... }
}

export interface PlanAtRisk {
  id: string
  patientName: string
  patientCode: string
  riskType: 'waiting_too_long' | 'stagnated' | 'low_progress'
  daysSinceLastActivity: number
  pendingValue: number
  completionRate: number
  suggestedAction: string
}

// ... outros tipos
```

---

## FASE 1 - IMPLEMENTAÇÃO DETALHADA

### Entregáveis da Fase 1

1. **Backend**:
   - Endpoint: `/api/clinics/:clinicId/metrics/guaranteed-revenue`
   - Endpoint: `/api/clinics/:clinicId/metrics/overdue-installments`
   - Endpoint: `/api/clinics/:clinicId/metrics/plan-conversion-rate`
   - Endpoint: `/api/clinics/:clinicId/metrics/plans-at-risk`

2. **Frontend**:
   - Card: "Receita Garantida Próximos 30 Dias"
   - Gráfico: Receitas Atrasadas vs Previstas
   - Card: "Taxa de Conversão de Planos"
   - Lista: "Planos em Risco de Abandono"

3. **Dashboard Integration**:
   - Nova seção no Dashboard: "Saúde Financeira"
   - Posicionamento: Logo após KPIs principais
   - Permissões: `canViewDashboardFinancial`

### Estrutura de Arquivos

```
server/
  routes/
    dashboardMetrics.ts (novo)

src/
  components/
    dashboard/
      metrics/
        GuaranteedRevenue.tsx (novo)
        OverdueInstallments.tsx (novo)
        PlanConversionRate.tsx (novo)
        PlansAtRisk.tsx (novo)
      FinancialHealthSection.tsx (novo)

  lib/
    types/
      dashboardMetrics.ts (novo)

  services/
    dashboardMetricsApi.ts (novo)
```

### Queries SQL Otimizadas

```sql
-- 1. Receita Garantida
CREATE OR REPLACE VIEW v_guaranteed_revenue AS
SELECT
  clinic_id,
  SUM(CASE WHEN due_date <= CURRENT_DATE + INTERVAL '30 days' THEN value ELSE 0 END) as next_30_days_installments,
  SUM(CASE WHEN due_date <= CURRENT_DATE + INTERVAL '60 days' THEN value ELSE 0 END) as next_60_days_installments,
  SUM(CASE WHEN due_date <= CURRENT_DATE + INTERVAL '90 days' THEN value ELSE 0 END) as next_90_days_installments
FROM revenue_installments
WHERE status IN ('A_RECEBER', 'ATRASADO')
GROUP BY clinic_id;

-- 2. Planos em Risco
CREATE OR REPLACE VIEW v_plans_at_risk AS
SELECT
  dce.id,
  dce.clinic_id,
  dce.patient_name,
  dce.patient_code,
  dce.plan_total_value as pending_value,
  CASE
    WHEN dce.waiting_start = true AND CURRENT_DATE - dce.waiting_start_at::date > 7
      THEN 'waiting_too_long'
    WHEN dce.in_execution = true
      AND NOT EXISTS (
        SELECT 1 FROM plan_procedures pp
        WHERE pp.consultation_entry_id = dce.id
          AND pp.completed = true
          AND pp.completed_at > CURRENT_DATE - INTERVAL '30 days'
      )
      THEN 'stagnated'
    WHEN dce.plan_procedures_completed * 100.0 / NULLIF(dce.plan_procedures_total, 0) < 20
      AND CURRENT_DATE - dce.plan_accepted_at::date > 30
      THEN 'low_progress'
  END as risk_type,
  CURRENT_DATE - COALESCE(
    (SELECT MAX(pp.completed_at)::date
     FROM plan_procedures pp
     WHERE pp.consultation_entry_id = dce.id
       AND pp.completed = true),
    dce.waiting_start_at::date,
    dce.plan_accepted_at::date
  ) as days_since_last_activity,
  dce.plan_procedures_completed * 100.0 / NULLIF(dce.plan_procedures_total, 0) as completion_rate
FROM daily_consultation_entries dce
WHERE dce.plan_accepted = true
  AND dce.abandoned = false
  AND dce.plan_finished = false
  AND (
    (dce.waiting_start = true AND CURRENT_DATE - dce.waiting_start_at::date > 7)
    OR (dce.in_execution = true AND NOT EXISTS (...))
    OR (dce.plan_procedures_completed * 100.0 / NULLIF(dce.plan_procedures_total, 0) < 20
        AND CURRENT_DATE - dce.plan_accepted_at::date > 30)
  );
```

---

## CRONOGRAMA ESTIMADO

- **Fase 1**: 3-4 dias
- **Fase 2**: 3-4 dias
- **Fase 3**: 4-5 dias
- **Fase 4**: 3-4 dias
- **Fase 5**: 3-4 dias
- **Fase 6**: 2-3 dias (opcional - apenas Portugal)
- **Fase 7**: 3-4 dias
- **Fase 8**: 5-6 dias

**Total estimado**: 26-34 dias de desenvolvimento

---

## CONSIDERAÇÕES TÉCNICAS

### Performance
- Todas as queries complexas devem ter views materializadas
- Refresh automático das views a cada 1 hora
- Cache de métricas no Redis (quando aplicável)
- Índices específicos para queries de métricas

### Permissões
- Respeitar permissões existentes do dashboard
- Novas permissões específicas se necessário

### Internacionalização
- Todos os textos em pt-BR, pt-PT, en, es, it, fr
- Formatação de datas/moedas por locale

### Responsividade
- Todos os componentes mobile-first
- Gráficos adaptáveis a telas pequenas

---

## FEEDBACK E ITERAÇÕES

Após cada fase, esperamos:
1. Revisão da implementação
2. Ajustes baseados em feedback real
3. Validação com dados reais
4. Aprovação para próxima fase

---

**Documento criado em**: 2026-04-07
**Versão**: 1.0
**Autor**: Claude Code
