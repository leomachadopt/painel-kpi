import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { DailyOrderEntry } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ViewOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
  clinicId: string
}

export function ViewOrderDialog({
  open,
  onOpenChange,
  orderId,
  clinicId,
}: ViewOrderDialogProps) {
  const [order, setOrder] = useState<DailyOrderEntry | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && orderId && clinicId) {
      loadOrder()
    } else {
      setOrder(null)
    }
  }, [open, orderId, clinicId])

  const loadOrder = async () => {
    if (!orderId || !clinicId) return

    setLoading(true)
    try {
      const data = await dailyEntriesApi.order.getById(clinicId, orderId)
      setOrder(data)
    } catch (error) {
      console.error('Error loading order:', error)
    } finally {
      setLoading(false)
    }
  }

  const getOrderStatus = (order: DailyOrderEntry) => {
    if (order.cancelled) return { label: 'Cancelado', variant: 'destructive' as const }
    if (order.delivered) return { label: 'Entregue', variant: 'default' as const }
    if (order.ready) return { label: 'Pronto', variant: 'default' as const }
    if (order.inProduction) return { label: 'Em Produção', variant: 'secondary' as const }
    if (order.confirmed) return { label: 'Confirmado', variant: 'secondary' as const }
    if (order.requested) return { label: 'Solicitado', variant: 'outline' as const }
    return { label: 'Novo', variant: 'outline' as const }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Pedido</DialogTitle>
          <DialogDescription>
            Visualize todas as informações do pedido
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data do Pedido</label>
                <p className="text-base">
                  {order.date
                    ? format(new Date(order.date), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fornecedor</label>
                <p className="text-base font-medium">{order.supplierName || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Número do Pedido</label>
                <p className="text-base">{order.orderNumber || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  <Badge variant={getOrderStatus(order).variant}>
                    {getOrderStatus(order).label}
                  </Badge>
                </div>
              </div>
              {order.total && order.total > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total</label>
                  <p className="text-base font-bold text-primary">
                    {new Intl.NumberFormat('pt-PT', {
                      style: 'currency',
                      currency: 'EUR',
                    }).format(order.total)}
                  </p>
                </div>
              )}
            </div>

            {/* Itens do Pedido */}
            {order.items && order.items.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Itens do Pedido</h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Preço Unitário</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item) => {
                        const subtotal = (item.quantity || 0) * (item.unitPrice || 0)
                        return (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">
                              {item.itemName || '-'}
                            </TableCell>
                            <TableCell>{item.quantity || 0}</TableCell>
                            <TableCell>
                              {item.unitPrice
                                ? new Intl.NumberFormat('pt-PT', {
                                    style: 'currency',
                                    currency: 'EUR',
                                  }).format(item.unitPrice)
                                : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {subtotal > 0
                                ? new Intl.NumberFormat('pt-PT', {
                                    style: 'currency',
                                    currency: 'EUR',
                                  }).format(subtotal)
                                : '-'}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Fases do Pedido */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Fases do Pedido</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">Pedido Solicitado</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.requested ? 'default' : 'outline'}>
                      {order.requested ? 'Sim' : 'Não'}
                    </Badge>
                    {order.requestedAt && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(order.requestedAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">Pedido Confirmado</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.confirmed ? 'default' : 'outline'}>
                      {order.confirmed ? 'Sim' : 'Não'}
                    </Badge>
                    {order.confirmedAt && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(order.confirmedAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">Em Produção</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.inProduction ? 'default' : 'outline'}>
                      {order.inProduction ? 'Sim' : 'Não'}
                    </Badge>
                    {order.inProductionAt && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(order.inProductionAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">Pronto para Retirada</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.ready ? 'default' : 'outline'}>
                      {order.ready ? 'Sim' : 'Não'}
                    </Badge>
                    {order.readyAt && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(order.readyAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">Entregue</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.delivered ? 'default' : 'outline'}>
                      {order.delivered ? 'Sim' : 'Não'}
                    </Badge>
                    {order.deliveredAt && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(order.deliveredAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-md">
                  <span className="font-medium">Cancelado</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={order.cancelled ? 'destructive' : 'outline'}>
                      {order.cancelled ? 'Sim' : 'Não'}
                    </Badge>
                    {order.cancelledAt && (
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(order.cancelledAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            {order.observations && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Observações</h3>
                <p className="text-sm p-3 border rounded-md bg-muted/50 whitespace-pre-wrap">
                  {order.observations}
                </p>
              </div>
            )}

            {/* Informações de Sistema */}
            <div className="pt-4 border-t text-xs text-muted-foreground">
              <p>
                Criado em:{' '}
                {order.createdAt
                  ? format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                  : '-'}
              </p>
              <p>
                Última atualização:{' '}
                {order.updatedAt
                  ? format(new Date(order.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                  : '-'}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <p>Pedido não encontrado</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


