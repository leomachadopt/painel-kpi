-- Add default appointment types for existing clinics
-- Only add if the clinic doesn't have any appointment types yet

DO $$
DECLARE
  clinic_rec RECORD;
BEGIN
  FOR clinic_rec IN SELECT id FROM clinics
  LOOP
    -- Check if clinic already has appointment types
    IF NOT EXISTS (SELECT 1 FROM appointment_types WHERE clinic_id = clinic_rec.id) THEN
      -- Add default appointment types
      INSERT INTO appointment_types (id, clinic_id, name, duration_minutes, color, is_active)
      VALUES 
        (gen_random_uuid(), clinic_rec.id, 'Consulta', 30, '#3B82F6', true),
        (gen_random_uuid(), clinic_rec.id, 'Avaliação', 60, '#10B981', true),
        (gen_random_uuid(), clinic_rec.id, 'Retorno', 20, '#8B5CF6', true),
        (gen_random_uuid(), clinic_rec.id, 'Procedimento', 90, '#F59E0B', true);
      
      RAISE NOTICE 'Added default appointment types for clinic: %', clinic_rec.id;
    END IF;
  END LOOP;
END $$;
