import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TrendingUp, TrendingDown, Minus, Target, Users, Phone } from 'lucide-react'
import api from '@/services/api'
import type {
  ConversionFunnel,
  SourcePerformance,
  AcquisitionTrends,
  ProspectingPipeline,
} from '@/lib/types/dashboardMetrics'

interface MarketingAcquisitionSectionProps {
  clinicId: string
}

export function MarketingAcquisitionSection({ clinicId }: MarketingAcquisitionSectionProps) {
  const [loading, setLoading] = useState(true)
  const [funnel, setFunnel] = useState<ConversionFunnel | null>(null)
  const [sources, setSources] = useState<SourcePerformance | null>(null)
  const [trends, setTrends] = useState<AcquisitionTrends | null>(null)
  const [pipeline, setPipeline] = useState<ProspectingPipeline | null>(null)

  useEffect(() => {
    loadMetrics()
  }, [clinicId])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      const [funnelData, sourcesData, trendsData, pipelineData] = await Promise.all([
        api.dashboardMetrics.getConversionFunnel(clinicId),
        api.dashboardMetrics.getSourcePerformance(clinicId),
        api.dashboardMetrics.getAcquisitionTrends(clinicId),
        api.dashboardMetrics.getProspectingPipeline(clinicId),
      ])
      setFunnel(funnelData)
      setSources(sourcesData)
      setTrends(trendsData)
      setPipeline(pipelineData)
    } catch (error) {
      console.error('Failed to load marketing metrics:', error)
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

  const formatPercent = (value: number) => `${value.toFixed(1)}%`
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR' }).format(value)

  // Calcular taxas de conversão do funil
  const funnelConversionRate = (current: number, previous: number) =>
    previous > 0 ? (current / previous) * 100 : 0

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Target className="h-6 w-6" />
        Marketing e Aquisição
      </h2>

      {/* Funil de Conversão */}
      {funnel && (
        <Card>
          <CardHeader>
            <CardTitle>Funil de Conversão - Mês Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <div className="flex-1">
                  <div className="font-medium">1. Contatos</div>
                  <div className="text-2xl font-bold">{funnel.contactsThisMonth}</div>
                </div>
                {funnel.contactsPrevMonth > 0 && (
                  <Badge variant="outline">
                    Mês anterior: {funnel.contactsPrevMonth}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2 pl-6">
                <div className="text-xs text-muted-foreground">↓ {formatPercent(funnelConversionRate(funnel.firstConsultationsThisMonth, funnel.contactsThisMonth))}</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <div className="flex-1">
                  <div className="font-medium">2. Primeiras Consultas</div>
                  <div className="text-2xl font-bold">{funnel.firstConsultationsThisMonth}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-6">
                <div className="text-xs text-muted-foreground">↓ {formatPercent(funnelConversionRate(funnel.plansCreatedThisMonth, funnel.firstConsultationsThisMonth))}</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <div className="flex-1">
                  <div className="font-medium">3. Planos Criados</div>
                  <div className="text-2xl font-bold">{funnel.plansCreatedThisMonth}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-6">
                <div className="text-xs text-muted-foreground">↓ {formatPercent(funnelConversionRate(funnel.plansPresentedThisMonth, funnel.plansCreatedThisMonth))}</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <div className="flex-1">
                  <div className="font-medium">4. Planos Apresentados</div>
                  <div className="text-2xl font-bold">{funnel.plansPresentedThisMonth}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pl-6">
                <div className="text-xs text-muted-foreground">↓ {formatPercent(funnelConversionRate(funnel.plansInExecutionThisMonth, funnel.plansPresentedThisMonth))}</div>
              </div>

              <div className="flex items-center justify-between p-3 bg-primary/10 rounded border-2 border-primary/20">
                <div className="flex-1">
                  <div className="font-medium">5. Planos em Execução</div>
                  <div className="text-2xl font-bold text-primary">{funnel.plansInExecutionThisMonth}</div>
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-sm">
                  <strong>Taxa de conversão geral:</strong>{' '}
                  {funnel.contactsThisMonth > 0
                    ? formatPercent((funnel.plansInExecutionThisMonth / funnel.contactsThisMonth) * 100)
                    : '0%'
                  } dos contatos viraram planos em execução
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance por Fonte */}
      {sources && sources.sources.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Performance por Fonte
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sources.sources.slice(0, 10).map((source) => {
                const conversionRate = source.firstConsultations > 0
                  ? (source.plansInExecution / source.firstConsultations) * 100
                  : 0

                return (
                  <div key={source.sourceId} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                    <div className="flex-1">
                      <div className="font-medium flex items-center gap-2">
                        {source.sourceName}
                        {source.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                        {source.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                        {source.trend === 'stable' && <Minus className="h-4 w-4 text-gray-500" />}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {source.totalPatients} pacientes • {source.plansInExecution} em execução
                        {source.avgPlanValue > 0 && ` • Ticket médio: ${formatCurrency(source.avgPlanValue)}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={conversionRate >= 50 ? 'default' : 'secondary'}>
                        {formatPercent(conversionRate)}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        conversão
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline de Prospecção */}
      {pipeline && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Pipeline de Prospecção
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">Mês Atual</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Agendados:</span>
                    <strong>{pipeline.scheduledMonth}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Telefone:</span>
                    <strong>{pipeline.phoneMonth}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>WhatsApp:</span>
                    <strong>{pipeline.whatsappMonth}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Presencial:</span>
                    <strong>{pipeline.inPersonMonth}</strong>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-medium">Total:</span>
                    <strong>{pipeline.totalContactsMonth}</strong>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">Comparativo</div>
                <div className="text-3xl font-bold">{pipeline.totalContactsMonth}</div>
                <div className="text-sm text-muted-foreground">contatos este mês</div>
                <div className="mt-4">
                  <div className="text-xs text-muted-foreground">Mês anterior:</div>
                  <div className="text-xl font-semibold">{pipeline.totalContactsPrevMonth}</div>
                  {pipeline.totalContactsPrevMonth > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      {pipeline.totalContactsMonth > pipeline.totalContactsPrevMonth ? (
                        <>
                          <TrendingUp className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-500">
                            +{formatPercent(((pipeline.totalContactsMonth - pipeline.totalContactsPrevMonth) / pipeline.totalContactsPrevMonth) * 100)}
                          </span>
                        </>
                      ) : pipeline.totalContactsMonth < pipeline.totalContactsPrevMonth ? (
                        <>
                          <TrendingDown className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-500">
                            {formatPercent(((pipeline.totalContactsMonth - pipeline.totalContactsPrevMonth) / pipeline.totalContactsPrevMonth) * 100)}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-gray-500">Sem alteração</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tendências de Aquisição */}
      {trends && trends.trends.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendências de Aquisição (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trends.trends.map((trend) => (
                <div key={trend.month} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium w-24">
                      {new Date(trend.month).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground">
                      {trend.newPatients} novos pacientes
                      {trend.plansPresented > 0 && ` • ${trend.plansPresented} planos apresentados`}
                      {trend.plansStarted > 0 && ` • ${trend.plansStarted} iniciados`}
                    </div>
                  </div>
                  {trend.totalValuePresented > 0 && (
                    <div className="text-sm font-medium">
                      {formatCurrency(trend.totalValuePresented)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
