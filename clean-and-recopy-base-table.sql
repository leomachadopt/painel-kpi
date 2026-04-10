-- Script para limpar procedimentos da tabela base e permitir recópia
-- Execute este script no banco de dados da clínica que tem valores incorretos

-- ATENÇÃO: Isso vai deletar TODOS os procedimentos da tabela base desta clínica
-- Execute apenas se tiver certeza que quer limpar e recopiar

-- Substituir 'SEU_CLINIC_ID' pelo ID real da clínica
-- Exemplo: clinic-1234567890

BEGIN;

-- Verificar quantos procedimentos serão deletados
SELECT 
  COUNT(*) as total_procedimentos,
  COUNT(CASE WHEN default_value IS NOT NULL THEN 1 END) as com_valores,
  COUNT(CASE WHEN default_value IS NULL THEN 1 END) as sem_valores
FROM procedure_base_table 
WHERE clinic_id = 'SEU_CLINIC_ID';

-- Se estiver OK com os números acima, descomente as linhas abaixo:

-- DELETE FROM procedure_base_table 
-- WHERE clinic_id = 'SEU_CLINIC_ID' 
--   AND is_custom = false;  -- Deleta apenas os copiados, mantém customizados

-- COMMIT;

ROLLBACK; -- Remover esta linha quando quiser executar de verdade
