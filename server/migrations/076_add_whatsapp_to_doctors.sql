-- Migration 076: Adicionar whatsapp aos médicos
-- Para sistema de alertas automáticos via WhatsApp

ALTER TABLE clinic_doctors
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

COMMENT ON COLUMN clinic_doctors.whatsapp IS
  'Número WhatsApp do médico no formato internacional. Ex: +351912345678';
