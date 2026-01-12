-- Migration 051: Add special accounts payable access permission
-- Adds has_special_accounts_payable_access column to user_permissions table
-- This allows specific users to access accounts payable even without other permissions

DO $$
BEGIN
  -- Add has_special_accounts_payable_access column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'has_special_accounts_payable_access'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN has_special_accounts_payable_access BOOLEAN DEFAULT false;
  END IF;
END $$;

