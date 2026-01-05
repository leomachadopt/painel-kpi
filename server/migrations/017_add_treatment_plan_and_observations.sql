-- Migration 017: Add treatment plan stage and observations field to aligners
-- Adds treatment_plan_created, treatment_plan_created_at, and observations

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_aligner_entries') THEN
    -- Add treatment_plan_created if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_aligner_entries' AND column_name = 'treatment_plan_created'
    ) THEN
      ALTER TABLE daily_aligner_entries
        ADD COLUMN treatment_plan_created BOOLEAN DEFAULT false;
    END IF;

    -- Add treatment_plan_created_at if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_aligner_entries' AND column_name = 'treatment_plan_created_at'
    ) THEN
      ALTER TABLE daily_aligner_entries
        ADD COLUMN treatment_plan_created_at DATE;
    END IF;

    -- Add observations if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_aligner_entries' AND column_name = 'observations'
    ) THEN
      ALTER TABLE daily_aligner_entries
        ADD COLUMN observations TEXT;
    END IF;
  END IF;
END $$;

