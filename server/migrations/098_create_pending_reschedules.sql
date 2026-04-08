-- Migration 098: Create pending_reschedules table
-- This table holds appointments that need to be rescheduled but don't have a date yet
-- They form a "reschedule queue" that can be used to fill available slots

CREATE TABLE IF NOT EXISTS pending_reschedules (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  original_appointment_id VARCHAR(255) REFERENCES appointments(id) ON DELETE SET NULL,

  -- Patient info
  patient_name VARCHAR(255) NOT NULL,
  patient_code VARCHAR(100),

  -- Preferred settings from original appointment
  preferred_doctor_id VARCHAR(255) REFERENCES clinic_doctors(id) ON DELETE SET NULL,
  preferred_appointment_type_id VARCHAR(255) REFERENCES appointment_types(id) ON DELETE SET NULL,

  -- Reschedule details
  reason TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,

  -- Tracking
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_pending_reschedules_clinic
  ON pending_reschedules(clinic_id);
CREATE INDEX IF NOT EXISTS idx_pending_reschedules_patient_code
  ON pending_reschedules(clinic_id, patient_code);
CREATE INDEX IF NOT EXISTS idx_pending_reschedules_patient_name
  ON pending_reschedules(clinic_id, patient_name);
CREATE INDEX IF NOT EXISTS idx_pending_reschedules_requested_at
  ON pending_reschedules(clinic_id, requested_at);

-- Trigger para updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_pending_reschedules_updated_at'
  ) THEN
    CREATE TRIGGER update_pending_reschedules_updated_at BEFORE UPDATE ON pending_reschedules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE pending_reschedules IS
  'Fila de remarcações pendentes. Pacientes que precisam remarcar mas ainda não têm data definida.';

COMMENT ON COLUMN pending_reschedules.original_appointment_id IS
  'Referência ao agendamento original que foi cancelado/remarcado';

COMMENT ON COLUMN pending_reschedules.preferred_doctor_id IS
  'Médico da consulta original (preferência, mas pode ser alterado)';

COMMENT ON COLUMN pending_reschedules.preferred_appointment_type_id IS
  'Tipo de consulta original (preferência, mas pode ser alterado)';
