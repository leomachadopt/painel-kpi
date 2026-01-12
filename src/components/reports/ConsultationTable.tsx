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
import { DailyConsultationEntry, Clinic } from '@/lib/types'
import { Check, X, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import useDataStore from '@/stores/useDataStore'
import { EditConsultationDialog } from './EditConsultationDialog'
import { useTranslation } from '@/hooks/useTranslation'

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

  const StatusIcon = ({ status }: { status: boolean }) =>
    status ? (
      <Check className="h-4 w-4 text-emerald-500" />
    ) : (
      <X className="h-4 w-4 text-rose-500" />
    )

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

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Código</TableHead>
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
            {data.length > 0 ? (
              data.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{entry.patientName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.code}
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
                <TableCell colSpan={clinic ? 9 : 8} className="h-24 text-center">
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
