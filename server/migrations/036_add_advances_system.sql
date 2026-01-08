-- Migration 036: Add Advances and Billing System
-- Creates tables for insurance providers, advance contracts, billing batches, and related entities

-- ================================
-- 1. INSURANCE PROVIDERS (Operadoras/Seguros)
-- ================================
CREATE TABLE IF NOT EXISTS insurance_providers (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id, name)
);

CREATE INDEX IF NOT EXISTS idx_insurance_providers_clinic ON insurance_providers(clinic_id);

-- ================================
-- 2. PROCEDURE BASE TABLE (Tabela Base de Procedimentos)
-- ================================
CREATE TABLE IF NOT EXISTS procedure_base_table (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  is_periciable BOOLEAN NOT NULL DEFAULT false,
  category VARCHAR(100),
  default_value DECIMAL(12, 2),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id, code)
);

CREATE INDEX IF NOT EXISTS idx_procedure_base_clinic ON procedure_base_table(clinic_id);
CREATE INDEX IF NOT EXISTS idx_procedure_base_periciable ON procedure_base_table(clinic_id, is_periciable);

-- ================================
-- 3. INSURANCE PROVIDER PROCEDURES (Procedimentos por Operadora)
-- ================================
CREATE TABLE IF NOT EXISTS insurance_provider_procedures (
  id VARCHAR(255) PRIMARY KEY,
  insurance_provider_id VARCHAR(255) NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
  procedure_base_id VARCHAR(255) REFERENCES procedure_base_table(id) ON DELETE SET NULL,
  provider_code VARCHAR(100) NOT NULL,
  provider_description TEXT,
  is_periciable BOOLEAN NOT NULL DEFAULT false,
  coverage_percentage DECIMAL(5, 2) DEFAULT 100.00,
  max_value DECIMAL(12, 2),
  requires_authorization BOOLEAN DEFAULT false,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(insurance_provider_id, provider_code)
);

CREATE INDEX IF NOT EXISTS idx_insurance_provider_procedures_provider ON insurance_provider_procedures(insurance_provider_id);
CREATE INDEX IF NOT EXISTS idx_insurance_provider_procedures_base ON insurance_provider_procedures(procedure_base_id);

