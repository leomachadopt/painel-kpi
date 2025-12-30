import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  Download,
  Info,
  AlertTriangle,
  FileText,
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

export default function Dashboard() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { calculateKPIs, calculateAlerts, getClinic } = useDataStore()

  const [selectedMonth, setSelectedMonth] = useState<string>('12')
  const [selectedYear, setSelectedYear] = useState<string>('2023')
  const [isSummaryOpen, setIsSummaryOpen] = useState(false)

  const currentMonth = parseInt(selectedMonth)
  const currentYear = parseInt(selectedYear)

  const kpis = useMemo(() => {
    if (!clinicId) return []
    return calculateKPIs(clinicId, currentMonth, currentYear)
  }, [clinicId, currentMonth, currentYear, calculateKPIs])

  const alerts = useMemo(() => {
    if (!clinicId) return []
    return calculateAlerts(clinicId, currentMonth, currentYear)
  }, [clinicId, currentMonth, currentYear, calculateAlerts])

  const clinic = clinicId ? getClinic(clinicId) : undefined

  const summary = useMemo(() => {
    if (!clinic) return null
    return generateSummary(
      clinic.name,
      MONTHS[currentMonth - 1],
      currentYear,
      kpis,
      alerts,
    )
  }, [clinic, currentMonth, currentYear, kpis, alerts])

  if (!clinic) {
    return <div className="p-8">Clínica não encontrada.</div>
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold tracking-tight">
            Dashboard de Performance
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="font-medium text-foreground">{clinic.name}</span>
            <span>•</span>
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
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="animate-fade-in-down">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Alertas Críticos ({alerts.length})
          </h2>
          <div className="grid gap-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} variant={alert.severity}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{alert.rule}</AlertTitle>
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        </div>
      )}

      {/* KPI Grid - 12 Cards */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <h2 className="text-xl font-semibold">Indicadores-Chave</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Monitoramento dos 12 pilares de sucesso da clínica.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <KPICard key={kpi.id} kpi={kpi} />
          ))}
        </div>
      </div>

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
