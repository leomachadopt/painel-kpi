import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { LANGUAGES, type Language } from '@/lib/i18n'
import { Globe } from 'lucide-react'

interface LanguageSelectorProps {
  value?: Language | null
  onChange: (language: Language | null) => void
  showLabel?: boolean
  showClearOption?: boolean
  clearOptionLabel?: string
  placeholder?: string
  disabled?: boolean
}

export function LanguageSelector({
  value,
  onChange,
  showLabel = true,
  showClearOption = false,
  clearOptionLabel,
  placeholder,
  disabled = false,
}: LanguageSelectorProps) {
  const { t } = useTranslation()

  const displayValue = value || undefined

  return (
    <div className="space-y-2">
      {showLabel && (
        <Label className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          {t('common.language')}
        </Label>
      )}
      <Select
        value={displayValue}
        onValueChange={(val) => {
          if (val === '__clear__') {
            onChange(null)
          } else {
            onChange(val as Language)
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder={placeholder || t('settings.languageDescription')} />
        </SelectTrigger>
        <SelectContent>
          {showClearOption && (
            <SelectItem value="__clear__">
              {clearOptionLabel || t('settings.useClinicLanguage')}
            </SelectItem>
          )}
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang} value={lang}>
              {t(`languages.${lang}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
