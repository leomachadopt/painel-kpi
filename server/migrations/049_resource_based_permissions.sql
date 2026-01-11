-- Migration 049: Resource-based Permissions System
-- Reorganiza permissões em recursos com ações combinadas (pares/trios)

-- ================================
-- 1. Create new resource_permissions table
-- ================================
CREATE TABLE IF NOT EXISTS resource_permissions (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  resource_id VARCHAR(100) NOT NULL,
  permission_level VARCHAR(20) DEFAULT 'DENIED' CHECK (permission_level IN ('DENIED', 'IF_RESPONSIBLE', 'ALLOWED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, clinic_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_resource_permissions_user_id ON resource_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_clinic_id ON resource_permissions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_resource_permissions_resource_id ON resource_permissions(resource_id);

-- ================================
-- 2. Create trigger for updated_at
-- ================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_resource_permissions_updated_at'
  ) THEN
    CREATE TRIGGER update_resource_permissions_updated_at
      BEFORE UPDATE ON resource_permissions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ================================
-- 3. Migration function: Convert old permissions to new format
-- ================================
CREATE OR REPLACE FUNCTION migrate_legacy_permissions_to_resources()
RETURNS void AS $$
DECLARE
  perm_record RECORD;
  res_id VARCHAR(100);
  perm_level VARCHAR(20);
BEGIN
  -- Loop through all existing user_permissions
  FOR perm_record IN 
    SELECT * FROM user_permissions
  LOOP
    -- ALINHADORES: VIEW_EDIT
    IF perm_record.can_view_report_aligners = true OR perm_record.can_edit_aligners = true THEN
      perm_level := CASE 
        WHEN perm_record.can_view_report_aligners = true AND perm_record.can_edit_aligners = true THEN 'ALLOWED'
        WHEN perm_record.can_view_report_aligners = true THEN 'ALLOWED' -- Se pode ver, permite ver
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-aligners',
        perm_record.user_id,
        perm_record.clinic_id,
        'aligners',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- FINANCEIRO: VIEW_EDIT_DELETE
    IF perm_record.can_view_dashboard_financial = true OR perm_record.can_view_report_financial = true OR perm_record.can_edit_financial = true THEN
      perm_level := CASE 
        WHEN perm_record.can_edit_financial = true THEN 'ALLOWED'
        WHEN perm_record.can_view_dashboard_financial = true OR perm_record.can_view_report_financial = true THEN 'ALLOWED'
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-financial',
        perm_record.user_id,
        perm_record.clinic_id,
        'financial',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- CONSULTAS: VIEW_EDIT_DELETE
    IF perm_record.can_view_report_consultations = true OR perm_record.can_edit_consultations = true THEN
      perm_level := CASE 
        WHEN perm_record.can_edit_consultations = true THEN 'ALLOWED'
        WHEN perm_record.can_view_report_consultations = true THEN 'ALLOWED'
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-consultations',
        perm_record.user_id,
        perm_record.clinic_id,
        'consultations',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- PACIENTES: VIEW_EDIT_DELETE
    IF perm_record.can_edit_patients = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-patients',
        perm_record.user_id,
        perm_record.clinic_id,
        'patients',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

    -- RELATÓRIOS: VIEW_EXPORT
    IF perm_record.can_view_reports = true OR 
       perm_record.can_view_report_financial = true OR 
       perm_record.can_view_report_billing = true OR
       perm_record.can_view_report_consultations = true OR
       perm_record.can_view_report_aligners = true OR
       perm_record.can_view_report_prospecting = true OR
       perm_record.can_view_report_cabinets = true OR
       perm_record.can_view_report_service_time = true OR
       perm_record.can_view_report_sources = true OR
       perm_record.can_view_report_consultation_control = true OR
       perm_record.can_view_report_marketing = true OR
       perm_record.can_view_report_advance_invoice = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-reports',
        perm_record.user_id,
        perm_record.clinic_id,
        'reports',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

    -- ADIANTAMENTOS: FULL_ACCESS
    IF perm_record.can_view_advances = true OR perm_record.can_edit_advances = true OR perm_record.can_bill_advances = true THEN
      perm_level := CASE 
        WHEN perm_record.can_bill_advances = true OR perm_record.can_edit_advances = true THEN 'ALLOWED'
        WHEN perm_record.can_view_advances = true THEN 'ALLOWED'
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-advances',
        perm_record.user_id,
        perm_record.clinic_id,
        'advances',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- METAS: VIEW_EDIT
    IF perm_record.can_view_targets = true OR perm_record.can_edit_targets = true THEN
      perm_level := CASE 
        WHEN perm_record.can_edit_targets = true THEN 'ALLOWED'
        WHEN perm_record.can_view_targets = true THEN 'ALLOWED'
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-targets',
        perm_record.user_id,
        perm_record.clinic_id,
        'targets',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- TICKETS: VIEW_EDIT
    IF perm_record.can_view_tickets = true OR perm_record.can_edit_tickets = true THEN
      perm_level := CASE 
        WHEN perm_record.can_edit_tickets = true THEN 'ALLOWED'
        WHEN perm_record.can_view_tickets = true THEN 'ALLOWED'
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-tickets',
        perm_record.user_id,
        perm_record.clinic_id,
        'tickets',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- NPS: VIEW_EDIT
    IF perm_record.can_view_nps = true OR perm_record.can_edit_nps = true THEN
      perm_level := CASE 
        WHEN perm_record.can_edit_nps = true THEN 'ALLOWED'
        WHEN perm_record.can_view_nps = true THEN 'ALLOWED'
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-nps',
        perm_record.user_id,
        perm_record.clinic_id,
        'nps',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- CONTAS A PAGAR: VIEW_EDIT_DELETE
    IF perm_record.can_view_accounts_payable = true OR perm_record.can_edit_accounts_payable = true THEN
      perm_level := CASE 
        WHEN perm_record.can_edit_accounts_payable = true THEN 'ALLOWED'
        WHEN perm_record.can_view_accounts_payable = true THEN 'ALLOWED'
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-accountsPayable',
        perm_record.user_id,
        perm_record.clinic_id,
        'accountsPayable',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- PEDIDOS: VIEW_EDIT
    IF perm_record.can_view_orders = true OR perm_record.can_edit_orders = true THEN
      perm_level := CASE 
        WHEN perm_record.can_edit_orders = true THEN 'ALLOWED'
        WHEN perm_record.can_view_orders = true THEN 'ALLOWED'
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-orders',
        perm_record.user_id,
        perm_record.clinic_id,
        'orders',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- FORNECEDORES: VIEW_EDIT
    IF perm_record.can_view_suppliers = true OR perm_record.can_edit_suppliers = true THEN
      perm_level := CASE 
        WHEN perm_record.can_edit_suppliers = true THEN 'ALLOWED'
        WHEN perm_record.can_view_suppliers = true THEN 'ALLOWED'
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-suppliers',
        perm_record.user_id,
        perm_record.clinic_id,
        'suppliers',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- MARKETING: VIEW_EDIT
    IF perm_record.can_view_marketing = true OR perm_record.can_edit_marketing = true THEN
      perm_level := CASE 
        WHEN perm_record.can_edit_marketing = true THEN 'ALLOWED'
        WHEN perm_record.can_view_marketing = true THEN 'ALLOWED'
        ELSE 'DENIED'
      END;
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-marketing',
        perm_record.user_id,
        perm_record.clinic_id,
        'marketing',
        perm_level
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = EXCLUDED.permission_level;
    END IF;

    -- DASHBOARD: VIEW_ONLY
    IF perm_record.can_view_dashboard_overview = true OR 
       perm_record.can_view_dashboard_financial = true OR 
       perm_record.can_view_dashboard_commercial = true OR
       perm_record.can_view_dashboard_operational = true OR
       perm_record.can_view_dashboard_marketing = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-dashboard',
        perm_record.user_id,
        perm_record.clinic_id,
        'dashboard',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

    -- CONFIGURAÇÕES: EDIT_ONLY
    IF perm_record.can_edit_clinic_config = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-clinicConfig',
        perm_record.user_id,
        perm_record.clinic_id,
        'clinicConfig',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

    -- ALERTAS: VIEW_ONLY
    IF perm_record.can_view_alerts = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-alerts',
        perm_record.user_id,
        perm_record.clinic_id,
        'alerts',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

    -- OPERADORAS: FULL_ACCESS
    IF perm_record.can_manage_insurance_providers = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-insuranceProviders',
        perm_record.user_id,
        perm_record.clinic_id,
        'insuranceProviders',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

    -- PROSPECÇÃO: VIEW_EDIT_DELETE
    IF perm_record.can_edit_prospecting = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-prospecting',
        perm_record.user_id,
        perm_record.clinic_id,
        'prospecting',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

    -- GABINETES: VIEW_EDIT_DELETE
    IF perm_record.can_edit_cabinets = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-cabinets',
        perm_record.user_id,
        perm_record.clinic_id,
        'cabinets',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

    -- TEMPOS: VIEW_EDIT_DELETE
    IF perm_record.can_edit_service_time = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-serviceTime',
        perm_record.user_id,
        perm_record.clinic_id,
        'serviceTime',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

    -- FONTES: VIEW_EDIT_DELETE
    IF perm_record.can_edit_sources = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-sources',
        perm_record.user_id,
        perm_record.clinic_id,
        'sources',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

    -- CONTROLE DE CONSULTAS: VIEW_EDIT_DELETE
    IF perm_record.can_edit_consultation_control = true THEN
      INSERT INTO resource_permissions (id, user_id, clinic_id, resource_id, permission_level)
      VALUES (
        'rp-' || perm_record.user_id || '-' || perm_record.clinic_id || '-consultationControl',
        perm_record.user_id,
        perm_record.clinic_id,
        'consultationControl',
        'ALLOWED'
      )
      ON CONFLICT (user_id, clinic_id, resource_id) DO UPDATE SET permission_level = 'ALLOWED';
    END IF;

  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ================================
-- 4. Execute migration
-- ================================
SELECT migrate_legacy_permissions_to_resources();

-- ================================
-- 5. Drop migration function
-- ================================
DROP FUNCTION IF EXISTS migrate_legacy_permissions_to_resources();

-- ================================
-- 6. Comments
-- ================================
COMMENT ON TABLE resource_permissions IS 'Resource-based permissions system - simplified permissions organized by resource with combined actions';
COMMENT ON COLUMN resource_permissions.resource_id IS 'Resource identifier (aligners, financial, consultations, etc.)';
COMMENT ON COLUMN resource_permissions.permission_level IS 'Permission level: DENIED, IF_RESPONSIBLE, or ALLOWED';

