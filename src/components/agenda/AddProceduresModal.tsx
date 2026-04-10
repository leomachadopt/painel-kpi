import { useState, useEffect } from 'react'
import { Plus, Search, X } from 'lucide-react'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import api from '@/services/api'
import { CreateCustomProcedureModal } from './CreateCustomProcedureModal'

interface AddProceduresModalProps {
  open: boolean
  onClose: () => void
  clinicId: string
  consultationEntryId: string
  patientName: string
  patientCode: string
  priceTableType?: string
  insuranceProviderId?: string
  onSuccess?: () => void
}

interface Procedure {
  id: string
  code: string
  description: string
  value: number
  type: 'clinica' | 'operadora'
  procedureBaseId: string | null
  insuranceProviderProcedureId: string | null
}

interface SelectedProcedure extends Procedure {
  quantity: number
  editableDescription: string
  editableValue: number
  toothRegion: string
}

export function AddProceduresModal({
  open,
  onClose,
  clinicId,
  consultationEntryId,
  patientName,
  patientCode,
  priceTableType,
  insuranceProviderId,
  onSuccess,
}: AddProceduresModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Procedure[]>([])
  const [selectedProcedures, setSelectedProcedures] = useState<SelectedProcedure[]>([])
  const [searchType, setSearchType] = useState<'clinica' | 'operadora'>(priceTableType as 'clinica' | 'operadora' || 'clinica')
  const [providers, setProviders] = useState<any[]>([])
  const [selectedProviderId, setSelectedProviderId] = useState<string>(insuranceProviderId || '')
  const [showCreateCustomModal, setShowCreateCustomModal] = useState(false)

  useEffect(() => {
    if (open && clinicId) {
      loadProviders()
      // Se já tem um tipo de tabela definido, carrega procedimentos iniciais
      if (priceTableType) {
        setSearchType(priceTableType as 'clinica' | 'operadora')
        if (priceTableType === 'operadora' && insuranceProviderId) {
          setSelectedProviderId(insuranceProviderId)
        }
      }
    }
  }, [open, clinicId, priceTableType, insuranceProviderId])

  useEffect(() => {
    // Trigger search when searchTerm changes (debounce)
    if (searchTerm.length >= 2) {
      const timeoutId = setTimeout(() => {
        searchProcedures()
      }, 300)
      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
    }
  }, [searchTerm, searchType, selectedProviderId])

  const loadProviders = async () => {
    try {
      const response = await fetch(`/api/procedures-catalog/${clinicId}/providers`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })
      const data = await response.json()
      setProviders(data.providers || [])
    } catch (error) {
      console.error('Error loading providers:', error)
    }
  }

  const searchProcedures = async () => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({
        type: searchType,
        search: searchTerm,
        limit: '20',
        requireApproved: 'false', // Agenda não requer aprovação de procedimentos
      })

      if (searchType === 'operadora' && selectedProviderId) {
        params.append('providerId', selectedProviderId)
      }

      const response = await fetch(`/api/procedures-catalog/${clinicId}?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao buscar procedimentos')
      }

      const data = await response.json()
      setSearchResults(data.procedures || [])
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao buscar procedimentos',
        variant: 'destructive',
      })
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  const addProcedure = (procedure: Procedure, toothRegion: string = '') => {
    // Check if already added WITH THE SAME TOOTH/REGION
    const existing = selectedProcedures.find(
      p => p.id === procedure.id && p.toothRegion === toothRegion
    )

    if (existing) {
      // Increment quantity only if same procedure AND same tooth/region
      setSelectedProcedures(prev =>
        prev.map(p =>
          p.id === procedure.id && p.toothRegion === toothRegion
            ? { ...p, quantity: p.quantity + 1 }
            : p
        )
      )
    } else {
      // Add new with editable fields - creates a separate entry for different tooth/region
      setSelectedProcedures(prev => [...prev, {
        ...procedure,
        quantity: 1,
        editableDescription: procedure.description,
        editableValue: procedure.value,
        toothRegion: toothRegion
      }])
    }

    // Clear search
    setSearchTerm('')
    setSearchResults([])
  }

  const removeProcedure = (index: number) => {
    setSelectedProcedures(prev => prev.filter((_, i) => i !== index))
  }

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) {
      removeProcedure(index)
      return
    }

    setSelectedProcedures(prev =>
      prev.map((p, i) => (i === index ? { ...p, quantity } : p))
    )
  }

  const updateDescription = (index: number, description: string) => {
    setSelectedProcedures(prev =>
      prev.map((p, i) => (i === index ? { ...p, editableDescription: description } : p))
    )
  }

  const updateValue = (index: number, value: number) => {
    // Garante que o valor é sempre um número válido maior que 0
    const validValue = isNaN(value) || value <= 0 ? 0.01 : value
    setSelectedProcedures(prev =>
      prev.map((p, i) => (i === index ? { ...p, editableValue: validValue } : p))
    )
  }

  const updateToothRegion = (index: number, toothRegion: string) => {
    setSelectedProcedures(prev =>
      prev.map((p, i) => (i === index ? { ...p, toothRegion } : p))
    )
  }

  const handleCustomProcedureCreated = (procedure: Procedure) => {
    // Adiciona automaticamente o procedimento customizado recém-criado à lista de selecionados
    addProcedure(procedure)
    toast({
      title: 'Procedimento adicionado',
      description: 'O procedimento customizado foi criado e adicionado à lista',
    })
  }

  const handleSave = async () => {
    if (selectedProcedures.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Selecione pelo menos um procedimento',
        variant: 'destructive',
      })
      return
    }

    // Validar que todos os procedimentos têm valores válidos
    const invalidProcedure = selectedProcedures.find(
      proc => !proc.editableDescription.trim() || proc.editableValue <= 0 || proc.quantity < 1
    )

    if (invalidProcedure) {
      toast({
        title: 'Atenção',
        description: 'Todos os procedimentos devem ter descrição, valor maior que zero e quantidade válida',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const proceduresToAdd = selectedProcedures.map(proc => ({
        procedureCode: proc.code,
        procedureDescription: proc.editableDescription,  // Usar descrição editável
        priceAtCreation: proc.editableValue,             // Usar valor editável
        quantity: proc.quantity,
        procedureBaseId: proc.procedureBaseId,
        insuranceProviderProcedureId: proc.insuranceProviderProcedureId,
        toothRegion: proc.toothRegion || null,           // Incluir dente/região
        notes: null,
      }))

      await api.planProcedures.addExtraProcedures(clinicId, consultationEntryId, {
        procedures: proceduresToAdd,
      })

      const totalAdded = selectedProcedures.reduce((sum, p) => sum + p.quantity, 0)
      toast({
        title: 'Sucesso',
        description: `${totalAdded} procedimento(s) adicionado(s) ao plano!`,
      })

      onSuccess?.()
      handleClose()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao adicionar procedimentos',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      setSearchTerm('')
      setSearchResults([])
      setSelectedProcedures([])
      onClose()
    }
  }

  const totalValue = selectedProcedures.reduce(
    (sum, p) => sum + p.editableValue * p.quantity,
    0
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Adicionar Procedimentos Extras ao Plano</DialogTitle>
          <DialogDescription>
            {patientName} (#{patientCode})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Controls */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Tabela</Label>
                <Select value={searchType} onValueChange={(val: 'clinica' | 'operadora') => setSearchType(val)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clinica">Clínica</SelectItem>
                    <SelectItem value="operadora">Operadora</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {searchType === 'operadora' && (
                <div className="space-y-1">
                  <Label className="text-xs">Operadora</Label>
                  <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map(provider => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por código ou descrição (min. 2 caracteres)..."
                  className="pl-9"
                />
              </div>
              {searchType === 'clinica' && (
                <Button
                  variant="outline"
                  onClick={() => setShowCreateCustomModal(true)}
                  className="gap-2 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Criar Novo
                </Button>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-40 overflow-y-auto">
                {searchResults.map(procedure => (
                  <button
                    key={procedure.id}
                    onClick={() => addProcedure(procedure)}
                    className="w-full text-left px-3 py-2 hover:bg-accent flex items-center justify-between border-b last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{procedure.code}</div>
                      <div className="text-xs text-muted-foreground">{procedure.description}</div>
                    </div>
                    <div className="text-sm font-semibold text-primary ml-2">
                      €{procedure.value.toFixed(2)}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {loading && (
              <div className="text-center text-sm text-muted-foreground py-2">
                Buscando procedimentos...
              </div>
            )}
          </div>

          {/* Selected Procedures */}
          {selectedProcedures.length > 0 && (
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold mb-2 block">
                Procedimentos Selecionados ({selectedProcedures.length})
              </Label>
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="space-y-3 p-3">
                  {selectedProcedures.map((procedure, index) => (
                    <div
                      key={`${procedure.id}-${index}`}
                      className="bg-accent/50 p-3 rounded-lg space-y-2"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {procedure.code}
                            </Badge>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Descrição</Label>
                            <Input
                              value={procedure.editableDescription}
                              onChange={(e) => updateDescription(index, e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Dente/Região (opcional)</Label>
                            <Input
                              value={procedure.toothRegion}
                              onChange={(e) => updateToothRegion(index, e.target.value)}
                              placeholder="Ex: 16, 11-21, Superior direito..."
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Valor Unitário (€)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={procedure.editableValue}
                                onChange={(e) => updateValue(index, parseFloat(e.target.value) || 0)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Quantidade</Label>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(index, procedure.quantity - 1)}
                                  className="h-8 w-8 p-0"
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  value={procedure.quantity}
                                  onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                                  className="h-8 text-sm text-center"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateQuantity(index, procedure.quantity + 1)}
                                  className="h-8 w-8 p-0"
                                >
                                  +
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Subtotal: €{(procedure.editableValue * procedure.quantity).toFixed(2)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeProcedure(index)}
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="mt-3 flex items-center justify-between p-3 bg-primary/10 rounded-lg">
                <span className="font-semibold">Valor Total a Adicionar:</span>
                <span className="text-lg font-bold text-primary">€{totalValue.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || selectedProcedures.length === 0}
          >
            {saving ? 'Adicionando...' : `Adicionar ${selectedProcedures.length} Procedimento(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Modal de criar procedimento customizado */}
      <CreateCustomProcedureModal
        open={showCreateCustomModal}
        onClose={() => setShowCreateCustomModal(false)}
        clinicId={clinicId}
        onSuccess={handleCustomProcedureCreated}
      />
    </Dialog>
  )
}
