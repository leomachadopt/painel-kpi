-- Migration 118: Add Petty Cash (Caixa do Dia)
-- Separate module for tracking daily small expenses per clinic.
-- Not integrated with accounts payable or financial DRE - isolated silo.

-- ================================
-- 1. petty_cash_categories
-- ================================
CREATE TABLE IF NOT EXISTS petty_cash_categories (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(clinic_id, name)
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_categories_clinic
  ON petty_cash_categories(clinic_id);

-- ================================
-- 2. petty_cash_entries
-- ================================
CREATE TABLE IF NOT EXISTS petty_cash_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  category_id VARCHAR(255) REFERENCES petty_cash_categories(id) ON DELETE SET NULL,
  description TEXT,
  payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'pix', 'card', 'transfer', 'other')),
  receipt_filename VARCHAR(255),
  receipt_original_filename VARCHAR(255),
  receipt_path VARCHAR(500),
  receipt_mime_type VARCHAR(100),
  receipt_size INTEGER,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_petty_cash_entries_clinic_date
  ON petty_cash_entries(clinic_id, date);

CREATE INDEX IF NOT EXISTS idx_petty_cash_entries_category
  ON petty_cash_entries(clinic_id, category_id);

-- ================================
-- 3. Seed default categories for existing clinics
-- ================================
DO $$
DECLARE
  c RECORD;
  default_names TEXT[] := ARRAY['Limpeza', 'Alimentação', 'Transporte', 'Manutenção', 'Escritório', 'Outros'];
  n TEXT;
BEGIN
  FOR c IN SELECT id FROM clinics LOOP
    FOREACH n IN ARRAY default_names LOOP
      INSERT INTO petty_cash_categories (id, clinic_id, name)
      VALUES (gen_random_uuid()::text, c.id, n)
      ON CONFLICT (clinic_id, name) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;
