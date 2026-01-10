-- Migration 021: Add order items system
-- Creates tables for order items and order item entries

-- Tabela de Itens (produtos que podem ser pedidos)
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  unit VARCHAR(50) DEFAULT 'unidade',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id, name)
);

-- Tabela de relacionamento: Itens do Pedido
CREATE TABLE IF NOT EXISTS order_item_entries (
  id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(255) NOT NULL REFERENCES daily_order_entries(id) ON DELETE CASCADE,
  item_id VARCHAR(255) NOT NULL REFERENCES order_items(id) ON DELETE RESTRICT,
  quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_order_items_clinic_id ON order_items(clinic_id);
CREATE INDEX IF NOT EXISTS idx_order_items_name ON order_items(clinic_id, name);
CREATE INDEX IF NOT EXISTS idx_order_item_entries_order_id ON order_item_entries(order_id);
CREATE INDEX IF NOT EXISTS idx_order_item_entries_item_id ON order_item_entries(item_id);

-- Trigger para updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_order_items_updated_at') THEN
    CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;






