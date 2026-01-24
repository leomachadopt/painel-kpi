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
} from '@/components/ui/form'
import useDataStore from '@/stores/useDataStore'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'
import { useTranslation } from '@/hooks/useTranslation'

const schema = z.object({
  date: z.string(),
  patientName: z.string().min(1, 'Nome obrigatório'),
  code: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
  doctorId: z.string().min(1),
  scheduledTime: z.string(),
  actualStartTime: z.string(),
  delayReason: z.enum(['paciente', 'medico']).optional(),
})

export function DailyServiceTime({ clinic }: { clinic: Clinic }) {
  const { t } = useTranslation()
  const { addServiceTimeEntry } = useDataStore()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      patientName: '',
      code: '',
      doctorId: '',
      scheduledTime: '09:00',
      actualStartTime: '09:00',
    },
  })

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      await addServiceTimeEntry(clinic.id, {
        id: Math.random().toString(36),
        ...data,
      })
      toast.success('Tempo de atendimento registado!')
      form.reset({
        date: data.date,
        patientName: '',
        code: '',
        doctorId: '',
        scheduledTime: '09:00',
        actualStartTime: '09:00',
      })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar atendimento')
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
              <FormLabel>{t('forms.date')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
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
              <FormLabel>{t('forms.doctor')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('forms.select')} />
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
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="scheduledTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forms.scheduledTime')}</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="actualStartTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forms.actualStartTime')}</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="delayReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.delayReason')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('forms.delayReasonNone')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="paciente">{t('forms.delayReasonPatient')}</SelectItem>
                  <SelectItem value="medico">{t('forms.delayReasonDoctor')}</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {t('forms.submitServiceTime')}
        </Button>
      </form>
    </Form>
  )
}
