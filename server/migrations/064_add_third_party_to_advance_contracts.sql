-- Migration 064: Add third party fields to advance_contracts
-- Adds fields to indicate if contract is billed to a third party (e.g., employer)

ALTER TABLE advance_contracts
ADD COLUMN IF NOT EXISTS billed_to_third_party BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS third_party_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS third_party_name VARCHAR(255);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_advance_contracts_third_party
ON advance_contracts(clinic_id, billed_to_third_party);
