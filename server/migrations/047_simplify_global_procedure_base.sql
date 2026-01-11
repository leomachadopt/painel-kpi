-- Migration 047: Simplify global procedure_base_table for pairing only
-- Makes code optional for global procedures (clinic_id IS NULL)
-- Global procedures are identified by description for pairing purposes

DO $$
BEGIN
  -- Make code nullable (already nullable from migration 038, but ensure it)
  ALTER TABLE procedure_base_table ALTER COLUMN code DROP NOT NULL;
  
  -- Drop unique index on code for global procedures (if exists)
  DROP INDEX IF EXISTS idx_procedure_base_global_code;
  
  -- Create unique index on description_normalized for global procedures
  -- This allows matching by description for pairing
  -- First, add a computed column for normalized description if needed
  -- We'll use description directly with a functional index
  
  -- Create unique index on normalized description for global procedures
  -- This ensures no duplicate descriptions in global table
  CREATE UNIQUE INDEX IF NOT EXISTS idx_procedure_base_global_description 
    ON procedure_base_table(UPPER(TRIM(description))) 
    WHERE clinic_id IS NULL;
  
  -- Keep the clinic-specific code index for non-global procedures
  CREATE UNIQUE INDEX IF NOT EXISTS idx_procedure_base_clinic_code 
    ON procedure_base_table(clinic_id, code) 
    WHERE clinic_id IS NOT NULL AND code IS NOT NULL;
END $$;

COMMENT ON INDEX idx_procedure_base_global_description IS 'Unique index on normalized description for global procedures (pairing by description)';
COMMENT ON INDEX idx_procedure_base_clinic_code IS 'Unique index on code for clinic-specific procedures';

