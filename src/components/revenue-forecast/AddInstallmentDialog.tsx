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
import { getCurrencySymbol } from '@/lib/utils'
import api from '@/services/api'

interface AddInstallmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planId: string
  clinicId: string
  onSuccess: () => void
}

export function AddInstallmentDialog({
  open,
  onOpenChange,
  planId,
  clinicId,
  onSuccess,
}: AddInstallmentDialogProps) {
  const { toast } = useToast()
  const { getClinic } = useDataStore()
  const clinic = getClinic(clinicId)

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    value: '',
    dueDate: '',
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        value: '',
        dueDate: '',
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.value || !formData.dueDate) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos',
        variant: 'destructive',
      })
      return
    }

    const value = parseFloat(formData.value)
    if (value <= 0) {
      toast({
        title: 'Erro',
        description: 'Valor deve ser maior que zero',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await api.revenueForecast.addInstallment(clinicId, planId, {
        value,
        dueDate: formData.dueDate,
      })

      toast({
        title: 'Sucesso',
        description: 'Parcela adicionada com sucesso',
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao adicionar parcela',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const currencySymbol = clinic ? getCurrencySymbol(clinic.country || 'PT-BR') : 'R$'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Adicionar Parcela</DialogTitle>
          <DialogDescription>
            Adicione uma parcela avulsa ao plano de receita recorrente
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="value">Valor ({currencySymbol})</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="dueDate">Data de Vencimento</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({ ...formData, dueDate: e.target.value })
                }
                required
              />
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
              {loading ? 'Adicionando...' : 'Adicionar Parcela'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
