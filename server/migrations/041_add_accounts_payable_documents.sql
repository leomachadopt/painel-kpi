-- Migration 041: Add accounts payable documents table
-- Creates table for accounts payable documents (PDF uploads)

CREATE TABLE IF NOT EXISTS accounts_payable_documents (
  id VARCHAR(255) PRIMARY KEY,
  accounts_payable_id VARCHAR(255) NOT NULL REFERENCES accounts_payable(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100),
  uploaded_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_accounts_payable_documents_entry_id 
  ON accounts_payable_documents(accounts_payable_id);

