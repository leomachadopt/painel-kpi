-- Migration 038: Make procedure_base_table global (support NULL clinic_id)
-- Allows procedure_base_table to be global (clinic_id = NULL) or clinic-specific

DO $$
BEGIN
  -- Make clinic_id nullable
  ALTER TABLE procedure_base_table ALTER COLUMN clinic_id DROP NOT NULL;
  
  -- Drop existing unique constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'procedure_base_table_clinic_id_code_key'
  ) THEN
    ALTER TABLE procedure_base_table DROP CONSTRAINT procedure_base_table_clinic_id_code_key;
  END IF;
  
  -- Drop existing index
  DROP INDEX IF EXISTS idx_procedure_base_clinic;
  DROP INDEX IF EXISTS idx_procedure_base_periciable;
  
  -- Create partial unique index for non-null clinic_id (clinic-specific procedures)
  CREATE UNIQUE INDEX IF NOT EXISTS idx_procedure_base_clinic_code 
    ON procedure_base_table(clinic_id, code) 
    WHERE clinic_id IS NOT NULL;
  
  -- Create unique index for global procedures (clinic_id IS NULL)
  CREATE UNIQUE INDEX IF NOT EXISTS idx_procedure_base_global_code 
    ON procedure_base_table(code) 
    WHERE clinic_id IS NULL;
  
  -- Recreate index for periciable (supporting both global and clinic-specific)
  CREATE INDEX IF NOT EXISTS idx_procedure_base_periciable 
    ON procedure_base_table(is_periciable) 
    WHERE active = true;
END $$;


