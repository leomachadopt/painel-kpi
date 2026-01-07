-- Migration 031: Add internal tickets system
-- Creates tables for internal task/ticket management between collaborators and managers

-- Tabela de Tickets
CREATE TABLE IF NOT EXISTS tickets (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  
  -- Informações básicas
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  
  -- Responsáveis
  created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_to VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Datas
  due_date DATE,
  completed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Comentários nos Tickets
CREATE TABLE IF NOT EXISTS ticket_comments (
  id VARCHAR(255) PRIMARY KEY,
  ticket_id VARCHAR(255) NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tickets_clinic_id ON tickets(clinic_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(clinic_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(clinic_id, priority);
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);

-- Trigger para updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_tickets_updated_at'
  ) THEN
    CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

