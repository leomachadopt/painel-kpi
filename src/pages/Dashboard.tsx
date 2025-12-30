import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Calendar as CalendarIcon, Download, TrendingUp } from 'lucide-react'
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
  Line,
  LineChart,
  PieChart,
  Pie,
  Cell,
  Label,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export default function Dashboard() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { calculateKPIs, getClinic, getMonthlyData } = useDataStore()

  const [selectedMonth, setSelectedMonth] = useState<string>('12')
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

  const criticalKPIs = kpis.filter((k) => k.status === 'danger')

  // Prepare chart data (Last 6 months)
  const historyData = useMemo(() => {
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
          revenue: d.revenueTotal,
          expenses: d.expenses,
          nps: d.nps,
          occupancy:
            (d.cabinets.reduce((acc, c) => acc + c.hoursOccupied, 0) /
              d.cabinets.reduce((acc, c) => acc + c.hoursAvailable, 0)) *
            100,
        })
      }
    }
    return data
  }, [clinicId, currentMonth, currentYear, getMonthlyData])

  const revenueDistributionData = useMemo(() => {
    if (!monthlyData) return []
    return [
      {
        name: 'Alinhadores',
        value: monthlyData.revenueAligners,
        fill: 'hsl(var(--chart-1))',
      },
      {
        name: 'Odontopediatria',
        value: monthlyData.revenuePediatrics,
        fill: 'hsl(var(--chart-2))',
      },
      {
        name: 'Dentisteria',
        value: monthlyData.revenueDentistry,
        fill: 'hsl(var(--chart-3))',
      },
      {
        name: 'Outros',
        value: monthlyData.revenueOthers,
        fill: 'hsl(var(--chart-4))',
      },
    ].filter((d) => d.value > 0)
  }, [monthlyData])

  const chartConfig = {
    revenue: { label: 'Faturamento', color: 'hsl(var(--chart-1))' },
    expenses: { label: 'Custos', color: 'hsl(var(--chart-2))' },
    nps: { label: 'NPS', color: 'hsl(var(--chart-3))' },
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
            {clinic.name} - {MONTHS[currentMonth - 1]} {currentYear}
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
          <TrendingUp className="h-4 w-4" />
          <AlertTitle>Oportunidades de Melhoria</AlertTitle>
          <AlertDescription>
            {criticalKPIs.length} indicador(es) abaixo da meta crítica:
            <span className="font-semibold">
              {' '}
              {criticalKPIs.map((k) => k.name).join(', ')}
            </span>
            .
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
            <CardTitle>Faturamento vs Custos</CardTitle>
            <CardDescription>Evolução últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={historyData}>
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
            <CardTitle>Distribuição de Receita</CardTitle>
            <CardDescription>Por categoria no mês atual</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer
              config={{
                aligners: {
                  label: 'Alinhadores',
                  color: 'hsl(var(--chart-1))',
                },
                pediatrics: {
                  label: 'Pediatria',
                  color: 'hsl(var(--chart-2))',
                },
                dentistry: {
                  label: 'Dentisteria',
                  color: 'hsl(var(--chart-3))',
                },
                others: { label: 'Outros', color: 'hsl(var(--chart-4))' },
              }}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel />}
                />
                <Pie
                  data={revenueDistributionData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  strokeWidth={5}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {monthlyData?.revenueTotal
                                ? `R$${(monthlyData.revenueTotal / 1000).toFixed(0)}k`
                                : '0'}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground text-xs"
                            >
                              Total
                            </tspan>
                          </text>
                        )
                      }
                    }}
                  />
                  {revenueDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="col-span-7">
          <CardHeader>
            <CardTitle>Taxa de Ocupação & NPS</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                occupancy: {
                  label: 'Ocupação (%)',
                  color: 'hsl(var(--chart-4))',
                },
                nps: { label: 'NPS', color: 'hsl(var(--chart-5))' },
              }}
              className="h-[300px] w-full"
            >
              <LineChart data={historyData}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis yAxisId="left" axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="occupancy"
                  stroke="var(--color-occupancy)"
                  strokeWidth={2}
                  name="Ocupação %"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="nps"
                  stroke="var(--color-nps)"
                  strokeWidth={2}
                  name="NPS"
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
