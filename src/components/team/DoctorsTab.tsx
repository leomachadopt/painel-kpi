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
import { Shield, Loader2, Mail, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import useAuthStore from '@/stores/useAuthStore'
import { collaboratorsApi } from '@/services/api'

interface Doctor {
  id: string
  name: string
  email?: string
  whatsapp?: string
  active?: boolean
  hasUserAccount?: boolean
  userId?: string
}

export default function DoctorsTab() {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    whatsapp: '',
    active: true,
    password: '',
  })

  useEffect(() => {
    loadDoctors()
  }, [])

  const loadDoctors = async () => {
    try {
      setLoading(true)
      const data = await collaboratorsApi.listDoctors()
      setDoctors(data)
    } catch (error) {
      console.error('Failed to load doctors:', error)
      toast.error(t('team.errorLoadingDoctors'))
    } finally {
      setLoading(false)
    }
  }

  const handleOpenEditDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setEditForm({
      name: doctor.name || '',
      email: doctor.email || '',
      whatsapp: doctor.whatsapp || '',
      active: doctor.active !== undefined ? doctor.active : true,
      password: '',
    })
    setShowEditModal(true)
  }

  const handleUpdateDoctor = async () => {
    if (!selectedDoctor) return

    if (!editForm.name || !editForm.email) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    try {
      setSubmitting(true)
      const updateData: { name: string; email: string; whatsapp?: string; active: boolean; password?: string } = {
        name: editForm.name,
        email: editForm.email,
        whatsapp: editForm.whatsapp || undefined,
        active: editForm.active,
      }

      if (editForm.password && editForm.password.trim() !== '') {
        updateData.password = editForm.password
      }

      await collaboratorsApi.updateDoctor(selectedDoctor.id, updateData)
      toast.success('Médico atualizado com sucesso')
      setShowEditModal(false)
      setSelectedDoctor(null)
      setEditForm({ name: '', email: '', whatsapp: '', active: true, password: '' })
      loadDoctors()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar médico')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenDeleteDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor)
    setShowDeleteModal(true)
  }

  const handleDeleteDoctor = async () => {
    if (!selectedDoctor) return

    try {
      setSubmitting(true)
      await collaboratorsApi.deleteDoctor(selectedDoctor.id)
      toast.success('Médico removido com sucesso')
      setShowDeleteModal(false)
      setSelectedDoctor(null)
      loadDoctors()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao remover médico')
    } finally {
      setSubmitting(false)
    }
  }

  // Count doctors with real vs fictitious emails
  const emailStats = doctors.reduce((acc, doctor) => {
    if (doctor.email?.endsWith('@dentalkpi.com')) {
      acc.fictitious++
    } else if (doctor.email) {
      acc.real++
    }
    return acc
  }, { real: 0, fictitious: 0 })

  return (
    <>
      <div className="mb-6">
        <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800 p-4">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            {t('team.doctorsInfo')}
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {t('team.doctorsDescription')}
          </p>
          <div className="mt-3 flex gap-4 text-xs text-blue-600 dark:text-blue-400">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{t('team.realEmails')}: <strong>{emailStats.real}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>{t('team.fictitiousEmails')}: <strong>{emailStats.fictitious}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('team.doctorsList')}</CardTitle>
          <CardDescription>
            {t('team.doctorsWithAccess')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : doctors.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              {t('team.noDoctorsRegistered')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('team.name')}</TableHead>
                  <TableHead>{t('team.email')}</TableHead>
                  <TableHead>{t('team.whatsapp')}</TableHead>
                  <TableHead>{t('team.status')}</TableHead>
                  <TableHead className="text-right">{t('team.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((doctor) => {
                  const isFictitious = doctor.email?.endsWith('@dentalkpi.com')
                  const hasAccount = doctor.email && !isFictitious

                  return (
                    <TableRow key={doctor.id}>
                      <TableCell className="font-medium">{doctor.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={isFictitious ? 'text-muted-foreground text-sm' : ''}>
                            {doctor.email || '-'}
                          </span>
                          {isFictitious && (
                            <Badge variant="outline" className="text-xs">
                              {t('team.fictitious')}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{doctor.whatsapp || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={hasAccount ? 'default' : 'secondary'}>
                          {hasAccount ? t('team.hasAccount') : t('team.noAccount')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEditDoctor(doctor)}
                          >
                            <Pencil className="h-4 w-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDeleteDoctor(doctor)}
                          >
                            <Trash2 className="h-4 w-4 mr-1 text-destructive" />
                            Remover
                          </Button>
                          {hasAccount && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                toast.info(t('team.permissionsComingSoon'))
                              }}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              {t('team.permissions')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Doctor Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Médico</DialogTitle>
            <DialogDescription>
              Atualizar informações do médico
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-doctor-name">Nome</Label>
              <Input
                id="edit-doctor-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-doctor-email">Email</Label>
              <Input
                id="edit-doctor-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-doctor-whatsapp">WhatsApp (opcional)</Label>
              <Input
                id="edit-doctor-whatsapp"
                value={editForm.whatsapp}
                onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                placeholder="Ex: +351 912 345 678"
              />
            </div>
            {selectedDoctor?.hasUserAccount && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-doctor-password">Nova senha (opcional)</Label>
                  <Input
                    id="edit-doctor-password"
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Deixe em branco para manter a senha atual"
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco se não quiser alterar a senha
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="edit-doctor-active"
                    checked={editForm.active}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, active: checked === true })
                    }
                  />
                  <Label htmlFor="edit-doctor-active" className="cursor-pointer">
                    Médico ativo no sistema
                  </Label>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateDoctor} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover Médico</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{selectedDoctor?.name}</strong>?
              {' '}Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteDoctor} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
