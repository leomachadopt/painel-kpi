-- Migration 078: Create appointment_types table
-- This table stores consultation types for clinic scheduling

CREATE TABLE IF NOT EXISTS appointment_types (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  color VARCHAR(7) DEFAULT '#1D9E75',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para listagem por clínica
CREATE INDEX IF NOT EXISTS idx_appointment_types_clinic
  ON appointment_types(clinic_id);

COMMENT ON TABLE appointment_types IS
  'Tipos de consulta configuráveis por clínica (ex: 1ª Consulta, Tratamento, Urgência)';
