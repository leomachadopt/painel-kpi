import { useState, useEffect } from 'react'
import { Calendar, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PendingReschedule {
  id: string
  patientName: string
  patientCode: string
  reason: string | null
  notes: string | null
  requestedAt: string
  createdAt: string
  originalAppointmentId: string | null
  preferredDoctor: { id: string; name: string } | null
  preferredAppointmentType: { id: string; name: string; color: string; durationMinutes: number } | null
}

interface BancoRemarcacoesTableProps {
  clinicId: string
}

export function BancoRemarcacoesTable({ clinicId }: BancoRemarcacoesTableProps) {
  const [reschedules, setReschedules] = useState<PendingReschedule[]>([])
  const [loading, setLoading] = useState(true)

  const loadReschedules = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/appointments/${clinicId}/pending-reschedules`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao carregar remarcações')
      }

      const data = await response.json()
      setReschedules(data.pendingReschedules || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (clinicId) {
      loadReschedules()
    }
  }, [clinicId])

  const handleRemove = async (id: string, patientName: string) => {
    if (!confirm(`Remover ${patientName} do banco de remarcações?`)) {
      return
    }

    try {
      const response = await fetch(`/api/appointments/${clinicId}/pending-reschedules/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao remover remarcação')
      }

      toast.success('Removido do banco de remarcações')
      loadReschedules()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (reschedules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground opacity-50 mb-4" />
        <h3 className="text-lg font-semibold">Banco Vazio</h3>
        <p className="text-sm text-muted-foreground mt-2">
          Não há pacientes aguardando remarcação no momento.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Banco de Remarcações</h3>
          <p className="text-sm text-muted-foreground">
            {reschedules.length} {reschedules.length === 1 ? 'paciente aguardando' : 'pacientes aguardando'} remarcação
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadReschedules}>
          Atualizar
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Paciente</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Médico Preferido</TableHead>
              <TableHead>Tipo de Consulta</TableHead>
              <TableHead>Há quanto tempo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reschedules.map((reschedule) => (
              <TableRow key={reschedule.id}>
                <TableCell className="font-medium">{reschedule.patientName}</TableCell>
                <TableCell>{reschedule.patientCode || '-'}</TableCell>
                <TableCell className="max-w-[200px]">
                  {reschedule.reason ? (
                    <span className="text-sm text-muted-foreground truncate block" title={reschedule.reason}>
                      {reschedule.reason}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {reschedule.preferredDoctor ? (
                    <span className="text-sm">{reschedule.preferredDoctor.name}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {reschedule.preferredAppointmentType ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: reschedule.preferredAppointmentType.color || '#3b82f6' }}
                      />
                      <span className="text-sm">{reschedule.preferredAppointmentType.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({reschedule.preferredAppointmentType.durationMinutes}min)
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(reschedule.requestedAt), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemove(reschedule.id, reschedule.patientName)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 <strong>Dica:</strong> Para encaixar esses pacientes, vá até a Agenda e clique em um horário disponível.
          No modal de novo agendamento, marque o checkbox "📋 Remarcação (do banco)" para buscar e selecionar o paciente.
        </p>
      </div>
    </div>
  )
}
