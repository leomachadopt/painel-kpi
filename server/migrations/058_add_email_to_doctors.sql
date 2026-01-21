-- Migration 058: Add email to clinic_doctors and associate doctors with users
-- This allows doctors to be linked to user accounts

-- Add email column to clinic_doctors
ALTER TABLE clinic_doctors ADD COLUMN IF NOT EXISTS email VARCHAR(255);

-- Create unique index on email per clinic (a doctor email should be unique within a clinic)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_doctors_email
ON clinic_doctors(clinic_id, email)
WHERE email IS NOT NULL;
