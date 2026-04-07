-- Migration 092: Resynchronize pending_treatments with plan_procedures completion state
-- This fixes any existing data where pending_quantity is out of sync

-- Atualizar pending_treatments baseado no estado atual de plan_procedures
UPDATE pending_treatments pt
SET
  pending_quantity = pt.total_quantity - COALESCE((
    SELECT COUNT(*)
    FROM plan_procedures pp
    WHERE pp.pending_treatment_id = pt.id
      AND pp.completed = true
  ), 0),
  status = CASE
    WHEN pt.total_quantity - COALESCE((
      SELECT COUNT(*)
      FROM plan_procedures pp
      WHERE pp.pending_treatment_id = pt.id
        AND pp.completed = true
    ), 0) = 0 THEN 'CONCLUIDO'
    WHEN pt.total_quantity - COALESCE((
      SELECT COUNT(*)
      FROM plan_procedures pp
      WHERE pp.pending_treatment_id = pt.id
        AND pp.completed = true
    ), 0) < pt.total_quantity THEN 'PARCIAL'
    ELSE 'PENDENTE'
  END
WHERE EXISTS (
  SELECT 1
  FROM plan_procedures pp
  WHERE pp.pending_treatment_id = pt.id
);

-- Log para debug
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Resynchronized % pending_treatments records', updated_count;
END $$;
