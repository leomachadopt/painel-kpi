import { DailyConsultationEntry, Clinic } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, User, Hash, Euro, DollarSign, Pencil, Trash2, MoreVertical, Stethoscope } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import useDataStore from '@/stores/useDataStore'
import { EditConsultationDialog } from './EditConsultationDialog'
import { useTranslation } from '@/hooks/useTranslation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface KanbanColumn {
  title: string
  description: string
  entries: DailyConsultationEntry[]
  color: string
}

export function ConsultationKanban({
  data,
  clinic,
  onDelete,
}: {
  data: DailyConsultationEntry[]
  clinic?: Clinic
  onDelete?: () => void
}) {
  const { deleteConsultationEntry } = useDataStore()
  const { formatCurrency, formatDate: formatDateLocale, locale, t } = useTranslation()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<DailyConsultationEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  
  const CurrencyIcon = locale === 'PT-BR' ? DollarSign : Euro

  const handleDelete = async (entry: DailyConsultationEntry) => {
    if (!clinic) return
    
    if (!confirm(`Excluir consulta de ${entry.patientName} (código ${entry.code})?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await deleteConsultationEntry(clinic.id, entry.id)
      toast.success('Consulta excluída com sucesso!')
      onDelete?.()
    } catch (error: any) {
      // Erro já é tratado na store
    } finally {
      setDeleting(null)
    }
  }

  const handleEdit = (entry: DailyConsultationEntry) => {
    if (!clinic) return
    setEditingEntry(entry)
    setIsEditDialogOpen(true)
  }

  const handleEditSuccess = () => {
    onDelete?.() // Recarregar dados
  }

  const getDoctorName = (doctorId: string | null | undefined) => {
    if (!doctorId || !clinic) return null
    return clinic.configuration.doctors.find((d) => d.id === doctorId)?.name || null
  }

  // Filter out non-eligible plans from kanban
  const eligibleData = data.filter((e) => !e.planNotEligible)

  // Organize entries by stage
  const columns: KanbanColumn[] = [
    {
      title: 'Sem Plano',
      description: 'Aguardando criação do plano',
      entries: eligibleData.filter((e) => !e.planCreated),
      color: 'bg-slate-100 border-slate-300',
    },
    {
      title: 'Plano Criado',
      description: 'Aguardando apresentação',
      entries: eligibleData.filter((e) => e.planCreated && !e.planPresented),
      color: 'bg-blue-50 border-blue-300',
    },
    {
      title: 'Plano Apresentado',
      description: 'Aguardando decisão',
      entries: eligibleData.filter((e) => e.planPresented && !e.planAccepted),
      color: 'bg-amber-50 border-amber-300',
    },
    {
      title: 'Plano Aceito',
      description: 'Convertido em paciente',
      entries: eligibleData.filter((e) => e.planAccepted),
      color: 'bg-emerald-50 border-emerald-300',
    },
  ]

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === 'PT-BR' ? 'pt-BR' : 'pt-PT', { day: '2-digit', month: '2-digit' })
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
                  className={`p-3 border-2 ${column.color} hover:shadow-md transition-shadow relative`}
                >
                  {clinic && (
                    <div className="absolute top-2 right-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-70 hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(entry)
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(entry)
                            }}
                            disabled={deleting === entry.id}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 pr-6">
                    {/* Patient Name */}
                    <div className="flex items-start gap-2">
                      <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="font-medium text-sm leading-tight">
                        {entry.patientName}
                      </span>
                    </div>

                    {/* Doctor Name */}
                    {getDoctorName(entry.doctorId) && (
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {getDoctorName(entry.doctorId)}
                        </span>
                      </div>
                    )}

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
                        <CurrencyIcon className="h-3.5 w-3.5" />
                        <span>
                          {formatCurrency(entry.planValue)}
                        </span>
                      </div>
                    ) : entry.planPresentedValue && entry.planPresentedValue > 0 ? (
                      <div className="flex items-center gap-1 text-sm font-semibold text-blue-700 pt-1 border-t">
                        <CurrencyIcon className="h-3.5 w-3.5" />
                        <span>
                          {formatCurrency(entry.planPresentedValue)}
                        </span>
                        <span className="text-xs text-muted-foreground font-normal">({t('financial.previsto')})</span>
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
      
      {clinic && (
        <EditConsultationDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          entry={editingEntry}
          clinic={clinic}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  )
}
