import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/hooks/usePermissions'
import useAuthStore from '@/stores/useAuthStore'
import { Plus, Pencil, Trash2, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { collaboratorsApi } from '@/services/api'
import type { User, UserPermissions, ResourcePermissions } from '@/lib/types'
import { ResourcePermissionsGrid } from '@/components/permissions/ResourcePermissionsGrid'
import { mapLegacyPermissionsToResources, mapResourcePermissionsToLegacy } from '@/lib/permissionsMapping'

export default function Collaborators() {
  const { isGestor } = usePermissions()
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedCollaborator, setSelectedCollaborator] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    active: true,
    password: '',
  })

  // Resource permissions form state (new format)
  const [resourcePermissions, setResourcePermissions] = useState<ResourcePermissions>({})

  // Load collaborators
  useEffect(() => {
    loadCollaborators()
  }, [])

  const loadCollaborators = async () => {
    try {
      setLoading(true)
      const data = await collaboratorsApi.list()
      setCollaborators(data)
    } catch (error) {
      console.error('Failed to load collaborators:', error)
      toast.error('Erro ao carregar colaboradores')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollaborator = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Preencha todos os campos')
      return
    }

    try {
      setSubmitting(true)
      await collaboratorsApi.create(createForm)
      toast.success('Colaborador criado com sucesso')
      setShowCreateModal(false)
      setCreateForm({ name: '', email: '', password: '' })
      loadCollaborators()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar colaborador')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenPermissions = (collaborator: any) => {
    setSelectedCollaborator(collaborator)
    // Convert legacy permissions to resource permissions
    const legacyPerms = collaborator.permissions || {}
    const resourcePerms = mapLegacyPermissionsToResources(legacyPerms as UserPermissions)
    setResourcePermissions(resourcePerms)
    setShowPermissionsModal(true)
  }

  const handleOpenEdit = (collaborator: any) => {
    setSelectedCollaborator(collaborator)
    setEditForm({
      name: collaborator.name || '',
      email: collaborator.email || '',
      active: collaborator.active !== undefined ? collaborator.active : true,
      password: '',
    })
    setShowEditModal(true)
  }

  const handleUpdateCollaborator = async () => {
    if (!selectedCollaborator) return

    if (!editForm.name || !editForm.email) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setSubmitting(true)
      // Enviar senha apenas se foi preenchida
      const updateData: { name: string; email: string; active: boolean; password?: string } = {
        name: editForm.name,
        email: editForm.email,
        active: editForm.active,
      }
      
      if (editForm.password && editForm.password.trim() !== '') {
        updateData.password = editForm.password
      }
      
      await collaboratorsApi.update(selectedCollaborator.id, updateData)
      toast.success('Colaborador atualizado com sucesso')
      setShowEditModal(false)
      setSelectedCollaborator(null)
      setEditForm({ name: '', email: '', active: true, password: '' })
      loadCollaborators()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar colaborador')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSavePermissions = async () => {
    if (!selectedCollaborator) return

    try {
      setSubmitting(true)
      // Convert resource permissions back to legacy format for API
      const legacyPermissions = mapResourcePermissionsToLegacy(resourcePermissions)
      await collaboratorsApi.updatePermissions(selectedCollaborator.id, legacyPermissions as UserPermissions)
      toast.success('Permissões atualizadas com sucesso')
      setShowPermissionsModal(false)
      setSelectedCollaborator(null)
      loadCollaborators()
      
      // If the updated collaborator is the current user, refresh their permissions
      if (user && user.id === selectedCollaborator.id && refreshPermissions) {
        await refreshPermissions()
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar permissões')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResourcePermissionChange = (resourceId: string, level: import('@/lib/types').PermissionLevel) => {
    setResourcePermissions((prev) => ({
      ...prev,
      [resourceId]: level,
    }))
  }

  const handleDeleteCollaborator = async () => {
    if (!selectedCollaborator) return

    try {
      setSubmitting(true)
      await collaboratorsApi.delete(selectedCollaborator.id)
      toast.success('Colaborador removido com sucesso')
      setShowDeleteModal(false)
      setSelectedCollaborator(null)
      loadCollaborators()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover colaborador')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isGestor()) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Apenas gestores de clínica podem acessar esta página
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Colaboradores</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os colaboradores da clínica e suas permissões
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Colaborador
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Colaboradores</CardTitle>
          <CardDescription>
            Colaboradores com acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : collaborators.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Nenhum colaborador cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collaborators.map((collaborator) => (
                  <TableRow key={collaborator.id}>
                    <TableCell className="font-medium">{collaborator.name}</TableCell>
                    <TableCell>{collaborator.email}</TableCell>
                    <TableCell>
                      <Badge variant={collaborator.active ? 'default' : 'secondary'}>
                        {collaborator.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(collaborator)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenPermissions(collaborator)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Permissões
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedCollaborator(collaborator)
                          setShowDeleteModal(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Collaborator Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Colaborador</DialogTitle>
            <DialogDescription>
              Crie um novo colaborador. Configure as permissões depois.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Senha temporária"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateCollaborator} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Permissões de {selectedCollaborator?.name}
            </DialogTitle>
            <DialogDescription>
              Configure o que este colaborador pode visualizar e editar. Clique nos sliders para alternar entre Permitido e Negado.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 py-4">
            <ResourcePermissionsGrid
              permissions={resourcePermissions}
              onChange={handleResourcePermissionChange}
              disabled={submitting}
            />
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Permissões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Collaborator Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Colaborador</DialogTitle>
            <DialogDescription>
              Atualize as informações do colaborador
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nova Senha (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Deixe em branco para manter a senha atual"
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco se não deseja alterar a senha
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-active"
                checked={editForm.active}
                onCheckedChange={(checked) => 
                  setEditForm({ ...editForm, active: checked === true })
                }
              />
              <Label htmlFor="edit-active" className="cursor-pointer">
                Colaborador ativo
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateCollaborator} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Colaborador</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{selectedCollaborator?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteCollaborator} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
