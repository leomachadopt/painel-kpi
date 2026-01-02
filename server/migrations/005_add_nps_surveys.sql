-- Migration 005: Add NPS Survey System
-- Creates infrastructure for NPS (Net Promoter Score) surveys

-- ================================
-- 1. Create nps_surveys table
-- ================================
CREATE TABLE IF NOT EXISTS nps_surveys (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id VARCHAR(255) REFERENCES patients(id) ON DELETE SET NULL,

  -- Patient information (denormalized for historical data)
  patient_name VARCHAR(255) NOT NULL,
  patient_email VARCHAR(255),
  patient_code VARCHAR(6),

  -- Unique token for public access
  token VARCHAR(64) UNIQUE NOT NULL,

  -- NPS score (0-10 scale)
  score INTEGER CHECK (score >= 0 AND score <= 10),

  -- Optional feedback
  feedback TEXT,
  comment TEXT,

  -- Survey lifecycle
  sent_at TIMESTAMP,
  responded_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Survey period
  survey_month INTEGER NOT NULL CHECK (survey_month >= 1 AND survey_month <= 12),
  survey_year INTEGER NOT NULL,

  -- Status tracking
  status VARCHAR(50) DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SENT', 'RESPONDED', 'EXPIRED', 'CANCELLED')),

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- 2. Create indexes for performance
-- ================================
CREATE INDEX IF NOT EXISTS idx_nps_surveys_clinic_date
  ON nps_surveys(clinic_id, survey_year, survey_month);

CREATE INDEX IF NOT EXISTS idx_nps_surveys_token
  ON nps_surveys(token);

CREATE INDEX IF NOT EXISTS idx_nps_surveys_status
  ON nps_surveys(clinic_id, status);

CREATE INDEX IF NOT EXISTS idx_nps_surveys_patient
  ON nps_surveys(patient_id);

CREATE INDEX IF NOT EXISTS idx_nps_surveys_expires
  ON nps_surveys(expires_at) WHERE status IN ('PENDING', 'SENT');

-- ================================
-- 3. Trigger for updated_at
-- ================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_nps_surveys_updated_at'
  ) THEN
    CREATE TRIGGER update_nps_surveys_updated_at
      BEFORE UPDATE ON nps_surveys
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ================================
-- 4. Function to calculate NPS for a period
-- ================================
CREATE OR REPLACE FUNCTION calculate_nps(
  p_clinic_id VARCHAR(255),
  p_month INTEGER,
  p_year INTEGER
) RETURNS INTEGER AS $$
DECLARE
  v_total INTEGER;
  v_promoters INTEGER;
  v_detractors INTEGER;
  v_nps INTEGER;
BEGIN
  -- Count total responses
  SELECT COUNT(*) INTO v_total
  FROM nps_surveys
  WHERE clinic_id = p_clinic_id
    AND survey_month = p_month
    AND survey_year = p_year
    AND status = 'RESPONDED'
    AND score IS NOT NULL;

  -- Return 0 if no responses
  IF v_total = 0 THEN
    RETURN 0;
  END IF;

  -- Count promoters (score 9-10)
  SELECT COUNT(*) INTO v_promoters
  FROM nps_surveys
  WHERE clinic_id = p_clinic_id
    AND survey_month = p_month
    AND survey_year = p_year
    AND status = 'RESPONDED'
    AND score >= 9;

  -- Count detractors (score 0-6)
  SELECT COUNT(*) INTO v_detractors
  FROM nps_surveys
  WHERE clinic_id = p_clinic_id
    AND survey_month = p_month
    AND survey_year = p_year
    AND status = 'RESPONDED'
    AND score <= 6;

  -- Calculate NPS: ((Promoters - Detractors) / Total) * 100
  v_nps := ROUND(((v_promoters - v_detractors)::DECIMAL / v_total) * 100);

  RETURN v_nps;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 5. Function to auto-update monthly_data.nps
-- ================================
CREATE OR REPLACE FUNCTION update_monthly_nps()
RETURNS TRIGGER AS $$
DECLARE
  v_nps INTEGER;
BEGIN
  -- Only update if survey was just responded
  IF (TG_OP = 'UPDATE' AND NEW.status = 'RESPONDED' AND OLD.status != 'RESPONDED') OR
     (TG_OP = 'INSERT' AND NEW.status = 'RESPONDED') THEN

    -- Calculate NPS for the period
    v_nps := calculate_nps(NEW.clinic_id, NEW.survey_month, NEW.survey_year);

    -- Update monthly_data
    UPDATE monthly_data
    SET nps = v_nps,
        updated_at = CURRENT_TIMESTAMP
    WHERE clinic_id = NEW.clinic_id
      AND month = NEW.survey_month
      AND year = NEW.survey_year;

    -- Create monthly_data if it doesn't exist
    IF NOT FOUND THEN
      INSERT INTO monthly_data (
        id, clinic_id, month, year, nps, created_at, updated_at
      ) VALUES (
        'md_' || gen_random_uuid()::TEXT,
        NEW.clinic_id,
        NEW.survey_month,
        NEW.survey_year,
        v_nps,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 6. Create trigger for auto-updating NPS
-- ================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_monthly_nps'
  ) THEN
    CREATE TRIGGER trigger_update_monthly_nps
      AFTER INSERT OR UPDATE ON nps_surveys
      FOR EACH ROW EXECUTE FUNCTION update_monthly_nps();
  END IF;
END $$;

-- ================================
-- 7. Function to mark expired surveys
-- ================================
CREATE OR REPLACE FUNCTION mark_expired_nps_surveys()
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE nps_surveys
  SET status = 'EXPIRED',
      updated_at = CURRENT_TIMESTAMP
  WHERE status IN ('PENDING', 'SENT')
    AND expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 8. Comments for documentation
-- ================================
COMMENT ON TABLE nps_surveys IS 'Stores NPS (Net Promoter Score) surveys sent to patients';
COMMENT ON COLUMN nps_surveys.token IS 'Unique token for public survey access without authentication';
COMMENT ON COLUMN nps_surveys.score IS 'NPS score from 0-10 (Detractors: 0-6, Passives: 7-8, Promoters: 9-10)';
COMMENT ON COLUMN nps_surveys.expires_at IS 'Survey link expiration date';
COMMENT ON FUNCTION calculate_nps IS 'Calculates NPS score for a clinic in a specific month/year';
COMMENT ON FUNCTION update_monthly_nps IS 'Automatically updates monthly_data.nps when a survey is responded';
COMMENT ON FUNCTION mark_expired_nps_surveys IS 'Marks surveys as expired based on expires_at date';
