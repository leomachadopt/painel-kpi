-- Create a trigger to automatically add default appointment types when a new clinic is created

CREATE OR REPLACE FUNCTION add_default_appointment_types()
RETURNS TRIGGER AS $$
BEGIN
  -- Add default appointment types for the new clinic
  INSERT INTO appointment_types (id, clinic_id, name, duration_minutes, color, is_active)
  VALUES 
    (gen_random_uuid(), NEW.id, 'Consulta', 30, '#3B82F6', true),
    (gen_random_uuid(), NEW.id, 'Avaliação', 60, '#10B981', true),
    (gen_random_uuid(), NEW.id, 'Retorno', 20, '#8B5CF6', true),
    (gen_random_uuid(), NEW.id, 'Procedimento', 90, '#F59E0B', true);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after a new clinic is inserted
DROP TRIGGER IF EXISTS trigger_add_default_appointment_types ON clinics;
CREATE TRIGGER trigger_add_default_appointment_types
  AFTER INSERT ON clinics
  FOR EACH ROW
  EXECUTE FUNCTION add_default_appointment_types();
