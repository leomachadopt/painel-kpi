-- Migration 055: Add Brazilian bank data fields to suppliers
-- Adiciona campos de dados bancários brasileiros à tabela de fornecedores
-- Brasil: Agência, Conta, Tipo de Conta, Código do Banco, Chave PIX
-- Portugal: IBAN, NIB, SWIFT/BIC (já existentes)

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS bank_agency VARCHAR(10),
ADD COLUMN IF NOT EXISTS bank_account VARCHAR(20),
ADD COLUMN IF NOT EXISTS bank_account_type VARCHAR(20),
ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10),
ADD COLUMN IF NOT EXISTS pix_key VARCHAR(255);

-- Comentários para documentação
COMMENT ON COLUMN suppliers.bank_agency IS 'Agência bancária (Brasil)';
COMMENT ON COLUMN suppliers.bank_account IS 'Número da conta bancária (Brasil)';
COMMENT ON COLUMN suppliers.bank_account_type IS 'Tipo de conta: corrente, poupança, etc. (Brasil)';
COMMENT ON COLUMN suppliers.bank_code IS 'Código do banco (Brasil) - ex: 001, 033, 341';
COMMENT ON COLUMN suppliers.pix_key IS 'Chave PIX (Brasil)';

