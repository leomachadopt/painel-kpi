import { useState } from 'react'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { treatmentPlanApi } from '@/services/api'
import { useTranslation } from '@/hooks/useTranslation'

interface AbandonPlanModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  clinicId: string
  entryId: string
  patientName: string
}

const ABANDON_REASONS = [
  { value: 'financeiro', label: 'Motivo financeiro' },
  { value: 'mudou_clinica', label: 'Mudou de clínica' },
  { value: 'plano_extenso', label: 'Plano muito extenso' },
  { value: 'nao_compareceu', label: 'Não compareceu/sem contato' },
  { value: 'outro', label: 'Outro' },
] as const

export function AbandonPlanModal({
  open,
  onClose,
  onSuccess,
  clinicId,
  entryId,
  patientName,
}: AbandonPlanModalProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!reason) {
      toast.error('Selecione um motivo')
      return
    }

    if (reason === 'outro' && !notes.trim()) {
      toast.error('Descreva o motivo no campo de observações')
      return
    }

    setLoading(true)
    try {
      await treatmentPlanApi.abandon(clinicId, entryId, {
        reason: reason as any,
        notes: notes.trim() || undefined,
      })

      toast.success('Plano marcado como abandonado')
      onSuccess()
      handleClose()
    } catch (error: any) {
      console.error('Erro ao abandonar plano:', error)
      toast.error(error.message || 'Erro ao abandonar plano')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setReason('')
    setNotes('')
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Marcar como Perda
          </DialogTitle>
          <DialogDescription>
            Paciente: {patientName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="reason">Motivo *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Selecione um motivo..." />
              </SelectTrigger>
              <SelectContent>
                {ABANDON_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">
              Observações {reason === 'outro' && '(obrigatório)'}
            </Label>
            <Textarea
              id="notes"
              placeholder="Detalhes adicionais sobre o abandono..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="bg-muted p-3 rounded-md text-sm text-muted-foreground">
            <strong>Atenção:</strong> Esta ação moverá o paciente para a coluna "Abandonado" no kanban.
            Você poderá reativar o plano posteriormente se necessário.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading || !reason}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirmando...
              </>
            ) : (
              'Confirmar Perda'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
