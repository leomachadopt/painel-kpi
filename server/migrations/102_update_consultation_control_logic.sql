-- Migration 102: Update consultation control metrics logic
-- Esta migração documenta as mudanças na lógica de contabilização
-- das métricas de controle de consultas (não altera estrutura do banco)

-- ============================================================================
-- RESUMO DAS MUDANÇAS
-- ============================================================================
--
-- A tabela daily_consultation_control_entries já existe (criada na migration 008)
-- Esta migration documenta apenas as mudanças de LÓGICA implementadas:
--
-- 1. NO_SHOW (Não Comparecimento) - AUTOMÁTICO
--    ANTES: Incrementado manualmente via updateMetricsOnStatusChange
--    AGORA: Job automático diário às 23:59
--           - Busca appointments com status IN ('scheduled', 'confirmed')
--           - SEM actual_arrival (paciente NÃO marcou "Paciente chegou?")
--           - Marca status = 'no_show' automaticamente
--           - Incrementa no_show na tabela
--    ARQUIVO: server/noShowChecker.ts + server/noShowScheduler.ts
--
-- 2. RESCHEDULED (Remarcação) - JÁ FUNCIONAVA
--    - Botão "Remarcar Consulta" envia para pending_reschedules
--    - Marca status = 'rescheduled'
--    - Incrementa rescheduled via updateMetricsOnStatusChange
--    - Nenhuma mudança necessária
--
-- 3. CANCELLED (Cancelamento) - NOVO
--    ANTES: Botão "Excluir" apenas deletava do banco
--    AGORA: Antes de deletar, incrementa cancelled na tabela
--    ARQUIVO: server/routes/appointments.ts (DELETE endpoint)
--
-- 4. OLD_PATIENT_BOOKING (Marcações Paciente Antigo) - NOVO
--    ANTES: Incrementado ao CONCLUIR consulta (status=completed && is_new_patient=false)
--    AGORA: Incrementado ao CRIAR agendamento (novo checkbox "Retorno paciente antigo")
--           - Checkbox adicionado no modal de criação
--           - Localização: Abaixo de "Remarcação (do banco)"
--           - Ao criar appointment com isOldPatientReturn=true, incrementa métrica
--    ARQUIVO: src/pages/Agenda.tsx + server/routes/appointments.ts (POST endpoint)
--
-- ============================================================================
-- VALIDAÇÃO
-- ============================================================================

-- Verificar que a tabela existe e tem a estrutura correta
DO $$
BEGIN
  -- Check table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'daily_consultation_control_entries'
  ) THEN
    RAISE EXCEPTION 'Table daily_consultation_control_entries does not exist';
  END IF;

  -- Check required columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_consultation_control_entries'
      AND column_name = 'no_show'
  ) THEN
    RAISE EXCEPTION 'Column no_show does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_consultation_control_entries'
      AND column_name = 'rescheduled'
  ) THEN
    RAISE EXCEPTION 'Column rescheduled does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_consultation_control_entries'
      AND column_name = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Column cancelled does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_consultation_control_entries'
      AND column_name = 'old_patient_booking'
  ) THEN
    RAISE EXCEPTION 'Column old_patient_booking does not exist';
  END IF;

  RAISE NOTICE '✅ All consultation control columns validated successfully';
END $$;

-- ============================================================================
-- COMENTÁRIOS ATUALIZADOS
-- ============================================================================

COMMENT ON COLUMN daily_consultation_control_entries.no_show IS
  'Não comparecimento - Incrementado automaticamente às 23:59 para consultas sem actual_arrival';

COMMENT ON COLUMN daily_consultation_control_entries.rescheduled IS
  'Remarcação - Incrementado ao clicar "Remarcar Consulta" (vai para banco de remarcações)';

COMMENT ON COLUMN daily_consultation_control_entries.cancelled IS
  'Cancelamento - Incrementado ao clicar "Excluir" consulta (antes de deletar do banco)';

COMMENT ON COLUMN daily_consultation_control_entries.old_patient_booking IS
  'Marcações de paciente antigo - Incrementado ao criar agendamento com checkbox "Retorno paciente antigo" marcado';

-- ============================================================================
-- CONFIGURAÇÃO DO SCHEDULER
-- ============================================================================

-- O job de no_show é configurado via variáveis de ambiente:
-- NO_SHOW_CHECKER_ENABLED=true (default)
-- NO_SHOW_CHECKER_HOUR=23 (default)
-- NO_SHOW_CHECKER_MINUTES=59 (default)

-- Para desabilitar o job automático:
-- NO_SHOW_CHECKER_ENABLED=false

-- ============================================================================
-- MIGRATION COMPLETA
-- ============================================================================

-- Esta migration serve apenas como documentação das mudanças de lógica
-- Nenhuma alteração de schema foi necessária
