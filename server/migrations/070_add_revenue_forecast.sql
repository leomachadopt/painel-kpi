-- Migration 070: Add Revenue Forecast System
-- Creates tables for recurring revenues (installments) and pending treatments

-- ================================
-- 1. REVENUE PLANS (Planos de Receita Recorrente)
-- ================================
CREATE TABLE IF NOT EXISTS revenue_plans (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Description
  description TEXT NOT NULL,

  -- Values
  total_value DECIMAL(12, 2) NOT NULL,
  installment_value DECIMAL(12, 2) NOT NULL,
  installment_count INTEGER NOT NULL CHECK (installment_count > 0),

  -- Dates
  start_date DATE NOT NULL,
  payment_day INTEGER NOT NULL CHECK (payment_day >= 1 AND payment_day <= 31),

  -- Optional category
  category_id VARCHAR(255) REFERENCES clinic_categories(id) ON DELETE SET NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revenue_plans_clinic ON revenue_plans(clinic_id);
CREATE INDEX IF NOT EXISTS idx_revenue_plans_category ON revenue_plans(category_id);

-- ================================
-- 2. REVENUE INSTALLMENTS (Parcelas)
-- ================================
CREATE TABLE IF NOT EXISTS revenue_installments (
  id VARCHAR(255) PRIMARY KEY,
  revenue_plan_id VARCHAR(255) NOT NULL REFERENCES revenue_plans(id) ON DELETE CASCADE,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Installment info
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  value DECIMAL(12, 2) NOT NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'A_RECEBER'
    CHECK (status IN ('A_RECEBER', 'RECEBIDO', 'ATRASADO')),
  received_date DATE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_revenue_installments_plan ON revenue_installments(revenue_plan_id);
CREATE INDEX IF NOT EXISTS idx_revenue_installments_clinic ON revenue_installments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_revenue_installments_status ON revenue_installments(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_revenue_installments_due_date ON revenue_installments(clinic_id, due_date);

-- ================================
-- 3. PENDING TREATMENT PATIENTS (Pacientes com Tratamentos Pendentes)
-- ================================
CREATE TABLE IF NOT EXISTS pending_treatment_patients (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Patient info (not linked to patients table - independent tracking)
  patient_code VARCHAR(100) NOT NULL,
  patient_name VARCHAR(255) NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, patient_code)
);

CREATE INDEX IF NOT EXISTS idx_pending_treatment_patients_clinic ON pending_treatment_patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pending_treatment_patients_code ON pending_treatment_patients(clinic_id, patient_code);

-- ================================
-- 4. PENDING TREATMENTS (Tratamentos Pendentes)
-- ================================
CREATE TABLE IF NOT EXISTS pending_treatments (
  id VARCHAR(255) PRIMARY KEY,
  pending_treatment_patient_id VARCHAR(255) NOT NULL REFERENCES pending_treatment_patients(id) ON DELETE CASCADE,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Treatment description
  description TEXT NOT NULL,

  -- Values and quantities
  unit_value DECIMAL(12, 2) NOT NULL,
  total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
  pending_quantity INTEGER NOT NULL CHECK (pending_quantity >= 0),
  pending_value DECIMAL(12, 2) GENERATED ALWAYS AS (unit_value * pending_quantity) STORED,

  -- Optional category
  category_id VARCHAR(255) REFERENCES clinic_categories(id) ON DELETE SET NULL,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE'
    CHECK (status IN ('PENDENTE', 'PARCIAL', 'CONCLUIDO')),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pending_treatments_patient ON pending_treatments(pending_treatment_patient_id);
CREATE INDEX IF NOT EXISTS idx_pending_treatments_clinic ON pending_treatments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pending_treatments_status ON pending_treatments(clinic_id, status);

-- ================================
-- 5. TRIGGERS FOR updated_at
-- ================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_revenue_plans_updated_at') THEN
    CREATE TRIGGER update_revenue_plans_updated_at BEFORE UPDATE ON revenue_plans
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_revenue_installments_updated_at') THEN
    CREATE TRIGGER update_revenue_installments_updated_at BEFORE UPDATE ON revenue_installments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pending_treatment_patients_updated_at') THEN
    CREATE TRIGGER update_pending_treatment_patients_updated_at BEFORE UPDATE ON pending_treatment_patients
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_pending_treatments_updated_at') THEN
    CREATE TRIGGER update_pending_treatments_updated_at BEFORE UPDATE ON pending_treatments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ================================
-- 6. FUNCTION TO UPDATE OVERDUE INSTALLMENTS
-- ================================
CREATE OR REPLACE FUNCTION update_overdue_installments()
RETURNS void AS $$
BEGIN
  UPDATE revenue_installments
  SET status = 'ATRASADO'
  WHERE status = 'A_RECEBER'
    AND due_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_overdue_installments() IS 'Updates installments status to ATRASADO when due_date has passed';

-- ================================
-- 7. VIEW: Revenue Forecast Summary
-- ================================
CREATE OR REPLACE VIEW v_revenue_forecast_summary AS
SELECT
  clinic_id,

  -- Installments summary
  COUNT(CASE WHEN status = 'A_RECEBER' THEN 1 END) as installments_pending_count,
  COALESCE(SUM(CASE WHEN status = 'A_RECEBER' THEN value END), 0) as installments_pending_value,

  COUNT(CASE WHEN status = 'RECEBIDO' THEN 1 END) as installments_received_count,
  COALESCE(SUM(CASE WHEN status = 'RECEBIDO' THEN value END), 0) as installments_received_value,

  COUNT(CASE WHEN status = 'ATRASADO' THEN 1 END) as installments_overdue_count,
  COALESCE(SUM(CASE WHEN status = 'ATRASADO' THEN value END), 0) as installments_overdue_value,

  -- Next 30 days
  COUNT(CASE WHEN status IN ('A_RECEBER', 'ATRASADO') AND due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as installments_next_30_days_count,
  COALESCE(SUM(CASE WHEN status IN ('A_RECEBER', 'ATRASADO') AND due_date <= CURRENT_DATE + INTERVAL '30 days' THEN value END), 0) as installments_next_30_days_value

FROM revenue_installments
GROUP BY clinic_id;

COMMENT ON VIEW v_revenue_forecast_summary IS 'Summary of revenue forecast by clinic';
