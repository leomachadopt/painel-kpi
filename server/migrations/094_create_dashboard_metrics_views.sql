-- Migration 094: Create Dashboard Metrics Views
-- Creates optimized views for Phase 1 dashboard metrics

-- ============================================================
-- VIEW 1: Guaranteed Revenue (Receita Garantida)
-- Only from revenue_installments (parcelized payments)
-- ============================================================
CREATE OR REPLACE VIEW v_guaranteed_revenue AS
SELECT
  clinic_id,

  -- Next 30 days
  SUM(CASE
    WHEN status IN ('A_RECEBER', 'ATRASADO')
      AND due_date <= CURRENT_DATE + INTERVAL '30 days'
    THEN value ELSE 0
  END) as next_30_days,

  -- Next 60 days
  SUM(CASE
    WHEN status IN ('A_RECEBER', 'ATRASADO')
      AND due_date <= CURRENT_DATE + INTERVAL '60 days'
    THEN value ELSE 0
  END) as next_60_days,

  -- Next 90 days
  SUM(CASE
    WHEN status IN ('A_RECEBER', 'ATRASADO')
      AND due_date <= CURRENT_DATE + INTERVAL '90 days'
    THEN value ELSE 0
  END) as next_90_days,

  -- Overdue
  SUM(CASE WHEN status = 'ATRASADO' THEN value ELSE 0 END) as overdue_amount,
  COUNT(CASE WHEN status = 'ATRASADO' THEN 1 END) as overdue_count,

  -- Receivable
  SUM(CASE WHEN status = 'A_RECEBER' THEN value ELSE 0 END) as receivable_amount,
  COUNT(CASE WHEN status = 'A_RECEBER' THEN 1 END) as receivable_count,

  -- Received this month
  SUM(CASE
    WHEN status = 'RECEBIDO'
      AND received_date >= date_trunc('month', CURRENT_DATE)
    THEN value ELSE 0
  END) as received_month_amount,
  COUNT(CASE
    WHEN status = 'RECEBIDO'
      AND received_date >= date_trunc('month', CURRENT_DATE)
    THEN 1
  END) as received_month_count

FROM revenue_installments
GROUP BY clinic_id;

COMMENT ON VIEW v_guaranteed_revenue IS
  'Receita garantida baseada apenas em parcelas contratualizadas (revenue_installments)';

-- ============================================================
-- VIEW 2: Pending Treatments (Receita Previsível)
-- Potential revenue from treatments presented but not fully executed
-- ============================================================
CREATE OR REPLACE VIEW v_pending_treatments_summary AS
SELECT
  pt.clinic_id,

  -- Total pending value
  SUM(pt.pending_value) as total_pending_value,

  -- Count of patients with pending treatments
  COUNT(DISTINCT pt.pending_treatment_patient_id) as num_patients,

  -- Count of pending treatment items
  COUNT(*) as num_treatments,

  -- Breakdown by status
  SUM(CASE WHEN pt.status = 'PENDENTE' THEN pt.pending_value ELSE 0 END) as pending_value,
  COUNT(CASE WHEN pt.status = 'PENDENTE' THEN 1 END) as pending_count,

  SUM(CASE WHEN pt.status = 'PARCIAL' THEN pt.pending_value ELSE 0 END) as partial_value,
  COUNT(CASE WHEN pt.status = 'PARCIAL' THEN 1 END) as partial_count

FROM pending_treatments pt
WHERE pt.status IN ('PENDENTE', 'PARCIAL')
GROUP BY pt.clinic_id;

COMMENT ON VIEW v_pending_treatments_summary IS
  'Resumo de tratamentos pendentes (receita previsível/potencial)';

-- ============================================================
-- VIEW 3: Plans Conversion Rate
-- Tracks conversion from presented to in_execution
-- ============================================================
CREATE OR REPLACE VIEW v_plan_conversion_rate AS
SELECT
  clinic_id,

  -- Current month data
  COUNT(*) FILTER (WHERE plan_presented = true
    AND plan_presented_at >= date_trunc('month', CURRENT_DATE)) as plans_presented_month,

  COUNT(*) FILTER (WHERE in_execution = true
    AND in_execution_at >= date_trunc('month', CURRENT_DATE)) as plans_in_execution_month,

  COUNT(*) FILTER (WHERE plan_finished = true
    AND plan_finished_at >= date_trunc('month', CURRENT_DATE)) as plans_completed_month,

  COUNT(*) FILTER (WHERE waiting_start = true AND abandoned = false) as plans_waiting,

  COUNT(*) FILTER (WHERE in_execution = true
    AND plan_finished = false
    AND abandoned = false) as plans_executing,

  -- Conversion rate (presented to execution)
  CASE
    WHEN COUNT(*) FILTER (WHERE plan_presented = true
      AND plan_presented_at >= date_trunc('month', CURRENT_DATE)) > 0
    THEN
      COUNT(*) FILTER (WHERE in_execution = true
        AND in_execution_at >= date_trunc('month', CURRENT_DATE)) * 100.0 /
      COUNT(*) FILTER (WHERE plan_presented = true
        AND plan_presented_at >= date_trunc('month', CURRENT_DATE))
    ELSE 0
  END as conversion_rate_month,

  -- Previous month for comparison
  COUNT(*) FILTER (WHERE plan_presented = true
    AND plan_presented_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    AND plan_presented_at < date_trunc('month', CURRENT_DATE)) as plans_presented_prev_month,

  COUNT(*) FILTER (WHERE in_execution = true
    AND in_execution_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    AND in_execution_at < date_trunc('month', CURRENT_DATE)) as plans_in_execution_prev_month

