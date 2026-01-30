-- Fix cabinet usage hours to support decimal values (e.g., 2.5 hours)
ALTER TABLE daily_cabinet_usage_entries
  ALTER COLUMN hours_available TYPE DECIMAL(10, 2),
  ALTER COLUMN hours_used TYPE DECIMAL(10, 2);
