-- Migration 010: Add doctor and payment source to financial entries
-- Adds support for tracking which doctor performed the procedure and payment method

-- Create clinic_payment_sources table
CREATE TABLE IF NOT EXISTS clinic_payment_sources (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add doctor_id and payment_source_id to daily_financial_entries
-- PostgreSQL requires separate ALTER TABLE statements when checking for column existence
DO $$
BEGIN
  -- Check if table exists first
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_financial_entries') THEN
    -- Add doctor_id if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_financial_entries' AND column_name = 'doctor_id'
    ) THEN
      ALTER TABLE daily_financial_entries
        ADD COLUMN doctor_id VARCHAR(255) REFERENCES clinic_doctors(id) ON DELETE SET NULL;
    END IF;

    -- Add payment_source_id if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'daily_financial_entries' AND column_name = 'payment_source_id'
    ) THEN
      ALTER TABLE daily_financial_entries
        ADD COLUMN payment_source_id VARCHAR(255) REFERENCES clinic_payment_sources(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Add indexes for performance (only if columns exist)
DO $$
BEGIN
  -- Create index for doctor_id only if column exists
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'daily_financial_entries' AND column_name = 'doctor_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_daily_financial_doctor_id ON daily_financial_entries(doctor_id);
  END IF;

  -- Create index for payment_source_id only if column exists
  IF EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'daily_financial_entries' AND column_name = 'payment_source_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_daily_financial_payment_source_id ON daily_financial_entries(payment_source_id);
  END IF;
END $$;

-- Index for clinic_payment_sources (always safe)
CREATE INDEX IF NOT EXISTS idx_clinic_payment_sources_clinic_id ON clinic_payment_sources(clinic_id);

