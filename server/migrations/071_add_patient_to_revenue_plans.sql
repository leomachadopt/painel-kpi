-- Migration 071: Add patient fields to revenue_plans
-- Adds patient_code and patient_name to track which patient the revenue plan belongs to

ALTER TABLE revenue_plans
ADD COLUMN IF NOT EXISTS patient_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS patient_name VARCHAR(255);

-- Create index for patient searches
CREATE INDEX IF NOT EXISTS idx_revenue_plans_patient_code ON revenue_plans(patient_code);
