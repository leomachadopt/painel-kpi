-- Migration 006: Add customizable NPS question to clinics

-- Add nps_question column to clinics table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'clinics' AND column_name = 'nps_question'
  ) THEN
    ALTER TABLE clinics
    ADD COLUMN nps_question TEXT DEFAULT 'Gostaríamos de saber o quanto você recomendaria nossa clínica para um amigo ou familiar?';
  END IF;
END $$;

COMMENT ON COLUMN clinics.nps_question IS 'Custom NPS survey question for the clinic';
