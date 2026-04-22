/* General utility functions (exposes cn) */
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get currency symbol based on country
 * @param country - Country code (PT-BR or PT-PT)
 * @returns Currency symbol (R$ or €)
 */
export function getCurrencySymbol(country?: string): string {
  const isBrazil = country === 'PT-BR'
  return isBrazil ? 'R$' : '€'
}

/**
 * Format currency value based on country
 * @param value - Numeric value to format
 * @param currencySymbol - Currency symbol (R$ or €)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number, currencySymbol: string): string {
  const isBrazil = currencySymbol === 'R$'
  const config = isBrazil
    ? { locale: 'pt-BR', currency: 'BRL' }
    : { locale: 'pt-PT', currency: 'EUR' }

  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency
  }).format(value)
}
