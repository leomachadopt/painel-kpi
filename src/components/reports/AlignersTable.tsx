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
import { DailyAlignersEntry, Clinic } from '@/lib/types'
import { Check, X, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import useDataStore from '@/stores/useDataStore'
import { EditAlignersDialog } from './EditAlignersDialog'

export function AlignersTable({
  data,
  clinic,
  onDelete,
}: {
  data: DailyAlignersEntry[]
  clinic?: Clinic
  onDelete?: () => void
}) {
  const { deleteAlignersEntry } = useDataStore()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<DailyAlignersEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const StatusIcon = ({ status }: { status: boolean }) =>
    status ? (
      <Check className="h-4 w-4 text-emerald-500" />
    ) : (
      <X className="h-4 w-4 text-rose-500" />
    )

  const getBrandName = (brandId: string) => {
    return clinic?.configuration.alignerBrands.find(b => b.id === brandId)?.name || brandId
  }

  const handleDelete = async (entry: DailyAlignersEntry) => {
    if (!clinic) return
    
    if (!confirm(`Excluir alinhador de ${entry.patientName} (código ${entry.code})?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await deleteAlignersEntry(clinic.id, entry.id)
      toast.success('Alinhador excluído com sucesso!')
      onDelete?.()
    } catch (error: any) {
      // Erro já é tratado na store
    } finally {
      setDeleting(null)
    }
  }

  const handleEdit = (entry: DailyAlignersEntry) => {
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
              <TableHead>Tipo</TableHead>
              <TableHead className="text-center">Cadastro Criado (Assistente)</TableHead>
              <TableHead className="text-center">CCK Criado (Médico (a))</TableHead>
              <TableHead className="text-center">Aguardando Plano (Empresa)</TableHead>
              <TableHead className="text-center">Plano Aprovado (Médico (a))</TableHead>
              <TableHead className="text-center">Alinhadores entregues (Assistente)</TableHead>
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
                  <TableCell>{getBrandName(entry.alignerBrandId)}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <StatusIcon status={entry.registrationCreated} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <StatusIcon status={entry.cckCreated} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <StatusIcon status={entry.awaitingPlan} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <StatusIcon status={entry.awaitingApproval} />
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      {entry.approved ? (
                        <Badge className="bg-emerald-500">Alinhadores entregues (Assistente)</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </div>
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
                <TableCell colSpan={clinic ? 10 : 9} className="h-24 text-center">
                  Nenhum alinhador registado no período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {clinic && (
        <EditAlignersDialog
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