FROM daily_consultation_entries
WHERE abandoned = false
GROUP BY clinic_id;

COMMENT ON VIEW v_plan_conversion_rate IS
  'Taxa de conversão de planos apresentados para em execução';

-- ============================================================
-- VIEW 4: Plans At Risk
-- Identifies plans that may be abandoned
-- ============================================================
CREATE OR REPLACE VIEW v_plans_at_risk AS
SELECT
  dce.id,
  dce.clinic_id,
  dce.patient_name,
  dce.code as patient_code,
  dce.plan_total_value as pending_value,
  dce.plan_procedures_total,
  dce.plan_procedures_completed,
  COALESCE(
    dce.plan_procedures_completed * 100.0 / NULLIF(dce.plan_procedures_total, 0),
    0
  ) as completion_rate,

  -- Risk type classification
  CASE
    WHEN dce.waiting_start = true
      AND CURRENT_DATE - dce.waiting_start_at::date >= 7
    THEN 'waiting_too_long'

    WHEN dce.in_execution = true
      AND NOT EXISTS (
        SELECT 1 FROM plan_procedures pp
        WHERE pp.consultation_entry_id = dce.id
          AND pp.completed = true
          AND pp.completed_at > CURRENT_DATE - INTERVAL '30 days'
      )
    THEN 'stagnated'

    WHEN dce.in_execution = true
      AND dce.plan_procedures_completed * 100.0 / NULLIF(dce.plan_procedures_total, 0) < 20
      AND CURRENT_DATE - dce.in_execution_at::date >= 30
    THEN 'low_progress'

    ELSE 'unknown'
  END as risk_type,

  -- Days since last activity
  CURRENT_DATE - COALESCE(
    (SELECT MAX(pp.completed_at)::date
     FROM plan_procedures pp
     WHERE pp.consultation_entry_id = dce.id
       AND pp.completed = true),
    dce.in_execution_at::date,
    dce.waiting_start_at::date,
    dce.plan_presented_at::date,
    dce.plan_created_at::date
  ) as days_since_last_activity,

  -- Timestamps for reference
  dce.plan_created_at,
  dce.plan_presented_at,
  dce.waiting_start_at,
  dce.in_execution_at

FROM daily_consultation_entries dce
WHERE dce.plan_presented = true
  AND dce.abandoned = false
  AND dce.plan_finished = false
  AND (
    -- Waiting too long (7+ days)
    (dce.waiting_start = true AND CURRENT_DATE - dce.waiting_start_at::date >= 7)

    -- Stagnated (in execution but no procedures completed in 30 days)
    OR (dce.in_execution = true AND NOT EXISTS (
      SELECT 1 FROM plan_procedures pp
      WHERE pp.consultation_entry_id = dce.id
        AND pp.completed = true
        AND pp.completed_at > CURRENT_DATE - INTERVAL '30 days'
    ))

    -- Low progress (< 20% after 30 days)
    OR (dce.in_execution = true
        AND dce.plan_procedures_completed * 100.0 / NULLIF(dce.plan_procedures_total, 0) < 20
        AND CURRENT_DATE - dce.in_execution_at::date >= 30)
  );

COMMENT ON VIEW v_plans_at_risk IS
  'Planos em risco de abandono (aguardando muito tempo, estagnados ou progresso baixo)';

-- ============================================================
-- Indexes for better performance
-- ============================================================

-- Index on revenue_installments for quick filtering
CREATE INDEX IF NOT EXISTS idx_revenue_installments_due_date_status
ON revenue_installments(clinic_id, due_date, status)
WHERE status IN ('A_RECEBER', 'ATRASADO');

-- Index on daily_consultation_entries for plan conversion queries
CREATE INDEX IF NOT EXISTS idx_consultation_entries_conversion
ON daily_consultation_entries(clinic_id, plan_presented_at, in_execution_at)
WHERE plan_presented = true AND abandoned = false;

-- Index on plan_procedures for risk detection
CREATE INDEX IF NOT EXISTS idx_plan_procedures_completed_at
ON plan_procedures(consultation_entry_id, completed, completed_at)
WHERE completed = true;
