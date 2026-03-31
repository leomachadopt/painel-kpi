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
import useDataStore from '@/stores/useDataStore'

interface NewRevenuePlanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId: string
  onSuccess: () => void
}

export function NewRevenuePlanDialog({
  open,
  onOpenChange,
  clinicId,
  onSuccess,
}: NewRevenuePlanDialogProps) {
  const { toast } = useToast()
  const { getClinic } = useDataStore()
  const clinic = getClinic(clinicId)

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    patientCode: '',
    patientName: '',
    description: '',
    totalValue: '',
    installmentValue: '',
    installmentCount: '',
    startDate: '',
    paymentDay: '',
    categoryId: '',
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormData({
        patientCode: '',
        patientName: '',
        description: '',
        totalValue: '',
        installmentValue: '',
        installmentCount: '',
        startDate: '',
        paymentDay: '',
        categoryId: '',
      })
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.patientCode || !formData.patientName || !formData.description || !formData.installmentCount || !formData.startDate || !formData.paymentDay) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }

    if (!formData.totalValue && !formData.installmentValue) {
      toast({
        title: 'Erro',
        description: 'Informe o valor total OU o valor por parcela',
        variant: 'destructive',
      })
      return
    }

    const installmentCount = parseInt(formData.installmentCount)
    const paymentDay = parseInt(formData.paymentDay)

    if (installmentCount <= 0 || paymentDay < 1 || paymentDay > 31) {
      toast({
        title: 'Erro',
        description: 'Valores inválidos',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const data: any = {
        patientCode: formData.patientCode,
        patientName: formData.patientName,
        description: formData.description,
        installmentCount,
        startDate: formData.startDate,
        paymentDay,
      }

      if (formData.totalValue) {
        data.totalValue = parseFloat(formData.totalValue)
        data.installmentValue = data.totalValue / installmentCount
      } else {
        data.installmentValue = parseFloat(formData.installmentValue)
      }

      if (formData.categoryId) {
        data.categoryId = formData.categoryId
      }

      await api.revenueForecast.createPlan(clinicId, data)

      toast({
        title: 'Sucesso',
        description: `Plano de receita criado com ${installmentCount} parcelas`,
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar plano de receita',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const calculatedTotalValue = formData.installmentValue && formData.installmentCount
    ? (parseFloat(formData.installmentValue) * parseInt(formData.installmentCount)).toFixed(2)
    : ''

  const calculatedInstallmentValue = formData.totalValue && formData.installmentCount
    ? (parseFloat(formData.totalValue) / parseInt(formData.installmentCount)).toFixed(2)
    : ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Receita Recorrente</DialogTitle>
          <DialogDescription>
            Cadastre um plano de receita com parcelas mensais
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient Code and Name */}
          <PatientCodeInput
            clinicId={clinicId!}
            value={formData.patientCode}
            onCodeChange={(code) => setFormData({ ...formData, patientCode: code })}
            patientName={formData.patientName}
            onPatientNameChange={(name) => setFormData({ ...formData, patientName: name })}
            required={true}
          />

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição (Detalhes) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Ortodontia com aparelho fixo"
              required
            />
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="totalValue">Valor Total</Label>
              <Input
                id="totalValue"
                type="number"
                step="0.01"
                min="0"
                value={formData.totalValue}
                onChange={(e) =>
                  setFormData({ ...formData, totalValue: e.target.value, installmentValue: '' })
                }
                placeholder="1500.00"
                disabled={!!formData.installmentValue}
              />
              {calculatedInstallmentValue && (
                <p className="text-xs text-muted-foreground">
                  Parcelas de: €{calculatedInstallmentValue}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="installmentValue">OU Valor por Parcela</Label>
              <Input
                id="installmentValue"
                type="number"
                step="0.01"
                min="0"
                value={formData.installmentValue}
                onChange={(e) =>
                  setFormData({ ...formData, installmentValue: e.target.value, totalValue: '' })
                }
                placeholder="150.00"
                disabled={!!formData.totalValue}
              />
              {calculatedTotalValue && (
                <p className="text-xs text-muted-foreground">
                  Total: €{calculatedTotalValue}
                </p>
              )}
            </div>
          </div>

          {/* Installment Count and Dates */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installmentCount">
                Nº Parcelas <span className="text-destructive">*</span>
              </Label>
              <Input
                id="installmentCount"
                type="number"
                min="1"
                value={formData.installmentCount}
                onChange={(e) => setFormData({ ...formData, installmentCount: e.target.value })}
                placeholder="10"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">
                Data de Início <span className="text-destructive">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paymentDay">
                Dia Vencimento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="paymentDay"
                type="number"
                min="1"
                max="31"
                value={formData.paymentDay}
                onChange={(e) => setFormData({ ...formData, paymentDay: e.target.value })}
                placeholder="10"
                required
              />
              <p className="text-xs text-muted-foreground">Dia do mês (1-31)</p>
            </div>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="categoryId">Categoria (Opcional)</Label>
            <Select
              value={formData.categoryId || undefined}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Gerando...' : 'Gerar Parcelas'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
