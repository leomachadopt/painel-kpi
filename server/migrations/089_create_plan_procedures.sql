-- Migration 089: Criar tabela de procedimentos do plano de tratamento
-- Cada procedimento é uma linha, com preço histórico imutável

CREATE TABLE IF NOT EXISTS plan_procedures (
  id VARCHAR(255) PRIMARY KEY,
  consultation_entry_id VARCHAR(255) NOT NULL
    REFERENCES daily_consultation_entries(id) ON DELETE CASCADE,
  clinic_id VARCHAR(255) NOT NULL
    REFERENCES clinics(id) ON DELETE CASCADE,

  -- Referências ao catálogo (opcional - para rastreabilidade)
  procedure_base_id VARCHAR(255)
    REFERENCES procedure_base_table(id) ON DELETE SET NULL,
  insurance_provider_procedure_id VARCHAR(255)
    REFERENCES insurance_provider_procedures(id) ON DELETE SET NULL,

  -- Dados históricos imutáveis (copiados no momento da criação)
  procedure_code VARCHAR(100) NOT NULL,
  procedure_description TEXT NOT NULL,
  price_at_creation DECIMAL(12, 2) NOT NULL DEFAULT 0,
  price_table_type VARCHAR(20) NOT NULL
    CHECK (price_table_type IN ('clinica', 'operadora')),

  -- Estado de execução
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  completed_by_doctor_id VARCHAR(255)
    REFERENCES clinic_doctors(id) ON DELETE SET NULL,
  appointment_id VARCHAR(255)
    REFERENCES appointments(id) ON DELETE SET NULL,

  -- Ordenação no plano
  sort_order INTEGER DEFAULT 0,

  -- Observações
  notes TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_plan_procedures_consultation
  ON plan_procedures(consultation_entry_id);

CREATE INDEX IF NOT EXISTS idx_plan_procedures_clinic
  ON plan_procedures(clinic_id);

CREATE INDEX IF NOT EXISTS idx_plan_procedures_completed
  ON plan_procedures(consultation_entry_id, completed);

CREATE INDEX IF NOT EXISTS idx_plan_procedures_appointment
  ON plan_procedures(appointment_id)
  WHERE appointment_id IS NOT NULL;

-- Índice para buscar procedimentos pendentes de um paciente
CREATE INDEX IF NOT EXISTS idx_plan_procedures_pending
  ON plan_procedures(consultation_entry_id, completed, sort_order)
  WHERE completed = false;
