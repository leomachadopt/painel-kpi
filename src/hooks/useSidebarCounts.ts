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
    // Não retry em 404 - usuário pode não ter permissão
    retry: (failureCount, error: any) => {
      // Não retry se for 404 ou "not found"
      if (error?.status === 404 || error?.message?.includes('not found')) {
        return false
      }
      // Retry outras falhas até 3 vezes
      return failureCount < 3
    },
    // Suprimir log de erro para 404 (permissão negada é esperado)
    meta: {
      errorHandler: (error: any) => {
        if (error?.status === 404 || error?.message?.includes('not found')) {
          // Silenciar 404 - usuário pode não ter permissão para ver contadores
          return
        }
        console.error('Error fetching sidebar counts:', error)
      }
    }
  })
}
