import { DailyConsultationEntry, Clinic } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Calendar, User, Hash, Euro, DollarSign, Pencil, Trash2, MoreVertical, Stethoscope, ClipboardCheck, AlertTriangle, FileText, Check } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import api from '@/services/api'
import useDataStore from '@/stores/useDataStore'
import { EditConsultationDialog } from './EditConsultationDialog'
import { PlanProceduresModal } from './PlanProceduresModal'
import { AbandonPlanModal } from './AbandonPlanModal'
import { CompleteConsultationModal } from './CompleteConsultationModal'
import { ExecuteProceduresModal } from './ExecuteProceduresModal'
import { useTranslation } from '@/hooks/useTranslation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  const [presentingPlan, setPresentingPlan] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<DailyConsultationEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [planProceduresEntry, setPlanProceduresEntry] = useState<DailyConsultationEntry | null>(null)
  const [abandonEntry, setAbandonEntry] = useState<DailyConsultationEntry | null>(null)
  const [completeConsultationEntry, setCompleteConsultationEntry] = useState<DailyConsultationEntry | null>(null)
  const [executeProceduresEntry, setExecuteProceduresEntry] = useState<DailyConsultationEntry | null>(null)

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

  const getProceduresStatus = (entry: DailyConsultationEntry) => {
    if (!entry.consultationCompleted || !entry.completedProcedures) {
      return null
    }

    const procedures = Object.values(entry.completedProcedures)
    const completed = procedures.filter((p: any) => p.completed).length
    const total = procedures.length

    return { completed, total }
  }

  // Filter out non-eligible plans from kanban
  const eligibleData = data.filter((e) => !e.planNotEligible)

  // Organize entries by stage (Fase 2: novos estados)
  const columns: KanbanColumn[] = [
    {
      title: 'Sem Plano',
      description: 'Aguardando consulta/criação do plano',
      entries: eligibleData.filter((e) => !e.consultationCompleted && !e.planCreated),
      color: 'bg-slate-100 border-slate-300',
    },
    {
      title: 'Consulta Realizada',
      description: 'Aguardando criação do plano',
      entries: eligibleData.filter((e) => e.consultationCompleted && !e.planCreated),
      color: 'bg-green-50 border-green-300',
    },
    {
      title: 'Plano Criado',
      description: 'Aguardando apresentação',
      entries: eligibleData.filter((e) => e.planCreated && !e.planPresented),
      color: 'bg-blue-50 border-blue-300',
    },
    {
      title: 'Aguardando Início',
      description: 'Plano apresentado, aguardando primeiro procedimento',
      entries: eligibleData.filter((e) => e.waitingStart && !e.inExecution && !e.abandoned && !e.planFinished),
      color: 'bg-amber-50 border-amber-300',
    },
    {
      title: 'Em Execução',
      description: 'Tratamento em andamento',
      entries: eligibleData.filter((e) => e.inExecution && !e.planFinished && !e.abandoned),
      color: 'bg-purple-50 border-purple-300',
    },
    {
      title: 'Finalizado',
      description: 'Tratamento completo',
      entries: eligibleData.filter((e) => e.planFinished && !e.abandoned),
      color: 'bg-emerald-50 border-emerald-300',
    },
    {
      title: 'Abandonado',
      description: 'Perdas/desistências',
      entries: eligibleData.filter((e) => e.abandoned),
      color: 'bg-red-50 border-red-300',
    },
  ]

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString(locale === 'PT-BR' ? 'pt-BR' : 'pt-PT', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {columns.map((column) => (
          <div key={column.title} className="flex flex-col gap-3 w-80 flex-shrink-0">
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
            <div className="flex flex-col gap-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
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
                          {/* Opção de realizar consulta */}
                          {column.title === 'Sem Plano' && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setCompleteConsultationEntry(entry)
                              }}
                            >
                              <Stethoscope className="h-4 w-4 mr-2" />
                              Realizar Consulta
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(entry)
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>

                          {/* Opção de criar/editar plano */}
                          {column.title === 'Plano Criado' && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setPlanProceduresEntry(entry)
                              }}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              {entry.planCreated ? 'Editar Plano' : 'Criar Plano'}
                            </DropdownMenuItem>
                          )}

                          {/* Opção de abandonar */}
                          {(column.title === 'Aguardando Início' || column.title === 'Em Execução') && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setAbandonEntry(entry)
                                }}
                                className="text-destructive"
                              >
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Marcar como Perda
                              </DropdownMenuItem>
                            </>
                          )}

                          <DropdownMenuSeparator />
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

                    {/* Consultation Completed Badge - Only show in other columns */}
                    {entry.consultationCompleted && entry.planCreated && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 text-xs">
                          <ClipboardCheck className="h-3 w-3 mr-1" />
                          {getProceduresStatus(entry) && (
                            <span>
                              {getProceduresStatus(entry)!.completed}/{getProceduresStatus(entry)!.total}
                            </span>
                          )}
                        </Badge>
                      </div>
                    )}

                    {/* Show procedures count in Consulta Realizada column */}
                    {entry.consultationCompleted && !entry.planCreated && getProceduresStatus(entry) && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-white border-green-300 text-green-700 text-xs">
                          <ClipboardCheck className="h-3 w-3 mr-1" />
                          Procedimentos: {getProceduresStatus(entry)!.completed}/{getProceduresStatus(entry)!.total}
                        </Badge>
                      </div>
                    )}

                    {/* Doctor Name */}
                    {getDoctorName(entry.doctorId) && (
                      <div className="flex items-center gap-2">
                        <Stethoscope className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">
                          {getDoctorName(entry.doctorId)}
                        </span>
                      </div>
                    )}

                    {/* Progress Bar - para estados com procedimentos */}
                    {(entry.waitingStart || entry.inExecution || entry.planFinished) && entry.planProceduresTotal && entry.planProceduresTotal > 0 && (
                      <div className="flex flex-col gap-1.5 pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">
                            {entry.planProceduresCompleted} de {entry.planProceduresTotal} procedimentos
                          </span>
                          <span className="font-semibold">
                            {Math.round((entry.planProceduresCompleted || 0) / entry.planProceduresTotal * 100)}%
                          </span>
                        </div>
                        <Progress
                          value={(entry.planProceduresCompleted || 0) / entry.planProceduresTotal * 100}
                          className="h-1.5"
                        />
                      </div>
                    )}

                    {/* Botão para realizar consulta (Sem Plano) */}
                    {column.title === 'Sem Plano' && clinic && (
                      <Button
                        size="sm"
                        className="w-full mt-2 bg-green-600 hover:bg-green-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setCompleteConsultationEntry(entry)
                        }}
                      >
                        <Stethoscope className="h-3.5 w-3.5 mr-1.5" />
                        Realizar Consulta
                      </Button>
                    )}

                    {/* Botão para criar plano (Consulta Realizada) */}
                    {column.title === 'Consulta Realizada' && clinic && (
                      <Button
                        size="sm"
                        className="w-full mt-2"
                        onClick={(e) => {
                          e.stopPropagation()
                          setPlanProceduresEntry(entry)
                        }}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        Criar Plano
                      </Button>
                    )}

                    {/* Botão para apresentar plano (Plano Criado) */}
                    {column.title === 'Plano Criado' && clinic && (
                      <Button
                        size="sm"
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                        disabled={presentingPlan === entry.id}
                        onClick={async (e) => {
                          e.stopPropagation()
                          if (presentingPlan === entry.id) return

                          setPresentingPlan(entry.id)
                          try {
                            await api.dailyEntries.consultation.presentPlan(clinic.id, entry.id)
                            toast.success('Plano apresentado com sucesso!')
                            onDelete?.() // Recarregar dados
                          } catch (error: any) {
                            toast.error(error.message || 'Erro ao apresentar plano')
                          } finally {
                            setPresentingPlan(null)
                          }
                        }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1.5" />
                        {presentingPlan === entry.id ? 'Apresentando...' : 'Apresentar Plano'}
                      </Button>
                    )}

                    {/* Botão Executar Procedimentos (Aguardando Início e Em Execução) */}
                    {(column.title === 'Aguardando Início' || column.title === 'Em Execução') && clinic && (
                      <Button
                        size="sm"
                        className="w-full mt-2 bg-green-600 hover:bg-green-700"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExecuteProceduresEntry(entry)
                        }}
                      >
                        <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />
                        Executar Procedimentos
                      </Button>
                    )}

                    {/* Botão para abandonar (Aguardando Início e Em Execução) */}
                    {(column.title === 'Aguardando Início' || column.title === 'Em Execução') && clinic && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full mt-2 border-red-200 text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation()
                          setAbandonEntry(entry)
                        }}
                      >
                        <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                        Marcar como Perda
                      </Button>
                    )}

                    {/* Dias em estado (Aguardando Início / Em Execução) */}
                    {(entry.waitingStart && entry.waitingStartAt) && (
                      <div className="text-xs text-muted-foreground pt-1">
                        Aguardando há {Math.floor((new Date().getTime() - new Date(entry.waitingStartAt).getTime()) / (1000 * 60 * 60 * 24))} dias
                      </div>
                    )}
                    {(entry.inExecution && entry.inExecutionAt) && (
                      <div className="text-xs text-muted-foreground pt-1">
                        Em execução há {Math.floor((new Date().getTime() - new Date(entry.inExecutionAt).getTime()) / (1000 * 60 * 60 * 24))} dias
                      </div>
                    )}

                    {/* Motivo de abandono */}
                    {entry.abandoned && entry.abandonedReason && (
                      <div className="text-xs text-red-700 bg-red-50 p-2 rounded mt-2">
                        <strong>Motivo:</strong>{' '}
                        {entry.abandonedReason === 'financeiro' && 'Financeiro'}
                        {entry.abandonedReason === 'mudou_clinica' && 'Mudou de clínica'}
                        {entry.abandonedReason === 'plano_extenso' && 'Plano extenso'}
                        {entry.abandonedReason === 'nao_compareceu' && 'Não compareceu'}
                        {entry.abandonedReason === 'outro' && 'Outro'}
                        {entry.abandonedReasonNotes && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {entry.abandonedReasonNotes}
                          </div>
                        )}
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

                    {/* Plan Value - Para Em Execução, mostrar valor pendente */}
                    {entry.planAccepted && entry.planValue && entry.planValue > 0 ? (
                      <div className="flex items-center gap-1 text-sm font-semibold text-emerald-700 pt-1 border-t">
                        <CurrencyIcon className="h-3.5 w-3.5" />
                        <span>
                          {formatCurrency(entry.planValue)}
                        </span>
                      </div>
                    ) : (entry.inExecution || entry.waitingStart) && entry.planTotalValue && entry.planTotalValue > 0 ? (
                      (() => {
                        // Calcular valor pendente = total - (completados / total * valor total)
                        const totalValue = entry.planTotalValue
                        const completedRatio = entry.planProceduresTotal > 0
                          ? (entry.planProceduresCompleted || 0) / entry.planProceduresTotal
                          : 0
                        const pendingValue = totalValue * (1 - completedRatio)

                        return (
                          <div className="flex items-center gap-1 text-sm font-semibold text-amber-600 pt-1 border-t">
                            <CurrencyIcon className="h-3.5 w-3.5" />
                            <span>
                              {formatCurrency(pendingValue)}
                            </span>
                            <span className="text-xs text-muted-foreground font-normal ml-1">
                              pendente
                            </span>
                          </div>
                        )
                      })()
                    ) : entry.planCreated && entry.planValue && entry.planValue > 0 ? (
                      <div className="flex items-center gap-1 text-sm font-semibold text-blue-600 pt-1 border-t">
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
      </div>

      {clinic && (
        <>
          <EditConsultationDialog
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            entry={editingEntry}
            clinic={clinic}
            onSuccess={handleEditSuccess}
          />

          {planProceduresEntry && (
            <PlanProceduresModal
              open={!!planProceduresEntry}
              onClose={() => setPlanProceduresEntry(null)}
              onSuccess={() => {
                setPlanProceduresEntry(null)
                onDelete?.()
              }}
              clinicId={clinic.id}
              entryId={planProceduresEntry.id}
              patientName={planProceduresEntry.patientName}
            />
          )}

          {abandonEntry && (
            <AbandonPlanModal
              open={!!abandonEntry}
              onClose={() => setAbandonEntry(null)}
              onSuccess={() => {
                setAbandonEntry(null)
                onDelete?.()
              }}
              clinicId={clinic.id}
              entryId={abandonEntry.id}
              patientName={abandonEntry.patientName}
            />
          )}

          {completeConsultationEntry && (
            <CompleteConsultationModal
              entry={completeConsultationEntry}
              clinicId={clinic.id}
              open={!!completeConsultationEntry}
              onOpenChange={(open) => !open && setCompleteConsultationEntry(null)}
              onSuccess={() => {
                setCompleteConsultationEntry(null)
                onDelete?.()
              }}
            />
          )}

          {executeProceduresEntry && (
            <ExecuteProceduresModal
              open={!!executeProceduresEntry}
              onClose={() => setExecuteProceduresEntry(null)}
              onSuccess={() => {
                setExecuteProceduresEntry(null)
                onDelete?.()
              }}
              clinicId={clinic.id}
              entryId={executeProceduresEntry.id}
              patientName={executeProceduresEntry.patientName}
              patientCode={executeProceduresEntry.code}
            />
          )}
        </>
      )}
    </div>
  )
}
