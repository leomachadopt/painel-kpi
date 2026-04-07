-- Migration 084: Fix appointments metrics columns
-- Add missing columns and fix data types

-- Add confirmed_at if it doesn't exist
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP;

-- Add actual_arrival if it doesn't exist
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS actual_arrival TIMESTAMP;

-- Change actual_start from TIME to TIMESTAMP if needed
DO $$
BEGIN
  BEGIN
    ALTER TABLE appointments ALTER COLUMN actual_start TYPE TIMESTAMP USING
      CASE
        WHEN actual_start IS NULL THEN NULL
        ELSE (CURRENT_DATE + actual_start)
      END;
  EXCEPTION
    WHEN undefined_column THEN
      ALTER TABLE appointments ADD COLUMN actual_start TIMESTAMP;
    WHEN others THEN
      -- Column exists and might already be TIMESTAMP, skip
      NULL;
  END;
END $$;

-- Change actual_end from TIME to TIMESTAMP if needed
DO $$
BEGIN
  BEGIN
    ALTER TABLE appointments ALTER COLUMN actual_end TYPE TIMESTAMP USING
      CASE
        WHEN actual_end IS NULL THEN NULL
        ELSE (CURRENT_DATE + actual_end)
      END;
  EXCEPTION
    WHEN undefined_column THEN
      ALTER TABLE appointments ADD COLUMN actual_end TIMESTAMP;
    WHEN others THEN
      -- Column exists and might already be TIMESTAMP, skip
      NULL;
  END;
END $$;

-- Change room_freed_at from TIME to TIMESTAMP if needed
DO $$
BEGIN
  BEGIN
    ALTER TABLE appointments ALTER COLUMN room_freed_at TYPE TIMESTAMP USING
      CASE
        WHEN room_freed_at IS NULL THEN NULL
        ELSE (CURRENT_DATE + room_freed_at)
      END;
  EXCEPTION
    WHEN undefined_column THEN
      ALTER TABLE appointments ADD COLUMN room_freed_at TIMESTAMP;
    WHEN others THEN
      -- Column exists and might already be TIMESTAMP, skip
      NULL;
  END;
END $$;

-- Add comments
COMMENT ON COLUMN appointments.confirmed_at IS 'Timestamp de quando a consulta foi confirmada';
COMMENT ON COLUMN appointments.actual_arrival IS 'Timestamp de quando o paciente chegou';
COMMENT ON COLUMN appointments.actual_start IS 'Timestamp de quando o atendimento iniciou';
COMMENT ON COLUMN appointments.actual_end IS 'Timestamp de quando o atendimento terminou';
COMMENT ON COLUMN appointments.room_freed_at IS 'Timestamp de quando o consultório foi liberado';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_confirmed_at ON appointments(confirmed_at);
CREATE INDEX IF NOT EXISTS idx_appointments_actual_arrival ON appointments(actual_arrival);
CREATE INDEX IF NOT EXISTS idx_appointments_actual_start ON appointments(actual_start);
CREATE INDEX IF NOT EXISTS idx_appointments_actual_end ON appointments(actual_end);
