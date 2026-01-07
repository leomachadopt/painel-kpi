-- Migration 029: Add advance invoice entries
-- Creates table for advance invoice entries (Fatura de Adiantamento)

CREATE TABLE IF NOT EXISTS daily_advance_invoice_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  doctor_id VARCHAR(255) REFERENCES clinic_doctors(id) ON DELETE SET NULL,
  billed_to_third_party BOOLEAN DEFAULT false,
  third_party_code VARCHAR(100),
  third_party_name VARCHAR(255),
  value DECIMAL(12, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_daily_advance_invoice_clinic_date ON daily_advance_invoice_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_advance_invoice_doctor_id ON daily_advance_invoice_entries(doctor_id);


