-- Migration 100: Add cloudinary_resource_type column to patient_documents
-- Stores the Cloudinary resource type (image, raw, video) for correct URL generation

ALTER TABLE patient_documents
ADD COLUMN IF NOT EXISTS cloudinary_resource_type VARCHAR(20) DEFAULT 'raw';

-- Update existing records to have a default value
UPDATE patient_documents
SET cloudinary_resource_type = 'raw'
WHERE cloudinary_resource_type IS NULL;
