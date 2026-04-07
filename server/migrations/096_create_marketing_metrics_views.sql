-- ============================================================
-- Migration 096: Marketing & Acquisition Metrics Views (Phase 3)
-- ============================================================

-- VIEW 1: Conversion Funnel Summary
-- Shows the complete patient acquisition funnel
CREATE OR REPLACE VIEW v_conversion_funnel AS
SELECT
  a.clinic_id,

  -- Etapa 1: Contatos/Prospecção (mês atual)
  (SELECT COUNT(DISTINCT id)
   FROM daily_prospecting_entries dpe
   WHERE dpe.clinic_id = a.clinic_id
     AND dpe.date >= date_trunc('month', CURRENT_DATE)
  ) as contacts_this_month,

  -- Etapa 2: Primeira Consulta Realizada (appointments com is_new_patient = true e status = completed)
  COUNT(DISTINCT CASE
    WHEN a.is_new_patient = true
      AND a.status = 'completed'
      AND a.date >= date_trunc('month', CURRENT_DATE)
    THEN a.id
  END) as first_consultations_this_month,

  -- Etapa 3: Plano Criado
  (SELECT COUNT(DISTINCT dce.id)
   FROM daily_consultation_entries dce
   WHERE dce.clinic_id = a.clinic_id
     AND dce.plan_created = true
     AND dce.plan_created_at >= date_trunc('month', CURRENT_DATE)
  ) as plans_created_this_month,

  -- Etapa 4: Plano Apresentado
  (SELECT COUNT(DISTINCT dce.id)
   FROM daily_consultation_entries dce
   WHERE dce.clinic_id = a.clinic_id
     AND dce.plan_presented = true
     AND dce.plan_presented_at >= date_trunc('month', CURRENT_DATE)
  ) as plans_presented_this_month,

  -- Etapa 5: Em Execução
  (SELECT COUNT(DISTINCT dce.id)
   FROM daily_consultation_entries dce
   WHERE dce.clinic_id = a.clinic_id
     AND dce.in_execution = true
     AND dce.in_execution_at >= date_trunc('month', CURRENT_DATE)
  ) as plans_in_execution_this_month,

  -- Métricas do mês anterior para comparação
  (SELECT COUNT(DISTINCT id)
   FROM daily_prospecting_entries dpe2
   WHERE dpe2.clinic_id = a.clinic_id
     AND dpe2.date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
     AND dpe2.date < date_trunc('month', CURRENT_DATE)
  ) as contacts_prev_month,

  COUNT(DISTINCT CASE
    WHEN a.is_new_patient = true
      AND a.status = 'completed'
      AND a.date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
      AND a.date < date_trunc('month', CURRENT_DATE)
    THEN a.id
  END) as first_consultations_prev_month,

  (SELECT COUNT(DISTINCT dce.id)
   FROM daily_consultation_entries dce
   WHERE dce.clinic_id = a.clinic_id
     AND dce.plan_created = true
     AND dce.plan_created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
     AND dce.plan_created_at < date_trunc('month', CURRENT_DATE)
  ) as plans_created_prev_month,

  (SELECT COUNT(DISTINCT dce.id)
   FROM daily_consultation_entries dce
   WHERE dce.clinic_id = a.clinic_id
     AND dce.in_execution = true
     AND dce.in_execution_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
     AND dce.in_execution_at < date_trunc('month', CURRENT_DATE)
  ) as plans_in_execution_prev_month

FROM appointments a
GROUP BY a.clinic_id;


-- VIEW 2: Source Performance
-- Analyzes conversion quality by patient source
CREATE OR REPLACE VIEW v_source_performance AS
SELECT
  dce.clinic_id,
  dce.source_id,
  cs.name as source_name,

  -- Total de pacientes únicos desta fonte (com entrada de consulta)
  COUNT(DISTINCT dce.code) as total_patients,

  -- Primeiras consultas (via appointments.is_new_patient)
  (SELECT COUNT(DISTINCT a.id)
   FROM appointments a
   LEFT JOIN daily_consultation_entries dce2 ON a.consultation_entry_id = dce2.id
   WHERE dce2.source_id = dce.source_id
     AND a.is_new_patient = true
     AND a.status = 'completed'
  ) as first_consultations,

  -- Planos criados
  COUNT(DISTINCT CASE WHEN dce.plan_created = true THEN dce.id END) as plans_created,

  -- Planos apresentados
  COUNT(DISTINCT CASE WHEN dce.plan_presented = true THEN dce.id END) as plans_presented,

  -- Planos em execução
  COUNT(DISTINCT CASE WHEN dce.in_execution = true THEN dce.id END) as plans_in_execution,

  -- Valor total de planos apresentados
  SUM(CASE WHEN dce.plan_presented_value IS NOT NULL THEN dce.plan_presented_value ELSE 0 END) as total_plan_value,

  -- Valor médio por plano apresentado
  AVG(CASE WHEN dce.plan_presented_value IS NOT NULL THEN dce.plan_presented_value END) as avg_plan_value,

  -- Tendência (últimos 3 meses vs 3 meses anteriores) - primeiras consultas
  (SELECT COUNT(DISTINCT a.id)
   FROM appointments a
   LEFT JOIN daily_consultation_entries dce3 ON a.consultation_entry_id = dce3.id
   WHERE dce3.source_id = dce.source_id
     AND a.is_new_patient = true
     AND a.status = 'completed'
     AND a.date >= CURRENT_DATE - INTERVAL '3 months'
  ) as first_consult_last_3m,

  (SELECT COUNT(DISTINCT a.id)
   FROM appointments a
   LEFT JOIN daily_consultation_entries dce4 ON a.consultation_entry_id = dce4.id
   WHERE dce4.source_id = dce.source_id
     AND a.is_new_patient = true
     AND a.status = 'completed'
     AND a.date >= CURRENT_DATE - INTERVAL '6 months'
     AND a.date < CURRENT_DATE - INTERVAL '3 months'
  ) as first_consult_prev_3m

