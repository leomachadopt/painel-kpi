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
import { Checkbox } from '@/components/ui/checkbox'
import { DailyAdvanceInvoiceEntry, Clinic } from '@/lib/types'
import useDataStore from '@/stores/useDataStore'
import { useTranslation } from '@/hooks/useTranslation'
import { toast } from 'sonner'

const schema = z.object({
  date: z.string(),
  patientName: z.string().min(1, 'Nome obrigatório'),
  code: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
  doctorId: z.string().optional(),
  billedToThirdParty: z.boolean().default(false),
  thirdPartyCode: z.string().optional(),
  thirdPartyName: z.string().optional(),
  value: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
})

interface EditAdvanceInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DailyAdvanceInvoiceEntry | null
  clinic: Clinic
  onSuccess?: () => void
}

export function EditAdvanceInvoiceDialog({
  open,
  onOpenChange,
  entry,
  clinic,
  onSuccess,
}: EditAdvanceInvoiceDialogProps) {
  const { t } = useTranslation()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: '',
      patientName: '',
      code: '',
      doctorId: '',
      billedToThirdParty: false,
      thirdPartyCode: '',
      thirdPartyName: '',
      value: 0,
    },
  })

  const billedToThirdParty = form.watch('billedToThirdParty')

  // Preencher formulário quando entry mudar
  useEffect(() => {
    if (entry && open) {
      form.reset({
        date: entry.date.split('T')[0] || entry.date,
        patientName: entry.patientName,
        code: entry.code,
        doctorId: entry.doctorId || '',
        billedToThirdParty: entry.billedToThirdParty || false,
        thirdPartyCode: entry.thirdPartyCode || '',
        thirdPartyName: entry.thirdPartyName || '',
        value: entry.value,
      })
    }
  }, [entry, open, form])

  const { updateAdvanceInvoiceEntry } = useDataStore()

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!entry) return

    // Validate third party name if checkbox is checked
    if (data.billedToThirdParty && !data.thirdPartyName) {
      form.setError('thirdPartyName', {
        message: 'Nome do terceiro é obrigatório quando faturado para terceiros',
      })
      return
    }

    try {
      await updateAdvanceInvoiceEntry(clinic.id, entry.id, {
        ...entry,
        date: data.date,
        patientName: data.patientName,
        code: data.code,
        doctorId: data.doctorId || null,
        billedToThirdParty: data.billedToThirdParty || false,
        thirdPartyCode: data.thirdPartyCode || null,
        thirdPartyName: data.thirdPartyName || null,
        value: data.value,
      })
      toast.success('Fatura de adiantamento atualizada com sucesso!')
      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      // Error já é tratado na store
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Fatura de Adiantamento</DialogTitle>
          <DialogDescription>
            Atualize os dados da fatura de adiantamento.
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
              name="billedToThirdParty"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Faturado para terceiros</FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {billedToThirdParty && (
              <>
                <FormField
                  control={form.control}
                  name="thirdPartyCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código (Terceiros)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Opcional"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="thirdPartyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome (Terceiros) *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Nome obrigatório"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

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
              <Button type="submit">Atualizar</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

