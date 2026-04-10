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
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'

interface ClinicBaseProcedure {
  id: string
  clinicId: string | null
  code: string
  description: string
  isPericiable: boolean
  category: string | null
  defaultValue: number | null
  active: boolean
  isCustom: boolean
  createdByUserId: string | null
  createdAt: string
  updatedAt: string
}

interface ManageClinicProceduresModalProps {
  open: boolean
  onClose: () => void
  clinicId: string
  clinicName: string
}

export function ManageClinicProceduresModal({
  open,
  onClose,
  clinicId,
  clinicName
}: ManageClinicProceduresModalProps) {
  const { formatCurrency } = useTranslation()
  const [procedures, setProcedures] = useState<ClinicBaseProcedure[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [procedureToDelete, setProcedureToDelete] = useState<ClinicBaseProcedure | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingProcedure, setEditingProcedure] = useState<ClinicBaseProcedure | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    defaultValue: '',
    isPericiable: false,
    category: ''
  })

  useEffect(() => {
    if (open) {
      loadProcedures()
    }
  }, [open, clinicId, searchTerm])

  const loadProcedures = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const params = new URLSearchParams({
        limit: '1000',
        offset: '0'
      })

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(
        `${API_BASE_URL}/procedures-management/clinic/${clinicId}/base?${params}`,
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
      code: '',
      description: '',
      defaultValue: '',
      isPericiable: false,
      category: ''
    })
  }

  const handleAdd = () => {
    resetForm()
    setEditingProcedure(null)
    setShowAddDialog(true)
  }

  const handleEdit = (procedure: ClinicBaseProcedure) => {
    setEditingProcedure(procedure)
    setFormData({
      code: procedure.code,
      description: procedure.description,
      defaultValue: procedure.defaultValue?.toString() || '',
      isPericiable: procedure.isPericiable,
      category: procedure.category || ''
    })
    setShowEditDialog(true)
  }

  const handleSave = async () => {
    // Validação
    if (!formData.code.trim() || !formData.description.trim()) {
      toast.error('Código e descrição são obrigatórios')
      return
    }

    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const body = {
        code: formData.code,
        description: formData.description,
        defaultValue: formData.defaultValue ? parseFloat(formData.defaultValue) : null,
        isPericiable: formData.isPericiable,
        category: formData.category || null
      }

      let url = `${API_BASE_URL}/procedures-management/clinic/${clinicId}/base`
      let method = 'POST'

      if (editingProcedure) {
        url += `/${editingProcedure.id}`
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
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar procedimento')
    }
  }

  const handleDeleteClick = (procedure: ClinicBaseProcedure) => {
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
        `${API_BASE_URL}/procedures-management/clinic/${clinicId}/base/${procedureToDelete.id}`,
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
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir procedimento')
    } finally {
      setDeleting(false)
    }
  }

  const customCount = procedures.filter(p => p.isCustom).length
  const globalCount = procedures.filter(p => !p.isCustom).length

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Gerenciar Tabela Base de Procedimentos</DialogTitle>
            <DialogDescription>
              Clínica: <strong>{clinicName}</strong>
              <br />
              <span className="text-xs text-muted-foreground mt-1">
                Procedimentos customizados podem ser editados e excluídos.
                Procedimentos globais são somente leitura.
              </span>
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

              <Button onClick={handleAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Procedimento
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
                    {searchTerm
                      ? 'Nenhum procedimento encontrado'
                      : 'Nenhum procedimento cadastrado. Clique em "Adicionar Procedimento" para criar o primeiro.'}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="w-[120px]">Categoria</TableHead>
                        <TableHead className="w-[120px] text-right">Valor Padrão</TableHead>
                        <TableHead className="w-[100px] text-center">Periciável</TableHead>
                        <TableHead className="w-[100px] text-center">Tipo</TableHead>
                        <TableHead className="w-[120px] text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {procedures.map((procedure) => (
                        <TableRow key={procedure.id}>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {procedure.code}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-md font-medium">
                              {procedure.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            {procedure.category ? (
                              <Badge variant="secondary">{procedure.category}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {procedure.defaultValue ? formatCurrency(procedure.defaultValue) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {procedure.isPericiable ? (
                              <Badge variant="secondary">Sim</Badge>
                            ) : (
                              <span className="text-muted-foreground">Não</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {procedure.isCustom ? (
                              <Badge variant="default">Custom</Badge>
                            ) : (
                              <Badge variant="outline">Global</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              {procedure.isCustom && (
                                <>
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
                                </>
                              )}
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
              <div className="text-blue-600">
                Customizados: <strong>{customCount}</strong>
              </div>
              <div className="text-gray-600">
                Globais: <strong>{globalCount}</strong>
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
              {editingProcedure ? 'Edite os dados do procedimento customizado' : 'Crie um novo procedimento customizado para a tabela base'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: CUSTOM-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultValue">Valor Padrão (€)</Label>
                <Input
                  id="defaultValue"
                  type="number"
                  step="0.01"
                  value={formData.defaultValue}
                  onChange={(e) => setFormData({ ...formData, defaultValue: e.target.value })}
                  placeholder="Ex: 50.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Procedimento customizado de avaliação"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="Ex: Ortodontia"
                />
              </div>

              <div className="flex items-center pt-7">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPericiable}
                    onChange={(e) => setFormData({ ...formData, isPericiable: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm">Periciável</span>
                </label>
              </div>
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
              <strong>{procedureToDelete?.code}</strong>?
              <br />
              <br />
              Esta ação não pode ser desfeita e o procedimento não poderá mais ser vinculado a tabelas de operadoras.
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
