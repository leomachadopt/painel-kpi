-- Migration 034: Add accounts payable permissions
-- Adds can_edit_accounts_payable and can_view_accounts_payable columns to user_permissions table

DO $$
BEGIN
  -- Add can_edit_accounts_payable column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_edit_accounts_payable'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_edit_accounts_payable BOOLEAN DEFAULT false;
  END IF;

  -- Add can_view_accounts_payable column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_view_accounts_payable'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_accounts_payable BOOLEAN DEFAULT false;
  END IF;
END $$;






