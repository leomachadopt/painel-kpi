-- Migration 053: Add bank data to suppliers
-- Adiciona campos de dados bancários à tabela de fornecedores

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS iban VARCHAR(34),
ADD COLUMN IF NOT EXISTS nib VARCHAR(25),
ADD COLUMN IF NOT EXISTS swift_bic VARCHAR(11);

-- Comentários para documentação
COMMENT ON COLUMN suppliers.bank_name IS 'Nome do banco';
COMMENT ON COLUMN suppliers.iban IS 'Número IBAN da conta bancária';
COMMENT ON COLUMN suppliers.nib IS 'Número de Identificação Bancária (NIB)';
COMMENT ON COLUMN suppliers.swift_bic IS 'Código SWIFT/BIC do banco';



