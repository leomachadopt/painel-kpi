import { Clinic } from './types'

/**
 * Verifica se a clínica é do Brasil (PT-BR)
 */
export function isBrazilClinic(clinic: Clinic | undefined | null): boolean {
  return clinic?.country === 'PT-BR'
}

/**
 * Verifica se a clínica é de Portugal (PT-PT)
 */
export function isPortugalClinic(clinic: Clinic | undefined | null): boolean {
  return clinic?.country === 'PT-PT'
}



