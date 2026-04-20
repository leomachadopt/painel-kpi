-- Migration: Add tooth_region column to pending_treatments
-- Allows tracking which tooth or region a pending treatment applies to

ALTER TABLE pending_treatments
  ADD COLUMN IF NOT EXISTS tooth_region VARCHAR(50);

COMMENT ON COLUMN pending_treatments.tooth_region IS
  'Dente ou região específica onde o tratamento será aplicado (ex: 16, 11-21, Superior direito)';
