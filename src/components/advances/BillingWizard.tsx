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
import { Checkbox } from '@/components/ui/checkbox'
import { advancesApi } from '@/services/api'
import { toast } from 'sonner'
import { EligibleBillingItem, AdvanceContract } from '@/lib/types'
import { Loader2, Calculator } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

interface BillingWizardProps {
  clinicId: string
  contractId: string
  onClose: () => void
}

export function BillingWizard({ clinicId, contractId, onClose }: BillingWizardProps) {
  const [contract, setContract] = useState<AdvanceContract | null>(null)
  const [eligibleItems, setEligibleItems] = useState<EligibleBillingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)
  const [targetAmount, setTargetAmount] = useState('')
  const [targetPericiableAmount, setTargetPericiableAmount] = useState('0')

  useEffect(() => {
    loadData()
  }, [clinicId, contractId])

  const loadData = async () => {
    setLoading(true)
    try {
      const contractData = await advancesApi.contracts.getById(clinicId, contractId)
      setContract(contractData)

      // For now, we'll create mock eligible items
      // In the real implementation, this would come from the API
      // based on procedures/services performed for this contract
      setEligibleItems([
        // Mock data - replace with actual API call
      ])
    } catch (err: any) {
      toast.error('Erro ao carregar dados do contrato')
    } finally {
      setLoading(false)
    }
  }

  const toggleItemSelection = (itemId: string) => {
    setEligibleItems(
      eligibleItems.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item
      )
    )
  }

  const calculateSelection = () => {
    setCalculating(true)
    try {
      // Implement calculation algorithm
      // For now, just a placeholder
      toast.info('Cálculo automático - em desenvolvimento')
    } catch (err: any) {
      toast.error('Erro ao calcular seleção')
    } finally {
      setCalculating(false)
    }
  }

  const selectedItems = eligibleItems.filter((item) => item.selected)
  const selectedTotal = selectedItems.reduce((sum, item) => sum + item.totalValue, 0)
  const selectedPericiable = selectedItems
    .filter((item) => item.isPericiable)
    .reduce((sum, item) => sum + item.totalValue, 0)

  const handleCreateBatch = async () => {
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      toast.error('Valor alvo do lote é obrigatório')
      return
    }

    try {
      // Create batch with selected items
      toast.info('Criar lote - em desenvolvimento')
      onClose()
    } catch (err: any) {
      toast.error('Erro ao criar lote')
    }
  }

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assistente de Faturação</DialogTitle>
          <DialogDescription>
            Selecione os itens elegíveis para criar um lote de faturação
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
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Paciente</Label>
                    <p className="font-medium">{contract.patientName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Operadora</Label>
                    <p className="font-medium">{contract.insuranceProviderName}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Saldo Disponível</Label>
                    <p className="font-medium text-green-600">
                      €{contract.balanceToBill?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Target Values */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Valor Alvo do Lote (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Valor Periciável no Lote (€)</Label>
              <Input
                type="number"
                step="0.01"
                value={targetPericiableAmount}
                onChange={(e) => setTargetPericiableAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                onClick={calculateSelection}
                disabled={calculating || !targetAmount}
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
                    Calcular
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Eligible Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Itens Elegíveis</Label>
              <div className="text-sm text-muted-foreground">
                {selectedItems.length} de {eligibleItems.length} selecionados
              </div>
            </div>

            <ScrollArea className="h-96 border rounded-md p-4">
              {eligibleItems.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    Nenhum item elegível encontrado para este contrato
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Non-Periciable Items */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Não Periciável</Label>
                    {eligibleItems
                      .filter((item) => !item.isPericiable)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 hover:bg-muted rounded-md"
                        >
                          <Checkbox
                            checked={item.selected || false}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{item.procedureDescription}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.dependentName || 'Titular'} • {item.procedureCode} •{' '}
                              {item.serviceDate}
                            </div>
                          </div>
                          <div className="text-sm font-medium">
                            €{item.totalValue.toFixed(2)}
                          </div>
                        </div>
                      ))}
                  </div>

                  <Separator />

                  {/* Periciable Items */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Periciável</Label>
                    {eligibleItems
                      .filter((item) => item.isPericiable)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 hover:bg-muted rounded-md"
                        >
                          <Checkbox
                            checked={item.selected || false}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">{item.procedureDescription}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.dependentName || 'Titular'} • {item.procedureCode} •{' '}
                              {item.serviceDate}
                            </div>
                          </div>
                          <div className="text-sm font-medium">
                            €{item.totalValue.toFixed(2)}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Summary */}
          {selectedItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Resumo do Lote</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Selecionado</Label>
                    <p className="font-medium">€{selectedTotal.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Periciável Selecionado</Label>
                    <p className="font-medium">€{selectedPericiable.toFixed(2)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Itens</Label>
                    <p className="font-medium">{selectedItems.length} itens</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreateBatch}
            disabled={selectedItems.length === 0 || !targetAmount}
          >
            Emitir Lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

