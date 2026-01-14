-- Migration 014: Add aligners functionality
-- Adds support for tracking aligner treatments with brands, data insertion, and stages

-- Create clinic_aligner_brands table
CREATE TABLE IF NOT EXISTS clinic_aligner_brands (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create daily_aligner_entries table
CREATE TABLE IF NOT EXISTS daily_aligner_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  aligner_brand_id VARCHAR(255) NOT NULL REFERENCES clinic_aligner_brands(id) ON DELETE RESTRICT,
  
  -- Data insertion fields
  data_insertion_active BOOLEAN DEFAULT false,
  data_insertion_area TEXT,
  has_scanner BOOLEAN DEFAULT false,
  scanner_collection_date DATE,
  has_photos BOOLEAN DEFAULT false,
  photos_status VARCHAR(50) CHECK (photos_status IN ('marked', 'dispensable') OR photos_status IS NULL),
  has_ortho BOOLEAN DEFAULT false,
  ortho_status VARCHAR(50) CHECK (ortho_status IN ('marked', 'dispensable') OR ortho_status IS NULL),
  has_tele BOOLEAN DEFAULT false,
  tele_status VARCHAR(50) CHECK (tele_status IN ('marked', 'dispensable') OR tele_status IS NULL),
  has_cbct BOOLEAN DEFAULT false,
  cbct_status VARCHAR(50) CHECK (cbct_status IN ('marked', 'dispensable') OR cbct_status IS NULL),
  
  -- Stage fields
  registration_created BOOLEAN DEFAULT false,
  registration_created_at DATE,
  cck_created BOOLEAN DEFAULT false,
  cck_created_at DATE,
  awaiting_plan BOOLEAN DEFAULT false,
  awaiting_plan_at DATE,
  awaiting_approval BOOLEAN DEFAULT false,
  awaiting_approval_at DATE,
  approved BOOLEAN DEFAULT false,
  approved_at DATE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- One record per patient per clinic (similar to consultations)
  CONSTRAINT uniq_daily_aligner_clinic_code UNIQUE (clinic_id, code)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_clinic_aligner_brands_clinic_id ON clinic_aligner_brands(clinic_id);
CREATE INDEX IF NOT EXISTS idx_daily_aligner_clinic_date ON daily_aligner_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_aligner_brand_id ON daily_aligner_entries(aligner_brand_id);
CREATE INDEX IF NOT EXISTS idx_daily_aligner_code ON daily_aligner_entries(clinic_id, code);

-- Add trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_aligner_entries_updated_at') THEN
    CREATE TRIGGER update_daily_aligner_entries_updated_at BEFORE UPDATE ON daily_aligner_entries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;








