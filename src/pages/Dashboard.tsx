import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AlertTriangle, Calendar as CalendarIcon, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { KPICard } from '@/components/KPICard'
import useDataStore from '@/stores/useDataStore'
import { MONTHS } from '@/lib/types'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Line,
  LineChart,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { calculateKPIs, getClinic, getMonthlyData } = useDataStore()

  const [selectedMonth, setSelectedMonth] = useState<string>('12') // Default December
  const [selectedYear, setSelectedYear] = useState<string>('2023')

  const currentMonth = parseInt(selectedMonth)
  const currentYear = parseInt(selectedYear)

  const kpis = useMemo(() => {
    if (!clinicId) return []
    return calculateKPIs(clinicId, currentMonth, currentYear)
  }, [clinicId, currentMonth, currentYear, calculateKPIs])

  const clinic = clinicId ? getClinic(clinicId) : undefined
  const monthlyData = clinicId
    ? getMonthlyData(clinicId, currentMonth, currentYear)
    : undefined

  // Identify alerts
  const criticalKPIs = kpis.filter((k) => k.status === 'danger')

  // Prepare chart data (Last 6 months)
  const chartData = useMemo(() => {
    if (!clinicId) return []
    const data = []
    for (let i = 5; i >= 0; i--) {
      let m = currentMonth - i
      let y = currentYear
      if (m <= 0) {
        m += 12
        y -= 1
      }
      const d = getMonthlyData(clinicId, m, y)
      if (d) {
        data.push({
          name: MONTHS[m - 1].slice(0, 3),
          revenue: d.revenue,
          expenses: d.expenses,
          patients: d.newPatients,
        })
      }
    }
    return data
  }, [clinicId, currentMonth, currentYear, getMonthlyData])

  const chartConfig = {
    revenue: {
      label: 'Faturamento',
      color: 'hsl(var(--chart-1))',
    },
    expenses: {
      label: 'Custos',
      color: 'hsl(var(--chart-2))',
    },
  }

  if (!clinic) {
    return <div className="p-8">Clínica não encontrada.</div>
  }

  return (
    <div className="flex flex-col gap-8 p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Visão geral de performance:{' '}
            <span className="font-semibold text-foreground">{clinic.name}</span>
          </p>
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

      {/* Alerts */}
      {criticalKPIs.length > 0 && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção Necessária</AlertTitle>
          <AlertDescription>
            {criticalKPIs.length} indicador(es) estão abaixo da meta crítica:
            <span className="font-semibold">
              {' '}
              {criticalKPIs.map((k) => k.name).join(', ')}
            </span>
            . Verifique os planos de ação sugeridos.
          </AlertDescription>
        </Alert>
      )}

      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KPICard key={kpi.id} kpi={kpi} />
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Faturamento vs Custos (Últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickFormatter={(value) => `R$${value / 1000}k`}
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[4, 4, 0, 0]}
                  name="Faturamento"
                />
                <Bar
                  dataKey="expenses"
                  fill="var(--color-expenses)"
                  radius={[4, 4, 0, 0]}
                  name="Custos"
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Novos Pacientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                patients: {
                  label: 'Pacientes',
                  color: 'hsl(var(--chart-3))',
                },
              }}
              className="h-[300px] w-full"
            >
              <LineChart data={chartData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line
                  type="monotone"
                  dataKey="patients"
                  stroke="var(--color-patients)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
