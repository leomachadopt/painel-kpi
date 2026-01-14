-- Migration 037: Add advances system permissions
-- Adds permissions for viewing, editing, billing advances and managing insurance providers

DO $$
BEGIN
  -- Add can_view_advances column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_view_advances'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_advances BOOLEAN DEFAULT false;
  END IF;

  -- Add can_edit_advances column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_edit_advances'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_edit_advances BOOLEAN DEFAULT false;
  END IF;

  -- Add can_bill_advances column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_bill_advances'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_bill_advances BOOLEAN DEFAULT false;
  END IF;

  -- Add can_manage_insurance_providers column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_manage_insurance_providers'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_manage_insurance_providers BOOLEAN DEFAULT false;
  END IF;
END $$;





