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
import { advancesApi, clinicsApi } from '@/services/api'
import { toast } from 'sonner'
import { AdvanceContract, Clinic } from '@/lib/types'
import { Loader2, Calculator, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/hooks/useTranslation'

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
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null) // Opcional - apenas para seleção automática
  const [activePeople, setActivePeople] = useState<Set<string | null>>(new Set()) // Pessoas ativas para adicionar procedimentos
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [creating, setCreating] = useState(false)
  const [targetAmount, setTargetAmount] = useState('')
  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [doctorId, setDoctorId] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [clinicId, contractId])

  const loadData = async () => {
    setLoading(true)
    try {
      // Load clinic to get doctors
      const clinicData = await clinicsApi.getById(clinicId)
      setClinic(clinicData)

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

      // Set default selected person to Titular (apenas para seleção automática)
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

  // Verifica se um procedimento já foi faturado para uma pessoa específica
  const isProcedureBilledForPerson = (procedureCode: string, dependentId: string | null) => {
    return billedProcedures.some(bp => 
      bp.procedureCode === procedureCode && bp.dependentId === dependentId
    )
  }

  // Obtém procedimentos disponíveis para uma pessoa específica (não faturados e não selecionados para ela)
  const getAvailableProceduresForPerson = (personId: string | null) => {
    const person = getAllPeople().find(p => p.id === personId)
    if (!person) return { periciable: [], nonPericiable: [] }

    const isAdult = person.age !== null && person.age >= 18
    
    // Filtra procedimentos elegíveis para esta pessoa
    const eligible = eligibleProcedures.filter(proc => {
      // Verifica se é elegível para esta pessoa
      const isEligible = proc.eligibleFor.some(ef => ef.id === personId)
      if (!isEligible) return false

      // Verifica restrição de idade
      if (proc.adultsOnly && !isAdult) return false

      // Verifica se já foi faturado para esta pessoa
      if (isProcedureBilledForPerson(proc.procedureCode, personId)) return false

      // Verifica se já está selecionado para esta pessoa
      if (isProcedureSelected(proc.id, personId)) return false

      return true
    })

    return {
      periciable: eligible.filter(p => p.isPericiable),
      nonPericiable: eligible.filter(p => !p.isPericiable)
    }
  }

  // Obtém procedimentos já faturados para uma pessoa
  const getBilledProceduresForPerson = (personId: string | null) => {
    return billedProcedures.filter(bp => bp.dependentId === personId)
  }

  // Check if procedure is selected (pode estar selecionado para qualquer pessoa)
  const isProcedureSelected = (procedureId: string, dependentId?: string | null) => {
    if (dependentId !== undefined) {
      // Verifica se está selecionado para uma pessoa específica
      return selectedItems.some(item => 
        item.procedureId === procedureId && item.dependentId === dependentId
      )
    }
    // Verifica se está selecionado para qualquer pessoa
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
      
      // Adiciona a pessoa selecionada às pessoas ativas se não estiver
      if (selectedPerson && !activePeople.has(selectedPerson.id)) {
        const newActive = new Set(activePeople)
        newActive.add(selectedPerson.id)
        setActivePeople(newActive)
      }
      
      // Adiciona os itens ao lote (não substitui, adiciona aos existentes)
      setSelectedItems([...selectedItems, ...items])
      toast.success(`Seleção automática concluída: ${items.length} procedimentos adicionados`)
    } catch (err: any) {
      console.error('[BillingWizard] Error calculating selection:', err)
      toast.error(err.message || 'Erro ao calcular seleção automática')
    } finally {
      setCalculating(false)
    }
  }

  // Adiciona procedimento ao lote para uma pessoa específica
  const handleAddProcedureForPerson = (procedure: EligibleProcedure, personId: string | null) => {
    const person = getAllPeople().find(p => p.id === personId)
    if (!person) return

    // Verifica se já está selecionado para esta pessoa
    if (isProcedureSelected(procedure.id, personId)) {
      // Remove se já estiver selecionado
      const index = selectedItems.findIndex(
        item => item.procedureId === procedure.id && item.dependentId === personId
      )
      if (index >= 0) {
        handleRemoveItem(index)
        toast.success(`${procedure.procedureDescription} removido de ${person.name}`)
      }
      return
    }

    // Verifica se já foi faturado
    if (isProcedureBilledForPerson(procedure.procedureCode, personId)) {
      toast.error(`Este procedimento já foi faturado para ${person.name}`)
      return
    }

    // Verifica se procedimento é elegível para essa pessoa
    const isEligible = procedure.eligibleFor.some(ef => ef.id === personId)
    if (!isEligible) {
      toast.error('Este procedimento não é elegível para esta pessoa')
      return
    }

    // Verifica restrição de idade
    if (procedure.adultsOnly) {
      const isAdult = person.age !== null && person.age >= 18
      if (!isAdult) {
        toast.error('Este procedimento é exclusivo para adultos (18+ anos)')
        return
      }
    }

    // Adiciona ao lote
    const newItem: SelectedItem = {
      procedureId: procedure.id,
      procedureCode: procedure.procedureCode,
      procedureDescription: procedure.procedureDescription,
      isPericiable: procedure.isPericiable,
      unitValue: procedure.unitValue,
      quantity: 1,
      totalValue: procedure.unitValue,
      dependentId: personId,
      dependentName: person.name,
    }

    setSelectedItems([...selectedItems, newItem])
    toast.success(`${procedure.procedureDescription} adicionado para ${person.name}`)
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

    if (!doctorId) {
      toast.error('Selecione o médico para emitir o lote')
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
        doctorId: doctorId,
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

  const { t, formatCurrency } = useTranslation()

  // Calculate totals in real-time
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.totalValue, 0)
  const selectedPericiable = selectedItems
    .filter((item) => item.isPericiable)
    .reduce((sum, item) => sum + item.totalValue, 0)
  const selectedNonPericiable = selectedItems
    .filter((item) => !item.isPericiable)
    .reduce((sum, item) => sum + item.totalValue, 0)

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
          <DialogTitle>{t('financial.billingWizard')}</DialogTitle>
          <DialogDescription>
            Selecione as pessoas e adicione procedimentos ao lote. Cada pessoa pode ter seus próprios procedimentos no mesmo lote.
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

          {/* Seleção de Pessoas Ativas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Selecione as Pessoas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Selecione as pessoas para adicionar procedimentos ao lote</Label>
                <div className="flex flex-wrap gap-2">
                  {getAllPeople().map((person) => {
                    const isActive = activePeople.has(person.id)
                    const selectedCount = selectedItems.filter(item => item.dependentId === person.id).length
                    return (
                      <Button
                        key={person.id || 'titular'}
                        type="button"
                        variant={isActive ? "default" : "outline"}
                        onClick={() => {
                          const newActive = new Set(activePeople)
                          if (isActive) {
                            newActive.delete(person.id)
                          } else {
                            newActive.add(person.id)
                          }
                          setActivePeople(newActive)
                        }}
                        className="flex items-center gap-2"
                      >
                        {person.name}
                        {person.age !== null && ` (${person.age} anos)`}
                        {isActive && <CheckCircle2 className="h-4 w-4" />}
                        {selectedCount > 0 && (
                          <Badge variant="secondary" className="ml-1">
                            {selectedCount}
                          </Badge>
                        )}
                      </Button>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Selecione uma ou mais pessoas para ver e adicionar procedimentos disponíveis
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Seleção Automática (Opcional) */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Faturar para (Seleção Automática)</Label>
              <Select
                value={selectedPerson ? `${selectedPerson.id || 'null'}|${selectedPerson.name}` : ''}
                onValueChange={(value) => {
                  const [id, name] = value.split('|')
                  const person = getAllPeople().find(p => (p.id || 'null') === id && p.name === name)
                  if (person) {
                    setSelectedPerson(person)
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione para seleção automática (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {getAllPeople().map((person) => (
                    <SelectItem key={person.id || 'titular'} value={`${person.id || 'null'}|${person.name}`}>
                      {person.name} {person.age !== null ? `(${person.age} anos)` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
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
              </div>
              <Button
                type="button"
                onClick={calculateSelection}
                disabled={calculating || creating || !targetAmount || parseFloat(targetAmount) <= 0 || !selectedPerson}
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

          {/* Seleção de Médico */}
          <div>
            <Label>Médico *</Label>
            <Select
              value={doctorId}
              onValueChange={setDoctorId}
              disabled={creating}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o médico" />
              </SelectTrigger>
              <SelectContent>
                {clinic?.configuration?.doctors?.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Obrigatório para emitir o lote
            </p>
          </div>

          <Separator />

          {/* Abas por Pessoa Ativa */}
          {activePeople.size === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">Selecione pelo menos uma pessoa acima para começar</p>
                  <p className="text-xs mt-2">
                    Você pode selecionar múltiplas pessoas para criar um lote híbrido
                </p>
              </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Array.from(activePeople).map((personId) => {
                const person = getAllPeople().find(p => p.id === personId)
                if (!person) return null

                const available = getAvailableProceduresForPerson(personId)
                const billed = getBilledProceduresForPerson(personId)
                const selectedForPerson = selectedItems.filter(item => item.dependentId === personId)

                return (
                  <Card key={personId || 'titular'}>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        {person.name}
                        {person.age !== null && ` (${person.age} anos)`}
                        <Badge variant="outline">
                          {selectedForPerson.length} selecionados
                        </Badge>
                        {person.age !== null && person.age >= 18 && (
                          <Badge variant="secondary" className="text-xs">
                            Adulto
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {/* Periciáveis */}
                        <div>
                          <h4 className="text-xs font-semibold mb-2">
                            Periciáveis ({available.periciable.length} disponíveis)
                          </h4>
                          <ScrollArea className="h-[400px] border rounded-md p-2">
                            {available.periciable.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-8">
                      Nenhum procedimento periciável disponível
                    </p>
                            ) : (
                              <div className="space-y-1">
                                {available.periciable.map((proc) => {
                                  const isSelected = isProcedureSelected(proc.id, personId)
                      return (
                        <div
                          key={proc.id}
                                      onClick={() => handleAddProcedureForPerson(proc, personId)}
                                      className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                            isSelected 
                                          ? 'bg-green-100 border-green-500 hover:bg-green-200' 
                                          : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate">{proc.procedureDescription}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {proc.procedureCode} • {formatCurrency(proc.unitValue)}
                            </div>
                          </div>
                                      {isSelected && (
                                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                      )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

                        {/* Não Periciáveis */}
                        <div>
                          <h4 className="text-xs font-semibold mb-2">
                            Não Periciáveis ({available.nonPericiable.length} disponíveis)
                          </h4>
                          <ScrollArea className="h-[400px] border rounded-md p-2">
                            {available.nonPericiable.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-8">
                      Nenhum procedimento não periciável disponível
                    </p>
                            ) : (
                              <div className="space-y-1">
                                {available.nonPericiable.map((proc) => {
                                  const isSelected = isProcedureSelected(proc.id, personId)
                      return (
                        <div
                          key={proc.id}
                                      onClick={() => handleAddProcedureForPerson(proc, personId)}
                                      className={`flex items-center gap-2 p-2 border rounded cursor-pointer transition-colors ${
                            isSelected 
                                          ? 'bg-green-100 border-green-500 hover:bg-green-200' 
                                          : 'hover:bg-muted'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                                        <div className="text-xs font-medium truncate">{proc.procedureDescription}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {proc.procedureCode} • {formatCurrency(proc.unitValue)}
                            </div>
                          </div>
                                      {isSelected && (
                                        <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                      )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

                        {/* Já Faturados */}
                        <div>
                          <h4 className="text-xs font-semibold mb-2">
                            Já Faturados ({billed.length})
                          </h4>
                          <ScrollArea className="h-[400px] border rounded-md p-2">
                            {billed.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-8">
                                Nenhum procedimento faturado
                              </p>
                            ) : (
                              <div className="space-y-1">
                                {billed.map((item) => (
                      <div
                        key={item.id}
                                    className="flex items-center gap-2 p-2 border rounded bg-muted/50"
                      >
                        <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                                      <div className="text-xs font-medium truncate">{item.procedureDescription}</div>
                          <div className="text-xs text-muted-foreground">
                                        {item.procedureCode} • Lote: {item.batchNumber}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

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
                    Selecione pessoas acima e adicione procedimentos ao lote
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
            disabled={selectedItems.length === 0 || creating || !doctorId}
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

