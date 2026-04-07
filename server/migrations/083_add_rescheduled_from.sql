-- Migration 083: Add rescheduled_from field to appointments
-- Allows tracking when an appointment is rescheduled from another

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS rescheduled_from VARCHAR(255) REFERENCES appointments(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rescheduled_to VARCHAR(255) REFERENCES appointments(id) ON DELETE SET NULL;

COMMENT ON COLUMN appointments.rescheduled_from IS 'ID da consulta original que foi remarcada para esta';
COMMENT ON COLUMN appointments.rescheduled_to IS 'ID da nova consulta para a qual esta foi remarcada';

-- Create index for better performance when querying rescheduled appointments
CREATE INDEX IF NOT EXISTS idx_appointments_rescheduled_from ON appointments(rescheduled_from);
CREATE INDEX IF NOT EXISTS idx_appointments_rescheduled_to ON appointments(rescheduled_to);
