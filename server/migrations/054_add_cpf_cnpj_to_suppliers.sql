-- Migration 054: Add CPF and CNPJ fields to suppliers for Brazil
-- Adiciona campos CPF e CNPJ para suporte ao Brasil
-- NIF continua disponível para Portugal

ALTER TABLE suppliers
ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

-- Comentários para documentação
COMMENT ON COLUMN suppliers.nif IS 'Número de Identificação Fiscal (NIF) - Portugal';
COMMENT ON COLUMN suppliers.cpf IS 'Cadastro de Pessoa Física (CPF) - Brasil';
COMMENT ON COLUMN suppliers.cnpj IS 'Cadastro Nacional de Pessoa Jurídica (CNPJ) - Brasil';

