import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Clock } from 'lucide-react'
import api from '@/services/api'
import type {
  GuaranteedRevenue,
  PendingTreatmentsSummary,
  PlanConversionRate,
  PlansAtRisk,
} from '@/lib/types/dashboardMetrics'
import { useTranslation } from '@/hooks/useTranslation'

interface FinancialHealthSectionProps {
  clinicId: string
}

export function FinancialHealthSection({ clinicId }: FinancialHealthSectionProps) {
  const { formatCurrency } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [guaranteedRevenue, setGuaranteedRevenue] = useState<GuaranteedRevenue | null>(null)
  const [pendingTreatments, setPendingTreatments] = useState<PendingTreatmentsSummary | null>(null)
  const [conversionRate, setConversionRate] = useState<PlanConversionRate | null>(null)
  const [plansAtRisk, setPlansAtRisk] = useState<PlansAtRisk | null>(null)

  useEffect(() => {
    loadMetrics()
  }, [clinicId])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      const [revenue, pending, conversion, risk] = await Promise.all([
        api.dashboardMetrics.getGuaranteedRevenue(clinicId),
        api.dashboardMetrics.getPendingTreatments(clinicId),
        api.dashboardMetrics.getPlanConversionRate(clinicId),
        api.dashboardMetrics.getPlansAtRisk(clinicId),
      ])
      setGuaranteedRevenue(revenue)
      setPendingTreatments(pending)
      setConversionRate(conversion)
      setPlansAtRisk(risk)
    } catch (error) {
      console.error('Failed to load financial metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-32 bg-muted rounded-lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <DollarSign className="h-6 w-6" />
        Saúde Financeira
      </h2>

      {/* Receita Garantida */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Garantida - Próximos 30 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(guaranteedRevenue?.next30Days.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Parcelas a receber
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximos 60 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(guaranteedRevenue?.next60Days.total || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximos 90 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(guaranteedRevenue?.next90Days.total || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Receita Previsível */}
      <Card>
        <CardHeader>
          <CardTitle>Receita Previsível - Tratamentos Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-2xl font-bold">
                {formatCurrency(pendingTreatments?.totalValue || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Valor Total Pendente</p>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {pendingTreatments?.numPatients || 0}
              </div>
              <p className="text-sm text-muted-foreground">Pacientes</p>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {pendingTreatments?.numTreatments || 0}
              </div>
              <p className="text-sm text-muted-foreground">Tratamentos</p>
            </div>
          </div>
          <Alert className="mt-4">
            <AlertDescription className="text-xs">
              * Receita potencial - baseada em planos apresentados mas não totalmente executados
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Parcelas Atrasadas */}
      {guaranteedRevenue && guaranteedRevenue.overdue.count > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{guaranteedRevenue.overdue.count} parcelas atrasadas</strong> -
            Total: {formatCurrency(guaranteedRevenue.overdue.amount)}
          </AlertDescription>
        </Alert>
      )}

      {/* Taxa de Conversão */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Taxa de Conversão de Planos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">
                {conversionRate?.conversionRate.toFixed(1) || 0}%
              </div>
              {conversionRate && (
                <Badge variant={conversionRate.trend === 'up' ? 'default' : 'secondary'}>
                  {conversionRate.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {conversionRate.change > 0 ? '+' : ''}
                  {conversionRate.change.toFixed(1)}%
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Planos apresentados que iniciaram execução
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Aguardando início:</span>
                <strong>{conversionRate?.currentStatus.waiting || 0}</strong>
              </div>
              <div className="flex justify-between text-sm">
                <span>Em execução:</span>
                <strong>{conversionRate?.currentStatus.executing || 0}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planos em Risco */}
      {plansAtRisk && plansAtRisk.totalAtRisk > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Planos em Risco de Abandono ({plansAtRisk.totalAtRisk})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-3 mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Aguardando há muito tempo:</span>
                  <strong className="ml-1">{plansAtRisk.byRiskType.waiting_too_long}</strong>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Estagnados:</span>
                  <strong className="ml-1">{plansAtRisk.byRiskType.stagnated}</strong>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-orange-600" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Progresso baixo:</span>
                  <strong className="ml-1">{plansAtRisk.byRiskType.low_progress}</strong>
                </div>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {plansAtRisk.plans.slice(0, 10).map((plan) => (
                <div
                  key={plan.id}
                  className="flex justify-between items-start p-3 bg-white rounded border text-sm"
                >
                  <div className="flex-1">
                    <div className="font-medium">{plan.patientName}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {plan.suggestedAction}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="font-bold text-orange-600">
                      {formatCurrency(plan.pendingValue)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {plan.daysSinceLastActivity} dias parado
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
