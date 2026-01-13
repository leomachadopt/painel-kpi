-- Migration 016: Update aligners data insertion to use date instead of text area
-- Changes data_insertion_area (TEXT) to data_insertion_activated_at (DATE)

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_aligner_entries') THEN
    -- Add new column if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_aligner_entries' AND column_name = 'data_insertion_activated_at'
    ) THEN
      ALTER TABLE daily_aligner_entries
        ADD COLUMN data_insertion_activated_at DATE;
    END IF;

    -- Remove old column if it exists
    IF EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_aligner_entries' AND column_name = 'data_insertion_area'
    ) THEN
      ALTER TABLE daily_aligner_entries
        DROP COLUMN data_insertion_area;
    END IF;
  END IF;
END $$;







