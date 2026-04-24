-- Migration 120: Petty Cash Income (integra lançamentos financeiros de Numerário ao Caixa do Dia)
-- - Adiciona flag is_cash em clinic_payment_sources (garantindo que a fonte "Numerário" exista em toda clínica).
-- - Cria tabela petty_cash_income para entradas automáticas no caixa vindas de daily_financial_entries (não-faturação) com fonte is_cash=true.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================
-- 1. is_cash em clinic_payment_sources
-- ================================
ALTER TABLE clinic_payment_sources
  ADD COLUMN IF NOT EXISTS is_cash BOOLEAN NOT NULL DEFAULT false;

-- Marca fontes existentes que já se chamam "Numerário" / "Dinheiro" como cash (uma por clínica).
UPDATE clinic_payment_sources
  SET is_cash = true
  WHERE id IN (
    SELECT DISTINCT ON (clinic_id) id
    FROM clinic_payment_sources
    WHERE LOWER(name) IN ('numerário', 'numerario', 'dinheiro')
    ORDER BY clinic_id, created_at ASC
  );

-- Garante que toda clínica tem uma fonte "Numerário" is_cash=true
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM clinics LOOP
    IF NOT EXISTS (
      SELECT 1 FROM clinic_payment_sources
      WHERE clinic_id = c.id AND is_cash = true
    ) THEN
      INSERT INTO clinic_payment_sources (id, clinic_id, name, is_cash)
      VALUES (gen_random_uuid()::text, c.id, 'Numerário', true);
    END IF;
  END LOOP;
END $$;

-- Índice parcial: só uma fonte is_cash por clínica (reforço de integridade)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_payment_sources_cash_per_clinic
  ON clinic_payment_sources(clinic_id)
  WHERE is_cash = true;

-- ================================
-- 2. petty_cash_income
-- ================================
CREATE TABLE IF NOT EXISTS petty_cash_income (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  description TEXT,
  financial_entry_id VARCHAR(255) NOT NULL UNIQUE
    REFERENCES daily_financial_entries(id) ON DELETE CASCADE,
  payment_source_id VARCHAR(255)
    REFERENCES clinic_payment_sources(id) ON DELETE SET NULL,
  patient_name VARCHAR(255),
  patient_code VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_income_clinic_date
  ON petty_cash_income(clinic_id, date);

CREATE INDEX IF NOT EXISTS idx_petty_cash_income_financial_entry
  ON petty_cash_income(financial_entry_id);
