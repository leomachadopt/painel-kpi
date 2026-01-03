-- Add plan_presented_value column to daily_consultation_entries table
-- This allows tracking the predicted value of presented plans separately from accepted plans

ALTER TABLE daily_consultation_entries
  ADD COLUMN IF NOT EXISTS plan_presented_value DECIMAL(10, 2) DEFAULT 0;

-- Make plan_value optional (nullable) since not all consultations result in accepted plans
ALTER TABLE daily_consultation_entries
  ALTER COLUMN plan_value DROP NOT NULL;
