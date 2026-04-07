-- Migration 088: Adicionar campos de estados do tratamento
-- Expande o módulo de 1ªs Consultas com kanban de tratamento

ALTER TABLE daily_consultation_entries
  -- Estados do tratamento
  ADD COLUMN IF NOT EXISTS waiting_start BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS waiting_start_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS in_execution BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_execution_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS plan_finished BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_finished_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS abandoned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS abandoned_at TIMESTAMP,

  -- Motivo de perda/abandono
  ADD COLUMN IF NOT EXISTS abandoned_reason VARCHAR(50)
    CHECK (abandoned_reason IN (
      'financeiro',
      'mudou_clinica',
      'plano_extenso',
      'nao_compareceu',
      'outro'
    )),
  ADD COLUMN IF NOT EXISTS abandoned_reason_notes TEXT,

  -- Configuração do plano (tabela de preços usada)
  ADD COLUMN IF NOT EXISTS price_table_type VARCHAR(20)
    CHECK (price_table_type IN ('clinica', 'operadora'))
    DEFAULT 'clinica',
  ADD COLUMN IF NOT EXISTS insurance_provider_id VARCHAR(255)
    REFERENCES insurance_providers(id) ON DELETE SET NULL,

  -- Métricas calculadas (atualizadas via trigger)
  ADD COLUMN IF NOT EXISTS plan_procedures_total INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_procedures_completed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS plan_total_value DECIMAL(12, 2) DEFAULT 0;

-- Constraint: Se usar tabela de operadora, deve ter provider_id
ALTER TABLE daily_consultation_entries
  ADD CONSTRAINT check_price_table_consistency
  CHECK (
    (price_table_type = 'operadora' AND insurance_provider_id IS NOT NULL)
    OR
    (price_table_type = 'clinica' AND insurance_provider_id IS NULL)
  );

-- Índices para performance nas queries do kanban
CREATE INDEX IF NOT EXISTS idx_consultations_waiting
  ON daily_consultation_entries(clinic_id, waiting_start, waiting_start_at)
  WHERE waiting_start = true AND abandoned = false;

CREATE INDEX IF NOT EXISTS idx_consultations_in_execution
  ON daily_consultation_entries(clinic_id, in_execution, in_execution_at)
  WHERE in_execution = true AND plan_finished = false AND abandoned = false;

CREATE INDEX IF NOT EXISTS idx_consultations_abandoned
  ON daily_consultation_entries(clinic_id, abandoned, abandoned_at)
  WHERE abandoned = true;

CREATE INDEX IF NOT EXISTS idx_consultations_finished
  ON daily_consultation_entries(clinic_id, plan_finished, plan_finished_at)
  WHERE plan_finished = true;
