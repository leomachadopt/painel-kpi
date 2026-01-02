import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
import { PatientCodeInput } from '@/components/PatientCodeInput'
import { dailyEntriesApi } from '@/services/api'

const schema = z.object({
  date: z.string(),
  patientName: z.string().min(1, 'Nome obrigatório'),
  code: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
  planCreated: z.boolean(),
  planCreatedAt: z.string().optional(),
  planPresented: z.boolean(),
  planPresentedAt: z.string().optional(),
  planAccepted: z.boolean(),
  planAcceptedAt: z.string().optional(),
  planValue: z.coerce.number().min(0),
})

export function DailyConsultations({ clinic }: { clinic: Clinic }) {
  const { addConsultationEntry } = useDataStore()
  const [lookupLoading, setLookupLoading] = useState(false)
  const [loadedCode, setLoadedCode] = useState<string | null>(null)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      patientName: '',
      code: '',
      planCreated: false,
      planCreatedAt: '',
      planPresented: false,
      planPresentedAt: '',
      planAccepted: false,
      planAcceptedAt: '',
      planValue: 0,
    },
  })

  const code = form.watch('code')

  // Revisit / preload consultation entry by patient code (unique record)
  useEffect(() => {
    if (!/^\d{1,6}$/.test(code)) {
      setLoadedCode(null)
      return
    }
    if (loadedCode === code) return

    const t = setTimeout(() => {
      setLookupLoading(true)
      setLoadedCode(code)

      dailyEntriesApi.consultation
        .getByCode(clinic.id, code)
        .then((entry) => {
          // Convert ISO date strings to yyyy-MM-dd format for date inputs
          const toDateInput = (isoDate: string | null | undefined) => {
            if (!isoDate) return ''
            return isoDate.split('T')[0]
          }

          const formData = {
            date: toDateInput(entry.date),
            patientName: entry.patientName,
            code: entry.code,
            planCreated: !!entry.planCreated,
            planCreatedAt: toDateInput(entry.planCreatedAt),
            planPresented: !!entry.planPresented,
            planPresentedAt: toDateInput(entry.planPresentedAt),
            planAccepted: !!entry.planAccepted,
            planAcceptedAt: toDateInput(entry.planAcceptedAt),
            planValue: entry.planValue ?? 0,
          }
          form.reset(formData)
        })
        .catch((err: any) => {
          // Not found: start a fresh record for this patient/code
          if (err?.message?.includes('404') || err?.message?.includes('not found')) {
            const today = new Date().toISOString().split('T')[0]
            form.setValue('date', today, { shouldValidate: true })
            form.setValue('planCreated', false)
            form.setValue('planCreatedAt', '')
            form.setValue('planPresented', false)
            form.setValue('planPresentedAt', '')
            form.setValue('planAccepted', false)
            form.setValue('planAcceptedAt', '')
            form.setValue('planValue', 0)
            return
          }
          toast.error(err?.message || 'Erro ao carregar 1.ª consulta')
        })
        .finally(() => setLookupLoading(false))
    }, 350)

    return () => clearTimeout(t)
  }, [code, clinic.id, form, loadedCode])

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const id = `consultation-${clinic.id}-${data.code}`
      await addConsultationEntry(clinic.id, {
        id,
        date: data.date,
        patientName: data.patientName,
        code: data.code,
        planCreated: data.planCreated,
        planCreatedAt: data.planCreated ? data.planCreatedAt || null : null,
        planPresented: data.planPresented,
        planPresentedAt: data.planPresented ? data.planPresentedAt || null : null,
        planAccepted: data.planAccepted,
        planAcceptedAt: data.planAccepted ? data.planAcceptedAt || null : null,
        planValue: data.planValue,
      })
      toast.success('1.ª consulta guardada!')
      setLoadedCode(null)
      form.reset({
        date: data.date,
        patientName: '',
        code: '',
        planCreated: false,
        planCreatedAt: '',
        planPresented: false,
        planPresentedAt: '',
        planAccepted: false,
        planAcceptedAt: '',
        planValue: 0,
      })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar 1.ª consulta')
    }
  }

  const today = new Date().toISOString().split('T')[0]

  const toggleWithDate = (
    boolField: 'planCreated' | 'planPresented' | 'planAccepted',
    dateField: 'planCreatedAt' | 'planPresentedAt' | 'planAcceptedAt',
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
              <FormLabel>Data (1.ª consulta)</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className={lookupLoading ? 'opacity-70 pointer-events-none' : ''}>
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
        </div>

        <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
          <FormField
            control={form.control}
            name="planCreated"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Plano Criado?</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('planCreated', 'planCreatedAt', v)}
                    />
                  </FormControl>
                </FormItem>
                {form.watch('planCreated') && (
                  <FormField
                    control={form.control}
                    name="planCreatedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Data de criação do plano
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
            name="planPresented"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Plano Apresentado?</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) =>
                        toggleWithDate('planPresented', 'planPresentedAt', v)
                      }
                    />
                  </FormControl>
                </FormItem>
                {form.watch('planPresented') && (
                  <FormField
                    control={form.control}
                    name="planPresentedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Data de apresentação do plano
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
            name="planAccepted"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Plano Aceite?</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('planAccepted', 'planAcceptedAt', v)}
                    />
                  </FormControl>
                </FormItem>
                {form.watch('planAccepted') && (
                  <FormField
                    control={form.control}
                    name="planAcceptedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Data de aceite do plano
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

        <FormField
          control={form.control}
          name="planValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor do Plano (€)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  onFocus={(e) => e.target.select()}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Lançar Consulta
        </Button>
      </form>
    </Form>
  )
}
