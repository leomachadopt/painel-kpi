-- Migration 026: Add order rejection system
-- Adds rejection fields to daily_order_entries table

-- Adicionar campos de recusa
DO $$
BEGIN
  -- Campo rejected (boolean) - indica se o pedido foi recusado pela gestora
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'rejected'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN rejected BOOLEAN DEFAULT false;
  END IF;

  -- Campo rejected_at (timestamp) - data/hora da recusa
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'rejected_at'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN rejected_at TIMESTAMP;
  END IF;

  -- Campo rejected_by (varchar) - ID do usuário que recusou
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'rejected_by'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN rejected_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Campo rejection_reason (text) - motivo da recusa
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'rejection_reason'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN rejection_reason TEXT;
  END IF;
END $$;

-- Atualizar índice para considerar pedidos pendentes (não aprovados E não recusados)
DROP INDEX IF EXISTS idx_daily_order_approved;
CREATE INDEX IF NOT EXISTS idx_daily_order_pending ON daily_order_entries(clinic_id, approved, rejected) 
  WHERE approved = false AND rejected = false;

