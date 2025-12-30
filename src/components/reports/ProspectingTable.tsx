import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DailyProspectingEntry } from '@/lib/types'

export function ProspectingTable({ data }: { data: DailyProspectingEntry[] }) {
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
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                Nenhum registro de prospecção no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
