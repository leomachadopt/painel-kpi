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
import { useTranslation } from '@/hooks/useTranslation'

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
  const { t } = useTranslation()
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejecting, setRejecting] = useState(false)

  const handleReject = async () => {
    if (!orderId || !clinicId) return

    if (!rejectionReason.trim()) {
      toast.error(t('order.rejectReason') + ' ' + t('common.required'))
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
          <DialogTitle>{t('order.reject')}</DialogTitle>
          <DialogDescription>
            {t('order.rejectDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rejection-reason">
              {t('order.rejectReason')} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder={t('order.rejectPlaceholder')}
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
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={rejecting || !rejectionReason.trim()}
          >
            {rejecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('order.rejecting')}
              </>
            ) : (
              t('order.reject')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

