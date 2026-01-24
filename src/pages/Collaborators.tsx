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
import { mapLegacyPermissionsToResources, mapResourcePermissionsToLegacy, RESOURCE_PERMISSIONS } from '@/lib/permissionsMapping'
import { isBrazilClinic } from '@/lib/clinicUtils'
import useDataStore from '@/stores/useDataStore'
import { useTranslation } from '@/hooks/useTranslation'

export default function Collaborators() {
  const { t } = useTranslation()
  const { isGestor } = usePermissions()
  const { user, refreshPermissions } = useAuthStore()
  const { getClinic } = useDataStore()
  const clinic = user?.clinicId ? getClinic(user.clinicId) : undefined
  const shouldShowAdvances = !isBrazilClinic(clinic)
  
  // Filtrar recursos baseado no país da clínica
  const filteredResources = shouldShowAdvances 
    ? RESOURCE_PERMISSIONS 
    : RESOURCE_PERMISSIONS.filter(r => r.id !== 'advances')
  
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
  
  // Special permissions state
  const [hasSpecialAccountsPayableAccess, setHasSpecialAccountsPayableAccess] = useState(false)

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
      toast.error(t('collaborators.errorLoadingCollaborators'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollaborator = async () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error(t('collaborators.fillAllFields'))
      return
    }

    try {
      setSubmitting(true)
      await collaboratorsApi.create(createForm)
      toast.success(t('collaborators.collaboratorCreated'))
      setShowCreateModal(false)
      setCreateForm({ name: '', email: '', password: '' })
      loadCollaborators()
    } catch (error: any) {
      toast.error(error.message || t('collaborators.errorCreatingCollaborator'))
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
    // Set special permissions
    setHasSpecialAccountsPayableAccess(legacyPerms.hasSpecialAccountsPayableAccess || false)
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
      toast.error(t('collaborators.fillRequiredFields'))
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
      toast.success(t('collaborators.collaboratorUpdated'))
      setShowEditModal(false)
      setSelectedCollaborator(null)
      setEditForm({ name: '', email: '', active: true, password: '' })
      loadCollaborators()
    } catch (error: any) {
      toast.error(error.message || t('collaborators.errorUpdatingCollaborator'))
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
      // Add special permissions
      const permissionsWithSpecial: UserPermissions = {
        ...legacyPermissions,
        hasSpecialAccountsPayableAccess,
      } as UserPermissions
      await collaboratorsApi.updatePermissions(selectedCollaborator.id, permissionsWithSpecial)
      toast.success(t('collaborators.permissionsUpdated'))
      setShowPermissionsModal(false)
      setSelectedCollaborator(null)
      loadCollaborators()

      // If the updated collaborator is the current user, refresh their permissions
      if (user && user.id === selectedCollaborator.id && refreshPermissions) {
        await refreshPermissions()
      }
    } catch (error: any) {
      toast.error(error.message || t('collaborators.errorUpdatingPermissions'))
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
      toast.success(t('collaborators.collaboratorRemoved'))
      setShowDeleteModal(false)
      setSelectedCollaborator(null)
      loadCollaborators()
    } catch (error: any) {
      toast.error(error.message || t('collaborators.errorRemovingCollaborator'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isGestor()) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>{t('collaborators.accessDenied')}</CardTitle>
            <CardDescription>
              {t('collaborators.onlyManagersAccess')}
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
          <h1 className="text-3xl font-bold">{t('collaborators.title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('collaborators.subtitle')}
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('collaborators.newCollaborator')}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('collaborators.collaboratorsList')}</CardTitle>
          <CardDescription>
            {t('collaborators.collaboratorsWithAccess')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : collaborators.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              {t('collaborators.noCollaboratorsRegistered')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('collaborators.name')}</TableHead>
                  <TableHead>{t('collaborators.email')}</TableHead>
                  <TableHead>{t('collaborators.status')}</TableHead>
                  <TableHead className="text-right">{t('collaborators.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {collaborators.map((collaborator) => (
                  <TableRow key={collaborator.id}>
                    <TableCell className="font-medium">{collaborator.name}</TableCell>
                    <TableCell>{collaborator.email}</TableCell>
                    <TableCell>
                      <Badge variant={collaborator.active ? 'default' : 'secondary'}>
                        {collaborator.active ? t('collaborators.active') : t('collaborators.inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(collaborator)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        {t('collaborators.edit')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenPermissions(collaborator)}
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        {t('collaborators.permissions')}
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
                        {t('collaborators.remove')}
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
            <DialogTitle>{t('collaborators.newCollaborator')}</DialogTitle>
            <DialogDescription>
              {t('collaborators.createNewCollaboratorDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('collaborators.name')}</Label>
              <Input
                id="name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder={t('collaborators.fullNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('collaborators.email')}</Label>
              <Input
                id="email"
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                placeholder={t('collaborators.emailPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('collaborators.password')}</Label>
              <Input
                id="password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder={t('collaborators.temporaryPasswordPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              {t('collaborators.cancel')}
            </Button>
            <Button onClick={handleCreateCollaborator} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('collaborators.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permissions Modal */}
      <Dialog open={showPermissionsModal} onOpenChange={setShowPermissionsModal}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {t('collaborators.permissionsOf')} {selectedCollaborator?.name}
            </DialogTitle>
            <DialogDescription>
              {t('collaborators.permissionsDescription')}
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
              <h3 className="text-sm font-semibold mb-3">{t('collaborators.specialPermissions')}</h3>
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
                    <div className="font-medium">{t('collaborators.specialAccountsPayableAccess')}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t('collaborators.specialAccountsPayableDescription')}
                    </div>
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button variant="outline" onClick={() => setShowPermissionsModal(false)}>
              {t('collaborators.cancel')}
            </Button>
            <Button onClick={handleSavePermissions} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('collaborators.savePermissions')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Collaborator Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('collaborators.editCollaborator')}</DialogTitle>
            <DialogDescription>
              {t('collaborators.updateCollaboratorInformation')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('collaborators.name')}</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t('collaborators.fullNamePlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">{t('collaborators.email')}</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder={t('collaborators.emailPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">{t('collaborators.newPasswordOptional')}</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder={t('collaborators.leaveBlankToKeepCurrentPassword')}
              />
              <p className="text-xs text-muted-foreground">
                {t('collaborators.leaveBlankIfNotChangingPassword')}
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
                {t('collaborators.activeCollaborator')}
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              {t('collaborators.cancel')}
            </Button>
            <Button onClick={handleUpdateCollaborator} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('collaborators.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('collaborators.removeCollaborator')}</DialogTitle>
            <DialogDescription>
              {t('collaborators.confirmRemove')} <strong>{selectedCollaborator?.name}</strong>?
              {' '}{t('collaborators.actionCannotBeUndone')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              {t('collaborators.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteCollaborator} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('collaborators.remove')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
