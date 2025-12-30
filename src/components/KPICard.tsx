import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KPI } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

interface KPICardProps {
  kpi: KPI
}

export function KPICard({ kpi }: KPICardProps) {
  const isPositive = kpi.change > 0
  const isNegative = kpi.change < 0

  // Determine color based on status
  const statusColor = {
    success: 'text-emerald-600',
    warning: 'text-amber-500',
    danger: 'text-rose-600',
  }[kpi.status]

  const formatValue = (val: number, unit: string) => {
    if (unit === 'currency') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(val)
    }
    if (unit === 'percent') {
      return `${val.toFixed(1)}%`
    }
    if (unit === 'ratio') {
      return `${val.toFixed(2)}x`
    }
    return val.toLocaleString('pt-BR')
  }

  return (
    <Card
      className="overflow-hidden border-t-4 data-[status=success]:border-t-emerald-500 data-[status=warning]:border-t-amber-400 data-[status=danger]:border-t-rose-500 shadow-sm hover:shadow-md transition-shadow"
      data-status={kpi.status}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {kpi.name}
        </CardTitle>
        <div
          className={cn('h-2 w-2 rounded-full', {
            'bg-emerald-500': kpi.status === 'success',
            'bg-amber-400': kpi.status === 'warning',
            'bg-rose-500': kpi.status === 'danger',
          })}
        />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">
          {formatValue(kpi.value, kpi.unit)}
        </div>
        <p className="flex items-center text-xs text-muted-foreground mt-1">
          {isPositive ? (
            <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
          ) : isNegative ? (
            <ArrowDown className="mr-1 h-3 w-3 text-rose-500" />
          ) : (
            <Minus className="mr-1 h-3 w-3" />
          )}
          <span
            className={cn('font-medium', {
              'text-emerald-600': isPositive && kpi.status !== 'danger', // Contextual color logic could be more complex
              'text-rose-600': isNegative && kpi.status !== 'success',
            })}
          >
            {Math.abs(kpi.change).toFixed(1)}%
          </span>
          <span className="ml-1">vs mês anterior</span>
        </p>
      </CardContent>
    </Card>
  )
}
