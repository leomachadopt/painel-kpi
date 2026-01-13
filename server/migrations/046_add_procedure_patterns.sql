-- Migration 046: Add procedure_patterns table for learned classification patterns
-- This table stores patterns learned from approved procedures to reduce AI costs

CREATE TABLE IF NOT EXISTS procedure_patterns (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) REFERENCES clinics(id) ON DELETE CASCADE,
  insurance_provider_id VARCHAR(255) REFERENCES insurance_providers(id) ON DELETE SET NULL,
  
  -- Pattern matching fields
  code_pattern VARCHAR(100), -- Exact code or pattern (e.g., "6185%" for 61851, 61852, etc)
  description_keywords TEXT[], -- Array of keywords from description
  description_normalized TEXT, -- Normalized description (uppercase, no accents)
  
  -- Classification learned from approved procedures
  is_periciable BOOLEAN NOT NULL,
  adults_only BOOLEAN NOT NULL,
  confidence DECIMAL(3, 2) DEFAULT 1.0, -- Confidence based on how many times it was confirmed
  
  -- Metadata
  match_count INTEGER DEFAULT 1, -- How many times this pattern was used
  last_matched_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_procedure_patterns_clinic ON procedure_patterns(clinic_id);
CREATE INDEX IF NOT EXISTS idx_procedure_patterns_provider ON procedure_patterns(insurance_provider_id);
CREATE INDEX IF NOT EXISTS idx_procedure_patterns_code ON procedure_patterns(code_pattern);
CREATE INDEX IF NOT EXISTS idx_procedure_patterns_keywords ON procedure_patterns USING GIN(description_keywords);
CREATE INDEX IF NOT EXISTS idx_procedure_patterns_normalized ON procedure_patterns(description_normalized);

COMMENT ON TABLE procedure_patterns IS 'Stores learned patterns from approved procedures to enable zero-cost classification for similar procedures';
COMMENT ON COLUMN procedure_patterns.code_pattern IS 'Exact code or pattern (e.g., "61851" or "6185%" for codes starting with 6185)';
COMMENT ON COLUMN procedure_patterns.description_keywords IS 'Array of keywords extracted from description for fuzzy matching';
COMMENT ON COLUMN procedure_patterns.description_normalized IS 'Normalized description (uppercase, no accents) for exact matching';
COMMENT ON COLUMN procedure_patterns.confidence IS 'Confidence score (0.0-1.0) based on how many times this pattern was confirmed';
COMMENT ON COLUMN procedure_patterns.match_count IS 'Number of times this pattern has been successfully matched';


