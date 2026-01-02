-- Migration 004: Add Collaborators and Permissions System
-- Adds support for collaborators with granular permissions

-- ================================
-- 1. Update users table to support COLABORADOR role
-- ================================
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check'
  ) THEN
    ALTER TABLE users DROP CONSTRAINT users_role_check;
  END IF;

  -- Add new constraint with COLABORADOR role
  ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('MENTOR', 'GESTOR_CLINICA', 'COLABORADOR'));
END $$;

-- Add active status to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'active'
  ) THEN
    ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT true;
  END IF;
END $$;

-- ================================
-- 2. Create user_permissions table
-- ================================
CREATE TABLE IF NOT EXISTS user_permissions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Permissions for VIEWING Dashboard sections
  can_view_dashboard_overview BOOLEAN DEFAULT false,
  can_view_dashboard_financial BOOLEAN DEFAULT false,
  can_view_dashboard_commercial BOOLEAN DEFAULT false,
  can_view_dashboard_operational BOOLEAN DEFAULT false,
  can_view_dashboard_marketing BOOLEAN DEFAULT false,
  can_view_reports BOOLEAN DEFAULT false,
  can_view_targets BOOLEAN DEFAULT false,

  -- Permissions for EDITING Data
  can_edit_financial BOOLEAN DEFAULT false,
  can_edit_consultations BOOLEAN DEFAULT false,
  can_edit_prospecting BOOLEAN DEFAULT false,
  can_edit_cabinets BOOLEAN DEFAULT false,
  can_edit_service_time BOOLEAN DEFAULT false,
  can_edit_sources BOOLEAN DEFAULT false,
  can_edit_patients BOOLEAN DEFAULT false,
  can_edit_clinic_config BOOLEAN DEFAULT false,
  can_edit_targets BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, clinic_id)
);

-- Index for fast permission lookups
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_clinic_id ON user_permissions(clinic_id);

-- ================================
-- 3. Create audit_logs table
-- ================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
  clinic_id VARCHAR(255) REFERENCES clinics(id) ON DELETE CASCADE,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255),
  details JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit logs queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_clinic_id ON audit_logs(clinic_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource, resource_id);

-- ================================
-- 4. Trigger for user_permissions updated_at
-- ================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_permissions_updated_at'
  ) THEN
    CREATE TRIGGER update_user_permissions_updated_at
      BEFORE UPDATE ON user_permissions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ================================
-- 5. Comments for documentation
-- ================================
COMMENT ON TABLE user_permissions IS 'Stores granular permissions for collaborator users';
COMMENT ON TABLE audit_logs IS 'Audit trail for all user actions in the system';
COMMENT ON COLUMN user_permissions.can_view_dashboard_overview IS 'Permission to view general dashboard overview';
COMMENT ON COLUMN user_permissions.can_view_dashboard_financial IS 'Permission to view financial dashboard section';
COMMENT ON COLUMN user_permissions.can_view_dashboard_commercial IS 'Permission to view commercial/sales dashboard section';
COMMENT ON COLUMN user_permissions.can_view_dashboard_operational IS 'Permission to view operational dashboard section';
COMMENT ON COLUMN user_permissions.can_view_dashboard_marketing IS 'Permission to view marketing dashboard section';
COMMENT ON COLUMN user_permissions.can_view_reports IS 'Permission to view and generate reports';
COMMENT ON COLUMN user_permissions.can_view_targets IS 'Permission to view monthly targets';
COMMENT ON COLUMN user_permissions.can_edit_financial IS 'Permission to create/edit/delete financial entries';
COMMENT ON COLUMN user_permissions.can_edit_consultations IS 'Permission to create/edit/delete consultation entries';
COMMENT ON COLUMN user_permissions.can_edit_prospecting IS 'Permission to create/edit/delete prospecting entries';
COMMENT ON COLUMN user_permissions.can_edit_cabinets IS 'Permission to create/edit/delete cabinet usage entries';
COMMENT ON COLUMN user_permissions.can_edit_service_time IS 'Permission to create/edit/delete service time entries';
COMMENT ON COLUMN user_permissions.can_edit_sources IS 'Permission to create/edit/delete source entries';
COMMENT ON COLUMN user_permissions.can_edit_patients IS 'Permission to create/edit/delete patient records';
COMMENT ON COLUMN user_permissions.can_edit_clinic_config IS 'Permission to edit clinic configuration';
COMMENT ON COLUMN user_permissions.can_edit_targets IS 'Permission to edit monthly targets';
