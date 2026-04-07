import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { DailyConsultationEntry, FirstConsultationType, FirstConsultationTypeProcedure } from '@/lib/types'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import api from '@/services/api'

interface CompleteConsultationModalProps {
  entry: DailyConsultationEntry
  clinicId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function CompleteConsultationModal({
  entry,
  clinicId,
  open,
  onOpenChange,
  onSuccess,
}: CompleteConsultationModalProps) {
  const [loading, setLoading] = useState(false)
  const [consultationTypes, setConsultationTypes] = useState<FirstConsultationType[]>([])
  const [procedures, setProcedures] = useState<FirstConsultationTypeProcedure[]>([])
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [completedProcedures, setCompletedProcedures] = useState<Record<string, { completed: boolean | null; justification: string }>>({})

  // Load consultation types
  useEffect(() => {
    if (open && clinicId) {
      loadConsultationTypes()
    }
  }, [open, clinicId])

  // Load procedures when type is selected
  useEffect(() => {
    if (selectedTypeId) {
      loadProcedures(selectedTypeId)
    } else {
      setProcedures([])
      setCompletedProcedures({})
    }
  }, [selectedTypeId])

  const loadConsultationTypes = async () => {
    try {
      const types = await api.config.consultationTypes.getAll(clinicId)
      setConsultationTypes(types.filter((t: FirstConsultationType) => t.active))
    } catch (error) {
      console.error('Error loading consultation types:', error)
      toast.error('Erro ao carregar tipos de consulta')
    }
  }

  const loadProcedures = async (typeId: string) => {
    try {
      const procs = await api.config.consultationTypes.getProcedures(clinicId, typeId)
      setProcedures(procs)

      // Initialize all procedures without selection
      const initial: Record<string, { completed: boolean | null; justification: string }> = {}
      procs.forEach((p: FirstConsultationTypeProcedure) => {
        initial[p.id] = { completed: null, justification: '' }
      })
      setCompletedProcedures(initial)
    } catch (error) {
      console.error('Error loading procedures:', error)
      toast.error('Erro ao carregar procedimentos')
    }
  }

  const updateJustification = (procedureId: string, justification: string) => {
    setCompletedProcedures((prev) => ({
      ...prev,
      [procedureId]: {
        ...prev[procedureId],
        justification,
      },
    }))
  }

  const handleSubmit = async () => {
    if (!selectedTypeId) {
      toast.error('Selecione o tipo de consulta')
      return
    }

    // Validate: all procedures must be selected (realizado ou não realizado)
    const unselected = procedures.filter(p => completedProcedures[p.id]?.completed === null)
    if (unselected.length > 0) {
      toast.error('Selecione "Realizado" ou "Não Realizado" para todos os procedimentos')
      return
    }

    // Validate: all incomplete procedures must have justification
    const incomplete = Object.entries(completedProcedures).filter(([_, v]) => v.completed === false)
    const missingJustification = incomplete.some(([_, v]) => !v.justification.trim())

    if (missingJustification) {
      toast.error('Preencha a justificativa para procedimentos não realizados')
      return
    }

    setLoading(true)
    try {
      await api.dailyEntries.consultation.completeConsultation(clinicId, entry.id, {
        consultationTypeId: selectedTypeId,
        completedProcedures,
      })

      toast.success('Consulta realizada com sucesso!')
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error('Error completing consultation:', error)
      toast.error(error.message || 'Erro ao completar consulta')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setSelectedTypeId('')
      setProcedures([])
      setCompletedProcedures({})
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Realizar Consulta</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Patient Info */}
          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-semibold">Paciente:</span> {entry.patientName}
              </div>
              <div>
                <span className="font-semibold">Código:</span> {entry.code}
              </div>
            </div>
          </div>

          {/* Consultation Type */}
          <div>
            <Label>Tipo de Consulta *</Label>
            <Select value={selectedTypeId} onValueChange={setSelectedTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de consulta" />
              </SelectTrigger>
              <SelectContent>
                {consultationTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Procedures Checklist */}
          {procedures.length > 0 && (
            <div className="border rounded-lg p-3">
              <h3 className="text-sm font-semibold mb-3">Procedimentos</h3>
              <div className="space-y-3">
                {procedures.map((procedure) => (
                  <div key={procedure.id} className="space-y-2 p-3 bg-slate-50 rounded-md border border-slate-200">
                    <div className="text-sm font-medium">{procedure.name}</div>
                    {procedure.description && (
                      <div className="text-xs text-muted-foreground">{procedure.description}</div>
                    )}

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCompletedProcedures(prev => ({
                          ...prev,
                          [procedure.id]: { completed: true, justification: '' }
                        }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all text-sm ${
                          completedProcedures[procedure.id]?.completed === true
                            ? 'bg-green-600 border-green-600 text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:border-green-400'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          completedProcedures[procedure.id]?.completed === true
                            ? 'bg-white border-white'
                            : 'bg-white border-slate-400'
                        }`}>
                          {completedProcedures[procedure.id]?.completed === true && (
                            <div className="w-2 h-2 rounded-full bg-green-600"></div>
                          )}
                        </div>
                        <span>Realizado</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCompletedProcedures(prev => ({
                          ...prev,
                          [procedure.id]: { completed: false, justification: prev[procedure.id]?.justification || '' }
                        }))}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border transition-all text-sm ${
                          completedProcedures[procedure.id]?.completed === false
                            ? 'bg-slate-600 border-slate-600 text-white'
                            : 'bg-white border-slate-300 text-slate-700 hover:border-slate-400'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          completedProcedures[procedure.id]?.completed === false
                            ? 'bg-white border-white'
                            : 'bg-white border-slate-400'
                        }`}>
                          {completedProcedures[procedure.id]?.completed === false && (
                            <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                          )}
                        </div>
                        <span>Não Realizado</span>
                      </button>
                    </div>

                    {/* Justification for incomplete procedures */}
                    {completedProcedures[procedure.id]?.completed === false && (
                      <div className="pt-1">
                        <Label className="text-xs text-muted-foreground">
                          Justificativa para procedimento não realizado *
                        </Label>
                        <Textarea
                          value={completedProcedures[procedure.id]?.justification || ''}
                          onChange={(e) => updateJustification(procedure.id, e.target.value)}
                          placeholder="Ex: Paciente não aceitou, será feito na próxima consulta..."
                          rows={2}
                          className="text-xs mt-1"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !selectedTypeId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Concluir Consulta
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
