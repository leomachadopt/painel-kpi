-- Migration 067: Add permission to view all doctors consultations
-- Adiciona permissão para visualizar relatórios de 1ª consulta de todos os profissionais

-- Add column to user_permissions table
ALTER TABLE user_permissions
ADD COLUMN IF NOT EXISTS can_view_all_doctors_consultations BOOLEAN DEFAULT FALSE;

-- Comment on the column
COMMENT ON COLUMN user_permissions.can_view_all_doctors_consultations IS 'Permite visualizar relatórios de 1ª consulta de todos os profissionais, não apenas dos que o usuário é responsável';
