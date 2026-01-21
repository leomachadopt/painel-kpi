import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Plus, Edit, Trash2, Loader2, Settings, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { configApi } from '@/services/api'
import { FirstConsultationType, FirstConsultationTypeProcedure } from '@/lib/types'

interface FirstConsultationTypesSettingsProps {
  clinicId: string
}

export function FirstConsultationTypesSettings({ clinicId }: FirstConsultationTypesSettingsProps) {
  const [consultationTypes, setConsultationTypes] = useState<FirstConsultationType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showProceduresDialog, setShowProceduresDialog] = useState(false)
  const [selectedType, setSelectedType] = useState<FirstConsultationType | null>(null)
  const [procedures, setProcedures] = useState<FirstConsultationTypeProcedure[]>([])
  const [loadingProcedures, setLoadingProcedures] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })
  const [newProcedure, setNewProcedure] = useState('')

  useEffect(() => {
    if (clinicId) {
      loadConsultationTypes()
    }
  }, [clinicId])

  const loadConsultationTypes = async () => {
    try {
      setLoading(true)
      const data = await configApi.consultationTypes.getAll(clinicId)
      setConsultationTypes(data)
    } catch (error: any) {
      console.error('Error loading consultation types:', error)
      toast.error('Erro ao carregar tipos de consulta')
    } finally {
      setLoading(false)
    }
  }

  const loadProcedures = async (typeId: string) => {
    try {
      setLoadingProcedures(true)
      const data = await configApi.procedures.getAll(clinicId, typeId)
      setProcedures(data)
    } catch (error: any) {
      console.error('Error loading procedures:', error)
      toast.error('Erro ao carregar procedimentos')
    } finally {
      setLoadingProcedures(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    try {
      setSaving(true)
      await configApi.consultationTypes.create(clinicId, formData)
      toast.success('Tipo de consulta criado com sucesso')
      setShowCreateDialog(false)
      setFormData({ name: '', description: '' })
      await loadConsultationTypes()
    } catch (error: any) {
      console.error('Error creating consultation type:', error)
      toast.error(error.message || 'Erro ao criar tipo de consulta')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!selectedType || !formData.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    try {
      setSaving(true)
      await configApi.consultationTypes.update(clinicId, selectedType.id, formData)
      toast.success('Tipo de consulta atualizado com sucesso')
      setShowEditDialog(false)
      setSelectedType(null)
      setFormData({ name: '', description: '' })
      await loadConsultationTypes()
    } catch (error: any) {
      console.error('Error updating consultation type:', error)
      toast.error(error.message || 'Erro ao atualizar tipo de consulta')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedType) return

    try {
      setSaving(true)
      await configApi.consultationTypes.delete(clinicId, selectedType.id)
      toast.success('Tipo de consulta excluído com sucesso')
      setShowDeleteDialog(false)
      setSelectedType(null)
      await loadConsultationTypes()
    } catch (error: any) {
      console.error('Error deleting consultation type:', error)
      toast.error(error.message || 'Erro ao excluir tipo de consulta')
    } finally {
      setSaving(false)
    }
  }

  const handleAddProcedure = async () => {
    if (!selectedType || !newProcedure.trim()) {
      toast.error('Nome do procedimento é obrigatório')
      return
    }

    try {
      await configApi.procedures.create(clinicId, selectedType.id, {
        name: newProcedure,
        displayOrder: procedures.length,
      })
      toast.success('Procedimento adicionado com sucesso')
      setNewProcedure('')
      await loadProcedures(selectedType.id)
    } catch (error: any) {
      console.error('Error adding procedure:', error)
      toast.error(error.message || 'Erro ao adicionar procedimento')
    }
  }

  const handleDeleteProcedure = async (procedureId: string) => {
    if (!selectedType) return

    try {
      await configApi.procedures.delete(clinicId, selectedType.id, procedureId)
      toast.success('Procedimento excluído com sucesso')
      await loadProcedures(selectedType.id)
    } catch (error: any) {
      console.error('Error deleting procedure:', error)
      toast.error(error.message || 'Erro ao excluir procedimento')
    }
  }

  const openEditDialog = (type: FirstConsultationType) => {
    setSelectedType(type)
    setFormData({
      name: type.name,
      description: type.description || '',
    })
    setShowEditDialog(true)
  }

  const openDeleteDialog = (type: FirstConsultationType) => {
    setSelectedType(type)
    setShowDeleteDialog(true)
  }

  const openProceduresDialog = async (type: FirstConsultationType) => {
    setSelectedType(type)
    setShowProceduresDialog(true)
    await loadProcedures(type.id)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Tipos de 1ª Consulta</h2>
          <p className="text-muted-foreground">
            Configure os diferentes tipos de primeira consulta e seus procedimentos
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Tipo
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {consultationTypes.map((type) => (
          <Card key={type.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{type.name}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openProceduresDialog(type)}
                    title="Gerenciar procedimentos"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(type)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(type)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardTitle>
              {type.description && (
                <CardDescription>{type.description}</CardDescription>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>

      {consultationTypes.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Nenhum tipo de consulta cadastrado</p>
          <p className="text-sm mt-2">Crie o primeiro tipo de consulta para começar</p>
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Tipo de Consulta</DialogTitle>
            <DialogDescription>
              Crie um novo tipo de primeira consulta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Ortodontia, Implante, Clareamento"
              />
            </div>
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional do tipo de consulta"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Tipo de Consulta</DialogTitle>
            <DialogDescription>
              Atualize as informações do tipo de consulta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o tipo de consulta "{selectedType?.name}"?
              Esta ação não pode ser desfeita e todos os procedimentos associados também serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? (
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

      {/* Procedures Dialog */}
      <Dialog open={showProceduresDialog} onOpenChange={setShowProceduresDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Procedimentos - {selectedType?.name}</DialogTitle>
            <DialogDescription>
              Gerencie os procedimentos que serão verificados neste tipo de consulta
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do procedimento"
                value={newProcedure}
                onChange={(e) => setNewProcedure(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddProcedure()}
              />
              <Button onClick={handleAddProcedure}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {loadingProcedures ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : procedures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum procedimento cadastrado</p>
                <p className="text-sm mt-2">Adicione procedimentos para este tipo de consulta</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {procedures.map((procedure) => (
                  <div
                    key={procedure.id}
                    className="flex items-center justify-between p-3 border rounded-md bg-background"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <span>{procedure.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteProcedure(procedure.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowProceduresDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
