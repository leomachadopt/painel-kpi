-- Migration 077: Create appointments table
-- This is the core table for clinic scheduling system

CREATE TABLE IF NOT EXISTS appointments (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id VARCHAR(255) REFERENCES clinic_doctors(id) ON DELETE SET NULL,
  cabinet_id VARCHAR(255) REFERENCES clinic_cabinets(id) ON DELETE SET NULL,
  appointment_type_id VARCHAR(255) REFERENCES appointment_types(id) ON DELETE SET NULL,

  -- Paciente
  patient_name VARCHAR(255) NOT NULL,
  patient_code VARCHAR(100),

  -- Horário
  date DATE NOT NULL,
  scheduled_start TIME NOT NULL,
  scheduled_end TIME NOT NULL,
  actual_start TIME,
  actual_end TIME,

  -- Estado
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled'
    CHECK (status IN (
      'scheduled',    -- marcado
      'confirmed',    -- confirmado (paciente confirmou presença)
      'arrived',      -- chegou à clínica
      'in_progress',  -- consulta a decorrer
      'completed',    -- concluída
      'no_show',      -- não compareceu
      'cancelled',    -- cancelado
      'rescheduled'   -- remarcado
    )),

  -- Tipo de paciente (para controlo)
  is_new_patient BOOLEAN DEFAULT true,

  -- Delay tracking
  delay_reason VARCHAR(50)
    CHECK (delay_reason IN ('paciente', 'medico') OR delay_reason IS NULL),

  -- Ligação a outros módulos
  consultation_entry_id VARCHAR(255)
    REFERENCES daily_consultation_entries(id) ON DELETE SET NULL,

  notes TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date
  ON appointments(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date
  ON appointments(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_cabinet_date
  ON appointments(cabinet_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments(status);

-- Trigger para updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_appointments_updated_at'
  ) THEN
    CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

COMMENT ON TABLE appointments IS
  'Agendamentos clínicos. Quando activos, preenchem automaticamente Tempos, Consultórios e Controlo';
