import { useMemo, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import useAuthStore from '@/stores/useAuthStore'
import useDataStore from '@/stores/useDataStore'
import { ptBR } from '@/lib/translations/pt-BR'
import { ptPT } from '@/lib/translations/pt-PT'
import type { Clinic } from '@/lib/types'

type Locale = 'PT-BR' | 'PT-PT'
type TranslationKey = string

const translations = {
  'PT-BR': ptBR,
  'PT-PT': ptPT,
}

export function useTranslation() {
  const { user } = useAuthStore()
  const { clinics, getClinic } = useDataStore()
  const location = useLocation()

  // Detectar clínica atual
  const currentClinic = useMemo(() => {
    // Se for mentor, pegar da URL
    if (user?.role === 'MENTOR') {
      const clinicId = location.pathname.split('/')[2]
      return clinicId ? getClinic(clinicId) : null
    }
    // Se for gestor, usar a clínica do usuário
    if (user?.clinicId) {
      return getClinic(user.clinicId)
    }
    return null
  }, [user, location, clinics, getClinic])

  // Detectar locale baseado no país da clínica
  const locale: Locale = useMemo(() => {
    return (currentClinic?.country as Locale) || 'PT-BR'
  }, [currentClinic])

  // Obter tradução - memoizada para evitar problemas de escopo na minificação
  const t = useCallback((key: TranslationKey): string => {
    const keys = key.split('.')
    let value: any = translations[locale]
    
    for (const k of keys) {
      value = value?.[k]
      if (value === undefined) {
        console.warn(`Translation key "${key}" not found for locale "${locale}"`)
        return key
      }
    }
    
    return value || key
  }, [locale])

  // Formatação de números
  const formatNumber = (value: number): string => {
    return value.toLocaleString(locale === 'PT-BR' ? 'pt-BR' : 'pt-PT')
  }

  // Formatação de moeda
  const formatCurrency = (value: number): string => {
    const currency = locale === 'PT-BR' ? 'BRL' : 'EUR'
    return new Intl.NumberFormat(
      locale === 'PT-BR' ? 'pt-BR' : 'pt-PT',
      { style: 'currency', currency }
    ).format(value)
  }

  // Formatação de data
  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return ''
    }
    return dateObj.toLocaleDateString(
      locale === 'PT-BR' ? 'pt-BR' : 'pt-PT',
      options || { day: '2-digit', month: '2-digit', year: 'numeric' }
    )
  }

  // Formatação de data e hora
  const formatDateTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return ''
    }
    return dateObj.toLocaleString(
      locale === 'PT-BR' ? 'pt-BR' : 'pt-PT',
      { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    )
  }

  // Formatação de data com hora completa
  const formatDateWithTime = (date: Date | string, includeSeconds = false): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return ''
    }
    return dateObj.toLocaleString(
      locale === 'PT-BR' ? 'pt-BR' : 'pt-PT',
      { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        ...(includeSeconds && { second: '2-digit' })
      }
    )
  }

  // Obter locale string para formatação
  const getLocaleString = (): string => {
    return locale === 'PT-BR' ? 'pt-BR' : 'pt-PT'
  }

  return {
    t,
    locale,
    formatNumber,
    formatCurrency,
    formatDate,
    formatDateTime,
    formatDateWithTime,
    getLocaleString,
    currentClinic,
  }
}

