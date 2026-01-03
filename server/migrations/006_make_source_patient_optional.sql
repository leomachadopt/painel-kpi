-- Make patient_name and code optional in daily_source_entries
-- This allows tracking source without identifying the new patient
-- Only the referral patient (who indicated) needs to be tracked

ALTER TABLE daily_source_entries
  ALTER COLUMN patient_name DROP NOT NULL,
  ALTER COLUMN code DROP NOT NULL;
