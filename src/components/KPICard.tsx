import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KPI } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ArrowDown, ArrowUp, Minus, Target } from 'lucide-react'

interface KPICardProps {
  kpi: KPI
}

export function KPICard({ kpi }: KPICardProps) {
  const isPositive = kpi.change > 0
  const isNegative = kpi.change < 0

  const formatValue = (val: number, unit: string) => {
    if (unit === 'currency') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
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
      className="overflow-hidden border-t-4 data-[status=success]:border-t-emerald-500 data-[status=warning]:border-t-amber-400 data-[status=danger]:border-t-rose-500 shadow-sm hover:shadow-md transition-shadow relative"
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
        <div className="flex flex-col gap-1 mt-1">
          <p className="flex items-center text-xs text-muted-foreground">
            {isPositive ? (
              <ArrowUp className="mr-1 h-3 w-3 text-emerald-500" />
            ) : isNegative ? (
              <ArrowDown className="mr-1 h-3 w-3 text-rose-500" />
            ) : (
              <Minus className="mr-1 h-3 w-3" />
            )}
            <span
              className={cn('font-medium', {
                'text-emerald-600': isPositive && kpi.status !== 'danger',
                'text-rose-600': isNegative && kpi.status !== 'success',
              })}
            >
              {Math.abs(kpi.change).toFixed(1)}%
            </span>
            <span className="ml-1">vs mês anterior</span>
          </p>
          {kpi.target !== undefined && (
            <p className="flex items-center text-xs text-muted-foreground">
              <Target className="mr-1 h-3 w-3 opacity-50" />
              Meta:{' '}
              <span className="font-medium ml-1">
                {formatValue(Number(kpi.target), kpi.unit)}
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
