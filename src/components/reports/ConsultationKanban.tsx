import { DailyConsultationEntry } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, User, Hash, Euro } from 'lucide-react'

interface KanbanColumn {
  title: string
  description: string
  entries: DailyConsultationEntry[]
  color: string
}

export function ConsultationKanban({
  data,
}: {
  data: DailyConsultationEntry[]
}) {
  // Organize entries by stage
  const columns: KanbanColumn[] = [
    {
      title: 'Sem Plano',
      description: 'Aguardando criação do plano',
      entries: data.filter((e) => !e.planCreated),
      color: 'bg-slate-100 border-slate-300',
    },
    {
      title: 'Plano Criado',
      description: 'Aguardando apresentação',
      entries: data.filter((e) => e.planCreated && !e.planPresented),
      color: 'bg-blue-50 border-blue-300',
    },
    {
      title: 'Plano Apresentado',
      description: 'Aguardando decisão',
      entries: data.filter((e) => e.planPresented && !e.planAccepted),
      color: 'bg-amber-50 border-amber-300',
    },
    {
      title: 'Plano Aceito',
      description: 'Convertido em paciente',
      entries: data.filter((e) => e.planAccepted),
      color: 'bg-emerald-50 border-emerald-300',
    },
  ]

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {columns.map((column) => (
        <div key={column.title} className="flex flex-col gap-3">
          {/* Column Header */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{column.title}</h3>
              <Badge variant="secondary" className="text-xs">
                {column.entries.length}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {column.description}
            </p>
          </div>

          {/* Column Cards */}
          <div className="flex flex-col gap-2 min-h-[200px]">
            {column.entries.length > 0 ? (
              column.entries.map((entry) => (
                <Card
                  key={entry.id}
                  className={`p-3 border-2 ${column.color} hover:shadow-md transition-shadow cursor-pointer`}
                >
                  <div className="flex flex-col gap-2">
                    {/* Patient Name */}
                    <div className="flex items-start gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="font-medium text-sm leading-tight">
                        {entry.patientName}
                      </span>
                    </div>

                    {/* Code and Date */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        <span className="font-mono">{entry.code}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(entry.date)}</span>
                      </div>
                    </div>

                    {/* Stage Dates */}
                    {entry.planCreatedAt && (
                      <div className="text-xs text-muted-foreground">
                        Criado: {formatDate(entry.planCreatedAt)}
                      </div>
                    )}
                    {entry.planPresentedAt && (
                      <div className="text-xs text-muted-foreground">
                        Apresentado: {formatDate(entry.planPresentedAt)}
                      </div>
                    )}
                    {entry.planAcceptedAt && (
                      <div className="text-xs text-muted-foreground">
                        Aceito: {formatDate(entry.planAcceptedAt)}
                      </div>
                    )}

                    {/* Plan Value */}
                    {entry.planAccepted && entry.planValue && entry.planValue > 0 ? (
                      <div className="flex items-center gap-1 text-sm font-semibold text-emerald-700 pt-1 border-t">
                        <Euro className="h-3.5 w-3.5" />
                        <span>
                          {new Intl.NumberFormat('pt-PT', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(entry.planValue)}
                        </span>
                      </div>
                    ) : entry.planPresentedValue && entry.planPresentedValue > 0 ? (
                      <div className="flex items-center gap-1 text-sm font-semibold text-blue-700 pt-1 border-t">
                        <Euro className="h-3.5 w-3.5" />
                        <span>
                          {new Intl.NumberFormat('pt-PT', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(entry.planPresentedValue)}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">(previsto)</span>
                      </div>
                    ) : null}
                  </div>
                </Card>
              ))
            ) : (
              <div className="flex items-center justify-center h-32 text-xs text-muted-foreground border-2 border-dashed rounded-md">
                Nenhum paciente
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
