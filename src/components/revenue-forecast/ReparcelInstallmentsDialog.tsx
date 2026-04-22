import { useState, useEffect } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import useDataStore from '@/stores/useDataStore'
import { getCurrencySymbol, formatCurrency } from '@/lib/utils'

interface ReparcelInstallmentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  clinicId: string
  pendingValue: number
  onSuccess: () => void
}

export function ReparcelInstallmentsDialog({
  open,
  onOpenChange,
  planId,
  clinicId,
  pendingValue,
  onSuccess,
}: ReparcelInstallmentsDialogProps) {
  const { toast } = useToast()
  const { getClinic } = useDataStore()
  const clinic = getClinic(clinicId)

  const [loading, setLoading] = useState(false)
  const [newInstallmentCount, setNewInstallmentCount] = useState('')

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setNewInstallmentCount('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!newInstallmentCount) {
      toast({
        title: 'Erro',
        description: 'Informe o número de parcelas',
        variant: 'destructive',
      })
      return
    }

    const count = parseInt(newInstallmentCount)
    if (count <= 0) {
      toast({
        title: 'Erro',
        description: 'Número de parcelas deve ser maior que zero',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/revenue-forecast/${clinicId}/plans/${planId}/reparcel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newInstallmentCount: count,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao reparcelar')
      }

      toast({
        title: 'Sucesso',
        description: 'Parcelas reparceladas com sucesso',
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao reparcelar',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const currencySymbol = clinic ? getCurrencySymbol(clinic.country || 'PT-BR') : 'R$'
  const count = parseInt(newInstallmentCount) || 0
  const valuePerInstallment = count > 0 ? pendingValue / count : 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Reparcelar Saldo Pendente</DialogTitle>
          <DialogDescription>
            Redistribua as parcelas pendentes em um novo número de parcelas
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-muted-foreground">Saldo Pendente:</span>
                <span className="font-bold">
                  {formatCurrency(pendingValue, currencySymbol)}
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="installmentCount">Número de Novas Parcelas</Label>
              <Input
                id="installmentCount"
                type="number"
                min="1"
                placeholder="Ex: 12"
                value={newInstallmentCount}
                onChange={(e) => setNewInstallmentCount(e.target.value)}
                required
              />
            </div>

            {count > 0 && (
              <div className="grid gap-2 p-3 bg-muted rounded-md">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Valor por parcela:</span>
                  <span className="font-semibold">
                    {formatCurrency(valuePerInstallment, currencySymbol)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {count} parcela{count > 1 ? 's' : ''} de {formatCurrency(valuePerInstallment, currencySymbol)}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Parcelas já recebidas serão mantidas</p>
              <p>• Parcelas pendentes serão substituídas</p>
              <p>• Primeira parcela vence no próximo mês</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Reparcelando...' : 'Reparcelar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
