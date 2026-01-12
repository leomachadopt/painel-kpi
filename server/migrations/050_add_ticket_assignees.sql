-- Migration 050: Add support for multiple assignees per ticket
-- Creates a many-to-many relationship between tickets and users

-- Garantir que a extensão UUID está habilitada
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de relacionamento entre tickets e colaboradores atribuídos
CREATE TABLE IF NOT EXISTS ticket_assignees (
  id VARCHAR(255) PRIMARY KEY,
  ticket_id VARCHAR(255) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ticket_id, user_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_ticket_assignees_ticket_id ON ticket_assignees(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignees_user_id ON ticket_assignees(user_id);

-- Migrar dados existentes: se houver assigned_to, criar registro em ticket_assignees
INSERT INTO ticket_assignees (id, ticket_id, user_id)
SELECT 
  gen_random_uuid()::TEXT,
  id,
  assigned_to
FROM tickets
WHERE assigned_to IS NOT NULL
ON CONFLICT (ticket_id, user_id) DO NOTHING;

