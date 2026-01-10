-- Migration 042: Add extracted_adults_only column to procedure_mappings
-- This allows manual editing of adults_only flag during procedure review

ALTER TABLE procedure_mappings 
ADD COLUMN IF NOT EXISTS extracted_adults_only BOOLEAN DEFAULT false;

COMMENT ON COLUMN procedure_mappings.extracted_adults_only IS 'If true, procedure can only be billed for adults. If false, can be billed for both adults and children. This can be manually edited during review.';

