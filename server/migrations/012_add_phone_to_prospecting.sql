-- Migration 012: Add phone column to daily_prospecting_entries
-- Adds support for tracking phone call leads in prospecting dashboard

DO $$
BEGIN
  -- Check if table exists first
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_prospecting_entries') THEN
    -- Add phone column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_prospecting_entries' AND column_name = 'phone'
    ) THEN
      ALTER TABLE daily_prospecting_entries
        ADD COLUMN phone INTEGER NOT NULL DEFAULT 0;
    END IF;
  END IF;
END $$;





