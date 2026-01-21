-- Migration 057: Add First Consultation Types and Procedures
-- This migration adds support for configurable consultation types with their respective procedures

-- Table: first_consultation_types
-- Stores different types of first consultations (e.g., Orthodontics, Implant, Whitening)
CREATE TABLE IF NOT EXISTS first_consultation_types (
  id TEXT PRIMARY KEY DEFAULT ('fct-' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(clinic_id, name)
);

-- Table: first_consultation_type_procedures
-- Stores the procedures/items that should be checked for each consultation type
CREATE TABLE IF NOT EXISTS first_consultation_type_procedures (
  id TEXT PRIMARY KEY DEFAULT ('fctp-' || substr(md5(random()::text || clock_timestamp()::text), 1, 16)),
  consultation_type_id TEXT NOT NULL REFERENCES first_consultation_types(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_fct_clinic_id ON first_consultation_types(clinic_id);
CREATE INDEX IF NOT EXISTS idx_fct_active ON first_consultation_types(active);
CREATE INDEX IF NOT EXISTS idx_fctp_consultation_type_id ON first_consultation_type_procedures(consultation_type_id);
CREATE INDEX IF NOT EXISTS idx_fctp_display_order ON first_consultation_type_procedures(display_order);

-- Add new columns to daily_consultation_entries
ALTER TABLE daily_consultation_entries
  ADD COLUMN IF NOT EXISTS consultation_type_id TEXT REFERENCES first_consultation_types(id) ON DELETE SET NULL;

ALTER TABLE daily_consultation_entries
  ADD COLUMN IF NOT EXISTS consultation_completed BOOLEAN DEFAULT false;

ALTER TABLE daily_consultation_entries
  ADD COLUMN IF NOT EXISTS consultation_completed_at TIMESTAMP;

-- JSONB structure:
-- {
--   "procedure_id": {
--     "completed": true/false,
--     "justification": "reason if not completed"
--   }
-- }
ALTER TABLE daily_consultation_entries
  ADD COLUMN IF NOT EXISTS completed_procedures JSONB;

-- Add index for consultation_type_id
CREATE INDEX IF NOT EXISTS idx_dce_consultation_type_id ON daily_consultation_entries(consultation_type_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_first_consultation_types_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_first_consultation_types_updated_at
  BEFORE UPDATE ON first_consultation_types
  FOR EACH ROW
  EXECUTE FUNCTION update_first_consultation_types_updated_at();

CREATE OR REPLACE FUNCTION update_first_consultation_type_procedures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_first_consultation_type_procedures_updated_at
  BEFORE UPDATE ON first_consultation_type_procedures
  FOR EACH ROW
  EXECUTE FUNCTION update_first_consultation_type_procedures_updated_at();
