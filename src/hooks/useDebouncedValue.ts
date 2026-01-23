import { useEffect, useState } from 'react'

/**
 * Hook que debounce (atrasa) a atualização de um valor
 *
 * Útil para evitar chamadas excessivas de API durante digitação.
 *
 * @example
 * ```tsx
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebouncedValue(searchTerm, 500)
 *
 * useEffect(() => {
 *   if (debouncedSearch) {
 *     fetchResults(debouncedSearch)
 *   }
 * }, [debouncedSearch])
 * ```
 *
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (padrão: 500ms)
 * @returns Valor debounced
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Criar timer que atualiza o valor após o delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cancelar timer se value mudar antes do delay acabar
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
