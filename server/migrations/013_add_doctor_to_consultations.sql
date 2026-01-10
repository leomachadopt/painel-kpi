-- Migration 013: Add doctor_id to daily_consultation_entries
-- Adds support for tracking which doctor performed the first consultation

DO $$
BEGIN
  -- Check if table exists first
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_consultation_entries') THEN
    -- Add doctor_id if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_consultation_entries' AND column_name = 'doctor_id'
    ) THEN
      ALTER TABLE daily_consultation_entries
        ADD COLUMN doctor_id VARCHAR(255) REFERENCES clinic_doctors(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add index for performance (only if column exists)
DO $$
BEGIN
  -- Create index for doctor_id only if column exists
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'daily_consultation_entries' AND column_name = 'doctor_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_daily_consultation_doctor_id ON daily_consultation_entries(doctor_id);
  END IF;
END $$;






