import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

/**
 * Hook para buscar metas mensais de uma clínica
 *
 * Benefícios:
 * - Cache agressivo (metas mensais mudam raramente)
 * - Combina com Cache-Control HTTP (1 hora)
 * - Deduplica requests
 *
 * @param clinicId - ID da clínica
 * @param year - Ano
 * @param month - Mês (1-12)
 * @param enabled - Se a query deve rodar (default: true)
 * @returns Query result com data, isLoading, error, etc.
 */
export function useMonthlyTargets(
  clinicId: string | undefined,
  year: number,
  month: number,
  enabled = true
) {
  return useQuery({
    queryKey: ['targets', clinicId, year, month],
    queryFn: () => api.targets.get(clinicId!, year, month),
    enabled: enabled && !!clinicId,
    // Cache por 30 minutos (metas mensais mudam raramente)
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    // Não refetch em caso de erro 404 (metas podem não existir)
    retry: false,
  })
}

/**
 * Hook para buscar todas as metas de uma clínica
 *
 * @param clinicId - ID da clínica
 * @param enabled - Se a query deve rodar (default: true)
 * @returns Query result com data, isLoading, error, etc.
 */
export function useAllTargets(clinicId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['targets', clinicId, 'all'],
    queryFn: () => api.targets.getAll(clinicId!),
    enabled: enabled && !!clinicId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
}
