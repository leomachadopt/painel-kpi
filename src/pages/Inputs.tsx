import { useEffect, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Lock,
  FileText,
  UserPlus,
  Megaphone,
  Armchair,
  Clock,
  CalendarCheck,
  Smile,
  Package,
  CreditCard,
  Receipt,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import useDataStore from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from '@/hooks/useTranslation'
import { DailyFinancials } from '@/components/daily/DailyFinancials'
import { DailyBilling } from '@/components/daily/DailyBilling'
import { DailyConsultations } from '@/components/daily/DailyConsultations'
import { DailyProspecting } from '@/components/daily/DailyProspecting'
import { DailyCabinets } from '@/components/daily/DailyCabinets'
import { DailyServiceTime } from '@/components/daily/DailyServiceTime'
import { DailyConsultationControl } from '@/components/daily/DailyConsultationControl'
import { DailyAligners } from '@/components/daily/DailyAligners'
import { DailyOrders } from '@/components/daily/DailyOrders'
import { DailyAccountsPayable } from '@/components/daily/DailyAccountsPayable'

export default function Inputs() {
  const { t } = useTranslation()
  const { clinicId } = useParams<{ clinicId: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getClinic } = useDataStore()
  const { user, refreshPermissions } = useAuthStore()
  const { canEdit } = usePermissions()

  // Ler parâmetros da URL
  const tabParam = searchParams.get('tab')
  const codeParam = searchParams.get('code')

  // Refresh permissions when component mounts if user is a collaborator
  useEffect(() => {
    if (user?.role === 'COLABORADOR' && refreshPermissions) {
      refreshPermissions()
    }
  }, [user?.role, refreshPermissions])

  const clinic = clinicId ? getClinic(clinicId) : undefined

  // Verificar permissões
  const hasFinancial = canEdit('canEditFinancial')
  const hasBilling = canEdit('canEditBilling') || canEdit('canEditAdvances') || canEdit('canEditAdvanceInvoice')
  const hasConsultations = canEdit('canEditConsultations')
  const hasProspecting = canEdit('canEditProspecting')
  const hasCabinets = canEdit('canEditCabinets')
  const hasServiceTime = canEdit('canEditServiceTime')
  const hasConsultationControl = canEdit('canEditConsultationControl')
  const hasAligners = canEdit('canEditAligners')
  const hasOrders = canEdit('canEditOrders')
  const hasAccountsPayable = canEdit('canEditAccountsPayable')

  // Determinar primeira aba disponível
  const firstAvailableTab =
    hasFinancial ? 'financial' :
    hasBilling ? 'billing' :
    hasConsultations ? 'consultations' :
    hasProspecting ? 'prospecting' :
    hasCabinets ? 'cabinets' :
    hasServiceTime ? 'serviceTime' :
    hasConsultationControl ? 'consultationControl' :
    hasAligners ? 'aligners' :
    hasOrders ? 'orders' :
    hasAccountsPayable ? 'accountsPayable' : 'financial'

  // Determinar aba inicial (priorizar parâmetro da URL)
  const validTabs = ['financial', 'billing', 'consultations', 'prospecting', 'cabinets', 'serviceTime', 'consultationControl', 'aligners', 'orders', 'accountsPayable']
  const initialTab = tabParam && validTabs.includes(tabParam)
    ? tabParam
    : firstAvailableTab

  const [activeTab, setActiveTab] = useState(initialTab)

  // Atualizar aba quando parâmetro da URL mudar
  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  if (
    user?.role === 'GESTOR_CLINICA' &&
    clinicId &&
    user.clinicId !== clinicId
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <Lock className="h-12 w-12 text-destructive opacity-50" />
        <h1 className="text-2xl font-bold">{t('daily.accessDenied')}</h1>
        <Button onClick={() => navigate(`/dashboard/${user.clinicId}`)}>
          {t('daily.backToDashboard')}
        </Button>
      </div>
    )
  }

  if (!clinic) return <div className="p-8">{t('errors.notFound')}</div>

  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('daily.title')}</h1>
        <p className="text-muted-foreground">
          {clinic.name} • {t('daily.subtitle')}.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-2 px-2">
          <TabsList className="inline-flex w-full min-w-max flex-wrap gap-1 h-auto p-1">
            {hasFinancial && (
              <TabsTrigger
                value="financial"
                className="flex flex-col gap-1 py-2 h-auto min-w-[80px] text-xs sm:text-sm"
              >
                <FileText className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('daily.financial')}</span>
              </TabsTrigger>
            )}
            {hasBilling && (
              <TabsTrigger
                value="billing"
                className="flex flex-col gap-1 py-2 h-auto min-w-[80px] text-xs sm:text-sm"
              >
                <Receipt className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('daily.billing')}</span>
              </TabsTrigger>
            )}
            {hasConsultations && (
              <TabsTrigger
                value="consultations"
                className="flex flex-col gap-1 py-2 h-auto min-w-[80px] text-xs sm:text-sm"
              >
                <UserPlus className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('daily.consultations')}</span>
              </TabsTrigger>
            )}
            {hasProspecting && (
              <TabsTrigger
                value="prospecting"
                className="flex flex-col gap-1 py-2 h-auto min-w-[80px] text-xs sm:text-sm"
              >
                <Megaphone className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('daily.prospecting')}</span>
              </TabsTrigger>
            )}
            {hasCabinets && (
              <TabsTrigger
                value="cabinets"
                className="flex flex-col gap-1 py-2 h-auto min-w-[80px] text-xs sm:text-sm"
              >
                <Armchair className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('sidebar.cabinets')}</span>
              </TabsTrigger>
            )}
            {hasServiceTime && (
              <TabsTrigger
                value="serviceTime"
                className="flex flex-col gap-1 py-2 h-auto min-w-[80px] text-xs sm:text-sm"
              >
                <Clock className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('daily.serviceTime')}</span>
              </TabsTrigger>
            )}
            {hasConsultationControl && (
              <TabsTrigger
                value="consultationControl"
                className="flex flex-col gap-1 py-2 h-auto min-w-[80px] text-xs sm:text-sm"
              >
                <CalendarCheck className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('daily.consultationControl')}</span>
              </TabsTrigger>
            )}
            {hasAligners && (
              <TabsTrigger
                value="aligners"
                className="flex flex-col gap-1 py-2 h-auto min-w-[80px] text-xs sm:text-sm"
              >
                <Smile className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('daily.aligners')}</span>
              </TabsTrigger>
            )}
            {hasOrders && (
              <TabsTrigger
                value="orders"
                className="flex flex-col gap-1 py-2 h-auto min-w-[80px] text-xs sm:text-sm"
              >
                <Package className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('daily.orders')}</span>
              </TabsTrigger>
            )}
            {hasAccountsPayable && (
              <TabsTrigger
                value="accountsPayable"
                className="flex flex-col gap-1 py-2 h-auto min-w-[80px] text-xs sm:text-sm"
              >
                <CreditCard className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('accountsPayable.title')}</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="mt-6">
          {hasFinancial && (
            <TabsContent value="financial">
              <Card>
                <CardHeader>
                  <CardTitle>{t('daily.financialTitle')}</CardTitle>
                  <CardDescription>
                    {t('cabinet.registerRevenue')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyFinancials clinic={clinic} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasBilling && (
            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle>{t('daily.billingTitle')}</CardTitle>
                  <CardDescription>
                    {t('daily.billingDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyBilling clinic={clinic} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasConsultations && (
            <TabsContent value="consultations">
              <Card>
                <CardHeader>
                  <CardTitle>{t('daily.consultationsTitle')}</CardTitle>
                  <CardDescription>
                    {t('daily.consultationsDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyConsultations clinic={clinic} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasProspecting && (
            <TabsContent value="prospecting">
              <Card>
                <CardHeader>
                  <CardTitle>{t('daily.prospectingTitle')}</CardTitle>
                  <CardDescription>
                    {t('daily.prospectingDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyProspecting clinic={clinic} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasCabinets && (
            <TabsContent value="cabinets">
              <Card>
                <CardHeader>
                  <CardTitle>{t('financial.cabinetOccupation')}</CardTitle>
                  <CardDescription>
                    {t('cabinet.registerHours')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyCabinets clinic={clinic} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasServiceTime && (
            <TabsContent value="serviceTime">
              <Card>
                <CardHeader>
                  <CardTitle>{t('daily.serviceTimeTitle')}</CardTitle>
                  <CardDescription>
                    {t('daily.serviceTimeDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyServiceTime clinic={clinic} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasConsultationControl && (
            <TabsContent value="consultationControl">
              <Card>
                <CardHeader>
                  <CardTitle>{t('daily.consultationControlTitle')}</CardTitle>
                  <CardDescription>
                    {t('daily.consultationControlDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyConsultationControl clinic={clinic} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasAligners && (
            <TabsContent value="aligners">
              <Card>
                <CardHeader>
                  <CardTitle>{t('daily.alignersTitle')}</CardTitle>
                  <CardDescription>
                    {t('daily.alignersDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyAligners clinic={clinic} initialCode={codeParam || undefined} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasOrders && (
            <TabsContent value="orders">
              <Card>
                <CardHeader>
                  <CardTitle>{t('daily.ordersTitle')}</CardTitle>
                  <CardDescription>
                    {t('daily.ordersDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyOrders clinic={clinic} />
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {hasAccountsPayable && (
            <TabsContent value="accountsPayable">
              <Card>
                <CardHeader>
                  <CardTitle>{t('daily.accountsPayableTitle')}</CardTitle>
                  <CardDescription>
                    {t('daily.accountsPayableDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyAccountsPayable clinic={clinic} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
