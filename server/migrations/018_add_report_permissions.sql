-- Migration 018: Add granular report view permissions
-- Adds individual permissions for each report tab

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_permissions') THEN
    -- Add can_view_report_financial
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_financial'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_report_financial BOOLEAN DEFAULT false;
    END IF;

    -- Add can_view_report_billing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_billing'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_report_billing BOOLEAN DEFAULT false;
    END IF;

    -- Add can_view_report_consultations
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_consultations'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_report_consultations BOOLEAN DEFAULT false;
    END IF;

    -- Add can_view_report_aligners
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_aligners'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_report_aligners BOOLEAN DEFAULT false;
    END IF;

    -- Add can_view_report_prospecting
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_prospecting'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_report_prospecting BOOLEAN DEFAULT false;
    END IF;

    -- Add can_view_report_cabinets
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_cabinets'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_report_cabinets BOOLEAN DEFAULT false;
    END IF;

    -- Add can_view_report_service_time
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_service_time'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_report_service_time BOOLEAN DEFAULT false;
    END IF;

    -- Add can_view_report_sources
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_sources'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_report_sources BOOLEAN DEFAULT false;
    END IF;

    -- Add can_view_report_consultation_control
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_consultation_control'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_report_consultation_control BOOLEAN DEFAULT false;
    END IF;

    -- Add can_view_report_marketing
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_report_marketing'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_report_marketing BOOLEAN DEFAULT false;
    END IF;
  END IF;
END $$;






