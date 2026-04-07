import { useState, useEffect } from 'react'
import { Check, Plus, Trash2, Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import api from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { PlanProcedure } from '@/lib/types'

interface ExecuteProceduresModalProps {
  open: boolean
  onClose: () => void
  clinicId: string
  entryId: string
  patientName: string
  patientCode: string
  onSuccess?: () => void
}

interface ProcedureExecution {
  procedureId: string
  execute: boolean
  executionDate: string
  executionTime: string
  notes: string
}

export function ExecuteProceduresModal({
  open,
  onClose,
  clinicId,
  entryId,
  patientName,
  patientCode,
  onSuccess,
}: ExecuteProceduresModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [procedures, setProcedures] = useState<PlanProcedure[]>([])
  const [executions, setExecutions] = useState<Record<string, ProcedureExecution>>({})

  useEffect(() => {
    if (open) {
      loadProcedures()
    }
  }, [open, clinicId, entryId])

  const loadProcedures = async () => {
    setLoading(true)
    try {
      const data = await api.planProcedures.get(clinicId, entryId)
      setProcedures(data.procedures)

      // Initialize executions with current date/time
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const timeStr = now.toTimeString().slice(0, 5)

      const initialExecutions: Record<string, ProcedureExecution> = {}
      data.procedures.forEach((proc: PlanProcedure) => {
        initialExecutions[proc.id] = {
          procedureId: proc.id,
          execute: false,
          executionDate: dateStr,
          executionTime: timeStr,
          notes: '',
        }
      })
      setExecutions(initialExecutions)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar procedimentos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleExecution = (procId: string, checked: boolean) => {
    setExecutions((prev) => ({
      ...prev,
      [procId]: {
        ...prev[procId],
        execute: checked,
      },
    }))
  }

  const updateExecution = (procId: string, field: keyof ProcedureExecution, value: string) => {
    setExecutions((prev) => ({
      ...prev,
      [procId]: {
        ...prev[procId],
        [field]: value,
      },
    }))
  }

  const handleSave = async () => {
    // Get procedures marked for execution
    const toExecute = Object.values(executions).filter((ex) => ex.execute)

    if (toExecute.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Selecione pelo menos um procedimento para executar',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      await api.dailyEntries.consultation.executeProcedures(clinicId, entryId, {
        executions: toExecute.map((ex) => ({
          procedureId: ex.procedureId,
          executedAt: `${ex.executionDate}T${ex.executionTime}:00`,
          notes: ex.notes,
        })),
      })

      toast({
        title: 'Sucesso',
        description: `${toExecute.length} procedimento(s) executado(s) com sucesso!`,
      })

      onSuccess?.()
      onClose()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao executar procedimentos',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      onClose()
    }
  }

  const pendingCount = procedures.filter((p) => !p.completed).length
  const selectedCount = Object.values(executions).filter((ex) => ex.execute).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Executar Procedimentos</DialogTitle>
          <DialogDescription>
            {patientName} (#{patientCode})
            <span className="ml-4 text-primary font-semibold">
              {pendingCount} pendente(s) • {selectedCount} selecionado(s)
            </span>
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Carregando procedimentos...</div>
        ) : (
          <>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {procedures.map((proc) => {
                  const execution = executions[proc.id]
                  if (!execution) return null

                  return (
                    <div
                      key={proc.id}
                      className={`border rounded-lg p-4 ${
                        proc.completed
                          ? 'bg-green-50 border-green-200'
                          : execution.execute
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          id={`proc-${proc.id}`}
                          checked={execution.execute}
                          onCheckedChange={(checked) => toggleExecution(proc.id, checked as boolean)}
                          disabled={proc.completed}
                          className="mt-1"
                        />

                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <Label htmlFor={`proc-${proc.id}`} className="cursor-pointer">
                              <div className="font-semibold">
                                {proc.procedureCode} - {proc.procedureDescription}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                €{proc.priceAtCreation.toFixed(2)}
                              </div>
                            </Label>
                            {proc.completed && (
                              <Badge className="bg-green-100 text-green-800">
                                Concluído {proc.completedAt && `em ${new Date(proc.completedAt).toLocaleDateString()}`}
                              </Badge>
                            )}
                          </div>

                          {execution.execute && !proc.completed && (
                            <div className="space-y-3 pl-6 border-l-2 border-blue-300">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <Label className="text-xs">Data da Execução</Label>
                                  <Input
                                    type="date"
                                    value={execution.executionDate}
                                    onChange={(e) =>
                                      updateExecution(proc.id, 'executionDate', e.target.value)
                                    }
                                    className="h-9"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Hora da Execução</Label>
                                  <Input
                                    type="time"
                                    value={execution.executionTime}
                                    onChange={(e) =>
                                      updateExecution(proc.id, 'executionTime', e.target.value)
                                    }
                                    className="h-9"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-xs">Observações</Label>
                                <Textarea
                                  value={execution.notes}
                                  onChange={(e) => updateExecution(proc.id, 'notes', e.target.value)}
                                  placeholder="Adicione observações sobre a execução..."
                                  rows={2}
                                  className="resize-none"
                                />
                              </div>
                            </div>
                          )}

                          {proc.completed && proc.notes && (
                            <div className="pl-6 text-sm text-muted-foreground">
                              <span className="font-semibold">Obs:</span> {proc.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>

            {pendingCount === 0 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <div className="font-semibold text-green-800">
                  Todos os procedimentos foram executados!
                </div>
              </div>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || selectedCount === 0}>
            {saving ? 'Salvando...' : `Executar ${selectedCount} Procedimento(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
