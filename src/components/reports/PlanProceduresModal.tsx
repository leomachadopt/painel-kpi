import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, Plus, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { planProceduresApi, proceduresCatalogApi, dailyEntriesApi } from '@/services/api'
import { InsuranceProvider, ProcedureCatalogItem } from '@/lib/types'
import { useTranslation } from '@/hooks/useTranslation'

interface PlanProceduresModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  clinicId: string
  entryId: string
  patientName: string
}

interface SelectedProcedure extends ProcedureCatalogItem {
  quantity: number
  editedValue: number
  editedDescription: string
}

export function PlanProceduresModal({
  open,
  onClose,
  onSuccess,
  clinicId,
  entryId,
  patientName,
}: PlanProceduresModalProps) {
  const { formatCurrency, t } = useTranslation()
  const [priceTableType, setPriceTableType] = useState<'clinica' | 'operadora'>('clinica')
  const [insuranceProviderId, setInsuranceProviderId] = useState<string>('')
  const [providers, setProviders] = useState<InsuranceProvider[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<ProcedureCatalogItem[]>([])
  const [selectedProcedures, setSelectedProcedures] = useState<SelectedProcedure[]>([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [providersLoading, setProvidersLoading] = useState(false)
  const [hasExistingPlan, setHasExistingPlan] = useState(false)

  // Carregar operadoras e plano existente ao abrir modal
  useEffect(() => {
    if (open) {
      // Carregar operadoras
      setProvidersLoading(true)
      proceduresCatalogApi
        .getProviders(clinicId)
        .then((data) => setProviders(data.providers))
        .catch((err) => {
          console.error('Erro ao carregar operadoras:', err)
          toast.error('Erro ao carregar operadoras')
        })
        .finally(() => setProvidersLoading(false))

      // Carregar plano existente se houver
      planProceduresApi
        .get(clinicId, entryId)
        .then((data) => {
          if (data.procedures && data.procedures.length > 0) {
            // Já existe um plano criado - carregar procedimentos
            setHasExistingPlan(true)
            setPriceTableType(data.priceTableType)
            if (data.insuranceProviderId) {
              setInsuranceProviderId(data.insuranceProviderId)
            }

            // Converter procedimentos do backend para o formato do modal
            const loadedProcedures: SelectedProcedure[] = data.procedures.map((proc: any) => ({
              id: proc.id,
              code: proc.procedureCode,
              description: proc.procedureDescription,
              value: proc.priceAtCreation,
              procedureBaseId: proc.procedureBaseId,
              insuranceProviderProcedureId: proc.insuranceProviderProcedureId,
              quantity: 1, // Cada linha já representa 1 unidade
              editedValue: proc.priceAtCreation,
              editedDescription: proc.procedureDescription,
            }))

            setSelectedProcedures(loadedProcedures)
          } else {
            setHasExistingPlan(false)
          }
        })
        .catch((err) => {
          // Se der 404, é porque ainda não tem plano - tudo bem
          setHasExistingPlan(false)
          if (err.status !== 404) {
            console.error('Erro ao carregar plano:', err)
          }
        })
    }
  }, [open, clinicId, entryId])

  // Buscar procedimentos quando o termo de busca mudar
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
      proceduresCatalogApi
        .search(clinicId, {
          type: priceTableType,
          providerId: insuranceProviderId || undefined,
          search: searchTerm,
          limit: 20,
        })
        .then((data) => setSearchResults(data.procedures))
        .catch((err) => {
          console.error('Erro ao buscar procedimentos:', err)
          toast.error('Erro ao buscar procedimentos')
        })
        .finally(() => setSearching(false))
    }, 300)

    return () => clearTimeout(timer)
  }, [searchTerm, priceTableType, insuranceProviderId, clinicId])

  const handleAddProcedure = (procedure: ProcedureCatalogItem) => {
    // Verificar se já está adicionado
    if (selectedProcedures.some((p) => p.id === procedure.id)) {
      toast.info('Procedimento já adicionado')
      return
    }

    const newProcedure: SelectedProcedure = {
      ...procedure,
      quantity: 1,
      editedValue: procedure.value,
      editedDescription: procedure.description,
    }
    setSelectedProcedures([...selectedProcedures, newProcedure])
    setSearchTerm('')
    setSearchResults([])
  }

  const handleUpdateQuantity = (procedureId: string, quantity: number) => {
    if (quantity < 1) return
    setSelectedProcedures(
      selectedProcedures.map((p) =>
        p.id === procedureId ? { ...p, quantity } : p
      )
    )
  }

  const handleUpdateValue = (procedureId: string, value: number) => {
    if (value < 0) return
    setSelectedProcedures(
      selectedProcedures.map((p) =>
        p.id === procedureId ? { ...p, editedValue: value } : p
      )
    )
  }

  const handleUpdateDescription = (procedureId: string, description: string) => {
    setSelectedProcedures(
      selectedProcedures.map((p) =>
        p.id === procedureId ? { ...p, editedDescription: description } : p
      )
    )
  }

  const handleRemoveProcedure = (procedureId: string) => {
    setSelectedProcedures(selectedProcedures.filter((p) => p.id !== procedureId))
  }

  const totalValue = selectedProcedures.reduce((sum, p) => sum + (p.editedValue * p.quantity), 0)

  const handleSave = async () => {
    if (selectedProcedures.length === 0) {
      toast.error('Adicione pelo menos um procedimento')
      return
    }

    if (priceTableType === 'operadora' && !insuranceProviderId) {
      toast.error('Selecione uma operadora')
      return
    }

    setLoading(true)
    try {
      await planProceduresApi.create(clinicId, entryId, {
        priceTableType,
        insuranceProviderId: priceTableType === 'operadora' ? insuranceProviderId : undefined,
        procedures: selectedProcedures.map((p, index) => ({
          procedureCode: p.code,
          procedureDescription: p.editedDescription,
          priceAtCreation: p.editedValue,
          quantity: p.quantity,
          procedureBaseId: p.procedureBaseId,
          insuranceProviderProcedureId: p.insuranceProviderProcedureId,
          sortOrder: index,
        })),
      })

      toast.success(hasExistingPlan ? 'Plano atualizado com sucesso!' : 'Plano criado com sucesso!')
      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Erro ao criar plano:', error)
      toast.error(error.message || 'Erro ao criar plano')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPriceTableType('clinica')
    setInsuranceProviderId('')
    setSearchTerm('')
    setSearchResults([])
    setSelectedProcedures([])
    setHasExistingPlan(false)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{hasExistingPlan ? 'Editar Plano de Tratamento' : 'Criar Plano de Tratamento'}</DialogTitle>
          <DialogDescription>
            Paciente: {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 flex-1 min-h-0">
          {/* Seleção de tabela de preços */}
          <div className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label>Tabela de preços</Label>
              <Select value={priceTableType} onValueChange={(v: 'clinica' | 'operadora') => {
                setPriceTableType(v)
                setInsuranceProviderId('')
                setSearchTerm('')
                setSearchResults([])
              }}>
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

          {/* Pesquisa de procedimentos */}
          <div className="flex flex-col gap-2">
            <Label>Adicionar procedimentos</Label>
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

            {/* Resultados da busca */}
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

          {/* Procedimentos adicionados */}
          <div className="flex flex-col gap-2 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <Label>Procedimentos adicionados ({selectedProcedures.length})</Label>
              <Badge variant="secondary">
                Total: {formatCurrency(totalValue)}
              </Badge>
            </div>

            {/* Cabeçalho das colunas */}
            {selectedProcedures.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-t-md border-b text-xs font-semibold text-muted-foreground">
                <div className="flex-shrink-0 w-24">Código</div>
                <div className="flex-1">Descrição</div>
                <div className="flex-shrink-0 w-16 text-center">Qtd</div>
                <div className="flex-shrink-0 w-24 text-right">Valor</div>
                <div className="flex-shrink-0 w-28 text-right">Total</div>
                <div className="flex-shrink-0 w-9"></div>
              </div>
            )}

            <ScrollArea className="h-[300px] border rounded-md">
              <div className="p-2 space-y-2">
                {selectedProcedures.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    Nenhum procedimento adicionado
                  </div>
                ) : (
                  selectedProcedures.map((proc) => (
                    <div
                      key={proc.id}
                      className="flex items-center gap-2 p-3 bg-muted rounded-md"
                    >
                      {/* Código */}
                      <div className="flex-shrink-0 w-24">
                        <Badge variant="outline" className="font-mono text-xs">
                          {proc.code}
                        </Badge>
                      </div>

                      {/* Descrição editável */}
                      <Input
                        value={proc.editedDescription}
                        onChange={(e) => handleUpdateDescription(proc.id, e.target.value)}
                        placeholder="Descrição do procedimento"
                        className="flex-1 h-9 text-sm"
                      />

                      {/* Quantidade */}
                      <div className="flex-shrink-0 w-16">
                        <Input
                          type="number"
                          min="1"
                          value={proc.quantity}
                          onChange={(e) => handleUpdateQuantity(proc.id, parseInt(e.target.value) || 1)}
                          className="w-full h-9 text-sm text-center"
                          title="Quantidade"
                        />
                      </div>

                      {/* Valor */}
                      <div className="flex-shrink-0 w-24">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={proc.editedValue}
                          onChange={(e) => handleUpdateValue(proc.id, parseFloat(e.target.value) || 0)}
                          className="w-full h-9 text-sm text-right"
                          title="Valor unitário"
                        />
                      </div>

                      {/* Total */}
                      <div className="flex-shrink-0 w-28 text-sm font-semibold h-9 flex items-center justify-end bg-background px-3 rounded border">
                        {formatCurrency(proc.editedValue * proc.quantity)}
                      </div>

                      {/* Botão Remover */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 flex-shrink-0"
                        onClick={() => handleRemoveProcedure(proc.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={loading || selectedProcedures.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              hasExistingPlan ? 'Salvar Alterações' : 'Salvar e Criar Plano'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
