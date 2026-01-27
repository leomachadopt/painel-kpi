-- Script de debug para verificar lotes de faturação
-- Execute este script no banco de dados para diagnosticar o problema

-- 1. Verificar se existem lotes
SELECT
  COUNT(*) as total_lotes,
  COUNT(CASE WHEN status = 'ISSUED' THEN 1 END) as issued,
  COUNT(CASE WHEN status = 'PAID' THEN 1 END) as paid,
  COUNT(CASE WHEN status = 'PARTIALLY_PAID' THEN 1 END) as partially_paid,
  COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draft
FROM billing_batches;

-- 2. Ver todos os lotes com detalhes
SELECT
  bb.id,
  bb.batch_number,
  bb.status,
  bb.issued_at,
  bb.total_amount,
  ac.patient_id,
  p.name as patient_name,
  ac.clinic_id
FROM billing_batches bb
INNER JOIN advance_contracts ac ON bb.contract_id = ac.id
INNER JOIN patients p ON ac.patient_id = p.id
ORDER BY bb.created_at DESC
LIMIT 20;

-- 3. Verificar se os campos de terceiros existem na tabela
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'advance_contracts'
  AND column_name IN ('billed_to_third_party', 'third_party_code', 'third_party_name');

-- 4. Ver lotes com status ISSUED/PAID/PARTIALLY_PAID
SELECT
  bb.id,
  bb.batch_number,
  bb.status,
  bb.issued_at,
  bb.total_amount,
  p.name as patient_name
FROM billing_batches bb
INNER JOIN advance_contracts ac ON bb.contract_id = ac.id
INNER JOIN patients p ON ac.patient_id = p.id
WHERE bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
ORDER BY bb.issued_at DESC;
