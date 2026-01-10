-- Migration 045: Simplify procedure extraction - Remove mandatory pairing with procedure_base
-- This migration supports the new workflow where:
-- 1. Insurance provider is created WITHOUT PDF upload
-- 2. PDF is uploaded later to extract procedures
-- 3. AI classifies procedures (periciable, adults_only) WITHOUT pairing to procedure_base
-- 4. Manual validation only for items AI couldn't identify

-- The mapped_procedure_base_id is now truly optional
-- Procedures from insurance PDFs are independent entities
COMMENT ON COLUMN procedure_mappings.mapped_procedure_base_id IS 'Optional reference to base procedure table. NULL means procedure exists independently in insurance provider context only.';

-- Add AI classification confidence fields
ALTER TABLE procedure_mappings
ADD COLUMN IF NOT EXISTS ai_periciable_confidence DECIMAL(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_adults_only_confidence DECIMAL(5, 2) DEFAULT 0;

COMMENT ON COLUMN procedure_mappings.ai_periciable_confidence IS 'AI confidence score (0-1) for periciable classification';
COMMENT ON COLUMN procedure_mappings.ai_adults_only_confidence IS 'AI confidence score (0-1) for adults_only classification';

-- Add index for procedures requiring manual classification
CREATE INDEX IF NOT EXISTS idx_procedure_mappings_needs_manual_review
ON procedure_mappings(document_id, status)
WHERE (ai_periciable_confidence < 0.7 OR ai_adults_only_confidence < 0.7);
