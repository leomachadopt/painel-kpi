import { useState, useEffect } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
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
  procedureCode?: string
  procedureBaseId?: string | null
  insuranceProviderProcedureId?: string | null
}

interface ProcedureResult {
  id: string
  code: string
  description: string
  value: number
  procedureBaseId?: string
  insuranceProviderProcedureId?: string
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

  // Procedure search state
  const [searchTerm, setSearchTerm] = useState<Record<number, string>>({})
  const [searchResults, setSearchResults] = useState<Record<number, ProcedureResult[]>>({})
  const [searching, setSearching] = useState<Record<number, boolean>>({})
  const [showResults, setShowResults] = useState<Record<number, boolean>>({})

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPatientCode('')
      setPatientName('')
      setTreatments([{ description: '', unitValue: '', totalQuantity: '', categoryId: '' }])
      setSearchTerm({})
      setSearchResults({})
      setSearching({})
      setShowResults({})
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
    // Clean up search state for this index
    const newSearchTerm = { ...searchTerm }
    const newSearchResults = { ...searchResults }
    const newSearching = { ...searching }
    const newShowResults = { ...showResults }
    delete newSearchTerm[index]
    delete newSearchResults[index]
    delete newSearching[index]
    delete newShowResults[index]
    setSearchTerm(newSearchTerm)
    setSearchResults(newSearchResults)
    setSearching(newSearching)
    setShowResults(newShowResults)
  }

  const handleTreatmentChange = (index: number, field: keyof Treatment, value: string) => {
    const updated = [...treatments]
    updated[index][field] = value
    setTreatments(updated)
  }

  // Search for procedures
  const handleSearchProcedure = async (index: number, search: string) => {
    setSearchTerm({ ...searchTerm, [index]: search })

    if (search.length < 2) {
      setSearchResults({ ...searchResults, [index]: [] })
      setShowResults({ ...showResults, [index]: false })
      return
    }

    setSearching({ ...searching, [index]: true })
    setShowResults({ ...showResults, [index]: true })

    try {
      const data = await api.proceduresCatalog.search(clinicId, {
        type: 'clinica',
        search,
        limit: 20,
      })

      setSearchResults({
        ...searchResults,
        [index]: data.procedures.map((p: any) => ({
          id: p.id,
          code: p.code,
          description: p.description,
          value: p.value,
          procedureBaseId: p.procedureBaseId,
          insuranceProviderProcedureId: p.insuranceProviderProcedureId,
        })),
      })
    } catch (error: any) {
      console.error('Search error:', error)
      setSearchResults({ ...searchResults, [index]: [] })
    } finally {
      setSearching({ ...searching, [index]: false })
    }
  }

  // Select a procedure from search results
  const handleSelectProcedure = (index: number, procedure: ProcedureResult) => {
    const updated = [...treatments]
    updated[index] = {
      ...updated[index],
      description: procedure.description,
      unitValue: procedure.value.toString(),
      procedureCode: procedure.code,
      procedureBaseId: procedure.procedureBaseId || null,
      insuranceProviderProcedureId: procedure.insuranceProviderProcedureId || null,
    }
    setTreatments(updated)
    setSearchTerm({ ...searchTerm, [index]: procedure.description })
    setShowResults({ ...showResults, [index]: false })
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
          procedureCode: t.procedureCode || undefined,
          procedureBaseId: t.procedureBaseId || undefined,
          insuranceProviderProcedureId: t.insuranceProviderProcedureId || undefined,
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
                    <div className="space-y-2 relative">
                      <Label htmlFor={`description-${index}`}>
                        Descrição <span className="text-destructive">*</span>
                      </Label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id={`description-${index}`}
                          value={searchTerm[index] || treatment.description}
                          onChange={(e) => {
                            handleTreatmentChange(index, 'description', e.target.value)
                            handleSearchProcedure(index, e.target.value)
                          }}
                          onFocus={() => {
                            if (searchResults[index]?.length > 0) {
                              setShowResults({ ...showResults, [index]: true })
                            }
                          }}
                          placeholder="Ex: Cáries, Implante"
                          className="pl-9"
                          required
                        />
                        {searching[index] && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Search Results Dropdown */}
                      {showResults[index] && searchResults[index]?.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {searchResults[index].map((proc) => (
                            <button
                              key={proc.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-0"
                              onClick={() => handleSelectProcedure(index, proc)}
                            >
                              <div className="font-medium text-sm">{proc.description}</div>
                              <div className="text-xs text-muted-foreground flex justify-between mt-1">
                                <span>Código: {proc.code}</span>
                                <span className="font-semibold text-primary">
                                  {formatCurrency(proc.value)}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
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
