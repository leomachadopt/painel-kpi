import { QueryClient } from '@tanstack/react-query'

/**
 * QueryClient configurado para otimizar caching e reduzir requests
 *
 * Estratégia de cache:
 * - staleTime: 5 minutos (dados permanecem fresh por 5 min)
 * - gcTime: 10 minutos (cache mantido na memória por 10 min após ficar unused)
 * - refetchOnWindowFocus: false (não refetch automático ao focar janela)
 * - refetchOnReconnect: false (não refetch automático ao reconectar)
 * - retry: 1 (apenas 1 retry em caso de erro)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Dados permanecem fresh (não refetch) por 5 minutos
      staleTime: 5 * 60 * 1000, // 5 min

      // Garbage collection: manter cache por 10 min após não ser usado
      gcTime: 10 * 60 * 1000, // 10 min

      // DESABILITAR refetch automático (reduz requests desnecessários)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,

      // Apenas 1 retry em caso de erro
      retry: 1,

      // Intervalo entre retries: 1 segundo
      retryDelay: 1000,
    },
    mutations: {
      // Apenas 1 retry para mutations
      retry: 1,
    },
  },
})
