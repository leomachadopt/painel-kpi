import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Patient } from '@/lib/types'
import { patientsApi } from '@/services/api'
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
import { Search, UserPlus, Loader2, Mail, Phone, Calendar, Trash2 } from 'lucide-react'
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

export default function Patients() {
  const { user } = useAuthStore()
  const { clinicId } = useParams<{ clinicId: string }>()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (clinicId) {
      loadPatients()
    }
  }, [clinicId])

  const loadPatients = async (search?: string) => {
    if (!clinicId) return

    setLoading(true)
    setError(null)
    try {
      const data = await patientsApi.getAll(clinicId, search)
      setPatients(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    if (value.length >= 2 || value.length === 0) {
      loadPatients(value || undefined)
    }
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
      await loadPatients(searchTerm || undefined)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir paciente')
    } finally {
      setDeleting(false)
    }
  }

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
        {user?.role === 'GESTOR_CLINICA' && (
          <Button>
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
                          {format(new Date(patient.createdAt), 'dd/MM/yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="sm">
                            Ver Detalhes
                          </Button>
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
