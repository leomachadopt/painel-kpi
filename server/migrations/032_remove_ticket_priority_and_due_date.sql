-- Migration 032: Remove priority and due_date fields from tickets
-- Simplifies ticket system by removing priority and due date fields

-- Remove index on priority (if exists)
DROP INDEX IF EXISTS idx_tickets_priority;

-- Remove priority column
ALTER TABLE tickets DROP COLUMN IF EXISTS priority;

-- Remove due_date column
ALTER TABLE tickets DROP COLUMN IF EXISTS due_date;

