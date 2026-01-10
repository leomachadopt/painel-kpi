-- Migration 023: Add view permissions for orders and suppliers
-- Adds can_view_orders and can_view_suppliers permissions

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_permissions') THEN
    -- Add can_view_orders
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_orders'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_orders BOOLEAN DEFAULT false;
    END IF;

    -- Add can_view_suppliers
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_view_suppliers'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_view_suppliers BOOLEAN DEFAULT false;
    END IF;
  END IF;
END $$;






