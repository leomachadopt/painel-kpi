-- Migration 035: Add missing permissions for collaborators
-- Adds permissions for Tickets, NPS, Targets, Suppliers, Marketing, and Alerts

DO $$
BEGIN
  -- Add can_view_tickets column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_view_tickets'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_tickets BOOLEAN DEFAULT false;
  END IF;

  -- Add can_edit_tickets column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_edit_tickets'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_edit_tickets BOOLEAN DEFAULT false;
  END IF;

  -- Add can_view_nps column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_view_nps'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_nps BOOLEAN DEFAULT false;
  END IF;

  -- Add can_edit_nps column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_edit_nps'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_edit_nps BOOLEAN DEFAULT false;
  END IF;

  -- Add can_view_targets column (já existe can_edit_targets, mas vamos garantir can_view_targets)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_view_targets'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_targets BOOLEAN DEFAULT false;
  END IF;

  -- Add can_view_suppliers column (já existe, mas vamos garantir)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_view_suppliers'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_suppliers BOOLEAN DEFAULT false;
  END IF;

  -- Add can_edit_suppliers column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_edit_suppliers'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_edit_suppliers BOOLEAN DEFAULT false;
  END IF;

  -- Add can_view_marketing column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_view_marketing'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_marketing BOOLEAN DEFAULT false;
  END IF;

  -- Add can_edit_marketing column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_edit_marketing'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_edit_marketing BOOLEAN DEFAULT false;
  END IF;

  -- Add can_view_alerts column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_view_alerts'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_alerts BOOLEAN DEFAULT false;
  END IF;
END $$;

