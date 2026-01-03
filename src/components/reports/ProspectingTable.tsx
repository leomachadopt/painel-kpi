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
import { DailyProspectingEntry, Clinic } from '@/lib/types'
import useDataStore from '@/stores/useDataStore'
import { useState } from 'react'

export function ProspectingTable({
  data,
  clinic,
  onDelete,
}: {
  data: DailyProspectingEntry[]
  clinic: Clinic
  onDelete?: () => void
}) {
  const { deleteProspectingEntry } = useDataStore()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (entry: DailyProspectingEntry) => {
    const total = entry.email + entry.sms + entry.whatsapp + entry.instagram
    if (!confirm(`Excluir dados de prospecção de ${entry.date} (${total} leads)?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await deleteProspectingEntry(clinic.id, entry.id)
      onDelete?.()
    } catch (error) {
      // Error toast already shown by deleteProspectingEntry
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
            <TableHead className="text-center">Agendadas</TableHead>
            <TableHead className="text-center">Emails</TableHead>
            <TableHead className="text-center">SMS</TableHead>
            <TableHead className="text-center">WhatsApp</TableHead>
            <TableHead className="text-center">Instagram</TableHead>
            <TableHead className="text-right font-bold">Total Leads</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry) => {
              const total =
                entry.email + entry.sms + entry.whatsapp + entry.instagram
              return (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell className="text-center font-medium text-emerald-600">
                    {entry.scheduled}
                  </TableCell>
                  <TableCell className="text-center">{entry.email}</TableCell>
                  <TableCell className="text-center">{entry.sms}</TableCell>
                  <TableCell className="text-center">
                    {entry.whatsapp}
                  </TableCell>
                  <TableCell className="text-center">
                    {entry.instagram}
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
              <TableCell colSpan={8} className="h-24 text-center">
                Nenhum registo de prospecção no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
