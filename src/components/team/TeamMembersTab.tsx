import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Shield, Loader2, Plus, Pencil, Trash2, Crown, Stethoscope, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import useAuthStore from '@/stores/useAuthStore'
import { collaboratorsApi } from '@/services/api'
import { ResourcePermissionsGrid } from '@/components/permissions/ResourcePermissionsGrid'
import { mapLegacyPermissionsToResources, mapResourcePermissionsToLegacy, RESOURCE_PERMISSIONS } from '@/lib/permissionsMapping'
import { isBrazilClinic } from '@/lib/clinicUtils'
import useDataStore from '@/stores/useDataStore'
import type { ResourcePermissions } from '@/lib/types'

interface TeamMember {
  id: string
  name: string
  email: string
  whatsapp?: string
  role: string
  isOwner: boolean
  isDoctor: boolean
  doctorId?: string
  active: boolean
  createdAt: string
  permissions?: any
}

export default function TeamMembersTab() {
  const { t } = useTranslation()
  const { user, refreshPermissions } = useAuthStore()
  const { getClinic } = useDataStore()
  const clinic = user?.clinicId ? getClinic(user.clinicId) : undefined
  const shouldShowAdvances = !isBrazilClinic(clinic)

  // Filtrar recursos baseado no país da clínica
  const filteredResources = shouldShowAdvances
    ? RESOURCE_PERMISSIONS
    : RESOURCE_PERMISSIONS.filter(r => r.id !== 'advances')

  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    whatsapp: '',
    isOwner: false,
    isDoctor: false,
  })

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    active: true,
    password: '',
    isOwner: false,
    isDoctor: false,
  })

  // Permissions state
  const [resourcePermissions, setResourcePermissions] = useState<ResourcePermissions>({})
  const [hasSpecialAccountsPayableAccess, setHasSpecialAccountsPayableAccess] = useState(false)
  const [canViewAllDoctorsConsultations, setCanViewAllDoctorsConsultations] = useState(false)

  useEffect(() => {
    loadTeamMembers()
  }, [])

  const loadTeamMembers = async () => {
    try {
      setLoading(true)
      const data = await collaboratorsApi.listTeam()
      setMembers(data)
    } catch (error) {
      console.error('Failed to load team members:', error)
      toast.error('Erro ao carregar membros da equipe')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateMember = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    try {
      setSubmitting(true)
      await collaboratorsApi.createTeamMember(createForm)
      toast.success('Membro criado com sucesso')
      setShowCreateModal(false)
      setCreateForm({ name: '', email: '', password: '', whatsapp: '', isOwner: false, isDoctor: false })
      loadTeamMembers()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar membro')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (member: TeamMember) => {
    setSelectedMember(member)
    setEditForm({
      name: member.name,
      email: member.email,
      whatsapp: member.whatsapp || '',
      active: member.active,
      password: '',
      isOwner: member.isOwner,
      isDoctor: member.isDoctor,
    })
    setShowEditModal(true)
  }

  const handleUpdateMember = async () => {
    if (!selectedMember) return

    if (!editForm.name || !editForm.email) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      setSubmitting(true)

      // Update basic info (using existing endpoint)
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
        whatsapp: editForm.whatsapp || undefined,
        active: editForm.active,
      }

      if (editForm.password && editForm.password.trim() !== '') {
        updateData.password = editForm.password
      }

      // Determine which endpoint to use based on current state
      if (selectedMember.isDoctor && !selectedMember.isOwner && selectedMember.role === 'MEDICO') {
        await collaboratorsApi.updateDoctor(selectedMember.doctorId || selectedMember.id, updateData)
      } else {
        await collaboratorsApi.update(selectedMember.id, updateData)
      }

      // Update roles if changed
      if (editForm.isOwner !== selectedMember.isOwner || editForm.isDoctor !== selectedMember.isDoctor) {
        await collaboratorsApi.updateTeamMemberRoles(selectedMember.id, {
          isOwner: editForm.isOwner,
          isDoctor: editForm.isDoctor,
        })
      }

      toast.success('Membro atualizado com sucesso')
      setShowEditModal(false)
      setSelectedMember(null)
      setEditForm({ name: '', email: '', whatsapp: '', active: true, password: '', isOwner: false, isDoctor: false })
      loadTeamMembers()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar membro')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenPermissions = (member: TeamMember) => {
    setSelectedMember(member)
    const legacyPerms = member.permissions || {}
    const resourcePerms = mapLegacyPermissionsToResources(legacyPerms)
    setResourcePermissions(resourcePerms)
    setHasSpecialAccountsPayableAccess(legacyPerms.hasSpecialAccountsPayableAccess || false)
    setCanViewAllDoctorsConsultations(legacyPerms.canViewAllDoctorsConsultations || false)
    setShowPermissionsModal(true)
  }

  const handleSavePermissions = async () => {
    if (!selectedMember) return

    try {
      setSubmitting(true)
      const legacyPermissions = mapResourcePermissionsToLegacy(resourcePermissions)
      const permissionsWithSpecial: any = {
        ...legacyPermissions,
        hasSpecialAccountsPayableAccess,
        canViewAllDoctorsConsultations,
      }
      await collaboratorsApi.updatePermissions(selectedMember.id, permissionsWithSpecial)
      toast.success('Permissões atualizadas')
      setShowPermissionsModal(false)
      setSelectedMember(null)
      loadTeamMembers()

      if (user && user.id === selectedMember.id && refreshPermissions) {
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

  const handleDeleteMember = async () => {
    if (!selectedMember) return

    try {
      setSubmitting(false)

      // Use appropriate delete endpoint
      if (selectedMember.isDoctor && !selectedMember.isOwner && selectedMember.role === 'MEDICO' && selectedMember.doctorId) {
        await collaboratorsApi.deleteDoctor(selectedMember.doctorId)
      } else {
        await collaboratorsApi.delete(selectedMember.id)
      }

      toast.success('Membro removido com sucesso')
      setShowDeleteModal(false)
      setSelectedMember(null)
      loadTeamMembers()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover membro')
    } finally {
      setSubmitting(false)
    }
  }

  const getRoleBadges = (member: TeamMember) => {
    const badges = []

    if (member.isOwner) {
      badges.push(
        <Badge key="owner" className="bg-yellow-500 text-white">
          <Crown className="h-3 w-3 mr-1" />
          Dono
        </Badge>
      )
    }

    if (member.isDoctor) {
      badges.push(
        <Badge key="doctor" variant="default">
          <Stethoscope className="h-3 w-3 mr-1" />
          Médico
        </Badge>
      )
    }

    if (!member.isOwner && !member.isDoctor) {
      badges.push(
        <Badge key="collaborator" variant="secondary">
          <Users className="h-3 w-3 mr-1" />
          Colaborador
        </Badge>
      )
    }

    return badges
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <div>
          <p className="text-sm text-muted-foreground">
            Gerencie todos os membros da equipe: donos, médicos e colaboradores
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Adicionar Membro
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membros da Equipe</CardTitle>
          <CardDescription>
            Todos os usuários com acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              Nenhum membro cadastrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Papéis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {getRoleBadges(member)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.active ? 'default' : 'secondary'}>
                        {member.active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEdit(member)}
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Editar
                        </Button>
                        {!member.isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPermissions(member)}
                          >
                            <Shield className="h-4 w-4 mr-1" />
                            Permissões
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedMember(member)
                            setShowDeleteModal(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                          Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro da Equipe</DialogTitle>
            <DialogDescription>
              Crie um novo membro e defina seus papéis
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome *</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email *</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-whatsapp">WhatsApp</Label>
              <Input
                id="create-whatsapp"
                value={createForm.whatsapp}
                onChange={(e) => setCreateForm({ ...createForm, whatsapp: e.target.value })}
                placeholder="Ex: +351 912 345 678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Senha *</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Senha temporária"
              />
            </div>
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-semibold">Papéis</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-owner"
                  checked={createForm.isOwner}
                  onCheckedChange={(checked) =>
                    setCreateForm({ ...createForm, isOwner: checked === true })
                  }
                />
                <Label htmlFor="create-owner" className="cursor-pointer flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Dono da clínica (acesso total)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-doctor"
                  checked={createForm.isDoctor}
                  onCheckedChange={(checked) =>
                    setCreateForm({ ...createForm, isDoctor: checked === true })
                  }
                />
                <Label htmlFor="create-doctor" className="cursor-pointer flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Médico (aparece nos formulários)
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateMember} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Membro</DialogTitle>
            <DialogDescription>
              Atualizar informações e papéis
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
              <Label htmlFor="edit-whatsapp">WhatsApp</Label>
              <Input
                id="edit-whatsapp"
                value={editForm.whatsapp}
                onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                placeholder="Ex: +351 912 345 678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nova senha (opcional)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Deixe em branco para manter"
              />
            </div>
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-semibold">Papéis</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-owner"
                  checked={editForm.isOwner}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isOwner: checked === true })
                  }
                />
                <Label htmlFor="edit-owner" className="cursor-pointer flex items-center gap-2">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Dono da clínica
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-doctor"
                  checked={editForm.isDoctor}
                  onCheckedChange={(checked) =>
                    setEditForm({ ...editForm, isDoctor: checked === true })
                  }
                />
                <Label htmlFor="edit-doctor" className="cursor-pointer flex items-center gap-2">
                  <Stethoscope className="h-4 w-4" />
                  Médico
                </Label>
              </div>
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
                Membro ativo no sistema
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateMember} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              Permissões de {selectedMember?.name}
            </DialogTitle>
            <DialogDescription>
              Configure as permissões de acesso aos recursos do sistema
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-6">
            <ResourcePermissionsGrid
              permissions={resourcePermissions}
              onChange={handleResourcePermissionChange}
              disabled={submitting}
              resources={filteredResources}
            />

            {/* Permissões Especiais */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-sm font-semibold mb-3">Permissões Especiais</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 p-3 rounded-md border bg-muted/30">
                  <Checkbox
                    id="special-accounts-payable"
                    checked={hasSpecialAccountsPayableAccess}
                    onCheckedChange={(checked) =>
                      setHasSpecialAccountsPayableAccess(checked === true)
                    }
                    disabled={submitting}
                  />
                  <Label htmlFor="special-accounts-payable" className="cursor-pointer flex-1">
                    <div className="font-medium">Acesso especial a Contas a Pagar</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Permite acesso total mesmo sem permissões normais
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-md border bg-muted/30">
                  <Checkbox
                    id="view-all-doctors-consultations"
                    checked={canViewAllDoctorsConsultations}
                    onCheckedChange={(checked) =>
                      setCanViewAllDoctorsConsultations(checked === true)
                    }
                    disabled={submitting}
                  />
                  <Label htmlFor="view-all-doctors-consultations" className="cursor-pointer flex-1">
                    <div className="font-medium">Ver consultas de todos os médicos</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Permite visualizar consultas de qualquer médico
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Membro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{selectedMember?.name}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteMember} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
