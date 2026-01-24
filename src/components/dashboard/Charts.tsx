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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslation } from '@/hooks/useTranslation'

// --- Revenue Breakdown Chart ---
export function RevenueChart({ data }: { data: MonthlyData }) {
  const { t } = useTranslation()
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
        <CardTitle>{t('charts.revenueByCategory')}</CardTitle>
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
  const { t } = useTranslation()
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
        <CardTitle>{t('charts.completeSalesFunnel')}</CardTitle>
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
  const { t } = useTranslation()
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
        <CardTitle>{t('charts.leadsByChannel')}</CardTitle>
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
  const { t } = useTranslation()
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
        <CardTitle>{t('financial.cabinetOccupation')}</CardTitle>
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
  const { t } = useTranslation()
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
        <CardTitle>{t('charts.delayReasons')}</CardTitle>
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
  const { t } = useTranslation()
  const chartData = Object.entries(data.sourceDistribution || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5) // Top 5

  const total = chartData.reduce((sum, item) => sum + item.value, 0)
  const hasData = total > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.topSources')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm font-medium text-muted-foreground mb-4">
          Total de pacientes: {total}
        </div>
        {hasData ? (
          <div className="space-y-3">
            {chartData.map((item, index) => {
              const percentage = ((item.value / total) * 100).toFixed(1)
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">
                      {item.value} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all rounded-full"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-8">
            Nenhum registo de fonte neste período
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Revenue Evolution Chart (6 months) ---
export function RevenueEvolutionChart({ monthlyDataList }: { monthlyDataList: MonthlyData[] }) {
  const { t, formatCurrency, locale } = useTranslation()
  const currencySymbol = locale === 'PT-BR' ? 'R$' : '€'

  // Expect last 6 months in chronological order
  const chartData = monthlyDataList.slice(-6).map((m) => ({
    month: `${m.month}/${m.year.toString().slice(-2)}`,
    revenue: m.revenueTotal || 0,
  }))

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0)
  const hasData = totalRevenue > 0 && chartData.length > 0

  const chartConfig = {
    revenue: {
      label: t('financial.billing'),
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig

  // Format tick based on value size
  const formatTick = (value: number) => {
    if (value >= 1000) {
      return `${currencySymbol}${(value / 1000).toFixed(0)}k`
    }
    return `${currencySymbol}${value.toFixed(0)}`
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.monthlyRevenueEvolution')}</CardTitle>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="w-full h-[250px]">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => formatTick(value)}
                tick={{ fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <ChartTooltip
                content={<ChartTooltipContent
                  formatter={(value) => formatCurrency(Number(value))}
                />}
              />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-revenue)"
                strokeWidth={3}
                dot={{ r: 5, fill: 'var(--color-revenue)' }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ChartContainer>
        ) : (
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-center text-sm text-muted-foreground">
              <p>Nenhuma receita registada nos últimos 6 meses</p>
              <p className="text-xs mt-2">Lance faturas para ver a evolução aqui</p>
            </div>
          </div>
        )}
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
  const { t, formatCurrency, locale } = useTranslation()
  const currencySymbol = locale === 'PT-BR' ? 'R$' : '€'

  const chartData = data.cabinets
    .filter(c => (c.revenue || 0) > 0) // Only cabinets with revenue
    .map(c => ({
      gabinete: c.name,
      valor: Number(c.revenue) || 0,
    }))
    .sort((a, b) => b.valor - a.valor)

  const totalRevenue = chartData.reduce((sum, item) => sum + item.valor, 0)
  const hasData = chartData.length > 0

  // Format tick based on value size
  const formatTick = (value: number) => {
    if (value >= 1000) {
      return `${currencySymbol}${(value / 1000).toFixed(0)}k`
    }
    return `${currencySymbol}${value}`
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>{t('financial.revenuePerCabinet')}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 py-6 px-4">
        {hasData ? (
          <>
            <div className="text-sm text-muted-foreground mb-6">
              Total: <span className="font-semibold text-foreground">{formatCurrency(totalRevenue)}</span>
            </div>
            <div style={{ width: '100%', height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 10, right: 60, left: 10, bottom: 10 }}
                  barCategoryGap="10%"
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    tickFormatter={formatTick}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="gabinete"
                    width={140}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Receita']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      padding: '8px 12px'
                    }}
                  />
                  <Bar
                    dataKey="valor"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-[200px]">
            <div className="text-center text-sm text-muted-foreground">
              <p>Nenhuma receita registada por gabinete neste mês</p>
              <p className="text-xs mt-2">Lance faturas para ver os dados aqui</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// --- Top Referrers Chart (Ranking de Pacientes que Mais Indicaram) ---
export function TopReferrersChart({ sourceEntries }: { sourceEntries: any[] }) {
  const { t } = useTranslation()
  // Count referrals by patient
  const referralCounts: Record<string, { name: string; code: string; count: number }> = {}

  sourceEntries.forEach((entry) => {
    if (entry.isReferral && entry.referralName && entry.referralCode) {
      const key = `${entry.referralCode}-${entry.referralName}`
      if (!referralCounts[key]) {
        referralCounts[key] = {
          name: entry.referralName,
          code: entry.referralCode,
          count: 0,
        }
      }
      referralCounts[key].count += 1
    }
  })

  // Convert to array and sort
  const topReferrers = Object.values(referralCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10) // Top 10

  const hasData = topReferrers.length > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('charts.topReferrers')}</CardTitle>
        <CardDescription>Pacientes que mais indicaram novos pacientes</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <div className="space-y-3">
            {topReferrers.map((referrer, index) => (
              <div key={`${referrer.code}-${referrer.name}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{referrer.name}</div>
                    <div className="text-xs text-muted-foreground font-mono">{referrer.code}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-primary">{referrer.count}</span>
                  <span className="text-xs text-muted-foreground">
                    {referrer.count === 1 ? 'indicação' : 'indicações'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-sm text-muted-foreground py-8">
            Nenhuma referência neste período
          </div>
        )}
      </CardContent>
    </Card>
  )
}
