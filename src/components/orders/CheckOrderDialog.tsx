import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Loader2, ClipboardCheck } from 'lucide-react'

interface CheckOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
  clinicId: string
  onSuccess?: () => void
}

export function CheckOrderDialog({
  open,
  onOpenChange,
  orderId,
  clinicId,
  onSuccess,
}: CheckOrderDialogProps) {
  const [password, setPassword] = useState('')
  const [conform, setConform] = useState<boolean | null>(null)
  const [nonConformReason, setNonConformReason] = useState('')
  const [checking, setChecking] = useState(false)

  const handleCheck = async () => {
    if (!orderId || !clinicId) return

    if (!password.trim()) {
      toast.error('Por favor, informe sua senha')
      return
    }

    if (conform === null) {
      toast.error('Por favor, selecione se o pedido está conforme ou não conforme')
      return
    }

    if (conform === false && !nonConformReason.trim()) {
      toast.error('Por favor, informe o motivo da não conformidade')
      return
    }

    setChecking(true)
    try {
      await dailyEntriesApi.order.check(clinicId, orderId, password, conform, nonConformReason || undefined)
      toast.success('Pedido conferido com sucesso!')
      setPassword('')
      setConform(null)
      setNonConformReason('')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao conferir pedido')
    } finally {
      setChecking(false)
    }
  }

  const handleClose = () => {
    if (!checking) {
      setPassword('')
      setConform(null)
      setNonConformReason('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Conferir Pedido</DialogTitle>
          <DialogDescription>
            Valide sua senha e informe se o pedido está conforme ou não conforme
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="password">
              Senha <span className="text-destructive">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha para validar"
              required
            />
          </div>

          <div className="space-y-3">
            <Label>Status da Conferência <span className="text-destructive">*</span></Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="conform"
                  checked={conform === true}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setConform(true)
                      setNonConformReason('')
                    } else {
                      setConform(null)
                    }
                  }}
                />
                <Label htmlFor="conform" className="font-normal cursor-pointer">
                  Conforme
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="non-conform"
                  checked={conform === false}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setConform(false)
                    } else {
                      setConform(null)
                    }
                  }}
                />
                <Label htmlFor="non-conform" className="font-normal cursor-pointer">
                  Não Conforme
                </Label>
              </div>
            </div>
          </div>

          {conform === false && (
            <div className="space-y-2">
              <Label htmlFor="non-conform-reason">
                Motivo da Não Conformidade <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="non-conform-reason"
                value={nonConformReason}
                onChange={(e) => setNonConformReason(e.target.value)}
                placeholder="Descreva o motivo da não conformidade..."
                rows={4}
                required
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={checking}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCheck}
            disabled={checking || !password.trim() || conform === null || (conform === false && !nonConformReason.trim())}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {checking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Conferindo...
              </>
            ) : (
              <>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Conferir Pedido
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

