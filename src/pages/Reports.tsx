import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText,
  Lock,
  ChevronDown,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  CalendarCheck,
  Smile,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useDataStore from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'
import { usePermissions } from '@/hooks/usePermissions'
import { FinancialGroupedTable } from '@/components/reports/FinancialGroupedTable'
import { UnifiedBillingTable } from '@/components/reports/UnifiedBillingTable'
import { ConsultationTable } from '@/components/reports/ConsultationTable'
import { ConsultationKanban } from '@/components/reports/ConsultationKanban'
import { ProspectingTable } from '@/components/reports/ProspectingTable'
import { CabinetTable } from '@/components/reports/CabinetTable'
import { ServiceTimeTable } from '@/components/reports/ServiceTimeTable'
import { SourceTable } from '@/components/reports/SourceTable'
import { ConsultationControlTable } from '@/components/reports/ConsultationControlTable'
import { AlignersTable } from '@/components/reports/AlignersTable'
import { AlignersKanban } from '@/components/reports/AlignersKanban'
import { MarketingReport } from '@/components/reports/MarketingReport'
import { DailyAlignersEntry } from '@/lib/types'
import { isBrazilClinic } from '@/lib/clinicUtils'
import { useTranslation } from '@/hooks/useTranslation'

export default function Reports() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const navigate = useNavigate()
  const {
    clinics,
    getClinic,
    financialEntries,
    consultationEntries,
    advanceInvoiceEntries,
    prospectingEntries,
    cabinetEntries,
    serviceTimeEntries,
    sourceEntries,
    consultationControlEntries,
    alignerEntries,
  } = useDataStore()
  const { user } = useAuthStore()
  const { canView, canViewReport, isMentor } = usePermissions()
  const { t } = useTranslation()

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [, setReloadTrigger] = useState(0)
  const [consultationView, setConsultationView] = useState<'table' | 'kanban'>('kanban')
  const [alignersView, setAlignersView] = useState<'table' | 'kanban'>('kanban')

  // Funções para definir períodos rápidos
  const setPeriodToday = () => {
    const today = new Date().toISOString().split('T')[0]
    setStartDate(today)
    setEndDate(today)
  }

  const setPeriodYesterday = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    setStartDate(yesterdayStr)
    setEndDate(yesterdayStr)
  }

  const setPeriodLastWeek = () => {
    const today = new Date()
    const lastWeekStart = new Date(today)
    lastWeekStart.setDate(today.getDate() - 7)
    const lastWeekEnd = new Date(today)
    lastWeekEnd.setDate(today.getDate() - 1)
    
    setStartDate(lastWeekStart.toISOString().split('T')[0])
    setEndDate(lastWeekEnd.toISOString().split('T')[0])
  }

  const setPeriodLastMonth = () => {
    const today = new Date()
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
    
    setStartDate(lastMonthStart.toISOString().split('T')[0])
    setEndDate(lastMonthEnd.toISOString().split('T')[0])
  }

  const handleDataChange = () => {
    setReloadTrigger(prev => prev + 1)
    // Recarregar dados da API (a implementar se necessário)
    window.location.reload()
  }

  const clinic = clinicId ? getClinic(clinicId) : undefined
  const shouldShowAdvanceInvoice = !isBrazilClinic(clinic)

  // Role Access Control
  const mentorAccess = isMentor()
  const gestorAccess = user?.role === 'GESTOR_CLINICA' && user.clinicId === clinicId
  const colaboradorAccess =
    user?.role === 'COLABORADOR' &&
    user.clinicId === clinicId &&
    canView('canViewReports')

  const hasAccess = mentorAccess || gestorAccess || colaboradorAccess

  if (!clinic) return <div className="p-8">{t('errors.notFound')}</div>

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <Lock className="h-12 w-12 text-destructive opacity-50" />
        <h1 className="text-2xl font-bold">{t('reports.accessDenied')}</h1>
        <Button onClick={() => navigate(`/relatorios/${user?.clinicId}`)}>
          {t('reports.backToReports')}
        </Button>
      </div>
    )
  }

  // Generic Filter Function
  const filterByDate = <T extends { date: string }>(entries: T[] = []) => {
    const filtered = entries.filter((e) => {
      // Normalize dates to YYYY-MM-DD format for comparison
      const entryDate = e.date.split('T')[0]
      return entryDate >= startDate && entryDate <= endDate
    })
    return filtered
  }

  // Filter function for aligners - show all entries regardless of creation date
  // since aligners are unique records per patient that track status over time
  const filterAligners = (entries: DailyAlignersEntry[] = []) => {
    // Return all entries - aligners should always be visible regardless of creation date
    return entries
  }

  // Determine first available tab based on permissions
  const getFirstAvailableTab = (): string => {
    if (canViewReport('canViewReportFinancial')) return 'financial'
    if (shouldShowAdvanceInvoice && canViewReport('canViewReportBilling')) return 'billing'
    if (canViewReport('canViewReportConsultations')) return 'consultations'
    if (canViewReport('canViewReportAligners')) return 'aligners'
    if (canViewReport('canViewReportProspecting')) return 'prospecting'
    if (canViewReport('canViewReportCabinets')) return 'cabinets'
    if (canViewReport('canViewReportServiceTime')) return 'serviceTime'
    if (canViewReport('canViewReportSources')) return 'sources'
    if (canViewReport('canViewReportConsultationControl')) return 'consultationControl'
    if (canViewReport('canViewReportMarketing')) return 'marketing'
    return 'financial' // fallback
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            {t('reports.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('reports.subtitle')}.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          {mentorAccess && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between">
                  {clinic.name}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                {clinics.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => navigate(`/relatorios/${c.id}`)}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 border rounded-md p-1 bg-background">
              <CalendarIcon className="h-4 w-4 ml-2 text-muted-foreground" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border-0 shadow-none h-8 w-auto p-0 focus-visible:ring-0"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border-0 shadow-none h-8 w-auto p-0 focus-visible:ring-0"
              />
            </div>
            
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={setPeriodToday}
                className="text-xs"
              >
                {t('reports.today')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={setPeriodYesterday}
                className="text-xs"
              >
                {t('reports.yesterday')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={setPeriodLastWeek}
                className="text-xs"
              >
                {t('reports.lastWeek')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={setPeriodLastMonth}
                className="text-xs"
              >
                {t('reports.lastMonth')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue={getFirstAvailableTab()} className="w-full">
        <div className="overflow-x-auto -mx-2 px-2">
          <TabsList className="inline-flex w-full min-w-max flex-wrap gap-1 h-auto p-1">
            {canViewReport('canViewReportFinancial') && (
              <TabsTrigger value="financial" className="text-xs sm:text-sm whitespace-nowrap min-w-[80px]">
                {t('reports.financial')}
              </TabsTrigger>
            )}
            {shouldShowAdvanceInvoice && canViewReport('canViewReportBilling') && (
              <TabsTrigger value="billing" className="text-xs sm:text-sm whitespace-nowrap min-w-[80px]">
                {t('reports.billing')}
              </TabsTrigger>
            )}
            {canViewReport('canViewReportConsultations') && (
              <TabsTrigger value="consultations" className="text-xs sm:text-sm whitespace-nowrap min-w-[100px]">
                {t('reports.consultations')}
              </TabsTrigger>
            )}
            {canViewReport('canViewReportAligners') && (
              <TabsTrigger value="aligners" className="text-xs sm:text-sm whitespace-nowrap min-w-[80px]">
                {t('reports.aligners')}
              </TabsTrigger>
            )}
            {canViewReport('canViewReportProspecting') && (
              <TabsTrigger value="prospecting" className="text-xs sm:text-sm whitespace-nowrap min-w-[80px]">
                {t('reports.prospecting')}
              </TabsTrigger>
            )}
            {canViewReport('canViewReportCabinets') && (
              <TabsTrigger value="cabinets" className="text-xs sm:text-sm whitespace-nowrap min-w-[80px]">
                {t('sidebar.cabinets')}
              </TabsTrigger>
            )}
            {canViewReport('canViewReportServiceTime') && (
              <TabsTrigger value="serviceTime" className="text-xs sm:text-sm whitespace-nowrap min-w-[80px]">
                {t('reports.serviceTime')}
              </TabsTrigger>
            )}
            {canViewReport('canViewReportSources') && (
              <TabsTrigger value="sources" className="text-xs sm:text-sm whitespace-nowrap min-w-[80px]">
                {t('reports.sources')}
              </TabsTrigger>
            )}
            {canViewReport('canViewReportConsultationControl') && (
              <TabsTrigger value="consultationControl" className="text-xs sm:text-sm whitespace-nowrap min-w-[80px]">
                {t('reports.consultationControl')}
              </TabsTrigger>
            )}
            {canViewReport('canViewReportMarketing') && (
              <TabsTrigger value="marketing" className="text-xs sm:text-sm whitespace-nowrap min-w-[80px]">
                {t('reports.marketing')}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="mt-6">
          {canViewReport('canViewReportFinancial') && (
            <TabsContent value="financial">
              <FinancialGroupedTable
                data={filterByDate(financialEntries[clinic.id])}
                clinic={clinic}
                onDelete={handleDataChange}
                startDate={startDate}
                endDate={endDate}
              />
            </TabsContent>
          )}
          {shouldShowAdvanceInvoice && canViewReport('canViewReportBilling') && (
            <TabsContent value="billing">
              <UnifiedBillingTable
                advanceData={filterByDate(advanceInvoiceEntries[clinic.id] || [])}
                billingData={filterByDate(financialEntries[clinic.id])}
                clinic={clinic}
                startDate={startDate}
                endDate={endDate}
                onDelete={handleDataChange}
              />
            </TabsContent>
          )}
          {canViewReport('canViewReportConsultations') && (
            <TabsContent value="consultations">
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <div className="inline-flex rounded-md border">
                  <Button
                    variant={consultationView === 'kanban' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setConsultationView('kanban')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t('reports.kanban')}
                  </Button>
                  <Button
                    variant={consultationView === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setConsultationView('table')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4 mr-2" />
                    {t('reports.table')}
                  </Button>
                </div>
              </div>
              {consultationView === 'kanban' ? (
                <ConsultationKanban
                  data={filterByDate(consultationEntries[clinic.id])}
                  clinic={clinic}
                  onDelete={handleDataChange}
                />
              ) : (
                <ConsultationTable
                  data={filterByDate(consultationEntries[clinic.id])}
                  clinic={clinic}
                  onDelete={handleDataChange}
                />
              )}
            </div>
          </TabsContent>
          )}
          {canViewReport('canViewReportAligners') && (
            <TabsContent value="aligners">
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <div className="inline-flex rounded-md border">
                  <Button
                    variant={alignersView === 'kanban' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAlignersView('kanban')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    {t('reports.kanban')}
                  </Button>
                  <Button
                    variant={alignersView === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setAlignersView('table')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4 mr-2" />
                    {t('reports.table')}
                  </Button>
                </div>
              </div>
              {alignersView === 'kanban' ? (
                <AlignersKanban
                  data={filterAligners(alignerEntries[clinic.id])}
                  clinic={clinic}
                  onDelete={handleDataChange}
                />
              ) : (
                <AlignersTable
                  data={filterAligners(alignerEntries[clinic.id])}
                  clinic={clinic}
                  onDelete={handleDataChange}
                />
              )}
            </div>
          </TabsContent>
          )}
          {canViewReport('canViewReportProspecting') && (
            <TabsContent value="prospecting">
              <ProspectingTable
                data={filterByDate(prospectingEntries[clinic.id])}
                clinic={clinic}
                onDelete={handleDataChange}
              />
            </TabsContent>
          )}
          {canViewReport('canViewReportCabinets') && (
            <TabsContent value="cabinets">
              <CabinetTable
                data={filterByDate(cabinetEntries[clinic.id])}
                clinic={clinic}
                onDelete={handleDataChange}
              />
            </TabsContent>
          )}
          {canViewReport('canViewReportServiceTime') && (
            <TabsContent value="serviceTime">
              <ServiceTimeTable
                data={filterByDate(serviceTimeEntries[clinic.id])}
                clinic={clinic}
                onDelete={handleDataChange}
              />
            </TabsContent>
          )}
          {canViewReport('canViewReportSources') && (
            <TabsContent value="sources">
              <SourceTable
                data={filterByDate(sourceEntries[clinic.id])}
                clinic={clinic}
                onDelete={handleDataChange}
              />
            </TabsContent>
          )}
          {canViewReport('canViewReportConsultationControl') && (
            <TabsContent value="consultationControl">
              <ConsultationControlTable
                data={filterByDate(consultationControlEntries[clinic.id])}
                clinic={clinic}
                onDelete={handleDataChange}
              />
            </TabsContent>
          )}
          {canViewReport('canViewReportMarketing') && (
            <TabsContent value="marketing">
              <MarketingReport
                clinicId={clinic.id}
                startDate={startDate}
                endDate={endDate}
              />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
