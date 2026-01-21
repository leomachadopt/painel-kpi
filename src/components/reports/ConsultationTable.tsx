import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DailyConsultationEntry, Clinic } from '@/lib/types'
import { Check, X, Pencil, Trash2, ClipboardCheck } from 'lucide-react'
import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import useDataStore from '@/stores/useDataStore'
import { EditConsultationDialog } from './EditConsultationDialog'
import { useTranslation } from '@/hooks/useTranslation'

type StatusFilter = 'all' | 'no_plan' | 'plan_created' | 'plan_presented' | 'plan_accepted' | 'not_eligible'

export function ConsultationTable({
  data,
  clinic,
  onDelete,
}: {
  data: DailyConsultationEntry[]
  clinic?: Clinic
  onDelete?: () => void
}) {
  const { deleteConsultationEntry } = useDataStore()
  const { formatCurrency } = useTranslation()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<DailyConsultationEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const StatusIcon = ({ status }: { status: boolean }) =>
    status ? (
      <Check className="h-4 w-4 text-emerald-500" />
    ) : (
      <X className="h-4 w-4 text-rose-500" />
    )

  const getStatus = (entry: DailyConsultationEntry) => {
    if (entry.planNotEligible) return 'not_eligible'
    if (entry.planAccepted) return 'plan_accepted'
    if (entry.planPresented) return 'plan_presented'
    if (entry.planCreated) return 'plan_created'
    return 'no_plan'
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'not_eligible': return 'Não-Elegível'
      case 'plan_accepted': return 'Plano Aceito'
      case 'plan_presented': return 'Plano Apresentado'
      case 'plan_created': return 'Plano Criado'
      case 'no_plan': return 'Sem Plano'
      default: return '-'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'not_eligible': return <Badge variant="destructive">Não-Elegível</Badge>
      case 'plan_accepted': return <Badge className="bg-emerald-500">Plano Aceito</Badge>
      case 'plan_presented': return <Badge className="bg-amber-500">Plano Apresentado</Badge>
      case 'plan_created': return <Badge className="bg-blue-500">Plano Criado</Badge>
      case 'no_plan': return <Badge variant="outline">Sem Plano</Badge>
      default: return <Badge variant="outline">-</Badge>
    }
  }

  const filteredData = useMemo(() => {
    if (statusFilter === 'all') return data
    return data.filter((entry) => getStatus(entry) === statusFilter)
  }, [data, statusFilter])

  const handleDelete = async (entry: DailyConsultationEntry) => {
    if (!clinic) return
    
    if (!confirm(`Excluir consulta de ${entry.patientName} (código ${entry.code})?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await deleteConsultationEntry(clinic.id, entry.id)
      toast.success('Consulta excluída com sucesso!')
      onDelete?.()
    } catch (error: any) {
      // Erro já é tratado na store
    } finally {
      setDeleting(null)
    }
  }

  const handleEdit = (entry: DailyConsultationEntry) => {
    if (!clinic) return
    setEditingEntry(entry)
    setIsEditDialogOpen(true)
  }

  const handleEditSuccess = () => {
    onDelete?.() // Recarregar dados
  }

  const getProceduresStatus = (entry: DailyConsultationEntry) => {
    if (!entry.consultationCompleted || !entry.completedProcedures) {
      return null
    }

    const procedures = Object.values(entry.completedProcedures)
    const completed = procedures.filter((p: any) => p.completed).length
    const total = procedures.length

    return { completed, total }
  }

  return (
    <>
      {/* Filter */}
      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm font-medium">Filtrar por status:</label>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="no_plan">Sem Plano</SelectItem>
            <SelectItem value="plan_created">Plano Criado</SelectItem>
            <SelectItem value="plan_presented">Plano Apresentado</SelectItem>
            <SelectItem value="plan_accepted">Plano Aceito</SelectItem>
            <SelectItem value="not_eligible">Não-Elegível</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Código</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Consulta Realizada</TableHead>
              <TableHead className="text-center">Plano Criado</TableHead>
              <TableHead className="text-center">Apresentado</TableHead>
              <TableHead className="text-center">Aceite</TableHead>
              <TableHead className="text-right">Valor Previsto</TableHead>
              <TableHead className="text-right">Valor Aceite</TableHead>
              {clinic && (
                <TableHead className="w-[120px]">Ações</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length > 0 ? (
              filteredData.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.patientName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.code}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      {getStatusBadge(getStatus(entry))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      {entry.consultationCompleted ? (
                        <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700">
                          <ClipboardCheck className="h-3 w-3 mr-1" />
                          {getProceduresStatus(entry) ? (
                            <span>
                              {getProceduresStatus(entry)!.completed}/{getProceduresStatus(entry)!.total}
                            </span>
                          ) : (
                            <span>Sim</span>
                          )}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">Não</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <StatusIcon status={entry.planCreated} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <StatusIcon status={entry.planPresented} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      {entry.planAccepted ? (
                        <Badge className="bg-emerald-500">Aceito</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.planPresentedValue && entry.planPresentedValue > 0
                      ? formatCurrency(entry.planPresentedValue)
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.planValue && entry.planValue > 0
                      ? formatCurrency(entry.planValue)
                      : '-'}
                  </TableCell>
                  {clinic && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(entry)}
                          className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(entry)}
                          disabled={deleting === entry.id}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={clinic ? 11 : 10} className="h-24 text-center">
                  Nenhuma consulta registada no período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {clinic && (
        <EditConsultationDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          entry={editingEntry}
          clinic={clinic}
          onSuccess={handleEditSuccess}
        />
      )}
    </>
  )
}
