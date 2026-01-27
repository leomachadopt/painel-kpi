-- Migration 065: Add dependent_id to billing_batches
-- Allows empty batches to be associated with a specific dependent

ALTER TABLE billing_batches
ADD COLUMN IF NOT EXISTS dependent_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS dependent_name VARCHAR(255);

-- Add foreign key constraint
ALTER TABLE billing_batches
ADD CONSTRAINT fk_billing_batches_dependent
FOREIGN KEY (dependent_id) REFERENCES contract_dependents(id)
ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_billing_batches_dependent
ON billing_batches(dependent_id);

COMMENT ON COLUMN billing_batches.dependent_id IS 'ID do dependente para lotes vazios ou lotes específicos de um dependente';
COMMENT ON COLUMN billing_batches.dependent_name IS 'Nome do dependente (desnormalizado para performance)';
