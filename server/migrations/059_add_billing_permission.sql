-- Migration 059: Add Billing Permission
-- Adds permission for daily billing entries in the diary

-- Add can_edit_billing column to user_permissions table
ALTER TABLE user_permissions
ADD COLUMN IF NOT EXISTS can_edit_billing BOOLEAN DEFAULT false;

-- Add can_view_report_billing column to user_permissions table (if not exists)
-- This should already exist, but adding for safety
ALTER TABLE user_permissions
ADD COLUMN IF NOT EXISTS can_view_report_billing BOOLEAN DEFAULT false;

-- Grant billing permission to all GESTOR_CLINICA users by default
-- (This is handled in the application layer, not at DB level)
