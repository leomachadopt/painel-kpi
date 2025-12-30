import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DailyCabinetUsageEntry, Clinic } from '@/lib/types'

export function CabinetTable({
  data,
  clinic,
}: {
  data: DailyCabinetUsageEntry[]
  clinic: Clinic
}) {
  const getCabinetName = (id: string) =>
    clinic.configuration.cabinets.find((c) => c.id === id)?.name || id

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Gabinete</TableHead>
            <TableHead className="text-center">Horas Disponíveis</TableHead>
            <TableHead className="text-center">Horas Usadas</TableHead>
            <TableHead className="text-right">Taxa Ocupação</TableHead>
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
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Nenhum registo de ocupação no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
