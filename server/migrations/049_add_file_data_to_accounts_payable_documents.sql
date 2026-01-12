-- Migration 049: Add file_data column to store PDF files in database
-- Adiciona coluna para armazenar arquivos PDF diretamente no banco de dados

ALTER TABLE accounts_payable_documents 
ADD COLUMN IF NOT EXISTS file_data BYTEA;

-- Tornar file_path opcional (pode ser NULL agora)
ALTER TABLE accounts_payable_documents 
ALTER COLUMN file_path DROP NOT NULL;

-- Criar índice para melhor performance (opcional, mas útil)
CREATE INDEX IF NOT EXISTS idx_accounts_payable_documents_has_file_data 
ON accounts_payable_documents(accounts_payable_id) 
WHERE file_data IS NOT NULL;

