import { useState, useEffect } from 'react'
import { Check, Pencil, Trash2, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/useTranslation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface RevenueForecastPlansSectionProps {
  clinicId: string
  refreshTrigger: number
  onRefresh: () => void
}

export function RevenueForecastPlansSection({
  clinicId,
  refreshTrigger,
  onRefresh,
}: RevenueForecastPlansSectionProps) {
  const { toast } = useToast()
  const { formatCurrency } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [plans, setPlans] = useState<any[]>([])
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'plan' | 'installment'; id: string } | null>(
    null
  )

  useEffect(() => {
    loadPlans()
  }, [clinicId, refreshTrigger])

  const loadPlans = async () => {
    setLoading(true)
    try {
      const data = await api.revenueForecast.getPlans(clinicId)
      setPlans(data)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar planos de receita',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePlan = (planId: string) => {
    setExpandedPlan(expandedPlan === planId ? null : planId)
  }

  const handleMarkAsReceived = async (installmentId: string) => {
    try {
      await api.revenueForecast.updateInstallment(clinicId, installmentId, {
        status: 'RECEBIDO',
        receivedDate: new Date().toISOString().split('T')[0],
      })
      toast({
        title: 'Sucesso',
        description: 'Parcela marcada como recebida',
      })
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar parcela',
        variant: 'destructive',
      })
    }
  }

  const handleRevertReceived = async (installmentId: string) => {
    try {
      await api.revenueForecast.revertInstallment(clinicId, installmentId)
      toast({
        title: 'Sucesso',
        description: 'Parcela revertida para A_RECEBER',
      })
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao reverter parcela',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      if (deleteConfirm.type === 'plan') {
        await api.revenueForecast.deletePlan(clinicId, deleteConfirm.id)
        toast({
          title: 'Sucesso',
          description: 'Plano de receita excluído',
        })
      } else {
        await api.revenueForecast.deleteInstallment(clinicId, deleteConfirm.id)
        toast({
          title: 'Sucesso',
          description: 'Parcela excluída',
        })
      }
      setDeleteConfirm(null)
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      A_RECEBER: { label: 'A Receber', variant: 'default' as const, className: 'bg-green-100 text-green-800' },
      RECEBIDO: { label: 'Recebido', variant: 'secondary' as const, className: 'bg-blue-100 text-blue-800' },
      ATRASADO: { label: 'Atrasado', variant: 'destructive' as const, className: 'bg-red-100 text-red-800' },
    }

    const config = variants[status as keyof typeof variants] || variants.A_RECEBER

    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
        {status === 'ATRASADO' && ' ⚠️'}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receitas Recorrentes (Mensalidades)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    )
  }

  if (plans.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Receitas Recorrentes (Mensalidades)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum plano de receita cadastrado ainda
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Receitas Recorrentes (Mensalidades)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.id} className="border rounded-lg">
                {/* Plan Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => togglePlan(plan.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedPlan === plan.id ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-semibold">
                        {plan.patientName && (
                          <span className="text-primary">{plan.patientName} </span>
                        )}
                        <span className="text-muted-foreground">• {plan.description}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {plan.patientCode && `#${plan.patientCode} • `}
                        {plan.installmentCount} parcelas de {formatCurrency(plan.installmentValue)} •
                        Total: {formatCurrency(plan.totalValue)}
                        {plan.categoryName && ` • ${plan.categoryName}`}
                      </div>
                      {plan.alreadyPaidAmount > 0 && (
                        <div className="text-xs text-green-600 font-medium mt-1">
                          ℹ️ Pagamentos anteriores: {formatCurrency(plan.alreadyPaidAmount)}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm({ type: 'plan', id: plan.id })
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                {/* Installments List */}
                {expandedPlan === plan.id && (
                  <div className="border-t bg-muted/10">
                    <div className="p-4 space-y-2">
                      {/* Header */}
                      <div className="grid grid-cols-6 gap-4 text-sm font-medium text-muted-foreground pb-2">
                        <div>Parcela</div>
                        <div>Vencimento</div>
                        <div className="text-right">Valor</div>
                        <div>Status</div>
                        <div>Recebido em</div>
                        <div className="text-right">Ações</div>
                      </div>

                      {/* Rows */}
                      {plan.installments.map((inst: any) => (
                        <div
                          key={inst.id}
                          className="grid grid-cols-6 gap-4 items-center py-2 text-sm hover:bg-muted/30 rounded px-2"
                        >
                          <div className="font-medium flex items-center gap-2">
                            {inst.installmentNumber}/{plan.installmentCount}
                            {inst.isHistorical && (
                              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                Histórico
                              </Badge>
                            )}
                          </div>
                          <div>{formatDate(inst.dueDate)}</div>
                          <div className="text-right font-semibold">
                            {formatCurrency(inst.value)}
                          </div>
                          <div>{getStatusBadge(inst.status)}</div>
                          <div className="text-muted-foreground">
                            {inst.receivedDate ? formatDate(inst.receivedDate) : '-'}
                          </div>
                          <div className="flex justify-end gap-1">
                            {inst.status !== 'RECEBIDO' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsReceived(inst.id)}
                                title="Marcar como recebido"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            {inst.status === 'RECEBIDO' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevertReceived(inst.id)}
                                title="Reverter para A_RECEBER"
                              >
                                <RotateCcw className="w-4 h-4 text-orange-600" />
                              </Button>
                            )}
                            {inst.status !== 'RECEBIDO' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm({ type: 'installment', id: inst.id })}
                                title="Excluir parcela"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === 'plan'
                ? 'Tem certeza que deseja excluir este plano de receita? Todas as parcelas serão excluídas.'
                : 'Tem certeza que deseja excluir esta parcela?'}
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
