-- Migration 033: Add accounts payable entries
-- Creates table for accounts payable (Contas a Pagar)

CREATE TABLE IF NOT EXISTS accounts_payable (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  description VARCHAR(500) NOT NULL,
  supplier_id VARCHAR(255) REFERENCES suppliers(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  due_date DATE NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  category VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_accounts_payable_clinic_id ON accounts_payable(clinic_id);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_paid ON accounts_payable(paid);
CREATE INDEX IF NOT EXISTS idx_accounts_payable_supplier_id ON accounts_payable(supplier_id);
