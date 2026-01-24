import { useTranslation as useI18nTranslation } from 'react-i18next'
import { useLanguage } from './useLanguage'
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import useAuthStore from '@/stores/useAuthStore'
import useDataStore from '@/stores/useDataStore'

type Locale = 'PT-BR' | 'PT-PT' | 'pt-BR' | 'pt-PT' | 'es' | 'en' | 'it' | 'fr'
type TranslationKey = string

/**
 * Hook de tradução que mantém compatibilidade com a interface antiga
 * mas usa i18next internamente para suportar multi-idioma
 */
export function useTranslation() {
  const { t: i18nT, i18n } = useI18nTranslation('common')
  const { language, effectiveLanguage } = useLanguage()
  const { user } = useAuthStore()
  const { getClinic } = useDataStore()
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
  }, [user, location, getClinic])

  // Usar o idioma efetivo selecionado pelo usuário em vez do país da clínica
  const locale: Locale = useMemo(() => {
    // Mapear effectiveLanguage para o formato esperado
    const languageToLocale: Record<string, Locale> = {
      'pt-BR': 'pt-BR',
      'pt-PT': 'pt-PT',
      'es': 'es',
      'en': 'en',
      'it': 'it',
      'fr': 'fr',
    }
    return languageToLocale[effectiveLanguage] || 'pt-BR'
  }, [effectiveLanguage])

  // Wrapper da função t() do i18next
  const t = (key: TranslationKey): string => {
    return i18nT(key) || key
  }

  // Formatação de números baseada no idioma efetivo
  const formatNumber = (value: number): string => {
    const localeMap: Record<string, string> = {
      'pt-BR': 'pt-BR',
      'pt-PT': 'pt-PT',
      'it': 'it-IT',
      'es': 'es-ES',
      'en': 'en-US',
      'fr': 'fr-FR'
    }
    return value.toLocaleString(localeMap[effectiveLanguage] || 'pt-BR')
  }

  // Formatação de moeda baseada no idioma efetivo
  const formatCurrency = (value: number): string => {
    const currencyMap: Record<string, { locale: string; currency: string }> = {
      'pt-BR': { locale: 'pt-BR', currency: 'BRL' },
      'pt-PT': { locale: 'pt-PT', currency: 'EUR' },
      'it': { locale: 'it-IT', currency: 'EUR' },
      'es': { locale: 'es-ES', currency: 'EUR' },
      'en': { locale: 'en-US', currency: 'USD' },
      'fr': { locale: 'fr-FR', currency: 'EUR' }
    }
    const config = currencyMap[effectiveLanguage] || currencyMap['pt-BR']
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency
    }).format(value)
  }

  // Formatação de data baseada no idioma efetivo
  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return ''
    }
    const localeMap: Record<string, string> = {
      'pt-BR': 'pt-BR',
      'pt-PT': 'pt-PT',
      'it': 'it-IT',
      'es': 'es-ES',
      'en': 'en-US',
      'fr': 'fr-FR'
    }
    return dateObj.toLocaleDateString(
      localeMap[effectiveLanguage] || 'pt-BR',
      options || { day: '2-digit', month: '2-digit', year: 'numeric' }
    )
  }

  // Formatação de data e hora
  const formatDateTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return ''
    }
    const localeMap: Record<string, string> = {
      'pt-BR': 'pt-BR',
      'pt-PT': 'pt-PT',
      'it': 'it-IT',
      'es': 'es-ES',
      'en': 'en-US',
      'fr': 'fr-FR'
    }
    return dateObj.toLocaleString(
      localeMap[effectiveLanguage] || 'pt-BR',
      { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    )
  }

  // Formatação de data com hora completa
  const formatDateWithTime = (date: Date | string, includeSeconds = false): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    if (isNaN(dateObj.getTime())) {
      return ''
    }
    const localeMap: Record<string, string> = {
      'pt-BR': 'pt-BR',
      'pt-PT': 'pt-PT',
      'it': 'it-IT',
      'es': 'es-ES',
      'en': 'en-US',
      'fr': 'fr-FR'
    }
    return dateObj.toLocaleString(
      localeMap[effectiveLanguage] || 'pt-BR',
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
    const localeMap: Record<string, string> = {
      'pt-BR': 'pt-BR',
      'pt-PT': 'pt-PT',
      'it': 'it-IT',
      'es': 'es-ES',
      'en': 'en-US',
      'fr': 'fr-FR'
    }
    return localeMap[effectiveLanguage] || 'pt-BR'
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
    // Também retornar o i18n para compatibilidade
    i18n,
    language: effectiveLanguage,
  }
}
