-- Add stage dates + enforce unique 1.ª consulta per patient (clinic_id + code)

ALTER TABLE daily_consultation_entries
  ADD COLUMN IF NOT EXISTS plan_created_at DATE,
  ADD COLUMN IF NOT EXISTS plan_presented_at DATE,
  ADD COLUMN IF NOT EXISTS plan_accepted_at DATE;

-- Enforce uniqueness per clinic + patient code
-- NOTE: if you already have duplicates, you must clean them up before this will succeed.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uniq_daily_consultation_clinic_code'
  ) THEN
    ALTER TABLE daily_consultation_entries
      ADD CONSTRAINT uniq_daily_consultation_clinic_code UNIQUE (clinic_id, code);
  END IF;
END $$;




