import { useEffect, useState, useMemo } from 'react'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Trash2, Plus } from 'lucide-react'
import useDataStore from '@/stores/useDataStore'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'
import { SupplierInput } from '@/components/SupplierInput'
import { ItemInput } from '@/components/ItemInput'
import { dailyEntriesApi } from '@/services/api'

const itemSchema = z.object({
  itemId: z.string().min(1, 'Item obrigatório'),
  quantity: z.coerce.number().int('Quantidade deve ser um número inteiro').min(1, 'Quantidade deve ser maior que zero'),
  unitPrice: z.coerce.number().min(0).optional().nullable(),
  notes: z.string().optional(),
})

const schema = z.object({
  date: z.string(),
  supplierId: z.string().min(1, 'Fornecedor obrigatório'),
  orderNumber: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Pelo menos um item é obrigatório'),
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
  requiresPrepayment: z.boolean(),
  invoicePending: z.boolean(),
})

export function DailyOrders({ clinic }: { clinic: Clinic }) {
  const [lookupLoading, setLookupLoading] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [itemNames, setItemNames] = useState<Record<number, string>>({})

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      supplierId: '',
      orderNumber: '',
      items: [
        {
          itemId: '',
          quantity: 1,
          unitPrice: null,
          notes: '',
        },
      ],
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
      requiresPrepayment: false,
      invoicePending: false,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const supplierId = form.watch('supplierId')
  // Usar useWatch em vez de form.watch para atualização em tempo real
  const items = useWatch({
    control: form.control,
    name: 'items',
    defaultValue: form.getValues('items') || []
  })
  const today = new Date().toISOString().split('T')[0]

  // Calcular total do pedido - agora atualiza em tempo real
  const total = useMemo(() => {
    if (!items || items.length === 0) return 0
    
    return items.reduce((sum, item) => {
      const quantity = typeof item.quantity === 'number' 
        ? item.quantity 
        : (item.quantity ? parseFloat(String(item.quantity)) : 0)
      const unitPrice = typeof item.unitPrice === 'number' 
        ? item.unitPrice 
        : (item.unitPrice ? parseFloat(String(item.unitPrice)) : 0)
      return sum + (quantity * unitPrice)
    }, 0)
  }, [items])

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const id = `order-${clinic.id}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      
      await dailyEntriesApi.order.create(clinic.id, {
        id,
        date: data.date,
        supplierId: data.supplierId,
        orderNumber: data.orderNumber || null,
        items: data.items.map((item) => ({
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice || null,
          notes: item.notes || null,
        })),
        // Fases sempre começam como false - só podem ser preenchidas após aprovação
        requested: false,
        requestedAt: null,
        confirmed: false,
        confirmedAt: null,
        inProduction: false,
        inProductionAt: null,
        ready: false,
        readyAt: null,
        delivered: false,
        deliveredAt: null,
        cancelled: false,
        cancelledAt: null,
        observations: data.observations || null,
        requiresPrepayment: data.requiresPrepayment || false,
        invoicePending: data.invoicePending || false,
      })
      
      toast.success('Pedido guardado!')
      form.reset({
        date: data.date,
        supplierId: '',
        orderNumber: '',
        items: [
          {
            itemId: '',
            quantity: 1,
            unitPrice: null,
            notes: '',
          },
        ],
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
        requiresPrepayment: false,
        invoicePending: false,
      })
      setSupplierName('')
      setItemNames({})
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar pedido')
    }
  }

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

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-4 max-w-lg"
      >
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data do Pedido</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className={lookupLoading ? 'opacity-70 pointer-events-none' : ''}>
          <SupplierInput
            clinicId={clinic.id}
            value={form.watch('supplierId')}
            onValueChange={(id) => form.setValue('supplierId', id, { shouldValidate: true })}
            supplierName={supplierName}
            onSupplierNameChange={setSupplierName}
            label="Fornecedor"
            required
            error={form.formState.errors.supplierId?.message}
          />
        </div>

        <FormField
          control={form.control}
          name="orderNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número do Pedido (opcional)</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="Ex: PO-2024-001"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Total do Pedido - Visível durante preenchimento */}
        {total > 0 && (
          <div className="flex items-center justify-between p-4 border-2 border-primary/30 rounded-md bg-primary/10 shadow-sm">
            <span className="text-base font-semibold">Total do Pedido:</span>
            <span className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('pt-PT', {
                style: 'currency',
                currency: 'EUR',
              }).format(total)}
            </span>
          </div>
        )}

        {/* Itens do Pedido */}
        <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Itens do Pedido</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ itemId: '', quantity: 1, unitPrice: null, notes: '' })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Item
            </Button>
          </div>
          
          {fields.map((field, index) => (
            <div key={field.id} className="space-y-3 p-3 border rounded-md bg-background">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-3">
                  <FormField
                    control={form.control}
                    name={`items.${index}.itemId`}
                    render={({ field }) => (
                      <FormItem>
                        <ItemInput
                          clinicId={clinic.id}
                          value={field.value}
                          onValueChange={(id) => {
                            field.onChange(id)
                            // Carregar nome do item
                            dailyEntriesApi.orderItem.getById(clinic.id, id)
                              .then((item) => {
                                setItemNames((prev) => ({ ...prev, [index]: item.name }))
                              })
                              .catch(() => {})
                          }}
                          itemName={itemNames[index]}
                          onItemNameChange={(name) => {
                            setItemNames((prev) => ({ ...prev, [index]: name }))
                          }}
                          label="Item"
                          required
                          error={form.formState.errors.items?.[index]?.itemId?.message}
                        />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-3">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="1"
                              min="1"
                              {...field}
                              onChange={(e) => {
                                const value = e.target.value
                                // Permitir apenas números inteiros
                                if (value === '' || /^\d+$/.test(value)) {
                                  field.onChange(value === '' ? '' : parseInt(value, 10))
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço Unitário (€) - Opcional</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                              onFocus={(e) => e.target.select()}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name={`items.${index}.notes`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observações do Item (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Observações específicas deste item..."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      remove(index)
                      const newItemNames = { ...itemNames }
                      delete newItemNames[index]
                      // Reindexar
                      const reindexed: Record<number, string> = {}
                      Object.keys(newItemNames).forEach((key) => {
                        const oldIndex = parseInt(key)
                        if (oldIndex > index) {
                          reindexed[oldIndex - 1] = newItemNames[oldIndex]
                        } else if (oldIndex < index) {
                          reindexed[oldIndex] = newItemNames[oldIndex]
                        }
                      })
                      setItemNames(reindexed)
                    }}
                    className="mt-8"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          
          {form.formState.errors.items && (
            <p className="text-xs text-destructive">
              {form.formState.errors.items.message || 'Pelo menos um item é obrigatório'}
            </p>
          )}
        </div>

        {/* Fases do Pedido - Desabilitadas até aprovação */}
        <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Fases do Pedido</h3>
            <span className="text-xs text-muted-foreground italic">
              (Será liberado após aprovação pela gestora)
            </span>
          </div>
          
          <div className="space-y-4 opacity-50 pointer-events-none">
          <FormField
            control={form.control}
            name="requested"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Pedido Solicitado</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('requested', 'requestedAt', v)}
                      disabled
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
            )}
          />

          <FormField
            control={form.control}
            name="confirmed"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Pedido Confirmado</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('confirmed', 'confirmedAt', v)}
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
            )}
          />

          <FormField
            control={form.control}
            name="inProduction"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Em Produção</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('inProduction', 'inProductionAt', v)}
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
            )}
          />

          <FormField
            control={form.control}
            name="ready"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Pronto para Retirada</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('ready', 'readyAt', v)}
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
          </div>
        </div>

        {/* Pagamento Prévio */}
        <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
          <h3 className="text-sm font-semibold">Pagamento Prévio</h3>
          
          <FormField
            control={form.control}
            name="requiresPrepayment"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between space-y-0">
                <div className="space-y-0.5">
                  <FormLabel>Pagamento Prévio Necessário</FormLabel>
                  <p className="text-xs text-muted-foreground">
                    Marque se este pedido requer pagamento antes de prosseguir com as fases
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
        </div>

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

        <Button type="submit" className="w-full">
          Lançar Pedido
        </Button>
      </form>
    </Form>
  )
}

