import { useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/stores/useAuthStore'
import useDataStore from '@/stores/useDataStore'
import type { Language } from '@/lib/i18n'

/**
 * Hook to manage user language preferences
 * Language priority:
 * 1. User's personal language (if set)
 * 2. Clinic's language (if user belongs to a clinic)
 * 3. Browser/localStorage language
 * 4. Default language (pt-BR)
 */
export function useLanguage() {
  const { i18n } = useTranslation()
  const { user } = useAuthStore()
  const { clinics } = useDataStore()
  const hasInitialized = useRef(false)

  // Get user's clinic - memoize to prevent recalculations
  const userClinic = useMemo(
    () => clinics?.find((c) => c.id === user?.clinic_id),
    [clinics, user?.clinic_id]
  )

  // Determine effective language based on priority - memoize to prevent recalculations
  const effectiveLanguage = useMemo(
    (): Language | undefined =>
      (user?.language as Language) ||
      (userClinic?.language as Language) ||
      undefined,
    [user?.language, userClinic?.language]
  )

  useEffect(() => {
    // Change language whenever effectiveLanguage changes
    if (effectiveLanguage) {
      if (i18n.language !== effectiveLanguage) {
        i18n.changeLanguage(effectiveLanguage).catch(() => {
          // Silently fail - will use default language
        })
      }
      hasInitialized.current = true
    }
  }, [effectiveLanguage, i18n])

  const changeLanguage = useCallback(
    async (language: Language) => {
      await i18n.changeLanguage(language)
    },
    [i18n]
  )

  return {
    language: i18n.language as Language,
    effectiveLanguage: effectiveLanguage || (i18n.language as Language),
    userLanguage: user?.language as Language | undefined,
    clinicLanguage: userClinic?.language as Language | undefined,
    changeLanguage,
    isLanguageFromUser: !!user?.language,
    isLanguageFromClinic: !user?.language && !!userClinic?.language
  }
}
