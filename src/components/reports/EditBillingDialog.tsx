import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DailyFinancialEntry, Clinic } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'

const schema = z.object({
  date: z.string().min(1, 'Data obrigatória'),
  patientName: z.string().min(1, 'Nome obrigatório'),
  code: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
  doctorId: z.string().min(1, 'Médico responsável obrigatório'),
  paymentSourceId: z.string().min(1, 'Fonte de recebimento obrigatória'),
  value: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
})

interface EditBillingDialogProps {
  entry: DailyFinancialEntry | null
  clinic: Clinic
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function EditBillingDialog({
  entry,
  clinic,
  open,
  onOpenChange,
  onSuccess,
}: EditBillingDialogProps) {
  const { formatCurrency } = useTranslation()
  const [saving, setSaving] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: '',
      patientName: '',
      code: '',
      doctorId: '',
      paymentSourceId: '',
      value: 0,
    },
  })

  // Update form when entry changes
  useEffect(() => {
    if (entry) {
      form.reset({
        date: entry.date.split('T')[0],
        patientName: entry.patientName,
        code: entry.code,
        doctorId: entry.doctorId || '',
        paymentSourceId: entry.paymentSourceId || '',
        value: entry.value,
      })
    }
  }, [entry, form])

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!entry) return

    setSaving(true)
    try {
      await dailyEntriesApi.financial.update(clinic.id, entry.id, {
        ...entry,
        date: data.date,
        patientName: data.patientName,
        code: data.code,
        doctorId: data.doctorId,
        paymentSourceId: data.paymentSourceId,
        value: data.value,
      })
      toast.success('Fatura atualizada com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar fatura')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Fatura</DialogTitle>
          <DialogDescription>
            Edite os dados da fatura de {entry?.patientName}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{1,6}"
                      maxLength={6}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="patientName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Médico Responsável</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o médico" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clinic.configuration.doctors.map((doc) => (
                        <SelectItem key={doc.id} value={doc.id}>
                          {doc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentSourceId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fonte de Recebimento</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a fonte" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(clinic.configuration.paymentSources || []).map((ps) => (
                        <SelectItem key={ps.id} value={ps.id}>
                          {ps.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor (€)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      {...field}
                      onFocus={(e) => e.target.select()}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
