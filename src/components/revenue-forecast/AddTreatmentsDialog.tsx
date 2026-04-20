import { useState, useEffect } from 'react'
import { Plus, X, Search, Loader2 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import api from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/useTranslation'
import useDataStore from '@/stores/useDataStore'

interface SelectedTreatment {
  id: string
  code: string
  description: string
  value: number
  procedureBaseId?: string
  insuranceProviderProcedureId?: string
  quantity: number
  editedValue: number
  editedDescription: string
  categoryId: string
  toothRegion: string
}

interface ProcedureResult {
  id: string
  code: string
  description: string
  value: number
  procedureBaseId?: string
  insuranceProviderProcedureId?: string
}

interface InsuranceProvider {
  id: string
  name: string
  proceduresCount?: number
}

interface AddTreatmentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId: string
  patient: {
    id: string
    patientCode: string
    patientName: string
  } | null
  onSuccess: () => void
}

export function AddTreatmentsDialog({
  open,
  onOpenChange,
  clinicId,
  patient,
  onSuccess,
}: AddTreatmentsDialogProps) {
  const { toast } = useToast()
  const { formatCurrency } = useTranslation()
  const { getClinic } = useDataStore()
  const clinic = getClinic(clinicId)

  const [loading, setLoading] = useState(false)

  // Price table selection
  const [priceTableType, setPriceTableType] = useState<'clinica' | 'operadora'>('clinica')
  const [insuranceProviderId, setInsuranceProviderId] = useState<string>('')
  const [providers, setProviders] = useState<InsuranceProvider[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)

  // Procedure search
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProcedureResult[]>([])
  const [searching, setSearching] = useState(false)

  // Selected treatments
  const [selectedTreatments, setSelectedTreatments] = useState<SelectedTreatment[]>([])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPriceTableType('clinica')
      setInsuranceProviderId('')
      setSearchTerm('')
      setSearchResults([])
      setSelectedTreatments([])

      // Load insurance providers
      setProvidersLoading(true)
      api.proceduresCatalog
        .getProviders(clinicId)
        .then((data) => setProviders(data.providers))
        .catch((err) => {
          console.error('Erro ao carregar operadoras:', err)
          toast({
            title: 'Erro',
            description: 'Erro ao carregar operadoras',
            variant: 'destructive',
          })
        })
        .finally(() => setProvidersLoading(false))
    }
  }, [open, clinicId])

  // Debounced search for procedures
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    if (priceTableType === 'operadora' && !insuranceProviderId) {
      return
    }

    const timer = setTimeout(() => {
      setSearching(true)
      api.proceduresCatalog
        .search(clinicId, {
          type: priceTableType,
          providerId: insuranceProviderId || undefined,
          search: searchTerm,
          limit: 20,
          requireApproved: false,
        })
        .then((data) =>
          setSearchResults(
            data.procedures.map((p: any) => ({
              id: p.id,
              code: p.code,
              description: p.description,
              value: p.value,
              procedureBaseId: p.procedureBaseId,
              insuranceProviderProcedureId: p.insuranceProviderProcedureId,
            }))
          )
        )
        .catch((err) => {
          console.error('Erro ao buscar procedimentos:', err)
          setSearchResults([])
        })
        .finally(() => setSearching(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, priceTableType, insuranceProviderId, clinicId])

  const handleAddProcedure = (procedure: ProcedureResult) => {
    if (selectedTreatments.some((t) => t.id === procedure.id)) {
      toast({
        title: 'Atenção',
        description: 'Procedimento já adicionado',
      })
      return
    }

    // Debug: log procedure code
    console.log('🔍 Procedimento selecionado:', {
      code: procedure.code,
      description: procedure.description,
      value: procedure.value,
    })

    const newTreatment: SelectedTreatment = {
      id: procedure.id,
      code: procedure.code,
      description: procedure.description,
      value: procedure.value,
      procedureBaseId: procedure.procedureBaseId,
      insuranceProviderProcedureId: procedure.insuranceProviderProcedureId,
      quantity: 1,
      editedValue: procedure.value,
      editedDescription: procedure.description,
      categoryId: '',
      toothRegion: '',
    }

    setSelectedTreatments([...selectedTreatments, newTreatment])
    setSearchTerm('')
    setSearchResults([])
  }

  const handleRemoveTreatment = (treatmentId: string) => {
    setSelectedTreatments(selectedTreatments.filter((t) => t.id !== treatmentId))
  }

  const handleUpdateQuantity = (treatmentId: string, quantity: number) => {
    if (quantity < 1) return
    setSelectedTreatments(
      selectedTreatments.map((t) => (t.id === treatmentId ? { ...t, quantity } : t))
    )
  }

  const handleUpdateValue = (treatmentId: string, value: number) => {
    if (value < 0) return
    setSelectedTreatments(
      selectedTreatments.map((t) => (t.id === treatmentId ? { ...t, editedValue: value } : t))
    )
  }

  const handleUpdateDescription = (treatmentId: string, description: string) => {
    setSelectedTreatments(
      selectedTreatments.map((t) =>
        t.id === treatmentId ? { ...t, editedDescription: description } : t
      )
    )
  }

  const handleUpdateToothRegion = (treatmentId: string, toothRegion: string) => {
    setSelectedTreatments(
      selectedTreatments.map((t) =>
        t.id === treatmentId ? { ...t, toothRegion } : t
      )
    )
  }

  const handleUpdateCategory = (treatmentId: string, categoryId: string) => {
    setSelectedTreatments(
      selectedTreatments.map((t) => (t.id === treatmentId ? { ...t, categoryId } : t))
    )
  }

  const totalPendingValue = selectedTreatments.reduce(
    (sum, t) => sum + t.editedValue * t.quantity,
    0
  )

  const handleSubmit = async () => {
    if (!patient) return

    if (selectedTreatments.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos 1 tratamento',
        variant: 'destructive',
      })
      return
    }

    if (priceTableType === 'operadora' && !insuranceProviderId) {
      toast({
        title: 'Erro',
        description: 'Selecione uma operadora',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      // Add each treatment individually
      for (const treatment of selectedTreatments) {
        const payload = {
          description: treatment.editedDescription,
          unitValue: treatment.editedValue,
          totalQuantity: treatment.quantity,
          categoryId: treatment.categoryId || undefined,
          toothRegion: treatment.toothRegion || undefined,
          procedureCode: treatment.code || undefined,
          procedureBaseId: treatment.procedureBaseId || undefined,
          insuranceProviderProcedureId: treatment.insuranceProviderProcedureId || undefined,
        }

        // Debug: log what's being sent
        console.log('📤 Enviando tratamento:', payload)

        await api.pendingTreatments.addTreatment(clinicId, patient.id, payload)
      }

      toast({
        title: 'Sucesso',
        description: `${selectedTreatments.length} tratamento(s) adicionado(s)`,
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao adicionar tratamentos',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!patient) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Tratamentos</DialogTitle>
          <DialogDescription>
            Adicionar tratamentos pendentes para{' '}
            <span className="text-primary font-semibold">{patient.patientName}</span> (#{patient.patientCode})
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 flex-1 min-h-0">
          {/* Price table selection */}
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Tipo de Tabela</Label>
              <Select
                value={priceTableType}
                onValueChange={(v: 'clinica' | 'operadora') => {
                  setPriceTableType(v)
                  setInsuranceProviderId('')
                  setSearchTerm('')
                  setSearchResults([])
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinica">Tabela da clínica (particular)</SelectItem>
                  <SelectItem value="operadora">Operadora</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {priceTableType === 'operadora' && (
              <div className="grid gap-2">
                <Label>Operadora</Label>
                <Select
                  value={insuranceProviderId}
                  onValueChange={setInsuranceProviderId}
                  disabled={providersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma operadora..." />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.name}
                        {provider.proceduresCount !== undefined && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({provider.proceduresCount} procedimentos)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Search for procedures */}
          <div className="flex flex-col gap-2">
            <Label>Pesquisar procedimentos</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por código ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
                disabled={priceTableType === 'operadora' && !insuranceProviderId}
              />
              {searching && (
                <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <ScrollArea className="h-40 border rounded-md">
                <div className="p-2 space-y-1">
                  {searchResults.map((proc) => (
                    <button
                      key={proc.id}
                      onClick={() => handleAddProcedure(proc)}
                      className="w-full flex items-center justify-between p-2 hover:bg-accent rounded-md text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {proc.code} - {proc.description}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <span className="text-sm font-semibold whitespace-nowrap">
                          {formatCurrency(proc.value)}
                        </span>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected Treatments */}
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <Label>Tratamentos selecionados ({selectedTreatments.length})</Label>
              <Badge variant="secondary">Total: {formatCurrency(totalPendingValue)}</Badge>
            </div>

            <ScrollArea className="h-[250px] border rounded-md">
              <div className="p-2 space-y-2">
                {selectedTreatments.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Nenhum tratamento selecionado
                  </div>
                ) : (
                  selectedTreatments.map((treatment) => (
                    <div
                      key={treatment.id}
                      className="p-3 bg-muted rounded-md space-y-2"
                    >
                      {/* Primeira linha: Código, Descrição */}
                      <div className="flex items-center gap-2">
                        <div className="flex-shrink-0 w-20">
                          <Badge variant="outline" className="font-mono text-xs">
                            {treatment.code}
                          </Badge>
                        </div>
                        <Input
                          value={treatment.editedDescription}
                          onChange={(e) =>
                            handleUpdateDescription(treatment.id, e.target.value)
                          }
                          placeholder="Descrição"
                          className="flex-1 h-9 text-sm"
                        />
                      </div>

                      {/* Segunda linha: Dente/Região, Categoria, Quantidade, Valor, Total, Remover */}
                      <div className="flex items-center gap-2">
                        {/* Dente/Região */}
                        <div className="flex-1">
                          <Input
                            value={treatment.toothRegion}
                            onChange={(e) => handleUpdateToothRegion(treatment.id, e.target.value)}
                            placeholder="Ex: 16, 11-21, Superior direito..."
                            className="h-8 text-xs"
                            title="Dente/Região (opcional)"
                          />
                        </div>

                        {/* Categoria */}
                        <div className="flex-shrink-0 w-32">
                          <Select
                            value={treatment.categoryId || undefined}
                            onValueChange={(value) => handleUpdateCategory(treatment.id, value)}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Categoria" />
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

                        {/* Quantidade */}
                        <div className="flex-shrink-0 w-16">
                          <Input
                            type="number"
                            min="1"
                            value={treatment.quantity}
                            onChange={(e) =>
                              handleUpdateQuantity(treatment.id, parseInt(e.target.value) || 1)
                            }
                            className="w-full h-8 text-xs text-center"
                            title="Quantidade"
                          />
                        </div>

                        {/* Valor unitário */}
                        <div className="flex-shrink-0 w-24">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={treatment.editedValue}
                            onChange={(e) =>
                              handleUpdateValue(treatment.id, parseFloat(e.target.value) || 0)
                            }
                            className="w-full h-8 text-xs text-right"
                            title="Valor unitário"
                          />
                        </div>

                        {/* Total */}
                        <div className="flex-shrink-0 w-28 text-xs font-semibold h-8 flex items-center justify-end bg-background px-3 rounded border">
                          {formatCurrency(treatment.editedValue * treatment.quantity)}
                        </div>

                        {/* Remover */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => handleRemoveTreatment(treatment.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || selectedTreatments.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adicionando...
              </>
            ) : (
              'Adicionar Tratamentos'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
