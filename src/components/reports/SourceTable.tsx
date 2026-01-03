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
import { DailySourceEntry, Clinic } from '@/lib/types'
import useDataStore from '@/stores/useDataStore'
import { useState } from 'react'

export function SourceTable({
  data,
  clinic,
  onDelete,
}: {
  data: DailySourceEntry[]
  clinic: Clinic
  onDelete?: () => void
}) {
  const { deleteSourceEntry } = useDataStore()
  const [deleting, setDeleting] = useState<string | null>(null)
  const getSourceName = (id: string) =>
    clinic.configuration.sources.find((s) => s.id === id)?.name || id
  const getCampaignName = (id: string) =>
    clinic.configuration.campaigns.find((c) => c.id === id)?.name || id

  const handleDelete = async (entry: DailySourceEntry) => {
    if (!confirm(`Excluir registo de ${entry.patientName} em ${entry.date}?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await deleteSourceEntry(clinic.id, entry.id)
      onDelete?.()
    } catch (error) {
      // Error toast already shown by deleteSourceEntry
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
            <TableHead>Novo Paciente</TableHead>
            <TableHead>Fonte</TableHead>
            <TableHead>Quem Indicou</TableHead>
            <TableHead className="text-right">Campanha</TableHead>
            <TableHead className="w-[80px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? (
            data.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{entry.date}</TableCell>
                <TableCell>
                  {entry.patientName || '-'}
                  {entry.code && (
                    <span className="block text-xs text-muted-foreground font-mono">
                      {entry.code}
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={entry.isReferral ? 'secondary' : 'outline'}>
                    {getSourceName(entry.sourceId)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {entry.isReferral && entry.referralName ? (
                    <div className="text-sm">
                      <span className="font-medium">{entry.referralName}</span>
                      <span className="block text-xs text-muted-foreground font-mono">
                        {entry.referralCode}
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
              <TableCell colSpan={6} className="h-24 text-center">
                Nenhum registo de fonte no período.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
