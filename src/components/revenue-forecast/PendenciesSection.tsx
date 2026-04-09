import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import api from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/useTranslation'

interface PendenciesSectionProps {
  clinicId: string
  refreshTrigger: number
}

interface Pendency {
  patientCode: string
  patientName: string
  totalPayments: number
  totalProcedures: number
  balance: number
}

interface PatientDetail {
  patientCode: string
  patientName: string
  totalPayments: number
  totalProcedures: number
  balance: number
  payments: Array<{
    id: string
    date: string
    value: number
    categoryId: string
  }>
  procedures: Array<{
    id: string
    procedureCode: string
    procedureDescription: string
    value: number
    completedAt: string
  }>
}

export function PendenciesSection({ clinicId, refreshTrigger }: PendenciesSectionProps) {
  const { toast } = useToast()
  const { formatCurrency } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [pendencies, setPendencies] = useState<Pendency[]>([])
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null)
  const [patientDetails, setPatientDetails] = useState<Record<string, PatientDetail>>({})
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadPendencies()
  }, [clinicId, refreshTrigger])

  const loadPendencies = async () => {
    setLoading(true)
    try {
      const data = await api.revenueForecast.getPendencies(clinicId)
      setPendencies(data.pendencies)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar pendências',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePatient = async (patientCode: string) => {
    if (expandedPatient === patientCode) {
      setExpandedPatient(null)
      return
    }

    setExpandedPatient(patientCode)

    // Load patient details if not already loaded
    if (!patientDetails[patientCode]) {
      setLoadingDetails({ ...loadingDetails, [patientCode]: true })
      try {
        const data = await api.revenueForecast.getPatientBalance(clinicId, patientCode)
        setPatientDetails({ ...patientDetails, [patientCode]: data })
      } catch (error: any) {
        toast({
          title: 'Erro',
          description: 'Falha ao carregar detalhes do paciente',
          variant: 'destructive',
        })
      } finally {
        setLoadingDetails({ ...loadingDetails, [patientCode]: false })
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pendências Financeiras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    )
  }

  if (pendencies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pendências Financeiras</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-green-600 text-5xl mb-4">✅</div>
            <div className="text-lg font-semibold text-green-600">Sem pendências!</div>
            <p className="text-muted-foreground mt-2">
              Todos os pacientes estão com os pagamentos em dia
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          Pendências Financeiras
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Pacientes com saldo devedor (procedimentos executados &gt; pagamentos recebidos)
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendencies.map((pendency) => {
            const details = patientDetails[pendency.patientCode]
            const isExpanded = expandedPatient === pendency.patientCode
            const isLoadingDetails = loadingDetails[pendency.patientCode]

            return (
              <div key={pendency.patientCode} className="border rounded-lg">
                {/* Patient Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => togglePatient(pendency.patientCode)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold flex items-center gap-2">
                        <span className="text-primary">{pendency.patientName}</span>
                        <Badge variant="outline" className="text-xs">
                          #{pendency.patientCode}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Procedimentos: {formatCurrency(pendency.totalProcedures)} •
                        Pagamentos: {formatCurrency(pendency.totalPayments)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Saldo Devedor</div>
                    <div className="text-xl font-bold text-destructive">
                      {formatCurrency(Math.abs(pendency.balance))}
                    </div>
                  </div>
                </div>

                {/* Details Section */}
                {isExpanded && (
                  <div className="border-t bg-muted/10">
                    {isLoadingDetails ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Carregando detalhes...
                      </div>
                    ) : details ? (
                      <div className="p-4 space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-background border rounded-lg p-4">
                            <div className="text-sm text-muted-foreground">Procedimentos Executados</div>
                            <div className="text-2xl font-bold text-orange-600">
                              {formatCurrency(details.totalProcedures)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {details.procedures.length} procedimentos
                            </div>
                          </div>
                          <div className="bg-background border rounded-lg p-4">
                            <div className="text-sm text-muted-foreground">Pagamentos Recebidos</div>
                            <div className="text-2xl font-bold text-green-600">
                              {formatCurrency(details.totalPayments)}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {details.payments.length} pagamentos
                            </div>
                          </div>
                          <div className="bg-background border rounded-lg p-4">
                            <div className="text-sm text-muted-foreground">Saldo</div>
                            <div className="text-2xl font-bold text-destructive">
                              {formatCurrency(Math.abs(details.balance))}
                            </div>
                            <div className="text-xs text-red-600 mt-1">
                              A receber
                            </div>
                          </div>
                        </div>

                        {/* Two Columns: Procedures and Payments */}
                        <div className="grid grid-cols-2 gap-6">
                          {/* Procedures Column */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <span className="text-orange-600">⚕️</span>
                              Procedimentos Executados
                            </h4>
                            {details.procedures.length === 0 ? (
                              <div className="text-sm text-muted-foreground italic">
                                Nenhum procedimento executado
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {details.procedures.map((proc) => (
                                  <div
                                    key={proc.id}
                                    className="bg-orange-50 border border-orange-200 rounded p-3 text-sm"
                                  >
                                    <div className="font-medium text-orange-900">
                                      {proc.procedureDescription}
                                    </div>
                                    <div className="text-xs text-orange-600 mt-1">
                                      {proc.procedureCode} • {formatDate(proc.completedAt)}
                                    </div>
                                    <div className="text-right font-semibold text-orange-700 mt-1">
                                      {formatCurrency(proc.value)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Payments Column */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <span className="text-green-600">💰</span>
                              Pagamentos Recebidos
                            </h4>
                            {details.payments.length === 0 ? (
                              <div className="text-sm text-muted-foreground italic">
                                Nenhum pagamento registrado
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {details.payments.map((payment) => (
                                  <div
                                    key={payment.id}
                                    className="bg-green-50 border border-green-200 rounded p-3 text-sm"
                                  >
                                    <div className="font-medium text-green-900">
                                      Pagamento
                                    </div>
                                    <div className="text-xs text-green-600 mt-1">
                                      {formatDate(payment.date)}
                                    </div>
                                    <div className="text-right font-semibold text-green-700 mt-1">
                                      {formatCurrency(payment.value)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
