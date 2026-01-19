-- Add plan not eligible fields to daily_consultation_entries
ALTER TABLE daily_consultation_entries
ADD COLUMN plan_not_eligible BOOLEAN DEFAULT FALSE,
ADD COLUMN plan_not_eligible_at TIMESTAMP,
ADD COLUMN plan_not_eligible_reason TEXT;
