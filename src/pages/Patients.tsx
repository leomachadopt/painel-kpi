import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Patient } from '@/lib/types'
import { patientsApi } from '@/services/api'
import { usePatients } from '@/hooks/usePatients'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, UserPlus, Loader2, Mail, Phone, Calendar, Trash2, Edit, DollarSign, Stethoscope, Clock, MapPin } from 'lucide-react'
import useAuthStore from '@/stores/useAuthStore'
import { format } from 'date-fns'
import { toast } from 'sonner'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function Patients() {
  const { user } = useAuthStore()
  const { clinicId } = useParams<{ clinicId: string }>()
  const [searchTerm, setSearchTerm] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientHistory, setPatientHistory] = useState<any>(null)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', birthDate: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false)
  const [newPatientForm, setNewPatientForm] = useState({ code: '', name: '', email: '', phone: '', birthDate: '', notes: '' })
  const [creating, setCreating] = useState(false)

  // ===================================================================
  // OTIMIZAÇÃO FASE 2: React Query + Debounce integrado
  // ===================================================================
  // ANTES: useEffect manual + useState + debounce separado
  // DEPOIS: Hook usePatients com cache, debounce e deduplicate automático
  // BENEFÍCIOS:
  // - Cache de 5 min (não refaz request se já tem dados fresh)
  // - Debounce de 500ms integrado no hook
  // - Deduplica requests idênticos
  // - Retry automático em caso de erro
  // ===================================================================
  const { data: patients = [], isLoading: loading, error: queryError, refetch } = usePatients(
    clinicId,
    searchTerm
  )

  const error = queryError ? (queryError as Error).message : null

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    // React Query automaticamente refetch quando searchTerm mudar (após debounce)
  }

  const handleDeleteClick = (patient: Patient) => {
    setPatientToDelete(patient)
    setShowDeleteDialog(true)
  }

  const handleDeletePatient = async () => {
    if (!clinicId || !patientToDelete) return

    setDeleting(true)
    try {
      await patientsApi.delete(clinicId, patientToDelete.id)
      toast.success('Paciente excluído com sucesso')
      setShowDeleteDialog(false)
      setPatientToDelete(null)
      // Recarregar a lista de pacientes
      await refetch()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir paciente')
    } finally {
      setDeleting(false)
    }
  }

  const handleViewDetails = async (patient: Patient) => {
    if (!clinicId) return

    // Skip if patient is temporary (only exists in daily entries)
    if (patient.id.startsWith('temp-')) {
      toast.info('Este paciente não possui cadastro completo. Apenas registros em entradas diárias.')
      return
    }

    setSelectedPatient(patient)
    setShowDetailsDialog(true)
    setLoadingHistory(true)
    setPatientHistory(null)

    try {
      const history = await patientsApi.getHistory(clinicId, patient.id)
      setPatientHistory(history)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar histórico')
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleEditClick = (patient: Patient) => {
    // Skip if patient is temporary
    if (patient.id.startsWith('temp-')) {
      toast.info('Não é possível editar pacientes que não possuem cadastro completo.')
      return
    }

    setEditingPatient(patient)
    setEditForm({
      name: patient.name || '',
      email: patient.email || '',
      phone: patient.phone || '',
      birthDate: patient.birthDate || '',
      notes: patient.notes || '',
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!clinicId || !editingPatient) return

    setSaving(true)
    try {
      await patientsApi.update(clinicId, editingPatient.id, editForm)
      toast.success('Paciente atualizado com sucesso')
      setShowEditDialog(false)
      setEditingPatient(null)
      await refetch()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar paciente')
    } finally {
      setSaving(false)
    }
  }

  const handleNewPatientClick = () => {
    setNewPatientForm({ code: '', name: '', email: '', phone: '', birthDate: '', notes: '' })
    setShowNewPatientDialog(true)
  }

  const handleCreatePatient = async () => {
    if (!clinicId) return

    // Validar código (1-6 dígitos)
    if (!newPatientForm.code || !/^\d{1,6}$/.test(newPatientForm.code)) {
      toast.error('O código deve ter entre 1 e 6 dígitos')
      return
    }

    // Validar nome
    if (!newPatientForm.name.trim()) {
      toast.error('O nome é obrigatório')
      return
    }

    setCreating(true)
    try {
      await patientsApi.create(clinicId, {
        code: newPatientForm.code,
        name: newPatientForm.name.trim(),
        email: newPatientForm.email || undefined,
        phone: newPatientForm.phone || undefined,
        birthDate: newPatientForm.birthDate || undefined,
        notes: newPatientForm.notes || undefined,
      })
      toast.success('Paciente criado com sucesso')
      setShowNewPatientDialog(false)
      setNewPatientForm({ code: '', name: '', email: '', phone: '', birthDate: '', notes: '' })
      await refetch()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar paciente')
    } finally {
      setCreating(false)
    }
  }

  const canEditPatient = user?.role === 'GESTOR_CLINICA' || user?.role === 'MENTOR' || user?.permissions?.canEditPatients

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pacientes</h1>
          <p className="text-muted-foreground">
            Gerir e visualizar todos os pacientes cadastrados
          </p>
        </div>
        {canEditPatient && (
          <Button onClick={handleNewPatientClick}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Paciente
          </Button>
        )}
      </div>

      {/* Search and Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="md:col-span-3">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Pacientes</CardDescription>
            <CardTitle className="text-3xl">{patients.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Patients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
          <CardDescription>
            {searchTerm
              ? `Resultados para "${searchTerm}"`
              : 'Todos os pacientes cadastrados'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="text-center py-4 text-sm text-destructive">{error}</div>
          )}

          {!loading && !error && patients.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              {searchTerm
                ? 'Nenhum paciente encontrado'
                : 'Nenhum paciente cadastrado ainda'}
            </div>
          )}

          {!loading && !error && patients.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Data Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {patients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {patient.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                          {patient.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {patient.email}
                            </div>
                          )}
                          {patient.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {patient.phone}
                            </div>
                          )}
                          {!patient.email && !patient.phone && (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {patient.createdAt ? format(new Date(patient.createdAt), 'dd/MM/yyyy') : '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleViewDetails(patient)}
                          >
                            Ver Detalhes
                          </Button>
                          {canEditPatient && !patient.id.startsWith('temp-') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(patient)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {user?.role === 'GESTOR_CLINICA' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(patient)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Patient Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Histórico do Paciente</DialogTitle>
            <DialogDescription>
              {selectedPatient && (
                <>
                  <div className="mt-2">
                    <p className="font-medium">{selectedPatient.name}</p>
                    <p className="text-xs text-muted-foreground">Código: {selectedPatient.code}</p>
                  </div>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : patientHistory ? (
            <ScrollArea className="max-h-[60vh] pr-4">
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">Todos</TabsTrigger>
                  <TabsTrigger value="financial">Financeiro</TabsTrigger>
                  <TabsTrigger value="consultation">Consultas</TabsTrigger>
                  <TabsTrigger value="serviceTime">Tempo Serviço</TabsTrigger>
                  <TabsTrigger value="source">Origem</TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="space-y-4 mt-4">
                  {patientHistory.financial.length === 0 &&
                  patientHistory.consultation.length === 0 &&
                  patientHistory.serviceTime.length === 0 &&
                  patientHistory.source.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum registro encontrado para este paciente.
                    </p>
                  ) : (
                    <div className="space-y-6">
                      {patientHistory.financial.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <DollarSign className="h-4 w-4" />
                            Entradas Financeiras ({patientHistory.financial.length})
                          </h3>
                          <div className="space-y-2">
                            {patientHistory.financial.map((entry: any) => (
                              <div key={entry.id} className="border rounded p-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">{format(new Date(entry.date), 'dd/MM/yyyy')}</span>
                                  <span className="font-semibold">€{entry.value.toFixed(2)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {patientHistory.consultation.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Stethoscope className="h-4 w-4" />
                            Consultas ({patientHistory.consultation.length})
                          </h3>
                          <div className="space-y-2">
                            {patientHistory.consultation.map((entry: any) => (
                              <div key={entry.id} className="border rounded p-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">{format(new Date(entry.date), 'dd/MM/yyyy')}</span>
                                  {entry.planValue > 0 && (
                                    <span className="font-semibold">Plano: €{entry.planValue.toFixed(2)}</span>
                                  )}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground">
                                  {entry.planCreated && '✓ Plano criado'}
                                  {entry.planPresented && ' • ✓ Plano apresentado'}
                                  {entry.planAccepted && ' • ✓ Plano aceito'}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {patientHistory.serviceTime.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Tempo de Serviço ({patientHistory.serviceTime.length})
                          </h3>
                          <div className="space-y-2">
                            {patientHistory.serviceTime.map((entry: any) => (
                              <div key={entry.id} className="border rounded p-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">{format(new Date(entry.date), 'dd/MM/yyyy')}</span>
                                  <span className="text-muted-foreground">
                                    {entry.scheduledTime} → {entry.actualStartTime}
                                  </span>
                                </div>
                                {entry.delayReason && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Atraso: {entry.delayReason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {patientHistory.source.length > 0 && (
                        <div>
                          <h3 className="font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Origem ({patientHistory.source.length})
                          </h3>
                          <div className="space-y-2">
                            {patientHistory.source.map((entry: any) => (
                              <div key={entry.id} className="border rounded p-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="font-medium">{format(new Date(entry.date), 'dd/MM/yyyy')}</span>
                                  {entry.isReferral && (
                                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                      Indicação
                                    </span>
                                  )}
                                </div>
                                {entry.referralName && (
                                  <div className="mt-1 text-xs text-muted-foreground">
                                    Indicado por: {entry.referralName}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="financial" className="mt-4">
                  {patientHistory.financial.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhuma entrada financeira encontrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {patientHistory.financial.map((entry: any) => (
                        <div key={entry.id} className="border rounded p-3 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{format(new Date(entry.date), 'dd/MM/yyyy')}</span>
                            <span className="font-semibold">€{entry.value.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="consultation" className="mt-4">
                  {patientHistory.consultation.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhuma consulta encontrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {patientHistory.consultation.map((entry: any) => (
                        <div key={entry.id} className="border rounded p-3 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{format(new Date(entry.date), 'dd/MM/yyyy')}</span>
                            {entry.planValue > 0 && (
                              <span className="font-semibold">Plano: €{entry.planValue.toFixed(2)}</span>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {entry.planCreated && '✓ Plano criado'}
                            {entry.planPresented && ' • ✓ Plano apresentado'}
                            {entry.planAccepted && ' • ✓ Plano aceito'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="serviceTime" className="mt-4">
                  {patientHistory.serviceTime.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum registro de tempo de serviço encontrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {patientHistory.serviceTime.map((entry: any) => (
                        <div key={entry.id} className="border rounded p-3 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{format(new Date(entry.date), 'dd/MM/yyyy')}</span>
                            <span className="text-muted-foreground">
                              {entry.scheduledTime} → {entry.actualStartTime}
                            </span>
                          </div>
                          {entry.delayReason && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Atraso: {entry.delayReason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="source" className="mt-4">
                  {patientHistory.source.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">Nenhum registro de origem encontrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {patientHistory.source.map((entry: any) => (
                        <div key={entry.id} className="border rounded p-3 text-sm">
                          <div className="flex justify-between">
                            <span className="font-medium">{format(new Date(entry.date), 'dd/MM/yyyy')}</span>
                            {entry.isReferral && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                Indicação
                              </span>
                            )}
                          </div>
                          {entry.referralName && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              Indicado por: {entry.referralName}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground py-8">Nenhum histórico disponível.</p>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Patient Dialog */}
      <Dialog open={showNewPatientDialog} onOpenChange={setShowNewPatientDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Novo Paciente</DialogTitle>
            <DialogDescription>
              Cadastre um novo paciente na clínica
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-code">Código * (1-6 dígitos)</Label>
              <Input
                id="new-code"
                value={newPatientForm.code}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setNewPatientForm({ ...newPatientForm, code: value })
                }}
                placeholder="123456"
                maxLength={6}
              />
              <p className="text-xs text-muted-foreground">
                O código deve ser único e ter entre 1 e 6 dígitos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-name">Nome *</Label>
              <Input
                id="new-name"
                value={newPatientForm.name}
                onChange={(e) => setNewPatientForm({ ...newPatientForm, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={newPatientForm.email}
                onChange={(e) => setNewPatientForm({ ...newPatientForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-phone">Telefone</Label>
              <Input
                id="new-phone"
                type="tel"
                value={newPatientForm.phone}
                onChange={(e) => setNewPatientForm({ ...newPatientForm, phone: e.target.value })}
                placeholder="+351 900 000 000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-birthDate">Data de Nascimento</Label>
              <Input
                id="new-birthDate"
                type="date"
                value={newPatientForm.birthDate}
                onChange={(e) => setNewPatientForm({ ...newPatientForm, birthDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-notes">Observações</Label>
              <Textarea
                id="new-notes"
                value={newPatientForm.notes}
                onChange={(e) => setNewPatientForm({ ...newPatientForm, notes: e.target.value })}
                placeholder="Notas adicionais sobre o paciente..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewPatientDialog(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePatient} disabled={creating || !newPatientForm.code || !newPatientForm.name.trim()}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Paciente'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Paciente</DialogTitle>
            <DialogDescription>
              Atualize as informações do paciente {editingPatient?.name} (código: {editingPatient?.code})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
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
              <Label htmlFor="edit-phone">Telefone</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+351 900 000 000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
              <Input
                id="edit-birthDate"
                type="date"
                value={editForm.birthDate}
                onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Notas adicionais sobre o paciente..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editForm.name.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o paciente <strong>{patientToDelete?.name}</strong> (código: <strong>{patientToDelete?.code}</strong>)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 py-4">
            <p className="text-sm text-muted-foreground mb-2">
              Esta ação irá remover <strong>permanentemente</strong>:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-muted-foreground">
              <li>O paciente do sistema</li>
              <li>Todos os registros de consultas</li>
              <li>Todas as entradas financeiras</li>
              <li>Todos os registros de tempo de serviço</li>
              <li>Todos os registros de origem (sources)</li>
              <li>Todas as pesquisas NPS relacionadas</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-4">
              <strong className="text-destructive">Esta ação não pode ser desfeita.</strong>
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePatient}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir Paciente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
