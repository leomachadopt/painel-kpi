import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DailyServiceTimeEntry, Clinic } from '@/lib/types'

export function ServiceTimeTable({
  data,
  clinic,
}: {
  data: DailyServiceTimeEntry[]
  clinic: Clinic
}) {
  const getDoctorName = (id: string) =>
    clinic.configuration.doctors.find((d) => d.id === id)?.name || id

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
                </TableRow>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                Nenhum registo de tempo no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
