import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar as CalendarIcon, Download, Info } from 'lucide-react'
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

export default function Dashboard() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { calculateKPIs, getClinic } = useDataStore()

  const [selectedMonth, setSelectedMonth] = useState<string>('12')
  const [selectedYear, setSelectedYear] = useState<string>('2023')

  const currentMonth = parseInt(selectedMonth)
  const currentYear = parseInt(selectedYear)

  const kpis = useMemo(() => {
    if (!clinicId) return []
    return calculateKPIs(clinicId, currentMonth, currentYear)
  }, [clinicId, currentMonth, currentYear, calculateKPIs])

  const clinic = clinicId ? getClinic(clinicId) : undefined

  if (!clinic) {
    return <div className="p-8">Clínica não encontrada.</div>
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
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

      {/* KPI Grid - 12 Cards */}
      <div>
        <div className="flex items-center gap-2 mb-4">
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
    </div>
  )
}
