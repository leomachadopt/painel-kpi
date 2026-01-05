-- Migration 015: Add aligners permission for collaborators
-- Adds can_edit_aligners permission column to user_permissions table

DO $$
BEGIN
  -- Add can_edit_aligners column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_permissions' AND column_name = 'can_edit_aligners'
  ) THEN
    ALTER TABLE user_permissions
      ADD COLUMN can_edit_aligners BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN user_permissions.can_edit_aligners IS 'Permission to create/edit/delete aligner entries';

