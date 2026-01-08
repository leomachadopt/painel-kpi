-- Migration 019: Add orders and suppliers system
-- Creates tables for suppliers and daily order entries

-- Tabela de Fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  nif VARCHAR(50),
  address TEXT,
  postal_code VARCHAR(20),
  city VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  website VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id, name)
);

-- Tabela de Pedidos
CREATE TABLE IF NOT EXISTS daily_order_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  supplier_id VARCHAR(255) NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  order_number VARCHAR(100),
  
  -- Fases do pedido
  requested BOOLEAN DEFAULT false,
  requested_at DATE,
  confirmed BOOLEAN DEFAULT false,
  confirmed_at DATE,
  in_production BOOLEAN DEFAULT false,
  in_production_at DATE,
  ready BOOLEAN DEFAULT false,
  ready_at DATE,
  delivered BOOLEAN DEFAULT false,
  delivered_at DATE,
  cancelled BOOLEAN DEFAULT false,
  cancelled_at DATE,
  
  observations TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_suppliers_clinic_id ON suppliers(clinic_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(clinic_id, name);
CREATE INDEX IF NOT EXISTS idx_daily_order_clinic_date ON daily_order_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_order_supplier_id ON daily_order_entries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_daily_order_date ON daily_order_entries(date);

-- Trigger para updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_suppliers_updated_at') THEN
    CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_order_entries_updated_at') THEN
    CREATE TRIGGER update_daily_order_entries_updated_at BEFORE UPDATE ON daily_order_entries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;




