import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface RejectOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
  clinicId: string
  onSuccess?: () => void
}

export function RejectOrderDialog({
  open,
  onOpenChange,
  orderId,
  clinicId,
  onSuccess,
}: RejectOrderDialogProps) {
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const handleReject = async () => {
    if (!orderId || !clinicId) return

    if (!rejectionReason.trim()) {
      toast.error('Por favor, informe o motivo da recusa')
      return
    }

    setRejecting(true)
    try {
      await dailyEntriesApi.order.reject(clinicId, orderId, rejectionReason)
      toast.success('Pedido recusado com sucesso!')
      setRejectionReason('')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao recusar pedido')
    } finally {
      setRejecting(false)
    }
  }

  const handleClose = () => {
    if (!rejecting) {
      setRejectionReason('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recusar Pedido</DialogTitle>
          <DialogDescription>
            Informe o motivo da recusa do pedido. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">
              Motivo da Recusa <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Descreva o motivo da recusa do pedido..."
              rows={5}
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={rejecting}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={rejecting || !rejectionReason.trim()}
          >
            {rejecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recusando...
              </>
            ) : (
              'Recusar Pedido'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

