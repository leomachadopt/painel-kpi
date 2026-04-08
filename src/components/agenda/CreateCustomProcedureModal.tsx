import { useState } from 'react'
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

interface CreateCustomProcedureModalProps {
  open: boolean
  onClose: () => void
  clinicId: string
  onSuccess?: (procedure: {
    id: string
    code: string
    description: string
    value: number
    type: 'clinica'
    procedureBaseId: string
    insuranceProviderProcedureId: null
    isCustom: true
  }) => void
}

export function CreateCustomProcedureModal({
  open,
  onClose,
  clinicId,
  onSuccess,
}: CreateCustomProcedureModalProps) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [code, setCode] = useState('')
  const [description, setDescription] = useState('')
  const [defaultValue, setDefaultValue] = useState<number>(0)

  const handleSave = async () => {
    // Validações
    if (!code.trim()) {
      toast({
        title: 'Atenção',
        description: 'O código é obrigatório',
        variant: 'destructive',
      })
      return
    }

    if (!description.trim()) {
      toast({
        title: 'Atenção',
        description: 'A descrição é obrigatória',
        variant: 'destructive',
      })
      return
    }

    if (defaultValue <= 0) {
      toast({
        title: 'Atenção',
        description: 'O valor deve ser maior que zero',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch(`/api/procedures-catalog/${clinicId}/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
        body: JSON.stringify({
          code: code.trim(),
          description: description.trim(),
          defaultValue,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar procedimento')
      }

      const data = await response.json()

      toast({
        title: 'Sucesso',
        description: 'Procedimento customizado criado com sucesso!',
      })

      // Callback com o procedimento criado
      onSuccess?.(data.procedure)

      // Reset e fechar
      handleClose()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar procedimento customizado',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    if (!saving) {
      setCode('')
      setDescription('')
      setDefaultValue(0)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Procedimento Customizado</DialogTitle>
          <DialogDescription>
            Este procedimento ficará disponível apenas para esta clínica
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código do Procedimento *</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Ex: CUSTOM.01.01"
              maxLength={50}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Procedimento especial de clareamento"
              maxLength={255}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultValue">Valor Padrão (€) *</Label>
            <Input
              id="defaultValue"
              type="number"
              step="0.01"
              min="0"
              value={defaultValue || ''}
              onChange={(e) => setDefaultValue(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              disabled={saving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Criando...' : 'Criar Procedimento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
