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
import api from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import useDataStore from '@/stores/useDataStore'

interface EditTreatmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clinicId: string
  treatment: {
    id: string
    description: string
    unitValue: number
    totalQuantity: number
    pendingQuantity: number
    categoryId?: string
    toothRegion?: string
  } | null
  onSuccess: () => void
}

export function EditTreatmentDialog({
  open,
  onOpenChange,
  clinicId,
  treatment,
  onSuccess,
}: EditTreatmentDialogProps) {
  const { toast } = useToast()
  const { getClinic } = useDataStore()
  const clinic = getClinic(clinicId)

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    description: '',
    unitValue: '',
    totalQuantity: '',
    pendingQuantity: '',
    categoryId: '',
    toothRegion: '',
  })

  // Populate form when treatment changes
  useEffect(() => {
    if (open && treatment) {
      setFormData({
        description: treatment.description,
        unitValue: treatment.unitValue.toString(),
        totalQuantity: treatment.totalQuantity.toString(),
        pendingQuantity: treatment.pendingQuantity.toString(),
        categoryId: treatment.categoryId || '',
        toothRegion: treatment.toothRegion || '',
      })
    }
  }, [open, treatment])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!treatment) return

    // Validation
    if (!formData.description || !formData.unitValue || !formData.totalQuantity) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }

    const unitValue = parseFloat(formData.unitValue)
    const totalQuantity = parseInt(formData.totalQuantity)
    const pendingQuantity = parseInt(formData.pendingQuantity)

    if (unitValue <= 0 || totalQuantity <= 0 || pendingQuantity < 0 || pendingQuantity > totalQuantity) {
      toast({
        title: 'Erro',
        description: 'Valores inválidos',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      await api.pendingTreatments.updateTreatment(clinicId, treatment.id, {
        description: formData.description,
        unitValue,
        totalQuantity,
        pendingQuantity,
        categoryId: formData.categoryId || undefined,
        toothRegion: formData.toothRegion || undefined,
      })

      toast({
        title: 'Sucesso',
        description: 'Tratamento atualizado com sucesso',
      })

      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atualizar tratamento',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (!treatment) return null

  const calculatedTotal = formData.unitValue && formData.totalQuantity
    ? (parseFloat(formData.unitValue) * parseInt(formData.totalQuantity)).toFixed(2)
    : '0.00'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Tratamento</DialogTitle>
          <DialogDescription>
            Altere os dados do tratamento pendente abaixo
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Descrição <span className="text-destructive">*</span>
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição do tratamento"
              required
            />
          </div>

          {/* Tooth Region */}
          <div className="space-y-2">
            <Label htmlFor="toothRegion">Dente/Região (Opcional)</Label>
            <Input
              id="toothRegion"
              value={formData.toothRegion}
              onChange={(e) => setFormData({ ...formData, toothRegion: e.target.value })}
              placeholder="Ex: 16, 11-21, Superior direito..."
            />
          </div>

          {/* Values */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unitValue">
                Valor Unitário <span className="text-destructive">*</span>
              </Label>
              <Input
                id="unitValue"
                type="number"
                step="0.01"
                min="0"
                value={formData.unitValue}
                onChange={(e) => setFormData({ ...formData, unitValue: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="totalQuantity">
                Quantidade Total <span className="text-destructive">*</span>
              </Label>
              <Input
                id="totalQuantity"
                type="number"
                min="1"
                value={formData.totalQuantity}
                onChange={(e) => setFormData({ ...formData, totalQuantity: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Pending Quantity and Total */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pendingQuantity">
                Quantidade Pendente <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pendingQuantity"
                type="number"
                min="0"
                max={formData.totalQuantity}
                value={formData.pendingQuantity}
                onChange={(e) => setFormData({ ...formData, pendingQuantity: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Máximo: {formData.totalQuantity}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Valor Total</Label>
              <div className="h-10 flex items-center px-3 bg-muted rounded-md font-semibold">
                €{calculatedTotal}
              </div>
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
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
