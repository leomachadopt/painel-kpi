-- Migration 077: Adicionar whatsapp aos users (colaboradores)
-- Para permitir ao dono da clínica configurar WhatsApp de todos os colaboradores

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50);

COMMENT ON COLUMN users.whatsapp IS
  'Número WhatsApp do colaborador no formato internacional. Ex: +351912345678';
