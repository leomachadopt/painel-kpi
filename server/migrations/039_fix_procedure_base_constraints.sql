-- Migration 039: Fix procedure_base_table constraints to properly support NULL clinic_id

DO $$
DECLARE
  constraint_rec RECORD;
BEGIN
  -- Make clinic_id nullable (if not already)
  ALTER TABLE procedure_base_table ALTER COLUMN clinic_id DROP NOT NULL;
  
  -- Remove ALL unique constraints on procedure_base_table
  FOR constraint_rec IN
    SELECT conname, contype
    FROM pg_constraint 
    WHERE conrelid = 'procedure_base_table'::regclass
      AND contype IN ('u', 'f')
  LOOP
    -- Drop unique constraints
    IF constraint_rec.contype = 'u' THEN
      BEGIN
        EXECUTE format('ALTER TABLE procedure_base_table DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
        RAISE NOTICE 'Dropped unique constraint: %', constraint_rec.conname;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop constraint %: %', constraint_rec.conname, SQLERRM;
      END;
    END IF;
    
    -- Drop foreign key constraints on clinic_id
    IF constraint_rec.contype = 'f' THEN
      BEGIN
        -- Check if this FK involves clinic_id
        IF EXISTS (
          SELECT 1 FROM pg_constraint c
          JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
          WHERE c.conname = constraint_rec.conname
            AND a.attname = 'clinic_id'
        ) THEN
          EXECUTE format('ALTER TABLE procedure_base_table DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
          RAISE NOTICE 'Dropped foreign key: %', constraint_rec.conname;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop FK constraint %: %', constraint_rec.conname, SQLERRM;
      END;
    END IF;
  END LOOP;
  
END $$;

-- Drop existing indexes that might conflict
DROP INDEX IF EXISTS idx_procedure_base_clinic;
DROP INDEX IF EXISTS idx_procedure_base_periciable;
DROP INDEX IF EXISTS idx_procedure_base_clinic_code;
DROP INDEX IF EXISTS idx_procedure_base_global_code;

-- Create partial unique index for non-null clinic_id (clinic-specific procedures)
CREATE UNIQUE INDEX IF NOT EXISTS idx_procedure_base_clinic_code 
  ON procedure_base_table(clinic_id, code) 
  WHERE clinic_id IS NOT NULL;

-- Create unique index for global procedures (clinic_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_procedure_base_global_code 
  ON procedure_base_table(code) 
  WHERE clinic_id IS NULL;

-- Recreate index for periciable
CREATE INDEX IF NOT EXISTS idx_procedure_base_periciable 
  ON procedure_base_table(is_periciable) 
  WHERE active = true;

-- Note: Foreign key constraint on clinic_id is removed to allow NULL values
-- Referential integrity for non-NULL clinic_id values should be handled in application logic

