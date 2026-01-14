-- Migration 025: Add order approval system
-- Adds approval fields to daily_order_entries table

-- Adicionar campos de aprovação
DO $$
BEGIN
  -- Campo approved (boolean) - indica se o pedido foi aprovado pela gestora
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'approved'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN approved BOOLEAN DEFAULT false;
  END IF;

  -- Campo approved_at (timestamp) - data/hora da aprovação
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN approved_at TIMESTAMP;
  END IF;

  -- Campo approved_by (varchar) - ID do usuário que aprovou
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN approved_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Criar índice para melhor performance nas consultas de pedidos pendentes
CREATE INDEX IF NOT EXISTS idx_daily_order_approved ON daily_order_entries(clinic_id, approved) WHERE approved = false;








