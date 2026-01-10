import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import { DailyConsultationControlEntry, Clinic } from '@/lib/types'
import useDataStore from '@/stores/useDataStore'
import { useState } from 'react'

export function ConsultationControlTable({
  data,
  clinic,
  onDelete,
}: {
  data: DailyConsultationControlEntry[]
  clinic: Clinic
  onDelete?: () => void
}) {
  const { deleteConsultationControlEntry } = useDataStore()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (entry: DailyConsultationControlEntry) => {
    const total = entry.noShow + entry.rescheduled + entry.cancelled + entry.oldPatientBooking
    if (!confirm(`Excluir dados de controle de consultas de ${entry.date} (${total} registos)?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await deleteConsultationControlEntry(clinic.id, entry.id)
      onDelete?.()
    } catch (error) {
      // Error toast already shown by deleteConsultationControlEntry
    } finally {
      setDeleting(null)
    }
  }
  
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead className="text-center">Não Comparecimento</TableHead>
            <TableHead className="text-center">Remarcação</TableHead>
            <TableHead className="text-center">Cancelamento</TableHead>
            <TableHead className="text-center">Paciente Antigo</TableHead>
            <TableHead className="text-right font-bold">Total</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry) => {
              const total =
                entry.noShow + entry.rescheduled + entry.cancelled + entry.oldPatientBooking
              return (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell className="text-center font-medium text-orange-600">
                    {entry.noShow}
                  </TableCell>
                  <TableCell className="text-center font-medium text-blue-600">
                    {entry.rescheduled}
                  </TableCell>
                  <TableCell className="text-center font-medium text-red-600">
                    {entry.cancelled}
                  </TableCell>
                  <TableCell className="text-center font-medium text-green-600">
                    {entry.oldPatientBooking}
                  </TableCell>
                  <TableCell className="text-right font-bold text-primary">
                    {total}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(entry)}
                      disabled={deleting === entry.id}
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                Nenhum registo de controle de consultas no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}






