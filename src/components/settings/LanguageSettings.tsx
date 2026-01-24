import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LanguageSelector } from '@/components/LanguageSelector'
import { useLanguage } from '@/hooks/useLanguage'
import useAuthStore from '@/stores/useAuthStore'
import useDataStore from '@/stores/useDataStore'
import { toast } from 'sonner'
import type { Language } from '@/lib/i18n'
import { Loader2, Save } from 'lucide-react'
import { authApi, clinicsApi } from '@/services/api'

interface LanguageSettingsProps {
  clinicId: string
}

export function LanguageSettings({ clinicId }: LanguageSettingsProps) {
  const { t } = useTranslation()
  const { user, updateUser } = useAuthStore()
  const { clinics, reloadClinics } = useDataStore()
  const { userLanguage, clinicLanguage } = useLanguage()

  const clinic = clinics?.find((c) => c.id === clinicId)

  const [personalLanguage, setPersonalLanguage] = useState<Language | null>(null)
  const [defaultLanguage, setDefaultLanguage] = useState<Language>('pt-BR')

  // Initialize state only once when values are available
  useEffect(() => {
    if (userLanguage !== undefined) {
      setPersonalLanguage(userLanguage || null)
    }
  }, [userLanguage])

  useEffect(() => {
    if (clinicLanguage) {
      setDefaultLanguage(clinicLanguage)
    }
  }, [clinicLanguage])

  const [isSavingPersonal, setIsSavingPersonal] = useState(false)
  const [isSavingClinic, setIsSavingClinic] = useState(false)

  const hasPersonalChanges = personalLanguage !== userLanguage
  const hasClinicChanges = defaultLanguage !== clinicLanguage

  const isMentor = user?.role === 'MENTOR'

  const handleSavePersonalLanguage = async () => {
    try {
      setIsSavingPersonal(true)

      const data = await authApi.updateLanguage(personalLanguage)
      updateUser(data.user)

      toast.success(t('success.updated'))

      // Reload page to apply language changes
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      toast.error(t('errors.generic'))
    } finally {
      setIsSavingPersonal(false)
    }
  }

  const handleSaveClinicLanguage = async () => {
    if (!clinic) return

    try {
      setIsSavingClinic(true)

      await clinicsApi.update(clinic.id, { language: defaultLanguage })

      // Reload clinics to get updated data
      await reloadClinics()

      toast.success(t('success.updated'))

      // Reload page to apply language changes
      setTimeout(() => {
        window.location.reload()
      }, 500)
    } catch (error) {
      toast.error(t('errors.generic'))
    } finally {
      setIsSavingClinic(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Personal Language Preference */}
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.personalLanguage')}</CardTitle>
          <CardDescription>
            {t('settings.personalLanguageDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LanguageSelector
            value={personalLanguage}
            onChange={setPersonalLanguage}
            showClearOption
            clearOptionLabel={t('settings.useClinicLanguage')}
          />

          {hasPersonalChanges && (
            <Button
              onClick={handleSavePersonalLanguage}
              disabled={isSavingPersonal}
              className="w-full sm:w-auto"
            >
              {isSavingPersonal ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('common.save')}
                </>
              )}
            </Button>
          )}

          <p className="text-sm text-muted-foreground">
            {t('common.from')}: {userLanguage ? t(`languages.${userLanguage}`) : t('settings.useClinicLanguage')} →{' '}
            {personalLanguage ? t(`languages.${personalLanguage}`) : t('settings.useClinicLanguage')}
          </p>
        </CardContent>
      </Card>

      {/* Clinic Default Language (Only for MENTOR) */}
      {isMentor && clinic && (
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.clinicLanguage')}</CardTitle>
            <CardDescription>
              {t('settings.clinicLanguageDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <LanguageSelector
              value={defaultLanguage}
              onChange={(lang) => setDefaultLanguage(lang || 'pt-BR')}
              showClearOption={false}
            />

            {hasClinicChanges && (
              <Button
                onClick={handleSaveClinicLanguage}
                disabled={isSavingClinic}
                className="w-full sm:w-auto"
              >
                {isSavingClinic ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('common.save')}
                  </>
                )}
              </Button>
            )}

            <p className="text-sm text-muted-foreground">
              {t('common.from')}: {t(`languages.${clinicLanguage || 'pt-BR'}`)} →{' '}
              {t(`languages.${defaultLanguage}`)}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
