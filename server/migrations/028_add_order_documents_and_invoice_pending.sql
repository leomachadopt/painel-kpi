-- Migration 028: Add order documents and invoice pending
-- Creates table for order documents and adds invoice_pending field

-- Tabela de Documentos dos Pedidos
CREATE TABLE IF NOT EXISTS order_documents (
  id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL REFERENCES daily_order_entries(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  uploaded_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(order_id, filename)
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_order_documents_order_id ON order_documents(order_id);

-- Adicionar campo invoice_pending
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'invoice_pending'
  ) THEN
    ALTER TABLE daily_order_entries ADD COLUMN invoice_pending BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Criar índice para melhor performance nas consultas de faturas pendentes
-- Usar DO $$ para garantir que a coluna existe antes de criar o índice
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_order_entries' AND column_name = 'invoice_pending'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE indexname = 'idx_daily_order_invoice_pending'
    ) THEN
      CREATE INDEX idx_daily_order_invoice_pending ON daily_order_entries(clinic_id, invoice_pending) 
        WHERE invoice_pending = true;
    END IF;
  END IF;
END $$;

