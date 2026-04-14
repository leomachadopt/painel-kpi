import { useState, useEffect } from 'react'
import { Check, Pencil, Trash2, Plus, ChevronDown, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import api from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/useTranslation'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PendingTreatmentsSectionProps {
  clinicId: string
  refreshTrigger: number
  onRefresh: () => void
}

export function PendingTreatmentsSection({
  clinicId,
  refreshTrigger,
  onRefresh,
}: PendingTreatmentsSectionProps) {
  const { toast } = useToast()
  const { formatCurrency } = useTranslation()
  const [loading, setLoading] = useState(true)
  const [patients, setPatients] = useState<any[]>([])
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [completeDialog, setCompleteDialog] = useState<{
    treatmentId: string
    description: string
    pendingQuantity: number
    unitValue: number
  } | null>(null)
  const [completedQuantity, setCompletedQuantity] = useState('')
  const [executionDate, setExecutionDate] = useState('')
  const [executionTime, setExecutionTime] = useState('')
  const [executionNotes, setExecutionNotes] = useState('')

  useEffect(() => {
    loadPatients()
  }, [clinicId, refreshTrigger])

  const loadPatients = async () => {
    setLoading(true)
    try {
      const data = await api.pendingTreatments.getPatients(clinicId)
      setPatients(data)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar tratamentos pendentes',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePatient = (patientId: string) => {
    setExpandedPatient(expandedPatient === patientId ? null : patientId)
  }

  const handleComplete = async () => {
    if (!completeDialog || !completedQuantity) return

    const qty = parseInt(completedQuantity)
    if (isNaN(qty) || qty <= 0 || qty > completeDialog.pendingQuantity) {
      toast({
        title: 'Erro',
        description: 'Quantidade inválida',
        variant: 'destructive',
      })
      return
    }

    try {
      const executedAtISO = executionDate && executionTime
        ? `${executionDate}T${executionTime}:00`
        : undefined

      await api.pendingTreatments.completeTreatment(clinicId, completeDialog.treatmentId, {
        completedQuantity: qty,
        executedAt: executedAtISO,
        notes: executionNotes || undefined,
      })

      toast({
        title: 'Sucesso',
        description: `${qty} procedimento(s) marcado(s) como realizado(s)`,
      })
      setCompleteDialog(null)
      setCompletedQuantity('')
      setExecutionDate('')
      setExecutionTime('')
      setExecutionNotes('')
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar tratamento',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      await api.pendingTreatments.deleteTreatment(clinicId, deleteConfirm)
      toast({
        title: 'Sucesso',
        description: 'Tratamento excluído',
      })
      setDeleteConfirm(null)
      onRefresh()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir tratamento',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDENTE: { label: 'Pendente', className: 'bg-yellow-100 text-yellow-800' },
      PARCIAL: { label: 'Parcial', className: 'bg-orange-100 text-orange-800' },
      CONCLUIDO: { label: 'Concluído', className: 'bg-green-100 text-green-800' },
    }

    const config = variants[status as keyof typeof variants] || variants.PENDENTE

    return <Badge className={config.className}>{config.label}</Badge>
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tratamentos Pendentes por Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    )
  }

  if (patients.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tratamentos Pendentes por Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Nenhum tratamento pendente cadastrado ainda
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tratamentos Pendentes por Paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {patients.map((patient) => (
              <div key={patient.id} className="border rounded-lg">
                {/* Patient Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => togglePatient(patient.id)}
                >
                  <div className="flex items-center gap-3">
                    {expandedPatient === patient.id ? (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                    <div>
                      <div className="font-semibold">
                        {patient.patientName} (#{patient.patientCode})
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {patient.treatments.length} tratamento(s) • Total pendente:{' '}
                        <span className="font-semibold text-primary">
                          {formatCurrency(patient.totalPendingValue)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Treatments List */}
                {expandedPatient === patient.id && (
                  <div className="border-t bg-muted/10">
                    <div className="p-4 space-y-2">
                      {/* Header */}
                      <div className="grid grid-cols-7 gap-4 text-sm font-medium text-muted-foreground pb-2">
                        <div className="col-span-2">Tratamento</div>
                        <div className="text-right">Quantidade</div>
                        <div className="text-right">Valor Unit.</div>
                        <div className="text-right">Total Pend.</div>
                        <div>Status</div>
                        <div className="text-right">Ações</div>
                      </div>

                      {/* Rows */}
                      {patient.treatments.map((treatment: any) => {
                        const isCompleted = treatment.status === 'CONCLUIDO'
                        return (
                          <div
                            key={treatment.id}
                            className={`grid grid-cols-7 gap-4 items-center py-2 text-sm rounded px-2 ${
                              isCompleted ? 'opacity-60 bg-muted/20' : 'hover:bg-muted/30'
                            }`}
                          >
                            <div className={`col-span-2 font-medium ${isCompleted ? 'line-through' : ''}`}>
                              {treatment.description}
                            </div>
                            <div className="text-right">
                              {treatment.pendingQuantity} de {treatment.totalQuantity}
                            </div>
                            <div className="text-right">{formatCurrency(treatment.unitValue)}</div>
                            <div className="text-right font-semibold text-primary">
                              {formatCurrency(treatment.pendingValue)}
                            </div>
                            <div>{getStatusBadge(treatment.status)}</div>
                            <div className="flex justify-end gap-1">
                              {!isCompleted && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    // Initialize with current date/time
                                    const now = new Date()
                                    const dateStr = now.toISOString().split('T')[0]
                                    const timeStr = now.toTimeString().slice(0, 5)

                                    setCompleteDialog({
                                      treatmentId: treatment.id,
                                      description: treatment.description,
                                      pendingQuantity: treatment.pendingQuantity,
                                      unitValue: treatment.unitValue,
                                    })
                                    setCompletedQuantity('')
                                    setExecutionDate(dateStr)
                                    setExecutionTime(timeStr)
                                    setExecutionNotes('')
                                  }}
                                  title="Marcar como realizado"
                                >
                                  <Check className="w-4 h-4 text-green-600" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(treatment.id)}
                                title="Excluir tratamento"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Patient Total */}
                    <div className="border-t px-4 py-3 bg-muted/20 flex justify-between items-center">
                      <span className="font-semibold">TOTAL PACIENTE:</span>
                      <span className="text-xl font-bold text-primary">
                        {formatCurrency(patient.totalPendingValue)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Grand Total */}
            <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-lg">TOTAL GERAL:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(patients.reduce((sum, p) => sum + p.totalPendingValue, 0))}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Complete Treatment Dialog */}
      <Dialog open={!!completeDialog} onOpenChange={() => setCompleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Procedimentos Realizados</DialogTitle>
            <DialogDescription>
              Tratamento: {completeDialog?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor unitário</Label>
              <div className="text-lg font-semibold">
                {completeDialog && formatCurrency(completeDialog.unitValue)}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quantidade pendente</Label>
              <div className="text-lg font-semibold">{completeDialog?.pendingQuantity}</div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="completed">Quantos foram realizados agora?</Label>
              <Input
                id="completed"
                type="number"
                min="1"
                max={completeDialog?.pendingQuantity}
                value={completedQuantity}
                onChange={(e) => setCompletedQuantity(e.target.value)}
                placeholder="Ex: 1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="execution-date">Data da execução</Label>
                <Input
                  id="execution-date"
                  type="date"
                  value={executionDate}
                  onChange={(e) => setExecutionDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="execution-time">Horário</Label>
                <Input
                  id="execution-time"
                  type="time"
                  value={executionTime}
                  onChange={(e) => setExecutionTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="execution-notes">Observações (opcional)</Label>
              <Input
                id="execution-notes"
                value={executionNotes}
                onChange={(e) => setExecutionNotes(e.target.value)}
                placeholder="Ex: Procedimento realizado com sucesso"
              />
            </div>
            {completedQuantity && completeDialog && (
              <div className="p-3 bg-muted rounded space-y-1">
                <div className="text-sm text-muted-foreground">Após confirmar:</div>
                <div className="font-semibold">
                  Novo pendente: {completeDialog.pendingQuantity - parseInt(completedQuantity || '0')}
                </div>
                <div className="font-semibold">
                  Novo valor pendente:{' '}
                  {formatCurrency(
                    completeDialog.unitValue *
                      (completeDialog.pendingQuantity - parseInt(completedQuantity || '0'))
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialog(null)}>
              Cancelar
            </Button>
            <Button onClick={handleComplete} disabled={!completedQuantity}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este tratamento?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
