import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DailySourceEntry, Clinic } from '@/lib/types'

export function SourceTable({
  data,
  clinic,
}: {
  data: DailySourceEntry[]
  clinic: Clinic
}) {
  const getSourceName = (id: string) =>
    clinic.configuration.sources.find((s) => s.id === id)?.name || id
  const getCampaignName = (id: string) =>
    clinic.configuration.campaigns.find((c) => c.id === id)?.name || id

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Data</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead>Fonte</TableHead>
            <TableHead>Detalhes Indicação</TableHead>
            <TableHead className="text-right">Campanha</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.date}</TableCell>
                <TableCell>
                  {entry.patientName}
                  <span className="block text-xs text-muted-foreground font-mono">
                    {entry.code}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={entry.isReferral ? 'secondary' : 'outline'}>
                    {getSourceName(entry.sourceId)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {entry.isReferral ? (
                    <div className="text-sm">
                      <span className="font-medium">{entry.referralName}</span>
                      <span className="text-muted-foreground ml-1">
                        ({entry.referralCode})
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {entry.campaignId ? (
                    <Badge variant="default" className="bg-blue-600">
                      {getCampaignName(entry.campaignId)}
                    </Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center">
                Nenhum registro de fonte no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
