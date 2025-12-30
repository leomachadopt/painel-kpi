import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DailyFinancialEntry, Clinic } from '@/lib/types'

export function FinancialTable({
  data,
  clinic,
}: {
  data: DailyFinancialEntry[]
  clinic: Clinic
}) {
  const getCategoryName = (id: string) =>
    clinic.configuration.categories.find((c) => c.id === id)?.name || id
  const getCabinetName = (id: string) =>
    clinic.configuration.cabinets.find((c) => c.id === id)?.name || id

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
                <TableCell>{getCategoryName(entry.categoryId)}</TableCell>
                <TableCell>{getCabinetName(entry.cabinetId)}</TableCell>
                <TableCell className="text-right font-medium">
                  {new Intl.NumberFormat('pt-PT', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(entry.value)}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                Nenhum lançamento financeiro no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
