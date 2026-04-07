-- Create table for clinic operating hours/shifts
-- Each clinic can have multiple shifts per day (e.g., morning and afternoon)

CREATE TABLE IF NOT EXISTS clinic_schedules (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  shift_name TEXT NOT NULL, -- e.g., "Manhã", "Tarde", "Noite"
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure shifts don't overlap for the same day
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

-- Index for faster queries
CREATE INDEX idx_clinic_schedules_clinic_day ON clinic_schedules(clinic_id, day_of_week, is_active);

-- Add default schedule for existing clinics (Monday to Friday, 8:00-18:00)
DO $$
DECLARE
  clinic_rec RECORD;
  day_num INTEGER;
BEGIN
  FOR clinic_rec IN SELECT id FROM clinics
  LOOP
    -- Check if clinic already has a schedule
    IF NOT EXISTS (SELECT 1 FROM clinic_schedules WHERE clinic_id = clinic_rec.id) THEN
      -- Add Monday to Friday schedule (days 1-5)
      FOR day_num IN 1..5 LOOP
        INSERT INTO clinic_schedules (id, clinic_id, day_of_week, shift_name, start_time, end_time, is_active)
        VALUES (
          gen_random_uuid(),
          clinic_rec.id,
          day_num,
          'Horário Normal',
          '08:00:00',
          '18:00:00',
          true
        );
      END LOOP;
      
      RAISE NOTICE 'Added default schedule for clinic: %', clinic_rec.id;
    END IF;
  END LOOP;
END $$;

-- Create trigger to add default schedule for new clinics
CREATE OR REPLACE FUNCTION add_default_clinic_schedule()
RETURNS TRIGGER AS $$
DECLARE
  day_num INTEGER;
BEGIN
  -- Add Monday to Friday schedule (days 1-5)
  FOR day_num IN 1..5 LOOP
    INSERT INTO clinic_schedules (id, clinic_id, day_of_week, shift_name, start_time, end_time, is_active)
    VALUES (
      gen_random_uuid(),
      NEW.id,
      day_num,
      'Horário Normal',
      '08:00:00',
      '18:00:00',
      true
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_add_default_clinic_schedule ON clinics;
CREATE TRIGGER trigger_add_default_clinic_schedule
  AFTER INSERT ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION add_default_clinic_schedule();
