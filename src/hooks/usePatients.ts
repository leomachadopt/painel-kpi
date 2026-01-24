import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'
import { useDebouncedValue } from './useDebouncedValue'

/**
 * Hook para buscar pacientes com React Query e debounce integrado
 *
 * Benefícios:
 * - Cache automático (5 min staleTime)
 * - Debounce de 500ms no searchTerm
 * - Deduplica requests idênticos
 * - Retry automático em caso de erro
 *
 * @param clinicId - ID da clínica
 * @param searchTerm - Termo de busca (será debounced)
 * @param enabled - Se a query deve rodar (default: true)
 * @returns Query result com data, isLoading, error, etc.
 */
export function usePatients(
  clinicId: string | undefined,
  searchTerm: string,
  enabled = true
) {
  // Debounce do searchTerm para evitar chamadas excessivas
  const debouncedSearch = useDebouncedValue(searchTerm, 500)

  return useQuery({
    queryKey: ['patients', clinicId, debouncedSearch],
    queryFn: async () => {
      if (!clinicId) throw new Error('Clinic ID is required')

      const response = await api.patients.getAll(
        clinicId,
        debouncedSearch || undefined
      )
      return response
    },
    enabled:
      enabled &&
      !!clinicId &&
      (debouncedSearch.length >= 2 || debouncedSearch.length === 0),
    // Cache por 5 minutos (pacientes não mudam frequentemente)
    staleTime: 5 * 60 * 1000,
  })
}
