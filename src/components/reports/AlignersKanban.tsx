import { DailyAlignersEntry, Clinic } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, User, Hash, Pencil, Trash2, MoreVertical } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import useDataStore from '@/stores/useDataStore'
import { EditAlignersDialog } from './EditAlignersDialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface KanbanColumn {
  title: string
  description: string
  entries: DailyAlignersEntry[]
  color: string
}

export function AlignersKanban({
  data,
  clinic,
  onDelete,
}: {
  data: DailyAlignersEntry[]
  clinic?: Clinic
  onDelete?: () => void
}) {
  const { deleteAlignersEntry } = useDataStore()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<DailyAlignersEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const getBrandName = (brandId: string) => {
    return clinic?.configuration.alignerBrands.find(b => b.id === brandId)?.name || brandId
  }

  const handleDelete = async (entry: DailyAlignersEntry) => {
    if (!clinic) return
    
    if (!confirm(`Excluir alinhador de ${entry.patientName} (código ${entry.code})?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await deleteAlignersEntry(clinic.id, entry.id)
      toast.success('Alinhador excluído com sucesso!')
      onDelete?.()
    } catch (error: any) {
      // Erro já é tratado na store
    } finally {
      setDeleting(null)
    }
  }

  const handleEdit = (entry: DailyAlignersEntry) => {
    if (!clinic) return
    setEditingEntry(entry)
    setIsEditDialogOpen(true)
  }

  const handleEditSuccess = () => {
    onDelete?.() // Recarregar dados
  }

  // Organize entries by stage
  const columns: KanbanColumn[] = [
    {
      title: 'Sem Cadastro',
      description: 'Aguardando criação do cadastro',
      entries: data.filter((e) => !e.registrationCreated && !e.cckCreated && !e.awaitingPlan && !e.awaitingApproval && !e.approved),
      color: 'bg-slate-100 border-slate-300',
    },
    {
      title: 'Cadastro Criado (Assistente)',
      description: 'Aguardando criação do CCK',
      entries: data.filter((e) => e.registrationCreated && !e.cckCreated && !e.awaitingPlan && !e.awaitingApproval && !e.approved),
      color: 'bg-blue-50 border-blue-300',
    },
    {
      title: 'CCK Criado (Médico (a))',
      description: 'Aguardando plano',
      entries: data.filter((e) => e.cckCreated && !e.awaitingPlan && !e.awaitingApproval && !e.approved),
      color: 'bg-cyan-50 border-cyan-300',
    },
    {
      title: 'Aguardando Plano (Empresa)',
      description: 'Aguardando criação do plano',
      entries: data.filter((e) => e.awaitingPlan && !e.awaitingApproval && !e.approved),
      color: 'bg-amber-50 border-amber-300',
    },
    {
      title: 'Plano Aprovado (Médico (a))',
      description: 'Aguardando aprovação',
      entries: data.filter((e) => e.awaitingApproval && !e.approved),
      color: 'bg-orange-50 border-orange-300',
    },
    {
      title: 'Alinhadores entregues (Assistente)',
      description: 'Tratamento aprovado',
      entries: data.filter((e) => e.approved),
      color: 'bg-emerald-50 border-emerald-300',
    },
  ]

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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

                    {/* Brand */}
                    <div className="text-xs text-muted-foreground">
                      {getBrandName(entry.alignerBrandId)}
                    </div>

                    {/* Stage Dates */}
                    {entry.registrationCreatedAt && (
                      <div className="text-xs text-muted-foreground">
                        Cadastro: {formatDate(entry.registrationCreatedAt)}
                      </div>
                    )}
                    {entry.cckCreatedAt && (
                      <div className="text-xs text-muted-foreground">
                        CCK: {formatDate(entry.cckCreatedAt)}
                      </div>
                    )}
                    {entry.awaitingPlanAt && (
                      <div className="text-xs text-muted-foreground">
                        Aguardando Plano (Empresa): {formatDate(entry.awaitingPlanAt)}
                      </div>
                    )}
                    {entry.awaitingApprovalAt && (
                      <div className="text-xs text-muted-foreground">
                        Plano Aprovado (Médico (a)): {formatDate(entry.awaitingApprovalAt)}
                      </div>
                    )}
                    {entry.approvedAt && (
                      <div className="text-xs font-semibold text-emerald-700 pt-1 border-t">
                        Alinhadores entregues (Assistente): {formatDate(entry.approvedAt)}
                      </div>
                    )}
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
        <EditAlignersDialog
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

