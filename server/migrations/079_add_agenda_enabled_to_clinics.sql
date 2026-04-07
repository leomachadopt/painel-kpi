-- Migration 079: Add agenda_enabled flag to clinics table
-- When enabled, scheduling system auto-fills Time, Cabinet Usage and Control modules

ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS agenda_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN clinics.agenda_enabled IS
  'Quando true: oculta os módulos Tempos, Consultórios e Controlo do menu. Estes módulos passam a ser preenchidos automaticamente pela agenda clínica.';
