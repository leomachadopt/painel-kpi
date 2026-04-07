import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Shield, Loader2, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import useAuthStore from '@/stores/useAuthStore'
import useDataStore from '@/stores/useDataStore'

interface Doctor {
  id: string
  name: string
  email?: string
  whatsapp?: string
}

export default function DoctorsTab() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const { getClinic } = useDataStore()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Just show loading for a brief moment for better UX
    const timer = setTimeout(() => setLoading(false), 300)
    return () => clearTimeout(timer)
  }, [])

  const clinic = user?.clinicId ? getClinic(user.clinicId) : null
  const clinicDoctors: Doctor[] = clinic?.configuration?.doctors || []

  // Count doctors with real vs fictitious emails
  const emailStats = clinicDoctors.reduce((acc, doctor) => {
    if (doctor.email?.endsWith('@dentalkpi.com')) {
      acc.fictitious++
    } else if (doctor.email) {
      acc.real++
    }
    return acc
  }, { real: 0, fictitious: 0 })

  return (
    <>
      <div className="mb-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            {t('team.doctorsInfo')}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t('team.doctorsDescription')}
          </p>
          <div className="mt-3 flex gap-4 text-xs text-blue-600 dark:text-blue-400">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{t('team.realEmails')}: <strong>{emailStats.real}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{t('team.fictitiousEmails')}: <strong>{emailStats.fictitious}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('team.doctorsList')}</CardTitle>
          <CardDescription>
            {t('team.doctorsWithAccess')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : clinicDoctors.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              {t('team.noDoctorsRegistered')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('team.name')}</TableHead>
                  <TableHead>{t('team.email')}</TableHead>
                  <TableHead>{t('team.whatsapp')}</TableHead>
                  <TableHead>{t('team.status')}</TableHead>
                  <TableHead className="text-right">{t('team.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinicDoctors.map((doctor) => {
                  const isFictitious = doctor.email?.endsWith('@dentalkpi.com')
                  const hasAccount = doctor.email && !isFictitious

                  return (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">{doctor.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={isFictitious ? 'text-muted-foreground text-sm' : ''}>
                            {doctor.email || '-'}
                          </span>
                          {isFictitious && (
                            <Badge variant="outline" className="text-xs">
                              {t('team.fictitious')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{doctor.whatsapp || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={hasAccount ? 'default' : 'secondary'}>
                          {hasAccount ? t('team.hasAccount') : t('team.noAccount')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {hasAccount && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              toast.info(t('team.permissionsComingSoon'))
                            }}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            {t('team.permissions')}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
