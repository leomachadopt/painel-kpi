-- Migration 048: Add doctor_id to billing_batches
-- Adds doctor field to billing batches to match advance invoice structure

-- Add doctor_id column to billing_batches
ALTER TABLE billing_batches 
ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(255) REFERENCES clinic_doctors(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_billing_batches_doctor ON billing_batches(doctor_id);

