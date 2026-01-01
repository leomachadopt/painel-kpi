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
import { DailyFinancialEntry, Clinic } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import { useState } from 'react'

export function FinancialTable({
  data,
  clinic,
  onDelete,
}: {
  data: DailyFinancialEntry[]
  clinic: Clinic
  onDelete?: () => void
}) {
  const [deleting, setDeleting] = useState<string | null>(null)

  const getCategoryName = (id: string) =>
    clinic.configuration.categories.find((c) => c.id === id)?.name || id
  const getCabinetName = (id: string) =>
    clinic.configuration.cabinets.find((c) => c.id === id)?.name || id

  const handleDelete = async (entry: DailyFinancialEntry) => {
    if (!confirm(`Excluir lançamento de €${entry.value} de ${entry.patientName}?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await dailyEntriesApi.financial.delete(clinic.id, entry.id)
      toast.success('Lançamento excluído com sucesso!')
      onDelete?.()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir lançamento')
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
            <TableHead>Código</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Gabinete</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.date.split('T')[0]}</TableCell>
                <TableCell>{entry.patientName}</TableCell>
                <TableCell className="font-mono text-xs">
                  {entry.code}
                </TableCell>
                <TableCell>{getCategoryName(entry.categoryId)}</TableCell>
                <TableCell>{getCabinetName(entry.cabinetId)}</TableCell>
                <TableCell className="text-right font-medium">
                  {new Intl.NumberFormat('pt-PT', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(entry.value)}
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
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                Nenhum lançamento financeiro no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
