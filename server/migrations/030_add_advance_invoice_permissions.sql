-- Migration 030: Add advance invoice permissions
-- Adds can_edit_advance_invoice and can_view_report_advance_invoice columns to user_permissions table

DO $$
BEGIN
  -- Add can_edit_advance_invoice column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_edit_advance_invoice'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_edit_advance_invoice BOOLEAN DEFAULT false;
  END IF;

  -- Add can_view_report_advance_invoice column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_advance_invoice'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_report_advance_invoice BOOLEAN DEFAULT false;
  END IF;
END $$;




