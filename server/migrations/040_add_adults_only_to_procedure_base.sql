-- Migration 040: Add adults_only column to procedure_base_table
-- This column indicates if a procedure can only be billed for adults (true) or for both adults and children (false)

ALTER TABLE procedure_base_table 
ADD COLUMN IF NOT EXISTS adults_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN procedure_base_table.adults_only IS 'If true, procedure can only be billed for adults. If false, can be billed for both adults and children.';


