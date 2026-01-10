-- ================================
-- Fix v_advance_contracts_summary view to prevent cartesian product
-- This fixes the issue where values were being doubled when multiple batches exist
-- ================================

CREATE OR REPLACE VIEW v_advance_contracts_summary AS
SELECT 
  ac.id,
  ac.clinic_id,
  ac.patient_id,
  p.code AS patient_code,
  p.name AS patient_name,
  ac.insurance_provider_id,
  ip.name AS insurance_provider_name,
  ac.contract_number,
  ac.status,
  ac.start_date,
  ac.end_date,
  -- Valor total adiantado (using subquery to avoid cartesian product)
  COALESCE((
    SELECT SUM(amount) 
    FROM advance_payments 
    WHERE contract_id = ac.id
  ), 0) AS total_advanced,
  -- Valor já faturado (lotes emitidos ou pagos) - using subquery to avoid cartesian product
  COALESCE((
    SELECT SUM(total_amount) 
    FROM billing_batches 
    WHERE contract_id = ac.id 
      AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
  ), 0) AS total_billed,
  -- Saldo a faturar
  COALESCE((
    SELECT SUM(amount) 
    FROM advance_payments 
    WHERE contract_id = ac.id
  ), 0) - COALESCE((
    SELECT SUM(total_amount) 
    FROM billing_batches 
    WHERE contract_id = ac.id 
      AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
  ), 0) AS balance_to_bill
FROM advance_contracts ac
LEFT JOIN patients p ON ac.patient_id = p.id
LEFT JOIN insurance_providers ip ON ac.insurance_provider_id = ip.id;

