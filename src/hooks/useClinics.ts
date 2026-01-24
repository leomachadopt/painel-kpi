import { useQuery } from '@tanstack/react-query'
import api from '@/services/api'

/**
 * Hook para buscar todas as clínicas do usuário
 *
 * Benefícios:
 * - Cache agressivo (30 min staleTime) - configurações raramente mudam
 * - Combina com Cache-Control HTTP (1 hora)
 * - Deduplica requests
 *
 * @param enabled - Se a query deve rodar (default: true)
 * @returns Query result com data, isLoading, error, etc.
 */
export function useClinics(enabled = true) {
  return useQuery({
    queryKey: ['clinics'],
    queryFn: () => api.clinics.getAll(),
    enabled,
    // Cache por 30 minutos (configurações mudam raramente)
    staleTime: 30 * 60 * 1000,
    // Manter em memória por 1 hora
    gcTime: 60 * 60 * 1000,
  })
}

/**
 * Hook para buscar uma clínica específica
 *
 * @param clinicId - ID da clínica
 * @param enabled - Se a query deve rodar (default: true)
 * @returns Query result com data, isLoading, error, etc.
 */
export function useClinic(clinicId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['clinic', clinicId],
    queryFn: () => api.clinics.getById(clinicId!),
    enabled: enabled && !!clinicId,
    // Cache por 30 minutos
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  })
}
