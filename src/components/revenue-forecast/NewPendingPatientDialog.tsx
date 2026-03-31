import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PatientCodeInput } from '@/components/PatientCodeInput'
import api from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/useTranslation'
import useDataStore from '@/stores/useDataStore'

interface Treatment {
  description: string
  unitValue: string
  totalQuantity: string
  categoryId: string
}

interface NewPendingPatientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId: string
  onSuccess: () => void
}

export function NewPendingPatientDialog({
  open,
  onOpenChange,
  clinicId,
  onSuccess,
}: NewPendingPatientDialogProps) {
  const { toast } = useToast()
  const { formatCurrency } = useTranslation()
  const { getClinic } = useDataStore()
  const clinic = getClinic(clinicId)

  const [loading, setLoading] = useState(false)
  const [patientCode, setPatientCode] = useState('')
  const [patientName, setPatientName] = useState('')
  const [treatments, setTreatments] = useState<Treatment[]>([
    { description: '', unitValue: '', totalQuantity: '', categoryId: '' },
  ])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPatientCode('')
      setPatientName('')
      setTreatments([{ description: '', unitValue: '', totalQuantity: '', categoryId: '' }])
    }
  }, [open])

  const handleAddTreatment = () => {
    setTreatments([
      ...treatments,
      { description: '', unitValue: '', totalQuantity: '', categoryId: '' },
    ])
  }

  const handleRemoveTreatment = (index: number) => {
    if (treatments.length === 1) {
      toast({
        title: 'Erro',
        description: 'Deve haver pelo menos 1 tratamento',
        variant: 'destructive',
      })
      return
    }
    setTreatments(treatments.filter((_, i) => i !== index))
  }

  const handleTreatmentChange = (index: number, field: keyof Treatment, value: string) => {
    const updated = [...treatments]
    updated[index][field] = value
    setTreatments(updated)
  }

  const handleSubmit = async () => {
    // Validation
    if (!patientCode || !patientName) {
      toast({
        title: 'Erro',
        description: 'Informe código e nome do paciente',
        variant: 'destructive',
      })
      return
    }

    const validTreatments = treatments.filter(
      (t) => t.description && t.unitValue && t.totalQuantity
    )

    if (validTreatments.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos 1 tratamento completo',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const data = {
        patientCode,
        patientName,
        treatments: validTreatments.map((t) => ({
          description: t.description,
          unitValue: parseFloat(t.unitValue),
          totalQuantity: parseInt(t.totalQuantity),
          categoryId: t.categoryId || undefined,
        })),
      }

      await api.pendingTreatments.createPatient(clinicId, data)

      toast({
        title: 'Sucesso',
        description: `Tratamentos pendentes cadastrados para ${patientName}`,
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao cadastrar tratamentos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const totalPendingValue = treatments.reduce((sum, t) => {
    const value = parseFloat(t.unitValue || '0')
    const quantity = parseInt(t.totalQuantity || '0')
    return sum + value * quantity
  }, 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Tratamentos Pendentes</DialogTitle>
          <DialogDescription>
            Busque o paciente e adicione os tratamentos que ainda estão pendentes de realização
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Patient Lookup */}
          <PatientCodeInput
            clinicId={clinicId}
            value={patientCode}
            onCodeChange={setPatientCode}
            patientName={patientName}
            onPatientNameChange={setPatientName}
            required={true}
          />

          {/* Treatments Section */}
          {patientCode && patientName && (
            <>
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm font-medium">
                  Tratamentos pendentes para: <span className="text-primary">{patientName}</span> (#{patientCode})
                </div>
                <Button type="button" onClick={handleAddTreatment} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Tratamento
                </Button>
              </div>

              {/* Treatments List */}
              <div className="space-y-4">
                {treatments.map((treatment, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3 relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">Tratamento #{index + 1}</div>
                    {treatments.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveTreatment(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`description-${index}`}>
                        Descrição <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`description-${index}`}
                        value={treatment.description}
                        onChange={(e) =>
                          handleTreatmentChange(index, 'description', e.target.value)
                        }
                        placeholder="Ex: Cáries, Implante"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`categoryId-${index}`}>Categoria (Opcional)</Label>
                      <Select
                        value={treatment.categoryId || undefined}
                        onValueChange={(value) =>
                          handleTreatmentChange(index, 'categoryId', value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhuma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {clinic?.configuration?.categories?.map((cat: any) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`unitValue-${index}`}>
                        Valor Unitário (€) <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`unitValue-${index}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={treatment.unitValue}
                        onChange={(e) =>
                          handleTreatmentChange(index, 'unitValue', e.target.value)
                        }
                        placeholder="50.00"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`totalQuantity-${index}`}>
                        Quantidade <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`totalQuantity-${index}`}
                        type="number"
                        min="1"
                        value={treatment.totalQuantity}
                        onChange={(e) =>
                          handleTreatmentChange(index, 'totalQuantity', e.target.value)
                        }
                        placeholder="3"
                        required
                      />
                    </div>
                  </div>

                  {/* Treatment Total */}
                  {treatment.unitValue && treatment.totalQuantity && (
                    <div className="text-sm text-right pt-2 border-t">
                      <span className="text-muted-foreground">Total: </span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(
                          parseFloat(treatment.unitValue) * parseInt(treatment.totalQuantity)
                        )}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

              {/* Grand Total */}
              <div className="border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">VALOR TOTAL PENDENTE:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(totalPendingValue)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !patientCode || !patientName}
          >
            {loading ? 'Salvando...' : 'Cadastrar Tratamentos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
