-- Migration 081: Add clinic operating hours schedule

CREATE TABLE IF NOT EXISTS clinic_schedule (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- 0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado
  is_active BOOLEAN DEFAULT true,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  lunch_start TIME,
  lunch_end TIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(clinic_id, day_of_week)
);

CREATE INDEX idx_clinic_schedule_clinic ON clinic_schedule(clinic_id);
CREATE INDEX idx_clinic_schedule_day ON clinic_schedule(clinic_id, day_of_week);

COMMENT ON TABLE clinic_schedule IS
  'Horários de funcionamento da clínica por dia da semana para a agenda';
COMMENT ON COLUMN clinic_schedule.day_of_week IS
  '0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado';
COMMENT ON COLUMN clinic_schedule.is_active IS
  'Se false, a clínica não funciona neste dia';
COMMENT ON COLUMN clinic_schedule.lunch_start IS
  'Horário de início do intervalo de almoço (opcional)';
COMMENT ON COLUMN clinic_schedule.lunch_end IS
  'Horário de fim do intervalo de almoço (opcional)';
