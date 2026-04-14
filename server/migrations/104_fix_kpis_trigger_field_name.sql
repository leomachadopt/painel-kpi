-- Migration 093: Fix KPIs trigger field name
-- Fix trigger to use 'date' instead of 'entry_date' for daily_financial_entries

-- Trigger para daily_financial_entries
CREATE OR REPLACE FUNCTION trigger_update_daily_kpis_financial()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_daily_kpis(OLD.clinic_id, OLD.date);
    RETURN OLD;
  ELSE
    PERFORM recalculate_daily_kpis(NEW.clinic_id, NEW.date);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION trigger_update_daily_kpis_financial IS 'Trigger para atualizar KPIs quando entries financeiros mudam';
