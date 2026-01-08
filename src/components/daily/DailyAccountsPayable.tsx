import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SupplierInput } from '@/components/SupplierInput'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import useDataStore from '@/stores/useDataStore'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'
import { useState } from 'react'

const schema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  supplierId: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  category: z.string().optional(),
  notes: z.string().optional(),
})

export function DailyAccountsPayable({ clinic }: { clinic: Clinic }) {
  const { addAccountsPayableEntry } = useDataStore()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      supplierId: '',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      category: '',
      notes: '',
    },
  })

  const [supplierName, setSupplierName] = useState('')

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      await addAccountsPayableEntry(clinic.id, {
        id: Math.random().toString(36),
        clinicId: clinic.id,
        description: data.description,
        supplierId: data.supplierId || null,
        amount: data.amount,
        dueDate: data.dueDate,
        paid: false,
        category: data.category || null,
        notes: data.notes || null,
      })
      toast.success('Conta a pagar registada com sucesso!')
      form.reset({
        description: '',
        supplierId: '',
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        category: '',
        notes: '',
      })
      setSupplierName('')
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao registar conta a pagar')
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
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Aluguer do mês" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <SupplierInput
                  clinicId={clinic.id}
                  value={field.value || ''}
                  onValueChange={(value) => {
                    field.onChange(value)
                  }}
                  supplierName={supplierName}
                  onSupplierNameChange={setSupplierName}
                  label="Fornecedor"
                  required={false}
                  error={form.formState.errors.supplierId?.message}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Vencimento</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Aluguer, Fornecedores, etc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionais..."
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Guardar Conta a Pagar
        </Button>
      </form>
    </Form>
  )
}

