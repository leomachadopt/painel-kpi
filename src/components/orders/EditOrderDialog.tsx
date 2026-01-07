import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { DailyOrderEntry } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import { Loader2, Paperclip } from 'lucide-react'
import { OrderDocuments } from './OrderDocuments'
import useAuthStore from '@/stores/useAuthStore'
import { usePermissions } from '@/hooks/usePermissions'

const schema = z.object({
  requested: z.boolean(),
  requestedAt: z.string().optional(),
  confirmed: z.boolean(),
  confirmedAt: z.string().optional(),
  inProduction: z.boolean(),
  inProductionAt: z.string().optional(),
  ready: z.boolean(),
  readyAt: z.string().optional(),
  delivered: z.boolean(),
  deliveredAt: z.string().optional(),
  cancelled: z.boolean(),
  cancelledAt: z.string().optional(),
  observations: z.string().optional(),
  invoicePending: z.boolean(),
})

interface EditOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderId: string | null
  clinicId: string
  onSuccess?: () => void
}

export function EditOrderDialog({
  open,
  onOpenChange,
  orderId,
  clinicId,
  onSuccess,
}: EditOrderDialogProps) {
  const { user } = useAuthStore()
  const { isGestor } = usePermissions()
  const [order, setOrder] = useState<DailyOrderEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)
  const [documentsOpen, setDocumentsOpen] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      requested: false,
      requestedAt: '',
      confirmed: false,
      confirmedAt: '',
      inProduction: false,
      inProductionAt: '',
      ready: false,
      readyAt: '',
      delivered: false,
      deliveredAt: '',
      cancelled: false,
      cancelledAt: '',
      observations: '',
    },
  })

  useEffect(() => {
    if (open && orderId && clinicId) {
      loadOrder()
    } else {
      setOrder(null)
      form.reset()
    }
  }, [open, orderId, clinicId])

  const loadOrder = async () => {
    if (!orderId || !clinicId) return

    setLoading(true)
    try {
      const data = await dailyEntriesApi.order.getById(clinicId, orderId)
      setOrder(data)
      
      // Preencher formulário com dados do pedido
      form.reset({
        requested: data.requested || false,
        requestedAt: data.requestedAt ? data.requestedAt.split('T')[0] : '',
        confirmed: data.confirmed || false,
        confirmedAt: data.confirmedAt ? data.confirmedAt.split('T')[0] : '',
        inProduction: data.inProduction || false,
        inProductionAt: data.inProductionAt ? data.inProductionAt.split('T')[0] : '',
        ready: data.ready || false,
        readyAt: data.readyAt ? data.readyAt.split('T')[0] : '',
        delivered: data.delivered || false,
        deliveredAt: data.deliveredAt ? data.deliveredAt.split('T')[0] : '',
        cancelled: data.cancelled || false,
        cancelledAt: data.cancelledAt ? data.cancelledAt.split('T')[0] : '',
        observations: data.observations || '',
        invoicePending: data.invoicePending || false,
      })
    } catch (error) {
      console.error('Error loading order:', error)
      toast.error('Erro ao carregar pedido')
    } finally {
      setLoading(false)
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const toggleWithDate = (
    boolField: 'requested' | 'confirmed' | 'inProduction' | 'ready' | 'delivered' | 'cancelled',
    dateField: 'requestedAt' | 'confirmedAt' | 'inProductionAt' | 'readyAt' | 'deliveredAt' | 'cancelledAt',
    next: boolean,
  ) => {
    form.setValue(boolField, next, { shouldValidate: true })
    if (next) {
      const current = form.getValues(dateField)
      form.setValue(dateField, current || today, { shouldValidate: true })
    } else {
      form.setValue(dateField, '', { shouldValidate: true })
    }
  }

  const handleConfirmPayment = async () => {
    if (!order || !orderId || !clinicId) return

    setConfirmingPayment(true)
    try {
      const updated = await dailyEntriesApi.order.confirmPayment(clinicId, orderId)
      setOrder(updated)
      toast.success('Pagamento confirmado com sucesso!')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao confirmar pagamento')
    } finally {
      setConfirmingPayment(false)
    }
  }

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!order || !orderId || !clinicId) return

    // Verificar se o pedido está aprovado antes de permitir edição de fases
    if (!order.approved && (data.requested || data.confirmed || data.inProduction || data.ready || data.delivered || data.cancelled)) {
      toast.error('Pedido precisa ser aprovado pela gestora antes de editar as fases')
      return
    }

    // Verificar se requer pagamento prévio e se foi confirmado
    if (order.requiresPrepayment && !order.paymentConfirmed && (data.requested || data.confirmed || data.inProduction || data.ready || data.delivered)) {
      toast.error('Pagamento precisa ser confirmado pelo gestor antes de ativar as fases do pedido')
      return
    }

    setSaving(true)
    try {
      // Preparar itens para atualização (manter os itens existentes)
      const items = (order.items || []).map((item) => ({
        itemId: item.itemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice || null,
        notes: item.notes || null,
      }))

      await dailyEntriesApi.order.update(clinicId, orderId, {
        date: order.date,
        supplierId: order.supplierId,
        orderNumber: order.orderNumber || null,
        items,
        requested: data.requested,
        requestedAt: data.requested ? data.requestedAt || null : null,
        confirmed: data.confirmed,
        confirmedAt: data.confirmed ? data.confirmedAt || null : null,
        inProduction: data.inProduction,
        inProductionAt: data.inProduction ? data.inProductionAt || null : null,
        ready: data.ready,
        readyAt: data.ready ? data.readyAt || null : null,
        delivered: data.delivered,
        deliveredAt: data.delivered ? data.deliveredAt || null : null,
        cancelled: data.cancelled,
        cancelledAt: data.cancelled ? data.cancelledAt || null : null,
        observations: data.observations || null,
        invoicePending: data.invoicePending || false,
      })

      toast.success('Pedido atualizado com sucesso!')
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar pedido')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Fases do Pedido</DialogTitle>
          <DialogDescription>
            Atualize as fases e observações do pedido
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : order ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Informações do Pedido (read-only) */}
              <div className="p-4 border rounded-md bg-muted/20">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-muted-foreground">Data:</label>
                    <p className="font-medium">{order.date}</p>
                  </div>
                  <div>
                    <label className="text-muted-foreground">Fornecedor:</label>
                    <p className="font-medium">{order.supplierName || '-'}</p>
                  </div>
                  {order.orderNumber && (
                    <div>
                      <label className="text-muted-foreground">Número do Pedido:</label>
                      <p className="font-medium">{order.orderNumber}</p>
                    </div>
                  )}
                  {order.total && order.total > 0 && (
                    <div>
                      <label className="text-muted-foreground">Total:</label>
                      <p className="font-medium text-primary">
                        {new Intl.NumberFormat('pt-PT', {
                          style: 'currency',
                          currency: 'EUR',
                        }).format(order.total)}
                      </p>
                    </div>
                  )}
                  {order.requiresPrepayment && (
                    <div className="col-span-2">
                      <label className="text-muted-foreground">Pagamento Prévio:</label>
                      <p className="font-medium text-orange-600">Necessário</p>
                      {isGestor && !order.paymentConfirmed && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={handleConfirmPayment}
                          disabled={confirmingPayment}
                          className="mt-2 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {confirmingPayment ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Confirmando...
                            </>
                          ) : (
                            'Confirmar Pagamento'
                          )}
                        </Button>
                      )}
                      {order.paymentConfirmed && (
                        <p className="text-sm text-green-600 mt-1">
                          ✓ Pagamento confirmado em {order.paymentConfirmedAt ? new Date(order.paymentConfirmedAt).toLocaleDateString('pt-PT') : ''}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Fases do Pedido */}
              <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Fases do Pedido</h3>
                  {!order.approved && (
                    <span className="text-xs text-muted-foreground italic">
                      (Aguardando aprovação da gestora)
                    </span>
                  )}
                </div>
                
                <div className={!order.approved ? 'opacity-50 pointer-events-none' : ''}>
                <FormField
                  control={form.control}
                  name="requested"
                  render={({ field }) => {
                    const isBlocked = order.requiresPrepayment && !order.paymentConfirmed
                    return (
                      <div className="space-y-2">
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>
                            Pedido Solicitado
                            {isBlocked && (
                              <span className="text-xs text-orange-600 ml-2">(Aguardando confirmação de pagamento)</span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(v) => toggleWithDate('requested', 'requestedAt', v)}
                              disabled={!order.approved || isBlocked}
                            />
                          </FormControl>
                        </FormItem>
                        {form.watch('requested') && (
                          <FormField
                            control={form.control}
                            name="requestedAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">
                                  Data de solicitação
                                </FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )
                  }}
                />

                <FormField
                  control={form.control}
                  name="confirmed"
                  render={({ field }) => {
                    const isBlocked = order.requiresPrepayment && !order.paymentConfirmed
                    return (
                      <div className="space-y-2">
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>
                            Pedido Confirmado
                            {isBlocked && (
                              <span className="text-xs text-orange-600 ml-2">(Aguardando pagamento)</span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(v) => toggleWithDate('confirmed', 'confirmedAt', v)}
                              disabled={!order.approved || isBlocked}
                            />
                          </FormControl>
                        </FormItem>
                        {form.watch('confirmed') && (
                          <FormField
                            control={form.control}
                            name="confirmedAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">
                                  Data de confirmação
                                </FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )
                  }}
                />

                <FormField
                  control={form.control}
                  name="inProduction"
                  render={({ field }) => {
                    const isBlocked = order.requiresPrepayment && !order.paymentConfirmed
                    return (
                      <div className="space-y-2">
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>
                            Em Produção
                            {isBlocked && (
                              <span className="text-xs text-orange-600 ml-2">(Aguardando pagamento)</span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(v) => toggleWithDate('inProduction', 'inProductionAt', v)}
                              disabled={!order.approved || isBlocked}
                            />
                          </FormControl>
                        </FormItem>
                        {form.watch('inProduction') && (
                          <FormField
                            control={form.control}
                            name="inProductionAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">
                                  Data de início de produção
                                </FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )
                  }}
                />

                <FormField
                  control={form.control}
                  name="ready"
                  render={({ field }) => {
                    const isBlocked = order.requiresPrepayment && !order.paymentConfirmed
                    return (
                      <div className="space-y-2">
                        <FormItem className="flex items-center justify-between space-y-0">
                          <FormLabel>
                            Pronto para Retirada
                            {isBlocked && (
                              <span className="text-xs text-orange-600 ml-2">(Aguardando pagamento)</span>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={(v) => toggleWithDate('ready', 'readyAt', v)}
                              disabled={!order.approved || isBlocked}
                            />
                          </FormControl>
                        </FormItem>
                        {form.watch('ready') && (
                          <FormField
                            control={form.control}
                            name="readyAt"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs text-muted-foreground">
                                  Data de prontidão
                                </FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    )
                  }}
                />

                <FormField
                  control={form.control}
                  name="cancelled"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <FormItem className="flex items-center justify-between space-y-0">
                        <FormLabel>Cancelado</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(v) => toggleWithDate('cancelled', 'cancelledAt', v)}
                          />
                        </FormControl>
                      </FormItem>
                      {form.watch('cancelled') && (
                        <FormField
                          control={form.control}
                          name="cancelledAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">
                                Data de cancelamento
                              </FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                />

                <FormField
                  control={form.control}
                  name="delivered"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <FormItem className="flex items-center justify-between space-y-0">
                        <FormLabel>Entregue</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={(v) => toggleWithDate('delivered', 'deliveredAt', v)}
                            disabled={!order.approved || (order.requiresPrepayment && !order.paymentConfirmed)}
                          />
                        </FormControl>
                      </FormItem>
                      {form.watch('delivered') && (
                        <FormField
                          control={form.control}
                          name="deliveredAt"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs text-muted-foreground">
                                Data de entrega
                              </FormLabel>
                              <FormControl>
                                <Input type="date" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  )}
                />
                </div>
              </div>

              {/* Fase Conferido - Após Entregue */}
              {order.delivered && (
                <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Conferência</h3>
                    {order.checked && (
                      <span className="text-xs text-green-600">
                        ✓ Conferido em {order.checkedAt ? new Date(order.checkedAt).toLocaleDateString('pt-PT') : ''}
                        {order.conform !== null && (
                          <span className={order.conform ? ' text-green-600' : ' text-red-600'}>
                            {' '}({order.conform ? 'Conforme' : 'Não Conforme'})
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  {!order.checked && (
                    <p className="text-xs text-muted-foreground">
                      O pedido precisa ser conferido após a entrega. Use o botão "Conferir Pedido" na página de pedidos.
                    </p>
                  )}
                  {order.checked && order.conform === false && order.nonConformReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm font-semibold text-red-800">Motivo da Não Conformidade:</p>
                      <p className="text-sm text-red-700 mt-1">{order.nonConformReason}</p>
                    </div>
                  )}
                </div>
              )}

              <FormField
                control={form.control}
                name="observations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={4}
                        placeholder="Adicione observações sobre este pedido..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Fatura Pendente */}
              <FormField
                control={form.control}
                name="invoicePending"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between space-y-0 p-4 border rounded-md bg-muted/20">
                    <div className="space-y-0.5">
                      <FormLabel>Fatura Pendente</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Marque se a fatura deste pedido está pendente
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Documentos */}
              <div className="p-4 border rounded-md bg-muted/20">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Documentos</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDocumentsOpen(true)}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Gerenciar Documentos
                  </Button>
                </div>
                {order?.documents && order.documents.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {order.documents.length} documento(s) anexado(s)
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Alterações'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <p>Pedido não encontrado</p>
          </div>
        )}
          </DialogContent>
        </Dialog>

        {orderId && (
          <OrderDocuments
            orderId={orderId}
            clinicId={clinicId}
            open={documentsOpen}
            onOpenChange={(open) => {
              setDocumentsOpen(open)
              if (!open && orderId && clinicId) {
                // Recarregar pedido para atualizar documentos
                loadOrder()
              }
            }}
          />
        )}
      </>
    )
  }

