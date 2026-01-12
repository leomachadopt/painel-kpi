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
import { DailyCabinetUsageEntry, Clinic } from '@/lib/types'
import useDataStore from '@/stores/useDataStore'
import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'

export function CabinetTable({
  data,
  clinic,
  onDelete,
}: {
  data: DailyCabinetUsageEntry[]
  clinic: Clinic
  onDelete?: () => void
}) {
  const { t } = useTranslation()
  const { deleteCabinetEntry } = useDataStore()
  const [deleting, setDeleting] = useState<string | null>(null)

  const getCabinetName = (id: string) =>
    clinic.configuration.cabinets.find((c) => c.id === id)?.name || id

  const handleDelete = async (entry: DailyCabinetUsageEntry) => {
    if (!confirm(`Excluir registo de ${getCabinetName(entry.cabinetId)} em ${entry.date}?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await deleteCabinetEntry(clinic.id, entry.id)
      onDelete?.()
    } catch (error) {
      // Error toast already shown by deleteCabinetEntry
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
            <TableHead>{t('financial.cabinet')}</TableHead>
            <TableHead className="text-center">Horas Disponíveis</TableHead>
            <TableHead className="text-center">Horas Usadas</TableHead>
            <TableHead className="text-right">Taxa Ocupação</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry) => {
              const rate =
                entry.hoursAvailable > 0
                  ? (entry.hoursUsed / entry.hoursAvailable) * 100
                  : 0
              return (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date}</TableCell>
                  <TableCell>{getCabinetName(entry.cabinetId)}</TableCell>
                  <TableCell className="text-center">
                    {entry.hoursAvailable}h
                  </TableCell>
                  <TableCell className="text-center">
                    {entry.hoursUsed}h
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {rate.toFixed(1)}%
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
              <TableCell colSpan={6} className="h-24 text-center">
                Nenhum registo de ocupação no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
