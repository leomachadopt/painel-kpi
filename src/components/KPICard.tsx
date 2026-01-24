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
import { useTranslation } from '@/hooks/useTranslation'

interface KPICardProps {
  kpi: KPI
}

export function KPICard({ kpi }: KPICardProps) {
  const { t, formatCurrency, formatNumber } = useTranslation()
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
      return formatCurrency(val)
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
    return formatNumber(val)
  }

  return (
    <Card
      className={cn(
        'overflow-hidden border-t-4 transition-all duration-300 relative group bg-white hover:scale-[1.02]',
        {
          'border-t-emerald-500': kpi.status === 'success',
          'border-t-amber-400': kpi.status === 'warning',
          'border-t-rose-500': kpi.status === 'danger',
        },
      )}
      style={{
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02)'
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-transparent group-hover:from-primary/5 group-hover:via-transparent group-hover:to-primary/5 transition-all duration-300 pointer-events-none rounded-xl" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-6">
          {kpi.name}
        </CardTitle>
        <StatusIcon className={cn('h-5 w-5 transition-transform group-hover:scale-110', statusColorClass)} />
      </CardHeader>
      <CardContent className="relative z-10">
        <div
          className={cn('text-2xl font-bold tracking-tight mb-2', statusColorText)}
        >
          {formatValue(kpi.value, kpi.unit)}
        </div>
        <div className="flex flex-col gap-1.5 mt-1">
          <p className="flex items-center text-xs text-muted-foreground">
            {isPositive ? (
              <ArrowUp className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
            ) : isNegative ? (
              <ArrowDown className="mr-1.5 h-3.5 w-3.5 text-rose-500" />
            ) : (
              <Minus className="mr-1.5 h-3.5 w-3.5" />
            )}
            <span
              className={cn('font-semibold', {
                'text-emerald-600': isPositive && kpi.status !== 'danger',
                'text-rose-600': isNegative && kpi.status !== 'success',
              })}
            >
              {Math.abs(kpi.change).toFixed(1)}%
            </span>
            <span className="ml-1">{t('kpi.vsPreviousMonth')}</span>
          </p>
          {kpi.target !== undefined && (
            <p className="flex items-center text-xs text-muted-foreground mt-0.5">
              <Target className="mr-1.5 h-3 w-3 opacity-60" />
              {t('kpi.target')}{' '}
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
