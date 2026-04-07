-- Migration 082: Add metrics tracking fields to appointments
-- Adds fields for tracking confirmation and actual times for clinic metrics

ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS actual_arrival TIMESTAMP,
ADD COLUMN IF NOT EXISTS actual_start TIMESTAMP,
ADD COLUMN IF NOT EXISTS actual_end TIMESTAMP,
ADD COLUMN IF NOT EXISTS room_freed_at TIMESTAMP;

COMMENT ON COLUMN appointments.confirmed_at IS 'Data e hora da confirmação da consulta pelo paciente';
COMMENT ON COLUMN appointments.actual_arrival IS 'Data e hora real de chegada do paciente (para métricas de tempo de espera)';
COMMENT ON COLUMN appointments.actual_start IS 'Data e hora real de início do atendimento';
COMMENT ON COLUMN appointments.actual_end IS 'Data e hora real de conclusão do atendimento';
COMMENT ON COLUMN appointments.room_freed_at IS 'Data e hora real de liberação da sala (para métricas de ocupação)';
