-- Migration 090: Triggers para transições automáticas de estado
-- Gerencia o fluxo: Aguardando Início → Em Execução → Finalizado

-- ============================================================
-- TRIGGER 1: Atualizar métricas e transições automáticas
-- ============================================================
CREATE OR REPLACE FUNCTION update_plan_metrics()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_completed INTEGER;
  v_total_value DECIMAL(12,2);
  v_entry_id VARCHAR(255);
  v_was_in_execution BOOLEAN;
  v_was_finished BOOLEAN;
BEGIN
  -- Determina o ID da consulta (INSERT/UPDATE vs DELETE)
  IF TG_OP = 'DELETE' THEN
    v_entry_id := OLD.consultation_entry_id;
  ELSE
    v_entry_id := NEW.consultation_entry_id;
  END IF;

  -- Busca estado atual antes de atualizar
  SELECT in_execution, plan_finished
  INTO v_was_in_execution, v_was_finished
  FROM daily_consultation_entries
  WHERE id = v_entry_id;

  -- Calcula métricas atualizadas
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE completed = true),
    COALESCE(SUM(price_at_creation), 0)
  INTO v_total, v_completed, v_total_value
  FROM plan_procedures
  WHERE consultation_entry_id = v_entry_id;

  -- Atualiza métricas na consulta
  UPDATE daily_consultation_entries
  SET
    plan_procedures_total = v_total,
    plan_procedures_completed = v_completed,
    plan_total_value = v_total_value
  WHERE id = v_entry_id;

  -- TRANSIÇÃO AUTOMÁTICA 1: Aguardando Início → Em Execução
  -- (quando primeiro procedimento é marcado como completo)
  IF v_completed > 0 AND NOT v_was_in_execution THEN
    UPDATE daily_consultation_entries
    SET
      in_execution = true,
      in_execution_at = NOW(),
      waiting_start = false
    WHERE id = v_entry_id
      AND abandoned = false;
  END IF;

  -- TRANSIÇÃO AUTOMÁTICA 2: Em Execução → Finalizado
  -- (quando todos os procedimentos estão completos)
  IF v_completed = v_total AND v_total > 0 AND NOT v_was_finished THEN
    UPDATE daily_consultation_entries
    SET
      plan_finished = true,
      plan_finished_at = NOW(),
      in_execution = false
    WHERE id = v_entry_id
      AND abandoned = false;
  END IF;

  -- RETROCESSO: Se estava finalizado mas deletaram procedimento completo
  IF v_completed < v_total AND v_was_finished THEN
    UPDATE daily_consultation_entries
    SET
      plan_finished = false,
      plan_finished_at = NULL,
      in_execution = true
    WHERE id = v_entry_id
      AND abandoned = false;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger que dispara após qualquer mudança em plan_procedures
CREATE TRIGGER trg_update_plan_metrics
AFTER INSERT OR UPDATE OR DELETE ON plan_procedures
FOR EACH ROW EXECUTE FUNCTION update_plan_metrics();

-- ============================================================
-- TRIGGER 2: Transição automática ao apresentar plano
-- ============================================================
CREATE OR REPLACE FUNCTION auto_start_waiting()
RETURNS TRIGGER AS $$
BEGIN
  -- Se plan_presented mudou para true E tem procedimentos cadastrados
  IF NEW.plan_presented = true
     AND (OLD.plan_presented = false OR OLD.plan_presented IS NULL)
     AND NEW.plan_procedures_total > 0
     AND NEW.abandoned = false THEN

    NEW.waiting_start := true;
    NEW.waiting_start_at := NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger que dispara antes de UPDATE em daily_consultation_entries
CREATE TRIGGER trg_auto_start_waiting
BEFORE UPDATE ON daily_consultation_entries
FOR EACH ROW EXECUTE FUNCTION auto_start_waiting();

-- ============================================================
-- TRIGGER 3: Atualizar timestamp de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_plan_procedure_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_plan_procedure_timestamp
BEFORE UPDATE ON plan_procedures
FOR EACH ROW EXECUTE FUNCTION update_plan_procedure_timestamp();
