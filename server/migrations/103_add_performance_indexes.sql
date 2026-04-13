-- Migration 103: Add performance indexes for frequently queried tables
-- Improves query performance on sidebar counts and dashboard metrics

-- Tickets table indexes (sidebar counts - queried every 60s)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tickets') THEN
    CREATE INDEX IF NOT EXISTS idx_tickets_clinic_status_perf
      ON tickets(clinic_id, status)
      WHERE status IN ('PENDING', 'IN_PROGRESS');

    CREATE INDEX IF NOT EXISTS idx_tickets_assigned_perf
      ON tickets(clinic_id, assigned_to, status)
      WHERE status IN ('PENDING', 'IN_PROGRESS');
  END IF;
END $$;

-- Accounts payable indexes (sidebar counts - queried every 60s)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'accounts_payable') THEN
    CREATE INDEX IF NOT EXISTS idx_accounts_payable_clinic_due_perf
      ON accounts_payable(clinic_id, due_date, paid)
      WHERE paid = false;

    CREATE INDEX IF NOT EXISTS idx_accounts_payable_status_perf
      ON accounts_payable(clinic_id, paid, due_date);
  END IF;
END $$;

-- Revenue installments indexes (dashboard guaranteed revenue metrics)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'revenue_installments') THEN
    CREATE INDEX IF NOT EXISTS idx_revenue_installments_clinic_status_perf
      ON revenue_installments(clinic_id, status, due_date)
      WHERE status IN ('A_RECEBER', 'ATRASADO');

    CREATE INDEX IF NOT EXISTS idx_revenue_installments_dates_perf
      ON revenue_installments(clinic_id, due_date, received_date)
      WHERE status IN ('A_RECEBER', 'ATRASADO', 'RECEBIDO');
  END IF;
END $$;

-- Pending treatments indexes (dashboard metrics)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_treatments') THEN
    CREATE INDEX IF NOT EXISTS idx_pending_treatments_clinic_status_perf
      ON pending_treatments(clinic_id, status)
      WHERE status IN ('PENDENTE', 'PARCIAL');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pending_treatment_patients') THEN
    CREATE INDEX IF NOT EXISTS idx_pending_treatment_patients_clinic_perf
      ON pending_treatment_patients(clinic_id);
  END IF;
END $$;

-- Appointments indexes (dashboard agenda metrics)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'appointments') THEN
    CREATE INDEX IF NOT EXISTS idx_appointments_clinic_status_perf
      ON appointments(clinic_id, status, date);

    CREATE INDEX IF NOT EXISTS idx_appointments_completed_perf
      ON appointments(clinic_id, date)
      WHERE status = 'completed';
  END IF;
END $$;

-- Plan procedures indexes (treatment progress metrics)
-- Note: plan_procedures already has several indexes from migration 089
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plan_procedures') THEN
    -- Additional index for faster status filtering by clinic
    CREATE INDEX IF NOT EXISTS idx_plan_procedures_clinic_completed_perf
      ON plan_procedures(clinic_id, completed);
  END IF;
END $$;

-- Patients indexes (source performance metrics)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_name = 'patients'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'patients' AND column_name = 'source_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_patients_clinic_source_perf
      ON patients(clinic_id, source_id);
  END IF;
END $$;
