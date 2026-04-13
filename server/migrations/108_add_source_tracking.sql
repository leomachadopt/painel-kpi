-- Migration: Add source tracking to patients and appointments
-- This allows tracking patient acquisition from marketing channels

-- Add source to patients table
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Add source to appointments table
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS source VARCHAR(100);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_patients_source ON patients(source) WHERE source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_source ON appointments(source) WHERE source IS NOT NULL;

-- Common source values:
-- 'INSTAGRAM', 'FACEBOOK', 'GOOGLE', 'REFERRAL', 'DIRECT', 'OTHER', 'KOMMO', 'WEBSITE'
