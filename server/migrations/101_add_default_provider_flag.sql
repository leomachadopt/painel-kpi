-- Migration 101: Add is_default_for_clinic flag to insurance_providers
-- Permite marcar uma operadora como tabela padrão da clínica (privado/particular)

ALTER TABLE insurance_providers 
ADD COLUMN IF NOT EXISTS is_default_for_clinic BOOLEAN NOT NULL DEFAULT false;

-- Garantir que apenas uma operadora pode ser padrão por clínica
CREATE UNIQUE INDEX IF NOT EXISTS idx_insurance_providers_default_per_clinic 
ON insurance_providers(clinic_id) 
WHERE is_default_for_clinic = true;

COMMENT ON COLUMN insurance_providers.is_default_for_clinic IS 'Se true, esta operadora é a tabela padrão da clínica (privado/particular). Apenas uma operadora por clínica pode ser padrão.';
