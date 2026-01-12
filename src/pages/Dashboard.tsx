import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  Download,
  Info,
  AlertTriangle,
  FileText,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KPICard } from '@/components/KPICard'
import useDataStore from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'
import { usePermissions } from '@/hooks/usePermissions'
import { MONTHS } from '@/lib/types'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { generateSummary } from '@/lib/summary'
import { SummaryModal } from '@/components/SummaryModal'
import { useTranslation } from '@/hooks/useTranslation'
import {
  RevenueChart,
  ConsultationFunnel,
  ProspectingChart,
  CabinetChart,
  DelaysChart,
  SourcesChart,
  RevenueEvolutionChart,
  OwnerAgendaChart,
  RevenuePerCabinetChart,
  TopReferrersChart,
} from '@/components/dashboard/Charts'

export default function Dashboard() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { calculateKPIs, calculateAlerts, getClinic, getMonthlyData, sourceEntries, loadMonthlyTargets } =
    useDataStore()
  const { user } = useAuthStore()
  const { canView } = usePermissions()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString()
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  )
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)

  const currentMonth = parseInt(selectedMonth)
  const currentYear = parseInt(selectedYear)
  const clinic = clinicId ? getClinic(clinicId) : undefined

  const hasAccess = !(
    user?.role === 'GESTOR_CLINICA' &&
    clinicId &&
    user.clinicId !== clinicId
  )

  // Load monthly targets when clinic/month/year changes
  useEffect(() => {
    if (clinicId && hasAccess) {
      loadMonthlyTargets(clinicId, currentMonth, currentYear)
    }
  }, [clinicId, currentMonth, currentYear, hasAccess, loadMonthlyTargets])

  const kpis = useMemo(() => {
    if (!clinicId || !hasAccess) return []
    return calculateKPIs(clinicId, currentMonth, currentYear)
  }, [clinicId, currentMonth, currentYear, calculateKPIs, hasAccess])

  const alerts = useMemo(() => {
    if (!clinicId || !hasAccess) return []
    return calculateAlerts(clinicId, currentMonth, currentYear)
  }, [clinicId, currentMonth, currentYear, calculateAlerts, hasAccess])

  const monthlyData = useMemo(() => {
    if (!clinicId || !hasAccess) return undefined
    return getMonthlyData(clinicId, currentMonth, currentYear)
  }, [clinicId, currentMonth, currentYear, getMonthlyData, hasAccess])

  // Get last 6 months for evolution chart
  const last6Months = useMemo(() => {
    if (!clinicId || !hasAccess) return []
    const months: any[] = []
    for (let i = 5; i >= 0; i--) {
      const targetMonth = currentMonth - i
      const targetYear = targetMonth <= 0 ? currentYear - 1 : currentYear
      const adjustedMonth = targetMonth <= 0 ? 12 + targetMonth : targetMonth
      const data = getMonthlyData(clinicId, adjustedMonth, targetYear)
      if (data) months.push(data)
    }
    return months
  }, [clinicId, currentMonth, currentYear, getMonthlyData, hasAccess])

  // Filter source entries for current month/year
  const currentMonthSourceEntries = useMemo(() => {
    if (!clinicId || !hasAccess) return []
    const entries = sourceEntries[clinicId] || []
    return entries.filter((entry: any) => {
      const entryDate = new Date(entry.date)
      return (
        entryDate.getMonth() + 1 === currentMonth &&
        entryDate.getFullYear() === currentYear
      )
    })
  }, [clinicId, sourceEntries, currentMonth, currentYear, hasAccess])

  const summary = useMemo(() => {
    if (!clinic || !hasAccess) return null
    return generateSummary(
      clinic.name,
      MONTHS[currentMonth - 1],
      currentYear,
      kpis,
      alerts,
    )
  }, [clinic, currentMonth, currentYear, kpis, alerts, hasAccess])

  // Verificar permissões do dashboard
  const canViewOverview = canView('canViewDashboardOverview')
  const canViewFinancial = canView('canViewDashboardFinancial')
  const canViewCommercial = canView('canViewDashboardCommercial')
  const canViewOperational = canView('canViewDashboardOperational')
  const canViewMarketing = canView('canViewDashboardMarketing')

  // Verificar se tem permissão para ver pelo menos uma seção do dashboard
  const canViewAnyDashboardSection = canViewOverview || canViewFinancial || canViewCommercial || canViewOperational || canViewMarketing

  if (!hasAccess && clinicId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('access.denied')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('access.deniedMessage')}
          </p>
        </div>
        <Button onClick={() => navigate(`/dashboard/${user?.clinicId}`)}>
          Voltar ao meu Dashboard
        </Button>
      </div>
    )
  }

  if (!clinic) {
    return <div className="p-8">Clínica não encontrada.</div>
  }

  // Se for colaborador e não tiver permissão para ver nenhuma seção do dashboard, mostrar mensagem
  if (user?.role === 'COLABORADOR' && !canViewAnyDashboardSection) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground mt-2">
            Você não tem permissão para visualizar o dashboard.
          </p>
        </div>
        <Button onClick={() => navigate(`/relatorios/${user?.clinicId}`)}>
          Ver Relatórios
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-border/50 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
            Dashboard de Performance
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-semibold text-foreground">{clinic.name}</span>
            <span className="opacity-50">•</span>
            <span>
              {MONTHS[currentMonth - 1]} {currentYear}
            </span>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => setIsSummaryOpen(true)}
          >
            <FileText className="h-4 w-4" />
            Gerar resumo para reunião
          </Button>

          <div className="flex items-center gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month, index) => (
                  <SelectItem key={index} value={(index + 1).toString()}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts Section - apenas se tiver permissão para ver pelo menos uma seção */}
      {canViewAnyDashboardSection && alerts.length > 0 && (
        <div className="animate-slide-up">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Alertas Críticos ({alerts.length})
          </h2>
          <div className="grid gap-3">
            {alerts.map((alert) => (
              <Alert 
                key={alert.id} 
                variant={alert.severity} 
                className="rounded-xl border-border/50"
                style={{
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.03)',
                }}
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{alert.rule}</AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* KPI Grid - Filtrar por permissões */}
      {canViewAnyDashboardSection && (
        <div>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-xl font-semibold">Indicadores-Chave</h2>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Monitorização completa dos indicadores de performance da clínica.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          {/* Financeiro - apenas se tiver permissão */}
          {canViewFinancial && (
            <div className="mb-8 animate-slide-up">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Financeiro</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.filter(k => ['revenue_monthly', 'avg_ticket', 'revenue_per_cabinet', 'aligners_started'].includes(k.id)).map((kpi) => (
                  <KPICard key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </div>
          )}

          {/* Comercial - apenas se tiver permissão */}
          {canViewCommercial && (
            <div className="mb-8 animate-slide-up">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Comercial & Vendas</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.filter(k => ['acceptance_rate', 'plans_presented', 'avg_ticket_created', 'avg_ticket_accepted', 'conversion_rate', 'follow_up_rate'].includes(k.id)).map((kpi) => (
                  <KPICard key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </div>
          )}

          {/* Operacional - apenas se tiver permissão */}
          {canViewOperational && (
            <>
              <div className="mb-8 animate-slide-up">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Operacional</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {kpis.filter(k => ['occupancy_rate', 'attendance_rate', 'avg_wait_time', 'integration_rate'].includes(k.id)).map((kpi) => (
                    <KPICard key={kpi.id} kpi={kpi} />
                  ))}
                </div>
              </div>

              {/* Controle de Consultas - parte do operacional */}
              <div className="mb-8 animate-slide-up">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Controle de Consultas</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {kpis.filter(k => ['no_show', 'rescheduled', 'cancelled', 'old_patient_booking'].includes(k.id)).map((kpi) => (
                    <KPICard key={kpi.id} kpi={kpi} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Experiência & Marketing - apenas se tiver permissão */}
          {canViewMarketing && (
            <div className="mb-8 animate-slide-up">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Experiência & Marketing</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.filter(k => ['nps', 'referrals', 'leads_total'].includes(k.id)).map((kpi) => (
                  <KPICard key={kpi.id} kpi={kpi} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Charts Section - apenas se tiver permissão para ver pelo menos uma seção */}
      {canViewAnyDashboardSection && monthlyData && (
        <div className="space-y-6 animate-slide-up">
          <h2 className="text-xl font-semibold">Análise Operacional Detalhada</h2>
          
          {/* Row 1: Financial Overview */}
          {(canViewFinancial || canViewCommercial) && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {canViewFinancial && <RevenueChart data={monthlyData} />}
              {canViewFinancial && last6Months.length > 0 && (
                <RevenueEvolutionChart monthlyDataList={last6Months} />
              )}
              {canViewFinancial && monthlyData.cabinets.length > 0 && (
                <RevenuePerCabinetChart data={monthlyData} />
              )}
              {canViewCommercial && <ConsultationFunnel data={monthlyData} />}
            </div>
          )}

          {/* Row 2: Marketing & Sources */}
          {canViewMarketing && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <ProspectingChart data={monthlyData} />
              <SourcesChart data={monthlyData} />
              <TopReferrersChart sourceEntries={currentMonthSourceEntries} />
            </div>
          )}

          {/* Row 3: Cabinets & Operations */}
          {canViewOperational && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <CabinetChart data={monthlyData} />
              <DelaysChart data={monthlyData} />
              {monthlyData.ownerAgenda && <OwnerAgendaChart data={monthlyData} />}
            </div>
          )}
        </div>
      )}

      {/* Summary Modal */}
      {summary && (
        <SummaryModal
          open={isSummaryOpen}
          onOpenChange={setIsSummaryOpen}
          summary={summary}
        />
      )}
    </div>
  )
}
