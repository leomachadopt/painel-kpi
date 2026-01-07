-- Migration 027: Add payment and checking system to orders
-- Adds payment confirmation and order checking fields

-- Adicionar campos de pagamento prévio
DO $$
BEGIN
  -- Campo requires_prepayment (boolean) - indica se o pedido requer pagamento prévio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'requires_prepayment'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN requires_prepayment BOOLEAN DEFAULT false;
  END IF;

  -- Campo payment_confirmed (boolean) - indica se o pagamento foi confirmado pelo gestor
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'payment_confirmed'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN payment_confirmed BOOLEAN DEFAULT false;
  END IF;

  -- Campo payment_confirmed_at (timestamp) - data/hora da confirmação do pagamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'payment_confirmed_at'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN payment_confirmed_at TIMESTAMP;
  END IF;

  -- Campo payment_confirmed_by (varchar) - ID do gestor que confirmou o pagamento
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'payment_confirmed_by'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN payment_confirmed_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Adicionar campos de conferência
DO $$
BEGIN
  -- Campo checked (boolean) - indica se o pedido foi conferido
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'checked'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN checked BOOLEAN DEFAULT false;
  END IF;

  -- Campo checked_at (timestamp) - data/hora da conferência
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'checked_at'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN checked_at TIMESTAMP;
  END IF;

  -- Campo conform (boolean) - indica se está conforme (true) ou não conforme (false)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'conform'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN conform BOOLEAN;
  END IF;

  -- Campo non_conform_reason (text) - motivo se não conforme
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'non_conform_reason'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN non_conform_reason TEXT;
  END IF;

  -- Campo checked_by (varchar) - ID de quem conferiu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'checked_by'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN checked_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL;
  END IF;

  -- Campo checked_by_password_verified (boolean) - indica se senha foi validada
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'checked_by_password_verified'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN checked_by_password_verified BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_daily_order_payment_pending ON daily_order_entries(clinic_id, requires_prepayment, payment_confirmed, approved) 
  WHERE requires_prepayment = true AND payment_confirmed = false AND approved = true;

