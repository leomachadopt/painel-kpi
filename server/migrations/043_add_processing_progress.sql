-- Migration 043: Add processing progress tracking
-- Adds fields to track real-time processing progress of PDF documents

ALTER TABLE insurance_provider_documents
ADD COLUMN IF NOT EXISTS processing_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_stage TEXT DEFAULT 'PENDING';

COMMENT ON COLUMN insurance_provider_documents.processing_progress IS 'Progress percentage (0-100)';
COMMENT ON COLUMN insurance_provider_documents.processing_stage IS 'Current stage: UPLOADING, EXTRACTING, MATCHING, COMPLETED, FAILED';
