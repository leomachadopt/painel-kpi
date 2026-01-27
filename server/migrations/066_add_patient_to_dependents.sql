-- Migration 066: Add patient_id and code to contract_dependents
-- Allows dependents to be linked to patient records

ALTER TABLE contract_dependents
ADD COLUMN IF NOT EXISTS code VARCHAR(6),
ADD COLUMN IF NOT EXISTS patient_id VARCHAR(255);

-- Add foreign key constraint to patients table
ALTER TABLE contract_dependents
ADD CONSTRAINT fk_contract_dependents_patient
FOREIGN KEY (patient_id) REFERENCES patients(id)
ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_contract_dependents_patient
ON contract_dependents(patient_id);

CREATE INDEX IF NOT EXISTS idx_contract_dependents_code
ON contract_dependents(code);

COMMENT ON COLUMN contract_dependents.code IS 'Código do paciente dependente (se tiver)';
COMMENT ON COLUMN contract_dependents.patient_id IS 'ID do paciente na tabela patients (se criado)';
