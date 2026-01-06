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
import { Plus, Pencil, Trash2, Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { collaboratorsApi } from '@/services/api'
import type { User, UserPermissions } from '@/lib/types'

export default function Collaborators() {
  const { isGestor } = usePermissions()
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCollaborator, setSelectedCollaborator] = useState<any | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  // Permissions form state
  const [permissionsForm, setPermissionsForm] = useState<UserPermissions>({
    canViewDashboardOverview: false,
    canViewDashboardFinancial: false,
    canViewDashboardCommercial: false,
    canViewDashboardOperational: false,
    canViewDashboardMarketing: false,
    canViewReports: false,
    canViewReportFinancial: false,
    canViewReportBilling: false,
    canViewReportConsultations: false,
    canViewReportAligners: false,
    canViewReportProspecting: false,
    canViewReportCabinets: false,
    canViewReportServiceTime: false,
    canViewReportSources: false,
    canViewReportConsultationControl: false,
    canViewReportMarketing: false,
    canViewTargets: false,
    canEditFinancial: false,
    canEditConsultations: false,
    canEditProspecting: false,
    canEditCabinets: false,
    canEditServiceTime: false,
    canEditSources: false,
    canEditConsultationControl: false,
    canEditAligners: false,
    canEditPatients: false,
    canEditClinicConfig: false,
    canEditTargets: false,
  })

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
    setPermissionsForm(collaborator.permissions || {})
    setShowPermissionsModal(true)
  }

  const handleSavePermissions = async () => {
    if (!selectedCollaborator) return

    try {
      setSubmitting(true)
      await collaboratorsApi.updatePermissions(selectedCollaborator.id, permissionsForm)
      toast.success('Permissões atualizadas com sucesso')
      setShowPermissionsModal(false)
      setSelectedCollaborator(null)
      loadCollaborators()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar permissões')
    } finally {
      setSubmitting(false)
    }
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

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setPermissionsForm((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Permissões de {selectedCollaborator?.name}
            </DialogTitle>
            <DialogDescription>
              Configure o que este colaborador pode visualizar e editar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* View Permissions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">📊 Permissões de Visualização</h3>
              <div className="space-y-2 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewDashboardOverview"
                    checked={permissionsForm.canViewDashboardOverview}
                    onCheckedChange={() => handleTogglePermission('canViewDashboardOverview')}
                  />
                  <Label htmlFor="canViewDashboardOverview" className="cursor-pointer">
                    Visão Geral do Dashboard
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewDashboardFinancial"
                    checked={permissionsForm.canViewDashboardFinancial}
                    onCheckedChange={() => handleTogglePermission('canViewDashboardFinancial')}
                  />
                  <Label htmlFor="canViewDashboardFinancial" className="cursor-pointer">
                    Dashboard Financeiro
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewDashboardCommercial"
                    checked={permissionsForm.canViewDashboardCommercial}
                    onCheckedChange={() => handleTogglePermission('canViewDashboardCommercial')}
                  />
                  <Label htmlFor="canViewDashboardCommercial" className="cursor-pointer">
                    Dashboard Comercial
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewDashboardOperational"
                    checked={permissionsForm.canViewDashboardOperational}
                    onCheckedChange={() => handleTogglePermission('canViewDashboardOperational')}
                  />
                  <Label htmlFor="canViewDashboardOperational" className="cursor-pointer">
                    Dashboard Operacional
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewDashboardMarketing"
                    checked={permissionsForm.canViewDashboardMarketing}
                    onCheckedChange={() => handleTogglePermission('canViewDashboardMarketing')}
                  />
                  <Label htmlFor="canViewDashboardMarketing" className="cursor-pointer">
                    Dashboard Marketing
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReports"
                    checked={permissionsForm.canViewReports}
                    onCheckedChange={() => handleTogglePermission('canViewReports')}
                  />
                  <Label htmlFor="canViewReports" className="cursor-pointer">
                    Acesso a Relatórios (Geral)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewTargets"
                    checked={permissionsForm.canViewTargets}
                    onCheckedChange={() => handleTogglePermission('canViewTargets')}
                  />
                  <Label htmlFor="canViewTargets" className="cursor-pointer">
                    Metas Mensais
                  </Label>
                </div>
              </div>
            </div>

            {/* Report Tab Permissions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">📋 Permissões de Abas de Relatórios</h3>
              <div className="space-y-2 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReportFinancial"
                    checked={permissionsForm.canViewReportFinancial}
                    onCheckedChange={() => handleTogglePermission('canViewReportFinancial')}
                  />
                  <Label htmlFor="canViewReportFinancial" className="cursor-pointer">
                    Relatório Financeiro
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReportBilling"
                    checked={permissionsForm.canViewReportBilling}
                    onCheckedChange={() => handleTogglePermission('canViewReportBilling')}
                  />
                  <Label htmlFor="canViewReportBilling" className="cursor-pointer">
                    Relatório de Faturação
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReportConsultations"
                    checked={permissionsForm.canViewReportConsultations}
                    onCheckedChange={() => handleTogglePermission('canViewReportConsultations')}
                  />
                  <Label htmlFor="canViewReportConsultations" className="cursor-pointer">
                    Relatório de 1.ªs Consultas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReportAligners"
                    checked={permissionsForm.canViewReportAligners}
                    onCheckedChange={() => handleTogglePermission('canViewReportAligners')}
                  />
                  <Label htmlFor="canViewReportAligners" className="cursor-pointer">
                    Relatório de Alinhadores
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReportProspecting"
                    checked={permissionsForm.canViewReportProspecting}
                    onCheckedChange={() => handleTogglePermission('canViewReportProspecting')}
                  />
                  <Label htmlFor="canViewReportProspecting" className="cursor-pointer">
                    Relatório de Prospecção
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReportCabinets"
                    checked={permissionsForm.canViewReportCabinets}
                    onCheckedChange={() => handleTogglePermission('canViewReportCabinets')}
                  />
                  <Label htmlFor="canViewReportCabinets" className="cursor-pointer">
                    Relatório de Gabinetes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReportServiceTime"
                    checked={permissionsForm.canViewReportServiceTime}
                    onCheckedChange={() => handleTogglePermission('canViewReportServiceTime')}
                  />
                  <Label htmlFor="canViewReportServiceTime" className="cursor-pointer">
                    Relatório de Tempos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReportSources"
                    checked={permissionsForm.canViewReportSources}
                    onCheckedChange={() => handleTogglePermission('canViewReportSources')}
                  />
                  <Label htmlFor="canViewReportSources" className="cursor-pointer">
                    Relatório de Fontes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReportConsultationControl"
                    checked={permissionsForm.canViewReportConsultationControl}
                    onCheckedChange={() => handleTogglePermission('canViewReportConsultationControl')}
                  />
                  <Label htmlFor="canViewReportConsultationControl" className="cursor-pointer">
                    Relatório de Controle
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canViewReportMarketing"
                    checked={permissionsForm.canViewReportMarketing}
                    onCheckedChange={() => handleTogglePermission('canViewReportMarketing')}
                  />
                  <Label htmlFor="canViewReportMarketing" className="cursor-pointer">
                    Relatório de Marketing
                  </Label>
                </div>
              </div>
            </div>

            {/* Edit Permissions */}
            <div>
              <h3 className="text-lg font-semibold mb-3">✏️ Permissões de Edição</h3>
              <div className="space-y-2 border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditFinancial"
                    checked={permissionsForm.canEditFinancial}
                    onCheckedChange={() => handleTogglePermission('canEditFinancial')}
                  />
                  <Label htmlFor="canEditFinancial" className="cursor-pointer">
                    Lançamentos Financeiros
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditConsultations"
                    checked={permissionsForm.canEditConsultations}
                    onCheckedChange={() => handleTogglePermission('canEditConsultations')}
                  />
                  <Label htmlFor="canEditConsultations" className="cursor-pointer">
                    Consultas e Planos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditProspecting"
                    checked={permissionsForm.canEditProspecting}
                    onCheckedChange={() => handleTogglePermission('canEditProspecting')}
                  />
                  <Label htmlFor="canEditProspecting" className="cursor-pointer">
                    Prospecção (Leads/Contatos)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditCabinets"
                    checked={permissionsForm.canEditCabinets}
                    onCheckedChange={() => handleTogglePermission('canEditCabinets')}
                  />
                  <Label htmlFor="canEditCabinets" className="cursor-pointer">
                    Uso de Gabinetes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditServiceTime"
                    checked={permissionsForm.canEditServiceTime}
                    onCheckedChange={() => handleTogglePermission('canEditServiceTime')}
                  />
                  <Label htmlFor="canEditServiceTime" className="cursor-pointer">
                    Tempo de Atendimento
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditSources"
                    checked={permissionsForm.canEditSources}
                    onCheckedChange={() => handleTogglePermission('canEditSources')}
                  />
                  <Label htmlFor="canEditSources" className="cursor-pointer">
                    Fontes e Campanhas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditConsultationControl"
                    checked={permissionsForm.canEditConsultationControl}
                    onCheckedChange={() => handleTogglePermission('canEditConsultationControl')}
                  />
                  <Label htmlFor="canEditConsultationControl" className="cursor-pointer">
                    Controle de Consultas
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditAligners"
                    checked={permissionsForm.canEditAligners}
                    onCheckedChange={() => handleTogglePermission('canEditAligners')}
                  />
                  <Label htmlFor="canEditAligners" className="cursor-pointer">
                    Alinhadores
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditPatients"
                    checked={permissionsForm.canEditPatients}
                    onCheckedChange={() => handleTogglePermission('canEditPatients')}
                  />
                  <Label htmlFor="canEditPatients" className="cursor-pointer">
                    Cadastro de Pacientes
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditClinicConfig"
                    checked={permissionsForm.canEditClinicConfig}
                    onCheckedChange={() => handleTogglePermission('canEditClinicConfig')}
                  />
                  <Label htmlFor="canEditClinicConfig" className="cursor-pointer">
                    Configurações da Clínica
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="canEditTargets"
                    checked={permissionsForm.canEditTargets}
                    onCheckedChange={() => handleTogglePermission('canEditTargets')}
                  />
                  <Label htmlFor="canEditTargets" className="cursor-pointer">
                    Editar Metas Mensais
                  </Label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
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
