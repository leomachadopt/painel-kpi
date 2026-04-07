-- Migration 080: Add appointments permissions to user_permissions table

ALTER TABLE user_permissions
  ADD COLUMN IF NOT EXISTS can_view_appointments BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_edit_appointments BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_permissions.can_view_appointments IS
  'Permite visualizar a agenda clínica';
COMMENT ON COLUMN user_permissions.can_edit_appointments IS
  'Permite criar e editar agendamentos';
