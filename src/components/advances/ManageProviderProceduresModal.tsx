import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Search, Plus, Edit, Trash2, Loader2, Check, X, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ProviderProcedure {
  id: string
  insuranceProviderId: string
  procedureBaseId: string | null
  providerCode: string
  providerDescription: string | null
  isPericiable: boolean
  coveragePercentage: number
  maxValue: number | null
  requiresAuthorization: boolean
  notes: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  baseCode: string | null
  baseDescription: string | null
  baseDefaultValue: number | null
}

interface ManageProviderProceduresModalProps {
  open: boolean
  onClose: () => void
  providerId: string
  providerName: string
  clinicId: string
  onUpdate?: () => void
}

export function ManageProviderProceduresModal({
  open,
  onClose,
  providerId,
  providerName,
  clinicId,
  onUpdate
}: ManageProviderProceduresModalProps) {
  const { formatCurrency } = useTranslation()
  const [procedures, setProcedures] = useState<ProviderProcedure[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [approvedFilter, setApprovedFilter] = useState<'all' | 'approved' | 'unapproved'>('all')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [procedureToDelete, setProcedureToDelete] = useState<ProviderProcedure | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingProcedure, setEditingProcedure] = useState<ProviderProcedure | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    providerCode: '',
    providerDescription: '',
    maxValue: '',
    isPericiable: false,
    coveragePercentage: '100',
    requiresAuthorization: false,
    notes: '',
    active: true
  })

  useEffect(() => {
    if (open) {
      loadProcedures()
    }
  }, [open, providerId, searchTerm, approvedFilter])

  const loadProcedures = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const params = new URLSearchParams({
        clinicId,
        limit: '1000',
        offset: '0'
      })

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      if (approvedFilter !== 'all') {
        params.append('approved', approvedFilter === 'approved' ? 'true' : 'false')
      }

      const response = await fetch(
        `${API_BASE_URL}/procedures-management/provider/${providerId}?${params}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error('Erro ao carregar procedimentos')
      }

      const data = await response.json()
      setProcedures(data.procedures || [])
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar procedimentos')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      providerCode: '',
      providerDescription: '',
      maxValue: '',
      isPericiable: false,
      coveragePercentage: '100',
      requiresAuthorization: false,
      notes: '',
      active: true
    })
  }

  const handleAdd = () => {
    resetForm()
    setEditingProcedure(null)
    setShowAddDialog(true)
  }

  const handleEdit = (procedure: ProviderProcedure) => {
    setEditingProcedure(procedure)
    setFormData({
      providerCode: procedure.providerCode,
      providerDescription: procedure.providerDescription || '',
      maxValue: procedure.maxValue?.toString() || '',
      isPericiable: procedure.isPericiable,
      coveragePercentage: procedure.coveragePercentage.toString(),
      requiresAuthorization: procedure.requiresAuthorization,
      notes: procedure.notes || '',
      active: procedure.active
    })
    setShowEditDialog(true)
  }

  const handleSave = async () => {
    // Validação
    if (!formData.providerCode.trim()) {
      toast.error('Código do procedimento é obrigatório')
      return
    }

    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const body = {
        clinicId,
        providerCode: formData.providerCode,
        providerDescription: formData.providerDescription || null,
        maxValue: formData.maxValue ? parseFloat(formData.maxValue) : null,
        isPericiable: formData.isPericiable,
        coveragePercentage: parseFloat(formData.coveragePercentage),
        requiresAuthorization: formData.requiresAuthorization,
        notes: formData.notes || null,
        active: formData.active
      }

      let url = `${API_BASE_URL}/procedures-management/provider/${providerId}`
      let method = 'POST'

      if (editingProcedure) {
        url += `/procedure/${editingProcedure.id}`
        method = 'PUT'
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar procedimento')
      }

      toast.success(editingProcedure ? 'Procedimento atualizado com sucesso' : 'Procedimento criado com sucesso')
      setShowAddDialog(false)
      setShowEditDialog(false)
      resetForm()
      setEditingProcedure(null)
      loadProcedures()
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar procedimento')
    }
  }

  const handleDeleteClick = (procedure: ProviderProcedure) => {
    setProcedureToDelete(procedure)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!procedureToDelete) return

    setDeleting(true)
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const response = await fetch(
        `${API_BASE_URL}/procedures-management/provider/${providerId}/procedure/${procedureToDelete.id}?clinicId=${clinicId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao excluir procedimento')
      }

      toast.success('Procedimento excluído com sucesso')
      setShowDeleteDialog(false)
      setProcedureToDelete(null)
      loadProcedures()
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir procedimento')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggleApproval = async (procedure: ProviderProcedure) => {
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const response = await fetch(
        `${API_BASE_URL}/procedures-management/provider/${providerId}/procedure/${procedure.id}/toggle-approval`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ clinicId })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao alterar aprovação')
      }

      toast.success(`Procedimento ${!procedure.active ? 'aprovado' : 'desaprovado'} com sucesso`)
      loadProcedures()
      onUpdate?.()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar aprovação')
    }
  }

  const approvedCount = procedures.filter(p => p.active).length
  const unapprovedCount = procedures.filter(p => !p.active).length

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar Tabela de Procedimentos</DialogTitle>
            <DialogDescription>
              Operadora: <strong>{providerName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Filtros e ações */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por código ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={approvedFilter} onValueChange={(v: any) => setApprovedFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos ({procedures.length})</SelectItem>
                  <SelectItem value="approved">Aprovados ({approvedCount})</SelectItem>
                  <SelectItem value="unapproved">Não aprovados ({unapprovedCount})</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar
              </Button>
            </div>

            {/* Tabela de procedimentos */}
            <div className="flex-1 min-h-0 border rounded-lg">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : procedures.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchTerm || approvedFilter !== 'all'
                      ? 'Nenhum procedimento encontrado com os filtros aplicados'
                      : 'Nenhum procedimento cadastrado. Clique em "Adicionar" para criar o primeiro.'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[120px] text-right">Valor Máx.</TableHead>
                        <TableHead className="w-[100px] text-center">Periciável</TableHead>
                        <TableHead className="w-[100px] text-center">Status</TableHead>
                        <TableHead className="w-[180px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procedures.map((procedure) => (
                        <TableRow key={procedure.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {procedure.providerCode}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md">
                              <div className="font-medium">
                                {procedure.providerDescription || procedure.baseDescription || '-'}
                              </div>
                              {procedure.baseCode && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  Base: {procedure.baseCode}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {procedure.maxValue ? formatCurrency(procedure.maxValue) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {procedure.isPericiable ? (
                              <Badge variant="secondary">Sim</Badge>
                            ) : (
                              <span className="text-muted-foreground">Não</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {procedure.active ? (
                              <Badge variant="default" className="bg-green-600">
                                <Check className="h-3 w-3 mr-1" />
                                Aprovado
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-orange-600 text-white">
                                <X className="h-3 w-3 mr-1" />
                                Pendente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleApproval(procedure)}
                                title={procedure.active ? 'Desaprovar' : 'Aprovar'}
                              >
                                {procedure.active ? (
                                  <X className="h-4 w-4 text-orange-600" />
                                ) : (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(procedure)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(procedure)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </ScrollArea>
            </div>

            {/* Estatísticas */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground border-t pt-3">
              <div>Total: <strong>{procedures.length}</strong> procedimentos</div>
              <div className="text-green-600">
                Aprovados: <strong>{approvedCount}</strong>
              </div>
              <div className="text-orange-600">
                Pendentes: <strong>{unapprovedCount}</strong>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Adicionar/Editar */}
      <Dialog open={showAddDialog || showEditDialog} onOpenChange={() => {
        setShowAddDialog(false)
        setShowEditDialog(false)
        resetForm()
        setEditingProcedure(null)
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProcedure ? 'Editar Procedimento' : 'Adicionar Procedimento'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados do procedimento para a operadora <strong>{providerName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="providerCode">Código *</Label>
                <Input
                  id="providerCode"
                  value={formData.providerCode}
                  onChange={(e) => setFormData({ ...formData, providerCode: e.target.value })}
                  placeholder="Ex: 01.01.01.001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxValue">Valor Máximo (€)</Label>
                <Input
                  id="maxValue"
                  type="number"
                  step="0.01"
                  value={formData.maxValue}
                  onChange={(e) => setFormData({ ...formData, maxValue: e.target.value })}
                  placeholder="Ex: 50.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="providerDescription">Descrição</Label>
              <Input
                id="providerDescription"
                value={formData.providerDescription}
                onChange={(e) => setFormData({ ...formData, providerDescription: e.target.value })}
                placeholder="Ex: Consulta de avaliação"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coveragePercentage">Cobertura (%)</Label>
                <Input
                  id="coveragePercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.coveragePercentage}
                  onChange={(e) => setFormData({ ...formData, coveragePercentage: e.target.value })}
                />
              </div>

              <div className="flex items-center space-x-4 pt-7">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPericiable}
                    onChange={(e) => setFormData({ ...formData, isPericiable: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Periciável</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.requiresAuthorization}
                    onChange={(e) => setFormData({ ...formData, requiresAuthorization: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Requer Autorização</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Aprovado</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas adicionais (opcional)"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false)
              setShowEditDialog(false)
              resetForm()
              setEditingProcedure(null)
            }}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingProcedure ? 'Salvar Alterações' : 'Adicionar Procedimento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Procedimento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o procedimento{' '}
              <strong>{procedureToDelete?.providerCode}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita e o procedimento não poderá mais ser utilizado em novos planos ou lotes de fatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
