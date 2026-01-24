-- Migration: Add language support to clinics and users
-- Description: Adds language field to clinics and users tables for multi-language support
-- Supported languages: pt-BR, pt-PT, it, es, en, fr

-- Add language column to clinics table
ALTER TABLE clinics
ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'pt-BR'
CHECK (language IN ('pt-BR', 'pt-PT', 'it', 'es', 'en', 'fr'));

-- Add language column to users table (can override clinic language)
ALTER TABLE users
ADD COLUMN IF NOT EXISTS language VARCHAR(10)
CHECK (language IS NULL OR language IN ('pt-BR', 'pt-PT', 'it', 'es', 'en', 'fr'));

-- Add comment to explain the language inheritance
COMMENT ON COLUMN clinics.language IS 'Default language for the clinic and all its users';
COMMENT ON COLUMN users.language IS 'User-specific language override. If NULL, inherits from clinic';

-- Update existing clinics to use Portuguese (Brazil) as default
UPDATE clinics SET language = 'pt-BR' WHERE language IS NULL;
