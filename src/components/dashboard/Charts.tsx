import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Label,
  Cell,
  Line,
  LineChart,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartConfig,
} from '@/components/ui/chart'
import { MonthlyData } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

// --- Revenue Breakdown Chart ---
export function RevenueChart({ data }: { data: MonthlyData }) {
  const chartData = Object.entries(data.revenueByCategory || {}).map(
    ([name, value]) => ({ name, value }),
  )

  const chartConfig = {
    value: {
      label: 'Receita',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Receita por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[300px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                />
              ))}
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
                          {data.entryCounts?.financial || 0}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground text-xs"
                        >
                          Lançamentos
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
            <ChartLegend content={<ChartLegendContent nameKey="name" />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// --- Consultation Funnel Chart (COMPLETE) ---
export function ConsultationFunnel({ data }: { data: MonthlyData }) {
  const chartData = [
    { name: 'Agendadas', value: data.firstConsultationsScheduled },
    { name: 'Compareceram', value: data.firstConsultationsAttended },
    { name: 'Planos Criados', value: data.plansCreated },
    { name: 'Planos Apresentados', value: data.plansPresentedAdults + data.plansPresentedKids },
    { name: 'Planos Aceites', value: data.plansAccepted },
  ]

  const chartConfig = {
    value: {
      label: 'Planos',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig

  const conversionRate = data.firstConsultationsScheduled > 0
    ? ((data.plansAccepted / data.firstConsultationsScheduled) * 100).toFixed(1)
    : '0'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funil de Vendas Completo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-4">
          Conversão Total: {conversionRate}% | Consultas Registadas: {data.entryCounts?.consultations || 0}
        </div>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 140 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={130}
            />
            <XAxis dataKey="value" type="number" hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={4}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(var(--chart-${(index % 5) + 1}))`}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// --- Prospecting Leads Chart ---
export function ProspectingChart({ data }: { data: MonthlyData }) {
  const chartData = Object.entries(data.leadsByChannel || {}).map(
    ([channel, count]) => ({ channel, count }),
  )

  const chartConfig = {
    count: {
      label: 'Leads',
      color: 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leads por Canal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-4">
          Total Registos: {data.entryCounts?.prospecting || 0}
        </div>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="channel"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill="var(--color-count)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// --- Cabinet Usage Chart ---
export function CabinetChart({ data }: { data: MonthlyData }) {
  const chartData = data.cabinets.map((c) => ({
    name: c.name,
    used: c.hoursOccupied,
    available: c.hoursAvailable,
  }))

  const chartConfig = {
    used: {
      label: 'Horas Usadas',
      color: 'hsl(var(--chart-3))',
    },
    available: {
      label: 'Disponíveis',
      color: 'hsl(var(--muted))',
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ocupação Gabinetes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-4">
          Registos de Ocupação: {data.entryCounts?.cabinets || 0}
        </div>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="name"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="used"
              fill="var(--color-used)"
              radius={4}
              stackId="a"
            />
            <Bar
              dataKey="available"
              fill="var(--color-available)"
              radius={4}
              stackId="a"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// --- Delays Chart ---
export function DelaysChart({ data }: { data: MonthlyData }) {
  const chartData = [
    { name: 'Paciente', value: data.delayReasons?.patient || 0 },
    { name: 'Médico', value: data.delayReasons?.doctor || 0 },
  ]

  const chartConfig = {
    value: {
      label: 'Atrasos',
      color: 'hsl(var(--destructive))',
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Motivos de Atraso</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-4">
          Tempo Médio: {data.avgWaitTime} min | Total:{' '}
          {data.entryCounts?.serviceTime || 0}
        </div>
        <ChartContainer
          config={chartConfig}
          className="aspect-square max-h-[250px] mx-auto"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent />} />
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={40}
              paddingAngle={5}
            >
              <Cell fill="hsl(var(--chart-4))" />
              <Cell fill="hsl(var(--chart-5))" />
            </Pie>
            <ChartLegend content={<ChartLegendContent />} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// --- Sources Chart ---
export function SourcesChart({ data }: { data: MonthlyData }) {
  const chartData = Object.entries(data.sourceDistribution || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5) // Top 5

  const chartConfig = {
    value: {
      label: 'Pacientes',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Fontes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-4">
          Registos: {data.entryCounts?.sources || 0}
        </div>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid horizontal={false} />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <XAxis dataKey="value" type="number" hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// --- Revenue Evolution Chart (6 months) ---
export function RevenueEvolutionChart({ monthlyDataList }: { monthlyDataList: MonthlyData[] }) {
  // Expect last 6 months in chronological order
  const chartData = monthlyDataList.slice(-6).map((m) => ({
    month: `${m.month}/${m.year.toString().slice(-2)}`,
    revenue: m.revenueTotal,
  }))

  const chartConfig = {
    revenue: {
      label: 'Faturação',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evolução Mensal de Receita</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis hide />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="var(--color-revenue)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// --- Owner Agenda Distribution Chart ---
export function OwnerAgendaChart({ data }: { data: MonthlyData }) {
  const chartData = [
    { name: 'Operacional', hours: data.ownerAgenda?.operational || 0 },
    { name: 'Planejamento', hours: data.ownerAgenda?.planning || 0 },
    { name: 'Comercial', hours: data.ownerAgenda?.sales || 0 },
    { name: 'Liderança', hours: data.ownerAgenda?.leadership || 0 },
  ]

  const chartConfig = {
    hours: {
      label: 'Horas',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig

  const total = chartData.reduce((sum, item) => sum + item.hours, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição Agenda do Dono</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground mb-4">
          Total: {total}h no mês
        </div>
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid horizontal={false} />
            <XAxis type="number" hide />
            <YAxis
              dataKey="name"
              type="category"
              tickLine={false}
              axisLine={false}
              width={100}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="hours" radius={4}>
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(var(--chart-${index + 1}))`}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// --- Revenue per Cabinet Chart ---
export function RevenuePerCabinetChart({ data }: { data: MonthlyData }) {
  const chartData = data.cabinets
    .map(c => ({
      name: c.name,
      revenue: c.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  const chartConfig = {
    revenue: {
      label: 'Receita',
      color: 'hsl(var(--chart-2))',
    },
  } satisfies ChartConfig

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Receita por Gabinete</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-[4/3] max-h-[300px] w-full"
        >
          <BarChart data={chartData} layout="horizontal">
            <CartesianGrid vertical={false} />
            <XAxis type="number" dataKey="revenue" tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" width={100} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                formatter={(value) => `€${Number(value).toLocaleString('pt-PT')}`}
              />}
            />
            <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
