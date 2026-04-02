-- Migration 075: Add Kommo credentials per clinic
-- Each clinic has its own Kommo account (subdomain + token)

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS kommo_subdomain VARCHAR(255),
  ADD COLUMN IF NOT EXISTS kommo_token     TEXT;

COMMENT ON COLUMN clinics.kommo_subdomain IS
  'Subdomínio da conta Kommo da clínica. Ex: se URL é clinica.kommo.com → "clinica"';
COMMENT ON COLUMN clinics.kommo_token IS
  'Long-term token OAuth da conta Kommo da clínica.';
