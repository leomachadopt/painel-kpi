-- Migration 020: Add canEditOrders permission
-- Adds permission for editing orders

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_permissions') THEN
    -- Add can_edit_orders
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'user_permissions' AND column_name = 'can_edit_orders'
    ) THEN
      ALTER TABLE user_permissions
        ADD COLUMN can_edit_orders BOOLEAN DEFAULT false;
    END IF;
  END IF;
END $$;








