-- Migration 050: Add country field to clinics for multi-language support
-- Adds country field to support PT-BR and PT-PT locales

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'country'
  ) THEN
    ALTER TABLE clinics ADD COLUMN country VARCHAR(10) DEFAULT 'PT-BR' CHECK (country IN ('PT-BR', 'PT-PT'));
  END IF;
END $$;


