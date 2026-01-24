import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

/**
 * Hook para buscar dados mensais de uma clínica
 *
 * Benefícios:
 * - Cache MUITO agressivo (dados históricos NUNCA mudam)
 * - Combina com Cache-Control HTTP (24 horas + immutable)
 * - Deduplica requests
 *
 * @param clinicId - ID da clínica
 * @param year - Ano
 * @param month - Mês (1-12)
 * @param enabled - Se a query deve rodar (default: true)
 * @returns Query result com data, isLoading, error, etc.
 */
export function useMonthlyData(
  clinicId: string | undefined,
  year: number,
  month: number,
  enabled = true
) {
  return useQuery({
    queryKey: ['monthly-data', clinicId, year, month],
    queryFn: () => api.monthlyData.get(clinicId!, year, month),
    enabled: enabled && !!clinicId,
    // Cache AGRESSIVO: dados históricos NUNCA mudam
    staleTime: 24 * 60 * 60 * 1000, // 24 horas
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 dias na memória
    // Não refetch NUNCA (dados históricos são imutáveis)
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Não retry em caso de 404 (dados podem não existir ainda)
    retry: false,
  })
}

/**
 * Hook para buscar dados anuais de uma clínica
 *
 * @param clinicId - ID da clínica
 * @param year - Ano
 * @param enabled - Se a query deve rodar (default: true)
 * @returns Query result com data, isLoading, error, etc.
 */
export function useYearlyData(
  clinicId: string | undefined,
  year: number,
  enabled = true
) {
  return useQuery({
    queryKey: ['monthly-data', clinicId, year, 'all'],
    queryFn: () => api.monthlyData.getYear(clinicId!, year),
    enabled: enabled && !!clinicId,
    staleTime: 24 * 60 * 60 * 1000, // 24 horas
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7 dias
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  })
}
