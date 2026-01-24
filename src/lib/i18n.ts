import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import ptBRCommon from '@/locales/pt-BR/common.json'
import ptPTCommon from '@/locales/pt-PT/common.json'
import itCommon from '@/locales/it/common.json'
import esCommon from '@/locales/es/common.json'
import enCommon from '@/locales/en/common.json'
import frCommon from '@/locales/fr/common.json'

// Supported languages
export const LANGUAGES = ['pt-BR', 'pt-PT', 'it', 'es', 'en', 'fr'] as const
export type Language = (typeof LANGUAGES)[number]

// Default language
export const DEFAULT_LANGUAGE: Language = 'pt-BR'

// Language detection order
const detectionOptions = {
  order: ['localStorage', 'navigator'],
  lookupLocalStorage: 'i18nextLng',
  caches: ['localStorage'],
  excludeCacheFor: ['cimode']
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { common: ptBRCommon },
      'pt-PT': { common: ptPTCommon },
      it: { common: itCommon },
      es: { common: esCommon },
      en: { common: enCommon },
      fr: { common: frCommon }
    },
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'common',
    ns: ['common'],
    debug: false,
    detection: detectionOptions,
    interpolation: {
      escapeValue: false // React already escapes values
    },
    react: {
      useSuspense: false
    }
  })

export default i18n
