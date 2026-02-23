-- Migration 069: Add in_person column to daily_prospecting_entries
-- Adds support for tracking in-person leads in prospecting dashboard

DO $$
BEGIN
  -- Check if table exists first
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_prospecting_entries') THEN
    -- Add in_person column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'daily_prospecting_entries' AND column_name = 'in_person'
    ) THEN
      ALTER TABLE daily_prospecting_entries
        ADD COLUMN in_person INTEGER NOT NULL DEFAULT 0;
    END IF;
  END IF;
END $$;
