-- Script para debug de dependentes em lotes

-- 1. Ver todos os itens de lote com dependentes
SELECT
  bb.batch_number,
  bb.status,
  bi.id as item_id,
  bi.dependent_id,
  cd.name as dependent_name,
  p.name as patient_name,
  bi.procedure_description,
  bi.total_value
FROM billing_batches bb
INNER JOIN advance_contracts ac ON bb.contract_id = ac.id
INNER JOIN patients p ON ac.patient_id = p.id
LEFT JOIN billing_items bi ON bb.id = bi.batch_id AND bi.status != 'REMOVED'
LEFT JOIN contract_dependents cd ON bi.dependent_id = cd.id
WHERE bi.dependent_id IS NOT NULL
  AND bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
ORDER BY bb.created_at DESC
LIMIT 20;

-- 2. Ver dependentes do contrato
SELECT
  ac.id as contract_id,
  p.name as titular_name,
  cd.id as dependent_id,
  cd.name as dependent_name,
  cd.relationship,
  cd.age
FROM advance_contracts ac
INNER JOIN patients p ON ac.patient_id = p.id
LEFT JOIN contract_dependents cd ON ac.id = cd.contract_id
WHERE cd.id IS NOT NULL
ORDER BY ac.created_at DESC
LIMIT 20;

-- 3. Ver o último lote criado com seus itens
SELECT
  bb.id as batch_id,
  bb.batch_number,
  bb.status,
  bi.dependent_id,
  cd.name as dependent_name,
  bi.procedure_description,
  bi.total_value
FROM billing_batches bb
LEFT JOIN billing_items bi ON bb.id = bi.batch_id
LEFT JOIN contract_dependents cd ON bi.dependent_id = cd.id
ORDER BY bb.created_at DESC
LIMIT 1;
