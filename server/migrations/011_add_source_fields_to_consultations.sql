-- Migration 011: Add source fields to consultation entries
-- Moves source tracking from separate daily_source_entries to daily_consultation_entries
-- This allows tracking patient source directly when registering first consultation

DO $$
BEGIN
  -- Check if table exists first
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_consultation_entries') THEN
    -- Add source_id if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_consultation_entries' AND column_name = 'source_id'
    ) THEN
      ALTER TABLE daily_consultation_entries
        ADD COLUMN source_id VARCHAR(255) REFERENCES clinic_sources(id) ON DELETE SET NULL;
    END IF;

    -- Add is_referral if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_consultation_entries' AND column_name = 'is_referral'
    ) THEN
      ALTER TABLE daily_consultation_entries
        ADD COLUMN is_referral BOOLEAN DEFAULT false;
    END IF;

    -- Add referral_name if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_consultation_entries' AND column_name = 'referral_name'
    ) THEN
      ALTER TABLE daily_consultation_entries
        ADD COLUMN referral_name VARCHAR(255);
    END IF;

    -- Add referral_code if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_consultation_entries' AND column_name = 'referral_code'
    ) THEN
      ALTER TABLE daily_consultation_entries
        ADD COLUMN referral_code VARCHAR(100);
    END IF;

    -- Add campaign_id if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_consultation_entries' AND column_name = 'campaign_id'
    ) THEN
      ALTER TABLE daily_consultation_entries
        ADD COLUMN campaign_id VARCHAR(255) REFERENCES clinic_campaigns(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add index for source_id (only if column exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'daily_consultation_entries' AND column_name = 'source_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_daily_consultation_source_id ON daily_consultation_entries(source_id);
  END IF;
END $$;








