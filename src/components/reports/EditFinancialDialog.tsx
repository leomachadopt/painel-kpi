import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PatientCodeInput } from '@/components/PatientCodeInput'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { DailyFinancialEntry, Clinic } from '@/lib/types'
import useDataStore from '@/stores/useDataStore'
import { useTranslation } from '@/hooks/useTranslation'

interface EditFinancialDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DailyFinancialEntry | null
  clinic: Clinic
  onSuccess?: () => void
}

export function EditFinancialDialog({
  open,
  onOpenChange,
  entry,
  clinic,
  onSuccess,
}: EditFinancialDialogProps) {
  const { t } = useTranslation()
  
  const schema = z.object({
    date: z.string(),
    patientName: z.string().min(1, 'Nome obrigatório'),
    code: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
    categoryId: z.string().min(1, 'Categoria obrigatória'),
    value: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
    cabinetId: z.string().min(1, t('cabinet.required')),
    doctorId: z.string().optional(),
    paymentSourceId: z.string().optional(),
  })
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: '',
      patientName: '',
      code: '',
      categoryId: '',
      value: 0,
      cabinetId: '',
      doctorId: '',
      paymentSourceId: '',
    },
  })

  // Preencher formulário quando entry mudar
  useEffect(() => {
    if (entry && open) {
      form.reset({
        date: entry.date.split('T')[0] || entry.date,
        patientName: entry.patientName,
        code: entry.code,
        categoryId: entry.categoryId,
        value: entry.value,
        cabinetId: entry.cabinetId,
        doctorId: entry.doctorId || '',
        paymentSourceId: entry.paymentSourceId || '',
      })
    }
  }, [entry, open, form])

  const { updateFinancialEntry } = useDataStore()

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!entry) return

    try {
      await updateFinancialEntry(clinic.id, entry.id, {
        id: entry.id,
        date: data.date,
        patientName: data.patientName,
        code: data.code,
        categoryId: data.categoryId,
        value: data.value,
        cabinetId: data.cabinetId,
        doctorId: data.doctorId || null,
        paymentSourceId: data.paymentSourceId || null,
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      // Erro já é tratado na store
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Lançamento Financeiro</DialogTitle>
          <DialogDescription>
            Atualize os dados do lançamento financeiro.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
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

            <PatientCodeInput
              clinicId={clinic.id}
              value={form.watch('code')}
              onCodeChange={(c) => form.setValue('code', c, { shouldValidate: true })}
              patientName={form.watch('patientName')}
              onPatientNameChange={(n) =>
                form.setValue('patientName', n, { shouldValidate: true })
              }
              label="Código"
              codeError={form.formState.errors.code?.message}
              patientNameError={form.formState.errors.patientName?.message}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clinic.configuration.categories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
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
                name="cabinetId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('financial.cabinet')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clinic.configuration.cabinets.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Médico</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (opcional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clinic.configuration.doctors.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
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
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione (opcional)" />
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
            </div>

            <FormField
              control={form.control}
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('financial.valueWithCurrency')}</FormLabel>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar Alterações</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

