-- Migration 022: Add total field to orders
-- Adds total field to daily_order_entries table to store calculated order total

ALTER TABLE daily_order_entries 
ADD COLUMN IF NOT EXISTS total DECIMAL(10, 2) DEFAULT 0;

-- Update existing orders with calculated total
DO $$
DECLARE
  order_record RECORD;
  calculated_total DECIMAL(10, 2);
BEGIN
  FOR order_record IN SELECT id FROM daily_order_entries LOOP
    SELECT COALESCE(SUM(quantity * COALESCE(unit_price, 0)), 0)
    INTO calculated_total
    FROM order_item_entries
    WHERE order_id = order_record.id;
    
    UPDATE daily_order_entries
    SET total = calculated_total
    WHERE id = order_record.id;
  END LOOP;
END $$;




