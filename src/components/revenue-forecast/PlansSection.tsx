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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  const [editingInstallment, setEditingInstallment] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    value: '',
    dueDate: '',
    status: '',
    receivedDate: '',
  })

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
    const receivedDate = new Date().toISOString().split('T')[0]

    // Optimistic update: update local state immediately
    setPlans(prevPlans =>
      prevPlans.map(plan => ({
        ...plan,
        installments: plan.installments.map((inst: any) =>
          inst.id === installmentId
            ? { ...inst, status: 'RECEBIDO', receivedDate }
            : inst
        )
      }))
    )

    try {
      await api.revenueForecast.updateInstallment(clinicId, installmentId, {
        status: 'RECEBIDO',
        receivedDate,
      })
      toast({
        title: 'Sucesso',
        description: 'Parcela marcada como recebida',
      })
      // Refresh from server to ensure consistency
      onRefresh()
    } catch (error: any) {
      // Revert optimistic update on error
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar parcela',
        variant: 'destructive',
      })
      // Reload to revert changes
      loadPlans()
    }
  }

  const handleRevertReceived = async (installmentId: string) => {
    // Optimistic update: revert status immediately
    setPlans(prevPlans =>
      prevPlans.map(plan => ({
        ...plan,
        installments: plan.installments.map((inst: any) =>
          inst.id === installmentId
            ? { ...inst, status: 'A_RECEBER', receivedDate: null }
            : inst
        )
      }))
    )

    try {
      await api.revenueForecast.revertInstallment(clinicId, installmentId)
      toast({
        title: 'Sucesso',
        description: 'Parcela revertida para A_RECEBER',
      })
      // Refresh from server to ensure consistency
      onRefresh()
    } catch (error: any) {
      // Revert optimistic update on error
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao reverter parcela',
        variant: 'destructive',
      })
      // Reload to revert changes
      loadPlans()
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

  const handleOpenEditDialog = (installment: any) => {
    setEditingInstallment(installment)
    setEditForm({
      value: installment.value.toString(),
      dueDate: installment.dueDate,
      status: installment.status,
      receivedDate: installment.receivedDate || '',
    })
  }

  const handleCloseEditDialog = () => {
    setEditingInstallment(null)
    setEditForm({
      value: '',
      dueDate: '',
      status: '',
      receivedDate: '',
    })
  }

  const handleSaveEdit = async () => {
    if (!editingInstallment) return

    const updatedData = {
      value: parseFloat(editForm.value),
      dueDate: editForm.dueDate,
      status: editForm.status,
      receivedDate: editForm.receivedDate || null,
    }

    // Optimistic update: update local state immediately
    setPlans(prevPlans =>
      prevPlans.map(plan => ({
        ...plan,
        installments: plan.installments.map((inst: any) =>
          inst.id === editingInstallment.id
            ? { ...inst, ...updatedData }
            : inst
        )
      }))
    )

    handleCloseEditDialog()

    try {
      await api.revenueForecast.updateInstallment(clinicId, editingInstallment.id, updatedData)
      toast({
        title: 'Sucesso',
        description: 'Parcela atualizada com sucesso',
      })
      // Refresh from server to ensure consistency
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atualizar parcela',
        variant: 'destructive',
      })
      // Reload to revert changes
      loadPlans()
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
                        {(() => {
                          // Calculate received and pending amounts
                          const receivedInstallments = plan.installments?.filter((i: any) => i.status === 'RECEBIDO') || []
                          const pendingInstallments = plan.installments?.filter((i: any) => i.status !== 'RECEBIDO') || []

                          const receivedCount = receivedInstallments.length
                          const pendingCount = pendingInstallments.length

                          // Sum actual values of pending installments
                          const remainingBalance = pendingInstallments.reduce((sum: number, i: any) => sum + parseFloat(i.value), 0)

                          return (
                            <>
                              {pendingCount} parcelas •
                              Saldo pendente: {formatCurrency(remainingBalance)}
                              {plan.categoryName && ` • ${plan.categoryName}`}
                            </>
                          )
                        })()}
                      </div>
                      {(() => {
                        const receivedInstallments = plan.installments?.filter((i: any) => i.status === 'RECEBIDO') || []
                        const receivedAmount = receivedInstallments.reduce((sum: number, i: any) => sum + parseFloat(i.value), 0)
                        const totalPaid = receivedAmount + (plan.alreadyPaidAmount || 0)

                        return totalPaid > 0 ? (
                          <div className="text-xs text-green-600 font-medium mt-1">
                            ✅ Já recebido: {formatCurrency(totalPaid)}
                            {plan.alreadyPaidAmount > 0 && (
                              <span className="text-muted-foreground ml-1">
                                (inclui {formatCurrency(plan.alreadyPaidAmount)} anteriores)
                              </span>
                            )}
                          </div>
                        ) : null
                      })()}
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditDialog(inst)}
                              title="Editar parcela"
                            >
                              <Pencil className="w-4 h-4 text-blue-600" />
                            </Button>
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

      {/* Edit Installment Dialog */}
      <Dialog open={!!editingInstallment} onOpenChange={handleCloseEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Parcela</DialogTitle>
            <DialogDescription>
              Altere os dados da parcela abaixo. Clique em Salvar quando terminar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="value">Valor</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={editForm.value}
                onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={editForm.dueDate}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
              >
                <option value="A_RECEBER">A Receber</option>
                <option value="RECEBIDO">Recebido</option>
                <option value="ATRASADO">Atrasado</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receivedDate">Data de Recebimento (opcional)</Label>
              <Input
                id="receivedDate"
                type="date"
                value={editForm.receivedDate}
                onChange={(e) => setEditForm({ ...editForm, receivedDate: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseEditDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
