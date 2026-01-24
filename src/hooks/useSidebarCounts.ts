import { useQuery } from '@tanstack/react-query'
import api, { SidebarCounts } from '@/services/api'

/**
 * Hook para buscar contadores do sidebar com React Query
 *
 * Benefícios:
 * - Cache automático (5 min staleTime)
 * - Deduplica requests idênticos
 * - Refetch automático a cada 60s (substituindo setInterval manual)
 * - Retry automático em caso de erro
 *
 * @param clinicId - ID da clínica
 * @param enabled - Se a query deve rodar (default: true)
 * @returns Query result com data, isLoading, error, etc.
 */
export function useSidebarCounts(clinicId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['sidebar-counts', clinicId],
    queryFn: () => api.sidebar.getCounts(clinicId!),
    enabled: enabled && !!clinicId,
    // Refetch a cada 60 segundos (substituindo setInterval)
    refetchInterval: 60 * 1000, // 60s
    // Dados ficam fresh por 60 segundos
    staleTime: 60 * 1000,
  })
}
