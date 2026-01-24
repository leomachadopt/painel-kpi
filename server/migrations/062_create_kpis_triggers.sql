-- Migration: Criar triggers para atualização automática de KPIs cache
-- Objetivo: Manter cache atualizado automaticamente quando dados mudam

-- ============================================================
-- FUNÇÃO: Recalcular KPIs diários
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_daily_kpis(
  p_clinic_id TEXT,
  p_date DATE
) RETURNS VOID AS $$
DECLARE
  v_id TEXT;
  v_total_revenue DECIMAL(10, 2);
  v_total_consultations INTEGER;
  v_plans_presented INTEGER;
  v_plans_accepted INTEGER;
  v_acceptance_rate DECIMAL(5, 2);
  v_total_leads INTEGER;
  v_aligners_started INTEGER;
  v_avg_wait_time INTEGER;
BEGIN
  v_id := p_clinic_id || '-' || p_date;

  -- Calcular receita total do dia
  SELECT COALESCE(SUM(value), 0)
  INTO v_total_revenue
  FROM daily_financial_entries
  WHERE clinic_id = p_clinic_id
    AND entry_date = p_date
    AND deleted_at IS NULL;

  -- Calcular total de consultas
  SELECT COALESCE(COUNT(*), 0)
  INTO v_total_consultations
  FROM daily_consultation_entries
  WHERE clinic_id = p_clinic_id
    AND entry_date = p_date
    AND deleted_at IS NULL;

  -- Calcular planos apresentados e aceitos
  SELECT
    COALESCE(SUM(CASE WHEN status = 'PRESENTED' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END), 0)
  INTO v_plans_presented, v_plans_accepted
  FROM daily_consultation_entries
  WHERE clinic_id = p_clinic_id
    AND entry_date = p_date
    AND deleted_at IS NULL;

  -- Calcular taxa de aceite
  IF v_plans_presented > 0 THEN
    v_acceptance_rate := (v_plans_accepted::DECIMAL / v_plans_presented) * 100;
  ELSE
    v_acceptance_rate := 0;
  END IF;

  -- Calcular total de leads
  SELECT COALESCE(SUM(quantity), 0)
  INTO v_total_leads
  FROM daily_prospecting_entries
  WHERE clinic_id = p_clinic_id
    AND entry_date = p_date
    AND deleted_at IS NULL;

  -- Calcular alinhadores iniciados
  SELECT COALESCE(COUNT(*), 0)
  INTO v_aligners_started
  FROM daily_aligner_entries
  WHERE clinic_id = p_clinic_id
    AND start_date = p_date
    AND deleted_at IS NULL;

  -- Calcular tempo médio de espera
  SELECT COALESCE(AVG(wait_time), 0)
  INTO v_avg_wait_time
  FROM daily_service_time_entries
  WHERE clinic_id = p_clinic_id
    AND entry_date = p_date
    AND deleted_at IS NULL;

  -- Inserir ou atualizar cache
  INSERT INTO daily_kpis_cache (
    id, clinic_id, date,
    total_revenue, total_consultations,
    plans_presented, plans_accepted, acceptance_rate,
    total_leads, aligners_started, avg_wait_time,
    last_calculated_at, updated_at
  ) VALUES (
    v_id, p_clinic_id, p_date,
    v_total_revenue, v_total_consultations,
    v_plans_presented, v_plans_accepted, v_acceptance_rate,
    v_total_leads, v_aligners_started, v_avg_wait_time,
    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  )
  ON CONFLICT (clinic_id, date) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    total_consultations = EXCLUDED.total_consultations,
    plans_presented = EXCLUDED.plans_presented,
    plans_accepted = EXCLUDED.plans_accepted,
    acceptance_rate = EXCLUDED.acceptance_rate,
    total_leads = EXCLUDED.total_leads,
    aligners_started = EXCLUDED.aligners_started,
    avg_wait_time = EXCLUDED.avg_wait_time,
    last_calculated_at = CURRENT_TIMESTAMP,
    updated_at = CURRENT_TIMESTAMP;

END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGERS: Atualizar cache quando dados mudam
-- ============================================================

-- Trigger para daily_financial_entries
CREATE OR REPLACE FUNCTION trigger_update_daily_kpis_financial()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_daily_kpis(OLD.clinic_id, OLD.entry_date);
    RETURN OLD;
  ELSE
    PERFORM recalculate_daily_kpis(NEW.clinic_id, NEW.entry_date);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_kpis_on_financial ON daily_financial_entries;
CREATE TRIGGER trg_update_kpis_on_financial
  AFTER INSERT OR UPDATE OR DELETE ON daily_financial_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_kpis_financial();

-- Trigger para daily_consultation_entries
CREATE OR REPLACE FUNCTION trigger_update_daily_kpis_consultation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_daily_kpis(OLD.clinic_id, OLD.entry_date);
    RETURN OLD;
  ELSE
    PERFORM recalculate_daily_kpis(NEW.clinic_id, NEW.entry_date);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_kpis_on_consultation ON daily_consultation_entries;
CREATE TRIGGER trg_update_kpis_on_consultation
  AFTER INSERT OR UPDATE OR DELETE ON daily_consultation_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_kpis_consultation();

-- Trigger para daily_prospecting_entries
CREATE OR REPLACE FUNCTION trigger_update_daily_kpis_prospecting()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_daily_kpis(OLD.clinic_id, OLD.entry_date);
    RETURN OLD;
  ELSE
    PERFORM recalculate_daily_kpis(NEW.clinic_id, NEW.entry_date);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_kpis_on_prospecting ON daily_prospecting_entries;
CREATE TRIGGER trg_update_kpis_on_prospecting
  AFTER INSERT OR UPDATE OR DELETE ON daily_prospecting_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_kpis_prospecting();

-- Trigger para daily_aligner_entries
CREATE OR REPLACE FUNCTION trigger_update_daily_kpis_aligner()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_daily_kpis(OLD.clinic_id, OLD.start_date);
    RETURN OLD;
  ELSE
    PERFORM recalculate_daily_kpis(NEW.clinic_id, NEW.start_date);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_kpis_on_aligner ON daily_aligner_entries;
CREATE TRIGGER trg_update_kpis_on_aligner
  AFTER INSERT OR UPDATE OR DELETE ON daily_aligner_entries
  FOR EACH ROW EXECUTE FUNCTION trigger_update_daily_kpis_aligner();

-- Comentários
COMMENT ON FUNCTION recalculate_daily_kpis IS 'Recalcula KPIs diários para uma clínica e data específicas';
COMMENT ON FUNCTION trigger_update_daily_kpis_financial IS 'Trigger para atualizar KPIs quando entries financeiros mudam';
COMMENT ON FUNCTION trigger_update_daily_kpis_consultation IS 'Trigger para atualizar KPIs quando consultas mudam';
COMMENT ON FUNCTION trigger_update_daily_kpis_prospecting IS 'Trigger para atualizar KPIs quando prospecção muda';
COMMENT ON FUNCTION trigger_update_daily_kpis_aligner IS 'Trigger para atualizar KPIs quando alinhadores mudam';
