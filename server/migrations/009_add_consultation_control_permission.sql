-- Add can_edit_consultation_control permission column to user_permissions table

ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS can_edit_consultation_control BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_permissions.can_edit_consultation_control IS 'Permission to create/edit/delete consultation control entries';


