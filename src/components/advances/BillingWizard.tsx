import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { advancesApi } from '@/services/api'
import { toast } from 'sonner'
import { AdvanceContract } from '@/lib/types'
import { Loader2, Calculator, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

interface BillingWizardProps {
  clinicId: string
  contractId: string
  onClose: () => void
}

interface EligibleProcedure {
  id: string
  procedureCode: string
  procedureDescription: string
  isPericiable: boolean
  adultsOnly: boolean
  unitValue: number
  eligibleFor: Array<{ id: string | null; name: string; type: string; age?: number | null }>
}

interface BilledProcedure {
  id: string
  procedureCode: string
  procedureDescription: string
  isPericiable: boolean
  unitValue: number
  quantity: number
  totalValue: number
  serviceDate: string
  dependentId: string | null
  dependentName: string | null
  batchNumber: string
  batchStatus: string
  issuedAt: string
}

interface SelectedItem {
  procedureId: string
  procedureCode: string
  procedureDescription: string
  isPericiable: boolean
  unitValue: number
  quantity: number
  totalValue: number
  dependentId: string | null
  dependentName: string
}

interface Person {
  id: string | null
  name: string
  age: number | null
  type: string
}

export function BillingWizard({ clinicId, contractId, onClose }: BillingWizardProps) {
  const [contract, setContract] = useState<AdvanceContract | null>(null)
  const [eligibleProcedures, setEligibleProcedures] = useState<EligibleProcedure[]>([])
  const [billedProcedures, setBilledProcedures] = useState<BilledProcedure[]>([])
  const [dependents, setDependents] = useState<Array<{ id: string; name: string; age: number | null; relationship: string }>>([])
  const [patientAge, setPatientAge] = useState<number | null>(null)
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [targetAmount, setTargetAmount] = useState('')

  useEffect(() => {
    loadData()
  }, [clinicId, contractId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load contract
      const contractData = await advancesApi.contracts.getById(clinicId, contractId)
      setContract(contractData)

      // Load eligible procedures with dependents and patient age
      const eligibleData = await advancesApi.contracts.getEligibleProcedures(clinicId, contractId)
      setEligibleProcedures((eligibleData.procedures || []).map((p: any) => ({
        ...p,
        adultsOnly: p.adultsOnly || false,
      })))
      setDependents(eligibleData.dependents || [])
      setPatientAge(eligibleData.patientAge || null)

      // Set default selected person to Titular
      if (eligibleData.patientAge !== null || eligibleData.patientAge !== undefined) {
        setSelectedPerson({
          id: null,
          name: 'Titular',
          age: eligibleData.patientAge,
          type: 'TITULAR',
        })
      }

      // Load billed procedures
      const billedData = await advancesApi.contracts.getBilledProcedures(clinicId, contractId)
      setBilledProcedures(billedData || [])
    } catch (err: any) {
      console.error('Error loading data:', err)
      toast.error(err.message || 'Erro ao carregar dados do contrato')
    } finally {
      setLoading(false)
    }
  }

  // Filter procedures based on selected person's age and already billed procedures
  const getFilteredProcedures = () => {
    if (!selectedPerson) return []

    const isAdult = selectedPerson.age !== null && selectedPerson.age >= 18

    // First filter by age
    let filtered = eligibleProcedures.filter(proc => {
      if (isAdult) return true
      return !proc.adultsOnly // Children can only see non-adults-only procedures
    })

    // Filter out procedures already billed for this specific person
    const billedForPerson = billedProcedures.filter(bp => {
      // Match by dependentId: null for titular, or specific dependent id
      return bp.dependentId === selectedPerson.id
    })

    const billedCodesForPerson = new Set(billedForPerson.map(bp => bp.procedureCode))
    
    // Exclude already billed procedures for this person
    filtered = filtered.filter(proc => !billedCodesForPerson.has(proc.procedureCode))

    return filtered
  }

  // Get billed procedures for selected person
  const getBilledForSelectedPerson = () => {
    if (!selectedPerson) return []
    
    return billedProcedures.filter(bp => {
      // Match by dependentId: null for titular, or specific dependent id
      return bp.dependentId === selectedPerson.id
    })
  }

  // Check if procedure is selected
  const isProcedureSelected = (procedureId: string) => {
    return selectedItems.some(item => item.procedureId === procedureId)
  }

  const calculateSelection = async () => {
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      toast.error('Valor alvo do lote é obrigatório')
      return
    }

    if (!selectedPerson) {
      toast.error('Selecione para quem será a fatura')
      return
    }

    setCalculating(true)
    try {
      console.log('[BillingWizard] Calculating automatic selection for target amount:', targetAmount)

      // Call the calculation endpoint (should NOT create batch, only calculate items)
      const result = await advancesApi.contracts.calculateBillingItems(clinicId, contractId, {
        targetAmount: parseFloat(targetAmount),
        serviceDate: new Date().toISOString().split('T')[0],
      })

      // Convert result items to selected items format
      const items: SelectedItem[] = result.items.map((item: any) => ({
        procedureId: item.procedureId || '',
        procedureCode: item.procedureCode,
        procedureDescription: item.procedureDescription,
        isPericiable: item.isPericiable,
        unitValue: item.unitValue,
        quantity: item.quantity,
        totalValue: item.totalValue,
        dependentId: item.dependentId,
        dependentName: item.dependentName || 'Titular',
      }))

      console.log('[BillingWizard] Automatic selection calculated:', items.length, 'items')
      setSelectedItems(items)
      toast.success(`Seleção automática concluída: ${items.length} procedimentos selecionados`)
    } catch (err: any) {
      console.error('[BillingWizard] Error calculating selection:', err)
      toast.error(err.message || 'Erro ao calcular seleção automática')
    } finally {
      setCalculating(false)
    }
  }

  const handleToggleProcedure = (procedure: EligibleProcedure) => {
    if (!selectedPerson) {
      toast.error('Selecione para quem será a fatura primeiro')
      return
    }

    // Check if already selected
    const existingIndex = selectedItems.findIndex(item => item.procedureId === procedure.id)
    
    if (existingIndex >= 0) {
      // Remove if already selected
      handleRemoveItem(existingIndex)
      return
    }

    // Check if procedure is adults only and if selected person is adult
    if (procedure.adultsOnly) {
      const isAdult = selectedPerson.age !== null && selectedPerson.age >= 18
      if (!isAdult) {
        toast.error('Este procedimento é exclusivo para adultos (18+ anos)')
        return
      }
    }

    // Check if procedure is eligible for selected person
    const isEligible = procedure.eligibleFor.some(ef => ef.id === selectedPerson.id)
    if (!isEligible) {
      toast.error('Este procedimento não é elegível para a pessoa selecionada')
      return
    }

    // Add new item
    const newItem: SelectedItem = {
      procedureId: procedure.id,
      procedureCode: procedure.procedureCode,
      procedureDescription: procedure.procedureDescription,
      isPericiable: procedure.isPericiable,
      unitValue: procedure.unitValue,
      quantity: 1,
      totalValue: procedure.unitValue,
      dependentId: selectedPerson.id,
      dependentName: selectedPerson.name,
    }

    setSelectedItems([...selectedItems, newItem])
  }

  const handleRemoveItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index))
  }

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return
    
    const updated = [...selectedItems]
    updated[index].quantity = quantity
    updated[index].totalValue = updated[index].unitValue * quantity
    setSelectedItems(updated)
  }

  const handleCreateBatch = async () => {
    if (selectedItems.length === 0) {
      toast.error('Nenhum procedimento selecionado')
      return
    }

    if (!selectedPerson) {
      toast.error('Selecione para quem será a fatura')
      return
    }

    // Prevent double submission
    if (creating) {
      console.log('[BillingWizard] Already creating batch, ignoring duplicate request')
      return
    }

    setCreating(true)
    try {
      console.log('[BillingWizard] Creating batch with', selectedItems.length, 'items')

      const result = await advancesApi.contracts.createBillingBatchManual(clinicId, contractId, {
        items: selectedItems.map(item => ({
          procedureId: item.procedureId,
          procedureCode: item.procedureCode,
          procedureDescription: item.procedureDescription,
          isPericiable: item.isPericiable,
          unitValue: item.unitValue,
          quantity: item.quantity,
          totalValue: item.totalValue,
          dependentId: item.dependentId,
        })),
        serviceDate: new Date().toISOString().split('T')[0],
      })

      console.log('[BillingWizard] Batch created successfully:', result.batchNumber)
      toast.success(`Lote ${result.batchNumber} criado com sucesso!`)

      // Close dialog and trigger parent refresh via callback
      onClose()
    } catch (err: any) {
      console.error('[BillingWizard] Error creating batch:', err)
      toast.error(err.message || 'Erro ao criar lote')
      setCreating(false) // Only reset on error
    }
    // Don't reset creating flag on success to prevent any potential race conditions
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  // Calculate totals in real-time
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.totalValue, 0)
  const selectedPericiable = selectedItems
    .filter((item) => item.isPericiable)
    .reduce((sum, item) => sum + item.totalValue, 0)
  const selectedNonPericiable = selectedItems
    .filter((item) => !item.isPericiable)
    .reduce((sum, item) => sum + item.totalValue, 0)

  // Get filtered procedures based on selected person
  const filteredProcedures = getFilteredProcedures()
  
  // Separate by category
  const periciableProcedures = filteredProcedures.filter((p) => p.isPericiable)
  const nonPericiableProcedures = filteredProcedures.filter((p) => !p.isPericiable)
  
  // Get billed procedures for selected person
  const billedForSelectedPerson = getBilledForSelectedPerson()

  // Get all available people (patient + dependents)
  const getAllPeople = (): Person[] => {
    const people: Person[] = [
      { id: null, name: 'Titular', age: patientAge, type: 'TITULAR' },
    ]
    dependents.forEach(dep => {
      people.push({ id: dep.id, name: dep.name, age: dep.age, type: dep.relationship })
    })
    return people
  }

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Carregando...</DialogTitle>
            <DialogDescription>
              Carregando dados do contrato e procedimentos disponíveis
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assistente de Faturação</DialogTitle>
          <DialogDescription>
            Selecione para quem será a fatura e escolha os procedimentos manualmente ou use a seleção automática
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Contract Info */}
          {contract && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contrato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Paciente</Label>
                    <p className="font-medium">{contract.patientName}</p>
                    {patientAge !== null && (
                      <p className="text-xs text-muted-foreground">Idade: {patientAge} anos</p>
                    )}
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Operadora</Label>
                    <p className="font-medium">{contract.insuranceProviderName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Saldo Disponível</Label>
                    <p className="font-medium text-green-600">
                      {formatCurrency(contract.balanceToBill || 0)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Selecionado</Label>
                    <p className="font-medium text-lg text-blue-600">
                      {formatCurrency(selectedTotal)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Person Selection and Auto Selection */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Faturar para *</Label>
              <Select
                value={selectedPerson ? `${selectedPerson.id || 'null'}|${selectedPerson.name}` : ''}
                onValueChange={(value) => {
                  const [id, name] = value.split('|')
                  const person = getAllPeople().find(p => (p.id || 'null') === id && p.name === name)
                  if (person) {
                    setSelectedPerson(person)
                    // Clear selected items when changing person
                    setSelectedItems([])
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione para quem será a fatura" />
                </SelectTrigger>
                <SelectContent>
                  {getAllPeople().map((person) => (
                    <SelectItem key={person.id || 'titular'} value={`${person.id || 'null'}|${person.name}`}>
                      {person.name} {person.age !== null ? `(${person.age} anos)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPerson && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedPerson.age !== null && selectedPerson.age >= 18 
                    ? 'Adulto - Todos os procedimentos disponíveis'
                    : 'Criança - Apenas procedimentos não exclusivos para adultos'}
                </p>
              )}
            </div>
            <div>
              <Label>Valor Alvo do Lote (€) - Opcional</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0.00"
                disabled={calculating || creating || !selectedPerson}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Deixe vazio para seleção manual
              </p>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={calculateSelection}
                disabled={calculating || creating || !targetAmount || parseFloat(targetAmount) <= 0 || !selectedPerson}
                className="w-full"
              >
                {calculating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Calculando...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Seleção Automática
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* 3 Columns: Periciáveis | Não Periciáveis | Já Faturados */}
          <div className="grid grid-cols-3 gap-4">
            {/* Column 1: Periciáveis */}
            <div className="flex flex-col">
              <div className="mb-2">
                <h3 className="text-sm font-semibold">Procedimentos Periciáveis</h3>
                <p className="text-xs text-muted-foreground">
                  {periciableProcedures.length} disponíveis
                </p>
              </div>
              <ScrollArea className="h-[500px] border rounded-md p-4">
                {!selectedPerson ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">
                      Selecione para quem será a fatura acima
                    </p>
                  </div>
                ) : periciableProcedures.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">
                      Nenhum procedimento periciável disponível
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {periciableProcedures.map((proc) => {
                      const isEligible = proc.eligibleFor.some(ef => ef.id === selectedPerson.id)
                      const isSelected = isProcedureSelected(proc.id)
                      
                      return (
                        <div
                          key={proc.id}
                          onClick={() => isEligible && handleToggleProcedure(proc)}
                          className={`flex items-center gap-2 p-3 border rounded-md transition-colors ${
                            isSelected 
                              ? 'bg-green-100 border-green-500 hover:bg-green-200 cursor-pointer' 
                              : isEligible
                              ? 'hover:bg-muted cursor-pointer'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium truncate">{proc.procedureDescription}</div>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {proc.procedureCode}
                              </Badge>
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Periciável
                              </Badge>
                              {proc.adultsOnly && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0 bg-orange-100">
                                  Adultos
                                </Badge>
                              )}
                              {isSelected && (
                                <Badge variant="default" className="text-xs flex-shrink-0 bg-green-600">
                                  Selecionado
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatCurrency(proc.unitValue)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Column 2: Não Periciáveis */}
            <div className="flex flex-col">
              <div className="mb-2">
                <h3 className="text-sm font-semibold">Procedimentos Não Periciáveis</h3>
                <p className="text-xs text-muted-foreground">
                  {nonPericiableProcedures.length} disponíveis
                </p>
              </div>
              <ScrollArea className="h-[500px] border rounded-md p-4">
                {!selectedPerson ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">
                      Selecione para quem será a fatura acima
                    </p>
                  </div>
                ) : nonPericiableProcedures.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">
                      Nenhum procedimento não periciável disponível
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {nonPericiableProcedures.map((proc) => {
                      const isEligible = proc.eligibleFor.some(ef => ef.id === selectedPerson.id)
                      const isSelected = isProcedureSelected(proc.id)
                      
                      return (
                        <div
                          key={proc.id}
                          onClick={() => isEligible && handleToggleProcedure(proc)}
                          className={`flex items-center gap-2 p-3 border rounded-md transition-colors ${
                            isSelected 
                              ? 'bg-green-100 border-green-500 hover:bg-green-200 cursor-pointer' 
                              : isEligible
                              ? 'hover:bg-muted cursor-pointer'
                              : 'opacity-50 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-medium truncate">{proc.procedureDescription}</div>
                              <Badge variant="outline" className="text-xs flex-shrink-0">
                                {proc.procedureCode}
                              </Badge>
                              {proc.adultsOnly && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0 bg-orange-100">
                                  Adultos
                                </Badge>
                              )}
                              {isSelected && (
                                <Badge variant="default" className="text-xs flex-shrink-0 bg-green-600">
                                  Selecionado
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatCurrency(proc.unitValue)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Column 3: Já Faturados */}
            <div className="flex flex-col">
              <div className="mb-2">
                <h3 className="text-sm font-semibold">Já Faturados</h3>
                <p className="text-xs text-muted-foreground">
                  {billedForSelectedPerson.length} procedimentos
                  {selectedPerson && ` para ${selectedPerson.name}`}
                </p>
              </div>
              <ScrollArea className="h-[500px] border rounded-md p-4">
                {!selectedPerson ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">
                      Selecione para quem será a fatura acima
                    </p>
                  </div>
                ) : billedForSelectedPerson.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">
                      Nenhum procedimento já faturado para {selectedPerson.name}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {billedForSelectedPerson.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-3 border rounded-md bg-muted/50"
                      >
                        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium truncate">{item.procedureDescription}</div>
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {item.procedureCode}
                            </Badge>
                            {item.isPericiable && (
                              <Badge variant="secondary" className="text-xs flex-shrink-0">
                                Periciável
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {item.dependentName || 'Titular'} • Qtd: {item.quantity} • {formatCurrency(item.totalValue)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Lote: {item.batchNumber} • {new Date(item.serviceDate).toLocaleDateString('pt-PT')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          {/* Selected Items Summary - Always visible with real-time calculation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Procedimentos Selecionados ({selectedItems.length})
                <span className="ml-auto text-lg font-bold text-blue-600">
                  Total: {formatCurrency(selectedTotal)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum procedimento selecionado</p>
                  <p className="text-xs mt-1">
                    {selectedPerson 
                      ? 'Use a seleção automática ou clique no botão + nos procedimentos acima'
                      : 'Selecione para quem será a fatura primeiro'}
                  </p>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-64 border rounded-md p-4">
                    <div className="space-y-2">
                      {selectedItems.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 p-3 border rounded-md bg-green-50"
                        >
                          <div className="flex-1">
                            <div className="text-sm font-medium">{item.procedureDescription}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.dependentName} • {item.procedureCode}
                              {item.isPericiable && ' • Periciável'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-20 h-8"
                            />
                            <div className="text-sm font-medium min-w-[100px] text-right">
                              {formatCurrency(item.totalValue)}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Total Selecionado</Label>
                      <p className="font-medium text-lg text-blue-600">{formatCurrency(selectedTotal)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Periciável</Label>
                      <p className="font-medium">{formatCurrency(selectedPericiable)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Não Periciável</Label>
                      <p className="font-medium">{formatCurrency(selectedNonPericiable)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Itens</Label>
                      <p className="font-medium">{selectedItems.length} procedimentos</p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={creating}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreateBatch}
            disabled={selectedItems.length === 0 || creating || !selectedPerson}
            className="bg-green-600 hover:bg-green-700"
          >
            {creating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Emitir Lote ({formatCurrency(selectedTotal)})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
