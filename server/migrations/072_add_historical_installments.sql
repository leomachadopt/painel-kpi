-- Migration 072: Add support for historical installments and already paid amounts

-- Add column to revenue_plans to track already paid amount
ALTER TABLE revenue_plans
ADD COLUMN IF NOT EXISTS already_paid_amount DECIMAL(12, 2) DEFAULT 0;

-- Add column to revenue_installments to mark historical entries
ALTER TABLE revenue_installments
ADD COLUMN IF NOT EXISTS is_historical BOOLEAN DEFAULT FALSE;

-- Add comment to explain the fields
COMMENT ON COLUMN revenue_plans.already_paid_amount IS 'Amount already paid before registering the plan in the system';
COMMENT ON COLUMN revenue_installments.is_historical IS 'Marks installments that were received before the plan was registered in the system';
