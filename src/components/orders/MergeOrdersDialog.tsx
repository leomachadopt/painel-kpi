import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DailyOrderEntry } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, AlertCircle, Package2 } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

const schema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  orderNumber: z.string().optional(),
  observations: z.string().optional(),
})

interface MergeOrdersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderIds: string[]
  clinicId: string
  onSuccess?: () => void
}

interface ConsolidatedItem {
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  notes: string | null
}

export function MergeOrdersDialog({
  open,
  onOpenChange,
  orderIds,
  clinicId,
  onSuccess,
}: MergeOrdersDialogProps) {
  const [orders, setOrders] = useState<DailyOrderEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [consolidatedItems, setConsolidatedItems] = useState<ConsolidatedItem[]>([])
  const [totalAmount, setTotalAmount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      orderNumber: '',
      observations: '',
    },
  })

  useEffect(() => {
    if (open && orderIds.length > 0 && clinicId) {
      loadOrders()
    } else {
      setOrders([])
      setConsolidatedItems([])
      setError(null)
      form.reset()
    }
  }, [open, orderIds, clinicId])

  const loadOrders = async () => {
    if (!clinicId || orderIds.length === 0) return

    setLoading(true)
    setError(null)
    try {
      // Buscar todos os pedidos
      const ordersData = await Promise.all(
        orderIds.map(id => dailyEntriesApi.order.getById(clinicId, id))
      )

      setOrders(ordersData)

      // Validar que todos são do mesmo fornecedor
      const supplierIds = [...new Set(ordersData.map(o => o.supplierId))]
      if (supplierIds.length > 1) {
        setError('Todos os pedidos devem ser do mesmo fornecedor')
        return
      }

      // Validar que nenhum está aprovado
      const hasApproved = ordersData.some(o => o.approved)
      if (hasApproved) {
        setError('Não é possível unificar pedidos já aprovados')
        return
      }

      // Consolidar itens
      const itemsMap = new Map<string, ConsolidatedItem>()

      for (const order of ordersData) {
        if (!order.items) continue

        for (const item of order.items) {
          const itemId = item.itemId

          if (itemsMap.has(itemId)) {
            const existing = itemsMap.get(itemId)!
            const totalQuantity = existing.quantity + item.quantity
            const totalWeight = (existing.quantity * existing.unitPrice) + (item.quantity * (item.unitPrice || 0))
            const avgPrice = totalWeight / totalQuantity

            itemsMap.set(itemId, {
              itemId,
              itemName: item.itemName || '',
              quantity: totalQuantity,
              unitPrice: avgPrice > 0 ? avgPrice : existing.unitPrice,
              notes: existing.notes || item.notes || null,
            })
          } else {
            itemsMap.set(itemId, {
              itemId,
              itemName: item.itemName || '',
              quantity: item.quantity,
              unitPrice: item.unitPrice || 0,
              notes: item.notes || null,
            })
          }
        }
      }

      const items = Array.from(itemsMap.values())
      setConsolidatedItems(items)

      // Calcular total
      const total = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
      setTotalAmount(total)

      // Preencher data com a mais recente
      const mostRecentDate = ordersData
        .map(o => o.date)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]

      form.setValue('date', mostRecentDate)
      form.setValue('observations', `Pedido unificado de ${orderIds.length} pedidos em ${new Date().toLocaleDateString('pt-PT')}`)
    } catch (err: any) {
      console.error('Error loading orders:', err)
      setError(err?.message || 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!clinicId || orderIds.length === 0) return
    if (error) return

    setMerging(true)
    try {
      await dailyEntriesApi.order.merge(clinicId, orderIds, {
        date: data.date,
        orderNumber: data.orderNumber?.trim() || undefined,
        observations: data.observations?.trim() || undefined,
      })

      toast.success(`${orderIds.length} pedidos unificados com sucesso!`)
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao unificar pedidos')
    } finally {
      setMerging(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="h-5 w-5" />
            Unificar Pedidos
          </DialogTitle>
          <DialogDescription>
            Consolidar {orderIds.length} pedidos em um único pedido
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Pedidos Originais */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Pedidos Selecionados ({orders.length})</h3>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Fornecedor</TableHead>
                        <TableHead>Número</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell>
                            {order.date ? format(new Date(order.date), 'dd/MM/yyyy', { locale: ptBR }) : '-'}
                          </TableCell>
                          <TableCell className="font-medium">
                            {order.supplierName || '-'}
                          </TableCell>
                          <TableCell>{order.orderNumber || '-'}</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-PT', {
                              style: 'currency',
                              currency: 'EUR',
                            }).format(order.total || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Dados do Pedido Unificado */}
              <div className="space-y-4 p-4 border rounded-md bg-muted/20">
                <h3 className="text-sm font-semibold">Dados do Pedido Unificado</h3>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número do Pedido (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: PED-2026-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="observations"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          rows={3}
                          placeholder="Observações sobre este pedido unificado..."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Fornecedor:</span>
                    <span className="font-semibold">{orders[0]?.supplierName || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium">Total de Itens:</span>
                    <span className="font-semibold">{consolidatedItems.length}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-lg font-medium">Total:</span>
                    <span className="text-lg font-bold text-primary">
                      {new Intl.NumberFormat('pt-PT', {
                        style: 'currency',
                        currency: 'EUR',
                      }).format(totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Itens Consolidados */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Itens Consolidados</h3>
                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background">
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Quantidade</TableHead>
                        <TableHead className="text-right">Preço Unit.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consolidatedItems.map((item) => (
                        <TableRow key={item.itemId}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-PT', {
                              style: 'currency',
                              currency: 'EUR',
                            }).format(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            {new Intl.NumberFormat('pt-PT', {
                              style: 'currency',
                              currency: 'EUR',
                            }).format(item.quantity * item.unitPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={merging}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={merging || !!error}>
                  {merging ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Unificando...
                    </>
                  ) : (
                    <>
                      <Package2 className="mr-2 h-4 w-4" />
                      Unificar {orderIds.length} Pedidos
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
