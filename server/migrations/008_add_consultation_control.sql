-- Add daily_consultation_control_entries table
-- This table tracks daily consultation control metrics:
-- - no_show: Não comparecimento
-- - rescheduled: Remarcação de horário
-- - cancelled: Cancelamento de consulta
-- - old_patient_booking: Marcação (paciente antigo)

CREATE TABLE IF NOT EXISTS daily_consultation_control_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  no_show INTEGER NOT NULL DEFAULT 0,
  rescheduled INTEGER NOT NULL DEFAULT 0,
  cancelled INTEGER NOT NULL DEFAULT 0,
  old_patient_booking INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id, date)
);

CREATE INDEX IF NOT EXISTS idx_daily_consultation_control_clinic_date 
  ON daily_consultation_control_entries(clinic_id, date);




