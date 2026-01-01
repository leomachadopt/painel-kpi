-- Add Patients Table
CREATE TABLE IF NOT EXISTS patients (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  birth_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, code)
);

-- Index for fast lookups by code
CREATE INDEX IF NOT EXISTS idx_patients_clinic_code ON patients(clinic_id, code);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(clinic_id, name);

-- Trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_patients_updated_at'
  ) THEN
    CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
