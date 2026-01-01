import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KPI } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  ArrowDown,
  ArrowUp,
  Minus,
  Target,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react'

interface KPICardProps {
  kpi: KPI
}

export function KPICard({ kpi }: KPICardProps) {
  const isPositive = kpi.change > 0
  const isNegative = kpi.change < 0

  // Status Icons mapping
  const StatusIcon = {
    success: CheckCircle,
    warning: AlertCircle,
    danger: XCircle,
  }[kpi.status]

  // Status Color mapping for Text
  const statusColorText = {
    success: 'text-emerald-600',
    warning: 'text-amber-500',
    danger: 'text-rose-600',
  }[kpi.status]

  // Status Color mapping for Border/Icon
  const statusColorClass = {
    success: 'text-emerald-500',
    warning: 'text-amber-400',
    danger: 'text-rose-500',
  }[kpi.status]

  const formatValue = (val: number, unit: string) => {
    if (val === undefined || val === null || isNaN(val)) {
      return '0'
    }
    if (unit === 'currency') {
      return new Intl.NumberFormat('pt-PT', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0,
      }).format(val)
    }
    if (unit === 'percent') {
      return `${val.toFixed(1)}%`
    }
    if (unit === 'ratio') {
      return `${val.toFixed(2)}x`
    }
    if (unit === 'time') {
      return `${val} min`
    }
    return val.toLocaleString('pt-PT')
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border-t-4 shadow-sm hover:shadow-md transition-shadow relative',
        {
          'border-t-emerald-500': kpi.status === 'success',
          'border-t-amber-400': kpi.status === 'warning',
          'border-t-rose-500': kpi.status === 'danger',
        },
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-6">
          {kpi.name}
        </CardTitle>
        <StatusIcon className={cn('h-5 w-5', statusColorClass)} />
      </CardHeader>
      <CardContent>
        <div
          className={cn('text-2xl font-bold tracking-tight', statusColorText)}
        >
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
            <p className="flex items-center text-xs text-muted-foreground mt-1">
              <Target className="mr-1 h-3 w-3 opacity-50" />
              Meta:{' '}
              <span className="font-medium ml-1">
                {typeof kpi.target === 'number'
                  ? formatValue(kpi.target, kpi.unit)
                  : kpi.target}
              </span>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
