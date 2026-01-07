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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Checkbox } from '@/components/ui/checkbox'
import useDataStore from '@/stores/useDataStore'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'
import { useEffect } from 'react'

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

export function DailyAdvanceInvoice({ clinic }: { clinic: Clinic }) {
  const { addAdvanceInvoiceEntry } = useDataStore()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
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

  // Validate third party name when checkbox is checked
  useEffect(() => {
    if (billedToThirdParty) {
      form.setValue('thirdPartyName', form.getValues('thirdPartyName') || '')
    }
  }, [billedToThirdParty, form])

  const onSubmit = async (data: z.infer<typeof schema>) => {
    // Validate third party name if checkbox is checked
    if (data.billedToThirdParty && !data.thirdPartyName) {
      form.setError('thirdPartyName', {
        message: 'Nome do terceiro é obrigatório quando faturado para terceiros',
      })
      return
    }

    try {
      await addAdvanceInvoiceEntry(clinic.id, {
        id: Math.random().toString(36),
        ...data,
        doctorId: data.doctorId || null,
        thirdPartyCode: data.thirdPartyCode || null,
        thirdPartyName: data.thirdPartyName || null,
      })
      toast.success('Fatura de adiantamento guardada com sucesso!')
      form.reset({
        date: data.date,
        patientName: '',
        code: '',
        doctorId: '',
        billedToThirdParty: false,
        thirdPartyCode: '',
        thirdPartyName: '',
        value: 0,
      })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar fatura de adiantamento')
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

        <Button type="submit" className="w-full">
          Guardar Fatura de Adiantamento
        </Button>
      </form>
    </Form>
  )
}
