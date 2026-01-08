-- Migration 024: Rename treatment_plan_created to expiration_date
-- Changes treatment plan from boolean toggle to date field (expiration date)

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_aligner_entries') THEN
    -- Remove treatment_plan_created boolean column if it exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_aligner_entries' AND column_name = 'treatment_plan_created'
    ) THEN
      ALTER TABLE daily_aligner_entries
        DROP COLUMN treatment_plan_created;
    END IF;

    -- Rename treatment_plan_created_at to expiration_date if it exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_aligner_entries' AND column_name = 'treatment_plan_created_at'
    ) THEN
      ALTER TABLE daily_aligner_entries
        RENAME COLUMN treatment_plan_created_at TO expiration_date;
    END IF;

    -- If expiration_date doesn't exist and treatment_plan_created_at also doesn't exist, create it
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_aligner_entries' AND column_name = 'expiration_date'
    ) THEN
      ALTER TABLE daily_aligner_entries
        ADD COLUMN expiration_date DATE;
    END IF;
  END IF;
END $$;




