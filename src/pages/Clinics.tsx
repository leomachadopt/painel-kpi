import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, MapPin, AlertTriangle, Trash2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import useDataStore from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'
import { clinicsApi } from '@/services/api'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'

export default function Clinics() {
  const { clinics, calculateKPIs, calculateAlerts, reloadClinics } = useDataStore()
  const { user } = useAuthStore()
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewClinicDialog, setShowNewClinicDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [clinicToDelete, setClinicToDelete] = useState<string | null>(null)
  const [newClinicName, setNewClinicName] = useState('')
  const [newClinicOwner, setNewClinicOwner] = useState('')
  const [newClinicEmail, setNewClinicEmail] = useState('')
  const [newClinicPassword, setNewClinicPassword] = useState('')
  const [newClinicCountry, setNewClinicCountry] = useState<'PT-BR' | 'PT-PT'>('PT-BR')
  const [clinicToEdit, setClinicToEdit] = useState<any>(null)
  const [editClinicName, setEditClinicName] = useState('')
  const [editClinicOwner, setEditClinicOwner] = useState('')
  const [editClinicCountry, setEditClinicCountry] = useState<'PT-BR' | 'PT-PT'>('PT-BR')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Constants for current month simulation
  const CURRENT_MONTH = 12
  const CURRENT_YEAR = 2023

  useEffect(() => {
    if (user && user.role !== 'MENTOR') {
      if (user.clinicId) {
        navigate(`/dashboard/${user.clinicId}`)
      } else {
        navigate('/')
      }
    }
  }, [user, navigate])

  const filteredClinics = clinics.filter((clinic) =>
    clinic.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCreateClinic = async () => {
    if (!newClinicName.trim() || !newClinicOwner.trim()) {
      toast.error('Nome e responsável são obrigatórios')
      return
    }

    if (!newClinicEmail.trim() || !newClinicPassword.trim()) {
      toast.error('Email e senha são obrigatórios')
      return
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newClinicEmail.trim())) {
      toast.error('Email inválido')
      return
    }

    // Validate password length
    if (newClinicPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setLoading(true)
    try {
      await clinicsApi.create({
        name: newClinicName.trim(),
        ownerName: newClinicOwner.trim(),
        email: newClinicEmail.trim(),
        password: newClinicPassword,
        country: newClinicCountry,
      })
      toast.success('Clínica e usuário criados com sucesso!')
      setShowNewClinicDialog(false)
      setNewClinicName('')
      setNewClinicOwner('')
      setNewClinicEmail('')
      setNewClinicPassword('')
      setNewClinicCountry('PT-BR')
      // Reload page to fetch updated clinics list
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar clínica')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClinic = (clinic: any) => {
    setClinicToEdit(clinic)
    setEditClinicName(clinic.name)
    setEditClinicOwner(clinic.ownerName)
    setEditClinicCountry(clinic.country || 'PT-BR')
    setShowEditDialog(true)
  }

  const handleUpdateClinic = async () => {
    if (!clinicToEdit) return

    if (!editClinicName.trim() || !editClinicOwner.trim()) {
      toast.error('Nome e responsável são obrigatórios')
      return
    }

    setLoading(true)
    try {
      console.log('Atualizando clínica:', {
        id: clinicToEdit.id,
        name: editClinicName.trim(),
        ownerName: editClinicOwner.trim(),
        country: editClinicCountry,
      })
      
      await clinicsApi.update(clinicToEdit.id, {
        name: editClinicName.trim(),
        ownerName: editClinicOwner.trim(),
        country: editClinicCountry,
      })
      
      console.log('Clínica atualizada com sucesso, recarregando...')
      toast.success('Clínica atualizada com sucesso!')
      setShowEditDialog(false)
      setClinicToEdit(null)
      
      // Recarregar clínicas do store para atualizar a lista sem recarregar a página
      await reloadClinics()
      
      // Verificar se o valor foi realmente atualizado
      const updatedClinics = await clinicsApi.getAll()
      const updatedClinic = updatedClinics.find(c => c.id === clinicToEdit.id)
      console.log('Clínica após atualização:', updatedClinic)
      
      if (updatedClinic && updatedClinic.country !== editClinicCountry) {
        console.warn('Aviso: O país não foi atualizado corretamente. Valor esperado:', editClinicCountry, 'Valor atual:', updatedClinic.country)
        toast.warning('Clínica atualizada, mas o país pode não ter sido salvo. Verifique se a migration foi executada.')
      }
    } catch (error: any) {
      console.error('Erro ao atualizar clínica:', error)
      toast.error(error.message || 'Erro ao atualizar clínica')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteClinic = async () => {
    if (!clinicToDelete) return

    setLoading(true)
    try {
      await clinicsApi.delete(clinicToDelete)
      toast.success('Clínica excluída com sucesso!')
      setShowDeleteDialog(false)
      setClinicToDelete(null)
      // Reload page to fetch updated clinics list
      window.location.reload()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir clínica')
    } finally {
      setLoading(false)
    }
  }

  if (user?.role !== 'MENTOR') {
    return null
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestão de Clínicas
          </h1>
          <p className="text-muted-foreground">
            Painel da Mentora: Visão geral de desempenho e alertas da rede.
          </p>
        </div>
        <Button onClick={() => setShowNewClinicDialog(true)} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova Clínica
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar clínicas por nome, responsável..."
          className="pl-9 max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClinics.map((clinic) => {
          const clinicLocale = clinic.country || 'PT-BR'
          const kpis = calculateKPIs(clinic.id, CURRENT_MONTH, CURRENT_YEAR, clinicLocale)
          const alerts = calculateAlerts(clinic.id, CURRENT_MONTH, CURRENT_YEAR, clinicLocale)

          const revenueKPI = kpis.find((k) => k.id === 'revenue_monthly')
          const alignersKPI = kpis.find((k) => k.id === 'aligner_starts')
          const npsKPI = kpis.find((k) => k.id === 'nps')

          const revenuePercent = revenueKPI
            ? (revenueKPI.value / clinic.targetRevenue) * 100
            : 0

          const alertCount = alerts.length

          const revenueStatus = revenueKPI?.status || 'danger'
          const statusColor = {
            success: 'bg-emerald-500',
            warning: 'bg-amber-400',
            danger: 'bg-rose-500',
          }[revenueStatus]

          const statusTextColor = {
            success: 'text-emerald-600',
            warning: 'text-amber-500',
            danger: 'text-rose-600',
          }[revenueStatus]

          return (
            <Card
              key={clinic.id}
              className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg relative overflow-hidden"
              onClick={() => navigate(`/dashboard/${clinic.id}`)}
            >
              <div
                className={`absolute top-0 left-0 w-1 h-full ${statusColor}`}
              />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10 flex-shrink-0">
                    <img
                      src={
                        clinic.logoUrl ||
                        'https://img.usecurling.com/i?q=hospital&color=blue'
                      }
                      alt="Logo"
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{clinic.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="mr-1 h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{clinic.ownerName}</span>
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-start gap-2 flex-shrink-0">
                  {alertCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="flex items-center gap-1"
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {alertCount}
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEditClinic(clinic)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      setClinicToDelete(clinic.id)
                      setShowDeleteDialog(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {t('financial.billingVsTarget')}
                    </span>
                    <span className={`font-bold ${statusTextColor}`}>
                      {revenuePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${statusColor}`}
                      style={{
                        width: `${Math.min(revenuePercent, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">
                      Alinhadores
                    </span>
                    <span className="text-lg font-bold">
                      {alignersKPI?.value || 0}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">
                      NPS
                    </span>
                    <span className="text-lg font-bold">
                      {npsKPI?.value || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-primary hover:text-primary/80 font-medium h-8"
                >
                  Aceder ao Dashboard
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* New Clinic Dialog */}
      <Dialog open={showNewClinicDialog} onOpenChange={setShowNewClinicDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Clínica</DialogTitle>
            <DialogDescription>
              {t('clinic.createNew')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('clinic.name')}</Label>
              <Input
                id="name"
                placeholder="Ex: Clínica Sorriso"
                value={newClinicName}
                onChange={(e) => setNewClinicName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="owner">{t('clinic.ownerName')}</Label>
              <Input
                id="owner"
                placeholder="Ex: Dr. João Silva"
                value={newClinicOwner}
                onChange={(e) => setNewClinicOwner(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('clinic.email')}</Label>
              <Input
                id="email"
                type="email"
                placeholder="Ex: gestor@clinica.com"
                value={newClinicEmail}
                onChange={(e) => setNewClinicEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('clinic.password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newClinicPassword}
                onChange={(e) => setNewClinicPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">{t('clinic.country')}</Label>
              <Select
                value={newClinicCountry}
                onValueChange={(value: 'PT-BR' | 'PT-PT') => setNewClinicCountry(value)}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder={t('clinic.selectCountry')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PT-BR">Brasil (Português-BR)</SelectItem>
                  <SelectItem value="PT-PT">Portugal (Português-PT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewClinicDialog(false)}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleCreateClinic} disabled={loading}>
              {loading ? t('common.creating') : t('clinic.createClinic')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Clinic Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('clinic.editClinic')}</DialogTitle>
            <DialogDescription>
              {t('clinic.editInfo')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t('clinic.name')}</Label>
              <Input
                id="edit-name"
                placeholder="Ex: Clínica Sorriso"
                value={editClinicName}
                onChange={(e) => setEditClinicName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-owner">{t('clinic.ownerName')}</Label>
              <Input
                id="edit-owner"
                placeholder="Ex: Dr. João Silva"
                value={editClinicOwner}
                onChange={(e) => setEditClinicOwner(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-country">{t('clinic.country')}</Label>
              <Select
                value={editClinicCountry}
                onValueChange={(value: 'PT-BR' | 'PT-PT') => setEditClinicCountry(value)}
              >
                <SelectTrigger id="edit-country">
                  <SelectValue placeholder={t('clinic.selectCountry')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PT-BR">Brasil (Português-BR)</SelectItem>
                  <SelectItem value="PT-PT">Portugal (Português-PT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false)
                setClinicToEdit(null)
              }}
              disabled={loading}
            >
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpdateClinic} disabled={loading}>
              {loading ? t('common.saving') : t('common.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta clínica? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteClinic}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? t('common.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
