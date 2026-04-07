-- Migration: Add link between plan_procedures and pending_treatments for bidirectional sync

-- Add pending_treatment_id to plan_procedures to link with pending_treatments
ALTER TABLE plan_procedures
ADD COLUMN IF NOT EXISTS pending_treatment_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_plan_procedures_pending_treatment
ON plan_procedures(pending_treatment_id);

-- Add plan_procedure_id to pending_treatments to link back
ALTER TABLE pending_treatments
ADD COLUMN IF NOT EXISTS plan_procedure_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pending_treatments_plan_procedure
ON pending_treatments(plan_procedure_id);
