-- Migration 060: Add is_billing_entry flag
-- Adds a flag to identify financial entries from the Billing tab

DO $$
BEGIN
  -- Add is_billing_entry if it doesn't exist
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'daily_financial_entries') THEN
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_name = 'daily_financial_entries' AND column_name = 'is_billing_entry'
    ) THEN
      ALTER TABLE daily_financial_entries
        ADD COLUMN is_billing_entry BOOLEAN DEFAULT false;
    END IF;
  END IF;
END $$;

-- Create index for filtering billing entries
CREATE INDEX IF NOT EXISTS idx_daily_financial_is_billing ON daily_financial_entries(clinic_id, is_billing_entry) WHERE is_billing_entry = true;