-- ================================
-- 4. ADVANCE CONTRACTS (Contratos de Adiantamento)
-- ================================
CREATE TABLE IF NOT EXISTS advance_contracts (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id VARCHAR(255) NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  insurance_provider_id VARCHAR(255) NOT NULL REFERENCES insurance_providers(id) ON DELETE RESTRICT,
  contract_number VARCHAR(100),
  start_date DATE NOT NULL,
  end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_advance_contracts_clinic ON advance_contracts(clinic_id);
CREATE INDEX IF NOT EXISTS idx_advance_contracts_patient ON advance_contracts(patient_id);
CREATE INDEX IF NOT EXISTS idx_advance_contracts_insurance ON advance_contracts(insurance_provider_id);
CREATE INDEX IF NOT EXISTS idx_advance_contracts_status ON advance_contracts(clinic_id, status);

-- ================================
-- 5. CONTRACT DEPENDENTS (Dependentes do Contrato)
-- ================================
CREATE TABLE IF NOT EXISTS contract_dependents (
  id VARCHAR(255) PRIMARY KEY,
  contract_id VARCHAR(255) NOT NULL REFERENCES advance_contracts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  birth_date DATE,
  age INTEGER,
  relationship VARCHAR(50) NOT NULL CHECK (relationship IN ('TITULAR', 'CONJUGE', 'FILHO', 'FILHA', 'OUTRO')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_contract_dependents_contract ON contract_dependents(contract_id);

-- ================================
-- 6. ADVANCE PAYMENTS (Pagamentos de Adiantamento)
-- ================================
CREATE TABLE IF NOT EXISTS advance_payments (
  id VARCHAR(255) PRIMARY KEY,
  contract_id VARCHAR(255) NOT NULL REFERENCES advance_contracts(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_advance_payments_contract ON advance_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_advance_payments_date ON advance_payments(payment_date);

-- ================================
-- 7. BILLING BATCHES (Lotes de Faturação)
-- ================================
CREATE TABLE IF NOT EXISTS billing_batches (
  id VARCHAR(255) PRIMARY KEY,
  contract_id VARCHAR(255) NOT NULL REFERENCES advance_contracts(id) ON DELETE CASCADE,
  batch_number VARCHAR(100) NOT NULL,
  target_amount DECIMAL(12, 2) NOT NULL,
  target_periciable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_periciable_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ISSUED', 'PAID', 'PARTIALLY_PAID', 'GLOSED', 'PARTIALLY_GLOSED', 'ADJUSTED', 'CANCELLED')),
  issued_at TIMESTAMP,
  paid_at TIMESTAMP,
  glosed_at TIMESTAMP,
  glosed_amount DECIMAL(12, 2) DEFAULT 0,
  notes TEXT,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_batches_contract ON billing_batches(contract_id);
CREATE INDEX IF NOT EXISTS idx_billing_batches_status ON billing_batches(contract_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_batches_number ON billing_batches(batch_number);

-- ================================
-- 8. BILLING ITEMS (Itens do Lote de Faturação)
-- ================================
CREATE TABLE IF NOT EXISTS billing_items (
  id VARCHAR(255) PRIMARY KEY,
  batch_id VARCHAR(255) NOT NULL REFERENCES billing_batches(id) ON DELETE CASCADE,
  dependent_id VARCHAR(255) REFERENCES contract_dependents(id) ON DELETE SET NULL,
  procedure_id VARCHAR(255) NOT NULL,
  procedure_type VARCHAR(50) NOT NULL CHECK (procedure_type IN ('BASE', 'PROVIDER')),
  procedure_code VARCHAR(100) NOT NULL,
  procedure_description TEXT NOT NULL,
  is_periciable BOOLEAN NOT NULL,
  unit_value DECIMAL(12, 2) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_value DECIMAL(12, 2) NOT NULL,
  service_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'INCLUDED' CHECK (status IN ('INCLUDED', 'GLOSED', 'ADJUSTED', 'REMOVED')),
  glosed_amount DECIMAL(12, 2) DEFAULT 0,
  glosed_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_billing_items_batch ON billing_items(batch_id);
CREATE INDEX IF NOT EXISTS idx_billing_items_dependent ON billing_items(dependent_id);
CREATE INDEX IF NOT EXISTS idx_billing_items_status ON billing_items(batch_id, status);

-- ================================
-- 9. INSURANCE PROVIDER DOCUMENTS (Documentos/PDFs das Operadoras)
-- ================================
CREATE TABLE IF NOT EXISTS insurance_provider_documents (
  id VARCHAR(255) PRIMARY KEY,
  insurance_provider_id VARCHAR(255) NOT NULL REFERENCES insurance_providers(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  processing_status VARCHAR(50) DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  extracted_data JSONB DEFAULT '{}'::jsonb,
  created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_insurance_provider_documents_provider ON insurance_provider_documents(insurance_provider_id);
CREATE INDEX IF NOT EXISTS idx_insurance_provider_documents_processed ON insurance_provider_documents(insurance_provider_id, processed);

-- ================================
-- 10. PROCEDURE MAPPINGS (Mapeamentos de Procedimentos - IA)
-- ================================
CREATE TABLE IF NOT EXISTS procedure_mappings (
  id VARCHAR(255) PRIMARY KEY,
  document_id VARCHAR(255) NOT NULL REFERENCES insurance_provider_documents(id) ON DELETE CASCADE,
  extracted_procedure_code VARCHAR(100) NOT NULL,
  extracted_description TEXT,
  extracted_is_periciable BOOLEAN,
  extracted_value DECIMAL(12, 2),
  mapped_procedure_base_id VARCHAR(255) REFERENCES procedure_base_table(id) ON DELETE SET NULL,
  mapped_provider_procedure_id VARCHAR(255) REFERENCES insurance_provider_procedures(id) ON DELETE SET NULL,
  confidence_score DECIMAL(5, 2),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'MANUAL')),
  reviewed_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_procedure_mappings_document ON procedure_mappings(document_id);
CREATE INDEX IF NOT EXISTS idx_procedure_mappings_status ON procedure_mappings(document_id, status);

-- ================================
-- 11. TRIGGERS FOR updated_at
-- ================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_insurance_providers_updated_at') THEN
    CREATE TRIGGER update_insurance_providers_updated_at BEFORE UPDATE ON insurance_providers
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_procedure_base_table_updated_at') THEN
    CREATE TRIGGER update_procedure_base_table_updated_at BEFORE UPDATE ON procedure_base_table
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_insurance_provider_procedures_updated_at') THEN
    CREATE TRIGGER update_insurance_provider_procedures_updated_at BEFORE UPDATE ON insurance_provider_procedures
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_advance_contracts_updated_at') THEN
    CREATE TRIGGER update_advance_contracts_updated_at BEFORE UPDATE ON advance_contracts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_contract_dependents_updated_at') THEN
    CREATE TRIGGER update_contract_dependents_updated_at BEFORE UPDATE ON contract_dependents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_billing_batches_updated_at') THEN
    CREATE TRIGGER update_billing_batches_updated_at BEFORE UPDATE ON billing_batches
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_billing_items_updated_at') THEN
    CREATE TRIGGER update_billing_items_updated_at BEFORE UPDATE ON billing_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_procedure_mappings_updated_at') THEN
    CREATE TRIGGER update_procedure_mappings_updated_at BEFORE UPDATE ON procedure_mappings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ================================
-- 12. VIEW: Advance Contracts Summary
-- ================================
CREATE OR REPLACE VIEW v_advance_contracts_summary AS
SELECT 
  ac.id,
  ac.clinic_id,
  ac.patient_id,
  p.code AS patient_code,
  p.name AS patient_name,
  ac.insurance_provider_id,
  ip.name AS insurance_provider_name,
  ac.contract_number,
  ac.status,
  ac.start_date,
  ac.end_date,
  -- Valor total adiantado
  COALESCE(SUM(ap.amount), 0) AS total_advanced,
  -- Valor já faturado (lotes emitidos ou pagos)
  COALESCE(SUM(CASE 
    WHEN bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID') 
    THEN bb.total_amount ELSE 0 
  END), 0) AS total_billed,
  -- Saldo a faturar
  COALESCE(SUM(ap.amount), 0) - COALESCE(SUM(CASE 
    WHEN bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID') 
    THEN bb.total_amount ELSE 0 
  END), 0) AS balance_to_bill
FROM advance_contracts ac
LEFT JOIN patients p ON ac.patient_id = p.id
LEFT JOIN insurance_providers ip ON ac.insurance_provider_id = ip.id
LEFT JOIN advance_payments ap ON ac.id = ap.contract_id
LEFT JOIN billing_batches bb ON ac.id = bb.contract_id
GROUP BY ac.id, ac.clinic_id, ac.patient_id, p.code, p.name, 
         ac.insurance_provider_id, ip.name, ac.contract_number, 
         ac.status, ac.start_date, ac.end_date;

