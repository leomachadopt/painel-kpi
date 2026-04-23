-- Migration 119: Add Petty Cash (Caixa do Dia) permissions

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_view_petty_cash'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_view_petty_cash BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_edit_petty_cash'
  ) THEN
    ALTER TABLE user_permissions ADD COLUMN can_edit_petty_cash BOOLEAN DEFAULT false;
  END IF;
END $$;
