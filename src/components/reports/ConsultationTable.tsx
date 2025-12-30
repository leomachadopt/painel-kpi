import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DailyConsultationEntry } from '@/lib/types'
import { Check, X, Minus } from 'lucide-react'

export function ConsultationTable({
  data,
}: {
  data: DailyConsultationEntry[]
}) {
  const StatusIcon = ({ status }: { status: boolean }) =>
    status ? (
      <Check className="h-4 w-4 text-emerald-500" />
    ) : (
      <X className="h-4 w-4 text-rose-500" />
    )

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Código</TableHead>
            <TableHead className="text-center">Plano Criado</TableHead>
            <TableHead className="text-center">Apresentado</TableHead>
            <TableHead className="text-center">Aceite</TableHead>
            <TableHead className="text-right">Valor Plano</TableHead>
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
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <StatusIcon status={entry.planCreated} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <StatusIcon status={entry.planPresented} />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    {entry.planAccepted ? (
                      <Badge className="bg-emerald-500">Aceito</Badge>
                    ) : (
                      <Badge variant="outline">Pendente</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {entry.planValue > 0
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(entry.planValue)
                    : '-'}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center">
                Nenhuma consulta registrada no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