FROM daily_consultation_entries dce
LEFT JOIN clinic_sources cs ON dce.source_id = cs.id
WHERE dce.source_id IS NOT NULL
GROUP BY dce.clinic_id, dce.source_id, cs.name;


-- VIEW 3: Acquisition Trends
-- Monthly trends of new patient acquisition
CREATE OR REPLACE VIEW v_acquisition_trends AS
WITH new_patients_by_month AS (
  SELECT
    clinic_id,
    date_trunc('month', date) as month,
    COUNT(DISTINCT id) as new_patients
  FROM appointments
  WHERE is_new_patient = true
    AND status = 'completed'
    AND date >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY clinic_id, date_trunc('month', date)
),
plans_by_month AS (
  SELECT
    clinic_id,
    date_trunc('month', plan_presented_at) as month,
    COUNT(DISTINCT CASE WHEN plan_presented = true THEN id END) as plans_presented,
    COUNT(DISTINCT CASE WHEN in_execution = true THEN id END) as plans_started,
    SUM(CASE WHEN plan_presented = true THEN plan_presented_value ELSE 0 END) as total_value_presented
  FROM daily_consultation_entries
  WHERE plan_presented_at >= CURRENT_DATE - INTERVAL '6 months'
     OR in_execution_at >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY clinic_id, date_trunc('month', plan_presented_at)
)
SELECT
  COALESCE(npm.clinic_id, pbm.clinic_id) as clinic_id,
  COALESCE(npm.month, pbm.month) as month,
  COALESCE(npm.new_patients, 0) as new_patients,
  COALESCE(pbm.plans_presented, 0) as plans_presented,
  COALESCE(pbm.plans_started, 0) as plans_started,
  COALESCE(pbm.total_value_presented, 0) as total_value_presented
FROM new_patients_by_month npm
FULL OUTER JOIN plans_by_month pbm
  ON npm.clinic_id = pbm.clinic_id
  AND npm.month = pbm.month
ORDER BY month DESC;


-- VIEW 4: Prospecting Pipeline
-- Analyzes prospecting volume by channel
CREATE OR REPLACE VIEW v_prospecting_pipeline AS
SELECT
  clinic_id,

  -- Total de contatos por canal (mês atual)
  SUM(CASE WHEN date >= date_trunc('month', CURRENT_DATE) THEN scheduled ELSE 0 END) as scheduled_month,
  SUM(CASE WHEN date >= date_trunc('month', CURRENT_DATE) THEN phone ELSE 0 END) as phone_month,
  SUM(CASE WHEN date >= date_trunc('month', CURRENT_DATE) THEN whatsapp ELSE 0 END) as whatsapp_month,
  SUM(CASE WHEN date >= date_trunc('month', CURRENT_DATE) THEN email ELSE 0 END) as email_month,
  SUM(CASE WHEN date >= date_trunc('month', CURRENT_DATE) THEN sms ELSE 0 END) as sms_month,
  SUM(CASE WHEN date >= date_trunc('month', CURRENT_DATE) THEN instagram ELSE 0 END) as instagram_month,
  SUM(CASE WHEN date >= date_trunc('month', CURRENT_DATE) THEN in_person ELSE 0 END) as in_person_month,

  -- Total de todos os contatos no mês
  SUM(CASE
    WHEN date >= date_trunc('month', CURRENT_DATE)
    THEN scheduled + phone + whatsapp + COALESCE(email, 0) + COALESCE(sms, 0) + COALESCE(instagram, 0) + COALESCE(in_person, 0)
    ELSE 0
  END) as total_contacts_month,

  -- Total de contatos por canal (semana atual)
  SUM(CASE WHEN date >= date_trunc('week', CURRENT_DATE) THEN scheduled ELSE 0 END) as scheduled_week,
  SUM(CASE WHEN date >= date_trunc('week', CURRENT_DATE) THEN phone ELSE 0 END) as phone_week,
  SUM(CASE WHEN date >= date_trunc('week', CURRENT_DATE) THEN whatsapp ELSE 0 END) as whatsapp_week,
  SUM(CASE WHEN date >= date_trunc('week', CURRENT_DATE) THEN in_person ELSE 0 END) as in_person_week,

  -- Total de todos os contatos na semana
  SUM(CASE
    WHEN date >= date_trunc('week', CURRENT_DATE)
    THEN scheduled + phone + whatsapp + COALESCE(email, 0) + COALESCE(sms, 0) + COALESCE(instagram, 0) + COALESCE(in_person, 0)
    ELSE 0
  END) as total_contacts_week,

  -- Mês anterior para comparação
  SUM(CASE
    WHEN date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
      AND date < date_trunc('month', CURRENT_DATE)
    THEN scheduled + phone + whatsapp + COALESCE(email, 0) + COALESCE(sms, 0) + COALESCE(instagram, 0) + COALESCE(in_person, 0)
    ELSE 0
  END) as total_contacts_prev_month

FROM daily_prospecting_entries
GROUP BY clinic_id;
