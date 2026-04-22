import { useState, useEffect } from 'react'
import { Check, Pencil, Trash2, ChevronDown, ChevronRight, RotateCcw, Search, X, Plus, RotateCw } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NewRevenuePlanDialog } from './NewRevenuePlanDialog'
import { AddInstallmentDialog } from './AddInstallmentDialog'
import { ReparcelInstallmentsDialog } from './ReparcelInstallmentsDialog'

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
  const [editingPlan, setEditingPlan] = useState<any | null>(null)
  const [editPlanDialogOpen, setEditPlanDialogOpen] = useState(false)

  // Add installment dialog
  const [addInstallmentDialogOpen, setAddInstallmentDialogOpen] = useState(false)
  const [selectedPlanForAddInstallment, setSelectedPlanForAddInstallment] = useState<string | null>(null)

  // Reparcel dialog
  const [reparcelDialogOpen, setReparcelDialogOpen] = useState(false)
  const [selectedPlanForReparcel, setSelectedPlanForReparcel] = useState<{ planId: string; pendingValue: number } | null>(null)

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // all, active, completed, overdue
  const [installmentStatusFilter, setInstallmentStatusFilter] = useState('all') // all, on-time, overdue, due-7days, due-30days

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

  const handleOpenEditPlanDialog = (plan: any) => {
    setEditingPlan(plan)
    setEditPlanDialogOpen(true)
  }

  const handleCloseEditPlanDialog = () => {
    setEditingPlan(null)
    setEditPlanDialogOpen(false)
  }

  const handleEditPlanSuccess = () => {
    handleCloseEditPlanDialog()
    onRefresh()
  }

  const handleOpenAddInstallmentDialog = (planId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedPlanForAddInstallment(planId)
    setAddInstallmentDialogOpen(true)
  }

  const handleCloseAddInstallmentDialog = () => {
    setSelectedPlanForAddInstallment(null)
    setAddInstallmentDialogOpen(false)
  }

  const handleAddInstallmentSuccess = () => {
    handleCloseAddInstallmentDialog()
    onRefresh()
  }

  const handleOpenReparcelDialog = (planId: string, pendingValue: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedPlanForReparcel({ planId, pendingValue })
    setReparcelDialogOpen(true)
  }

  const handleCloseReparcelDialog = () => {
    setSelectedPlanForReparcel(null)
    setReparcelDialogOpen(false)
  }

  const handleReparcelSuccess = () => {
    handleCloseReparcelDialog()
    onRefresh()
  }

  // Filter and search logic
  const filteredPlans = plans.filter((plan) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      const matchesName = plan.patientName?.toLowerCase().includes(search)
      const matchesCode = plan.patientCode?.toLowerCase().includes(search)
      const matchesDescription = plan.description?.toLowerCase().includes(search)
      const matchesCategory = plan.categoryName?.toLowerCase().includes(search)

      if (!matchesName && !matchesCode && !matchesDescription && !matchesCategory) {
        return false
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      const pendingInstallments = plan.installments?.filter((i: any) => i.status !== 'RECEBIDO') || []
      const hasOverdue = pendingInstallments.some((i: any) => {
        const dueDate = new Date(i.dueDate)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate < today
      })

      if (statusFilter === 'active' && pendingInstallments.length === 0) return false
      if (statusFilter === 'completed' && pendingInstallments.length > 0) return false
      if (statusFilter === 'overdue' && !hasOverdue) return false
    }

    // Installment status filter
    if (installmentStatusFilter !== 'all') {
      const pendingInstallments = plan.installments?.filter((i: any) => i.status !== 'RECEBIDO') || []

      if (installmentStatusFilter === 'overdue') {
        const hasOverdue = pendingInstallments.some((i: any) => {
          const dueDate = new Date(i.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate < today
        })
        if (!hasOverdue) return false
      }

      if (installmentStatusFilter === 'on-time') {
        const hasOverdue = pendingInstallments.some((i: any) => {
          const dueDate = new Date(i.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate < today
        })
        if (hasOverdue) return false
      }

      if (installmentStatusFilter === 'due-7days') {
        const sevenDaysFromNow = new Date(today)
        sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

        const hasDueSoon = pendingInstallments.some((i: any) => {
          const dueDate = new Date(i.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate >= today && dueDate <= sevenDaysFromNow
        })
        if (!hasDueSoon) return false
      }

      if (installmentStatusFilter === 'due-30days') {
        const thirtyDaysFromNow = new Date(today)
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

        const hasDueSoon = pendingInstallments.some((i: any) => {
          const dueDate = new Date(i.dueDate)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate >= today && dueDate <= thirtyDaysFromNow
        })
        if (!hasDueSoon) return false
      }
    }

    return true
  })

  // Get overdue installments count for a plan
  const getOverdueCount = (plan: any) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return plan.installments?.filter((i: any) => {
      if (i.status === 'RECEBIDO') return false
      const dueDate = new Date(i.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      return dueDate < today
    }).length || 0
  }

  // Clear all filters
  const handleClearFilters = () => {
    setSearchTerm('')
    setStatusFilter('all')
    setInstallmentStatusFilter('all')
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || installmentStatusFilter !== 'all'

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
      // Don't call onRefresh to avoid closing expanded plans
      // The optimistic update already updated the UI
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
      // Don't call onRefresh to avoid closing expanded plans
      // The optimistic update already updated the UI
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
      // Don't call onRefresh to avoid closing expanded plans
      // The optimistic update already updated the UI
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
          {/* Search and Filter Bar */}
          <div className="mb-4 space-y-3 pb-4 border-b">
            <div className="flex flex-wrap gap-3">
              {/* Search Input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, código, descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os planos</SelectItem>
                  <SelectItem value="active">Ativos</SelectItem>
                  <SelectItem value="completed">Completos</SelectItem>
                  <SelectItem value="overdue">Com atraso</SelectItem>
                </SelectContent>
              </Select>

              {/* Installment Status Filter */}
              <Select value={installmentStatusFilter} onValueChange={setInstallmentStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Parcelas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas parcelas</SelectItem>
                  <SelectItem value="on-time">Em dia</SelectItem>
                  <SelectItem value="overdue">Atrasadas</SelectItem>
                  <SelectItem value="due-7days">Vencem em 7 dias</SelectItem>
                  <SelectItem value="due-30days">Vencem em 30 dias</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters Button */}
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearFilters}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Limpar filtros
                </Button>
              )}
            </div>

            {/* Results Counter */}
            <div className="text-sm text-muted-foreground">
              Mostrando <span className="font-medium text-foreground">{filteredPlans.length}</span> de{' '}
              <span className="font-medium text-foreground">{plans.length}</span> planos
            </div>
          </div>

          <div className="space-y-3">
            {filteredPlans.map((plan) => {
              const overdueCount = getOverdueCount(plan)
              return (
              <div key={plan.id} className={`border rounded-lg ${overdueCount > 0 ? 'border-red-300 bg-red-50/30' : ''}`}>
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
                      <div className="font-semibold flex items-center gap-2">
                        <div>
                          {plan.patientName && (
                            <span className="text-primary">{plan.patientName} </span>
                          )}
                          <span className="text-muted-foreground">• {plan.description}</span>
                        </div>
                        {overdueCount > 0 && (
                          <Badge variant="destructive" className="ml-2">
                            {overdueCount} atrasada{overdueCount > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>
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
                        </span>
                        {(() => {
                          const pendingInstallments = plan.installments?.filter((i: any) => i.status !== 'RECEBIDO') || []
                          const remainingBalance = pendingInstallments.reduce((sum: number, i: any) => sum + parseFloat(i.value), 0)

                          return pendingInstallments.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs gap-1"
                              onClick={(e) => handleOpenReparcelDialog(plan.id, remainingBalance, e)}
                              title="Reparcelar saldo pendente"
                            >
                              <RotateCw className="w-3 h-3" />
                              Reparcelar
                            </Button>
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
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenEditPlanDialog(plan)
                      }}
                      title="Editar plano"
                    >
                      <Pencil className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleteConfirm({ type: 'plan', id: plan.id })
                      }}
                      title="Excluir plano"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
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

                      {/* Add Installment Button */}
                      <div className="pt-3 border-t mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={(e) => handleOpenAddInstallmentDialog(plan.id, e)}
                        >
                          <Plus className="w-4 h-4" />
                          Adicionar Parcela
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )
            })}
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

      {/* Edit Plan Dialog */}
      <NewRevenuePlanDialog
        open={editPlanDialogOpen}
        onOpenChange={setEditPlanDialogOpen}
        clinicId={clinicId}
        onSuccess={handleEditPlanSuccess}
        editingPlan={editingPlan}
      />

      {/* Add Installment Dialog */}
      {selectedPlanForAddInstallment && (
        <AddInstallmentDialog
          open={addInstallmentDialogOpen}
          onOpenChange={setAddInstallmentDialogOpen}
          planId={selectedPlanForAddInstallment}
          clinicId={clinicId}
          onSuccess={handleAddInstallmentSuccess}
        />
      )}

      {/* Reparcel Installments Dialog */}
      {selectedPlanForReparcel && (
        <ReparcelInstallmentsDialog
          open={reparcelDialogOpen}
          onOpenChange={setReparcelDialogOpen}
          planId={selectedPlanForReparcel.planId}
          clinicId={clinicId}
          pendingValue={selectedPlanForReparcel.pendingValue}
          onSuccess={handleReparcelSuccess}
        />
      )}
    </>
  )
}
