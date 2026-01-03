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
import { Trash2 } from 'lucide-react'
import { DailyServiceTimeEntry, Clinic } from '@/lib/types'
import useDataStore from '@/stores/useDataStore'
import { useState } from 'react'

export function ServiceTimeTable({
  data,
  clinic,
  onDelete,
}: {
  data: DailyServiceTimeEntry[]
  clinic: Clinic
  onDelete?: () => void
}) {
  const { deleteServiceTimeEntry } = useDataStore()
  const [deleting, setDeleting] = useState<string | null>(null)

  const getDoctorName = (id: string) =>
    clinic.configuration.doctors.find((d) => d.id === id)?.name || id

  const handleDelete = async (entry: DailyServiceTimeEntry) => {
    if (!confirm(`Excluir registo de ${entry.patientName} em ${entry.date}?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await deleteServiceTimeEntry(clinic.id, entry.id)
      onDelete?.()
    } catch (error) {
      // Error toast already shown by deleteServiceTimeEntry
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
            <TableHead>Paciente</TableHead>
            <TableHead>Médico</TableHead>
            <TableHead>Agendado</TableHead>
            <TableHead>Início Real</TableHead>
            <TableHead>Atraso</TableHead>
            <TableHead className="text-right">Motivo</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry) => {
              const [h1, m1] = entry.scheduledTime.split(':').map(Number)
              const [h2, m2] = entry.actualStartTime.split(':').map(Number)
              const diff = h2 * 60 + m2 - (h1 * 60 + m1)
              const isDelayed = diff > 0

              return (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>
                    {entry.patientName}
                    <span className="block text-xs text-muted-foreground font-mono">
                      {entry.code}
                    </span>
                  </TableCell>
                  <TableCell>{getDoctorName(entry.doctorId)}</TableCell>
                  <TableCell>{entry.scheduledTime}</TableCell>
                  <TableCell>{entry.actualStartTime}</TableCell>
                  <TableCell>
                    {isDelayed ? (
                      <span className="text-rose-600 font-medium">
                        +{diff} min
                      </span>
                    ) : (
                      <span className="text-emerald-600">No horário</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {isDelayed && entry.delayReason && (
                      <Badge variant="outline" className="capitalize">
                        {entry.delayReason}
                      </Badge>
                    )}
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
              <TableCell colSpan={8} className="h-24 text-center">
                Nenhum registo de tempo no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
