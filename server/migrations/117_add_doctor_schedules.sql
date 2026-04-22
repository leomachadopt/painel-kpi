-- Migration 117: Add Doctor Schedules
-- Each doctor can have individual weekly schedules similar to clinic schedules
-- Doctors' schedules must be within clinic operating hours

-- ================================
-- 1. CREATE clinic_doctor_schedule TABLE
-- ================================
CREATE TABLE IF NOT EXISTS clinic_doctor_schedule (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  doctor_id VARCHAR(255) NOT NULL REFERENCES clinic_doctors(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  shift_name VARCHAR(255) DEFAULT '',
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- 2. CREATE INDEXES
-- ================================
CREATE INDEX IF NOT EXISTS idx_clinic_doctor_schedule_clinic
  ON clinic_doctor_schedule(clinic_id);

CREATE INDEX IF NOT EXISTS idx_clinic_doctor_schedule_doctor
  ON clinic_doctor_schedule(doctor_id);

CREATE INDEX IF NOT EXISTS idx_clinic_doctor_schedule_day
  ON clinic_doctor_schedule(doctor_id, day_of_week, is_active);

-- ================================
-- 3. ADD COMMENTS
-- ================================
COMMENT ON TABLE clinic_doctor_schedule IS
  'Individual weekly schedules for each doctor. Similar to clinic_schedule but per doctor.';

COMMENT ON COLUMN clinic_doctor_schedule.day_of_week IS
  'Day of week: 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday';

COMMENT ON COLUMN clinic_doctor_schedule.start_time IS
  'Start time of this shift. Must be within clinic operating hours.';

COMMENT ON COLUMN clinic_doctor_schedule.end_time IS
  'End time of this shift. Must be within clinic operating hours.';

-- ================================
-- 4. CREATE TRIGGER FOR updated_at
-- ================================
CREATE OR REPLACE FUNCTION update_clinic_doctor_schedule_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_clinic_doctor_schedule_timestamp
  ON clinic_doctor_schedule;

CREATE TRIGGER trigger_update_clinic_doctor_schedule_timestamp
  BEFORE UPDATE ON clinic_doctor_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_clinic_doctor_schedule_timestamp();

-- ================================
-- 5. VERIFICATION
-- ================================
DO $$
DECLARE
  total_doctors INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_doctors FROM clinic_doctors;

  RAISE NOTICE '';
  RAISE NOTICE '================== MIGRATION 117 SUMMARY ==================';
  RAISE NOTICE '✅ Created clinic_doctor_schedule table';
  RAISE NOTICE '✅ Created indexes for performance';
  RAISE NOTICE '✅ Created trigger for updated_at';
  RAISE NOTICE '';
  RAISE NOTICE 'Ready to add individual schedules for % doctors', total_doctors;
  RAISE NOTICE '===========================================================';
END $$;
