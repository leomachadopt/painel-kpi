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
import useDataStore from '@/stores/useDataStore'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'
import { useEffect } from 'react'

const schema = z.object({
  date: z.string(),
  sourceId: z.string().min(1, 'Selecione uma fonte'),
  isReferral: z.boolean(),
  referralName: z.string().optional(),
  referralCode: z.string().optional(),
  campaignId: z.string().optional(),
  // Campos gerados automaticamente (não usados no form)
  patientName: z.string().optional(),
  code: z.string().optional(),
})

export function DailySources({ clinic }: { clinic: Clinic }) {
  const { addSourceEntry } = useDataStore()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      sourceId: '',
      isReferral: false,
      referralName: '',
      referralCode: '',
      campaignId: '',
    },
  })

  const watchedSourceId = form.watch('sourceId')

  const selectedSource = clinic.configuration.sources.find(
    (s) => s.id === watchedSourceId,
  )
  const isReferralSource = selectedSource?.name === 'Referência'
  const isPaidAds =
    selectedSource?.name === 'Google Ads' || selectedSource?.name === 'Meta Ads'

  useEffect(() => {
    // Auto-check referral if source is "Referência"
    if (isReferralSource) {
      form.setValue('isReferral', true)
    }
  }, [isReferralSource, form])

  const onSubmit = (data: z.infer<typeof schema>) => {
    // Validate conditional fields
    if (isReferralSource) {
      if (!data.referralName || !data.referralCode) {
        form.setError('referralName', {
          message: 'Obrigatório para referência',
        })
        form.setError('referralCode', {
          message: 'Obrigatório para referência',
        })
        return
      }
    }

    ;(async () => {
      try {
        // Source tracking: only track referral patient (who indicated), not the new patient
        const entryData = {
          id: Math.random().toString(36),
          date: data.date,
          sourceId: data.sourceId,
          isReferral: data.isReferral || isReferralSource,
          referralName: data.referralName || null,
          referralCode: data.referralCode || null,
          campaignId: data.campaignId || null,
          patientName: null, // New patient name not needed for source tracking
          code: null, // New patient code not needed
        }

        await addSourceEntry(clinic.id, entryData)
        toast.success('Fonte registada com sucesso!')
        form.reset({
          date: data.date,
          sourceId: '',
          isReferral: false,
          referralName: '',
          referralCode: '',
          campaignId: '',
        })
      } catch (err: any) {
        toast.error(err?.message || 'Erro ao guardar fonte')
      }
    })()
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

        <FormField
          control={form.control}
          name="sourceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fonte de Chegada</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fonte" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clinic.configuration.sources.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Conditional Campaign Field */}
        {isPaidAds && (
          <div className="rounded-md border p-4 bg-muted/20 animate-fade-in">
            <FormField
              control={form.control}
              name="campaignId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campanha (Ads)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a campanha" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clinic.configuration.campaigns.map((c) => (
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
        )}

        {/* Conditional Referral Fields */}
        {isReferralSource && (
          <div className="space-y-4 rounded-md border p-4 bg-blue-50/50 animate-fade-in">
            <h4 className="text-sm font-semibold text-blue-800">
              Paciente que fez a referência
            </h4>
            <PatientCodeInput
              clinicId={clinic.id}
              value={form.watch('referralCode') || ''}
              onCodeChange={(c) =>
                form.setValue('referralCode', c, { shouldValidate: true })
              }
              patientName={form.watch('referralName') || ''}
              onPatientNameChange={(n) =>
                form.setValue('referralName', n, { shouldValidate: true })
              }
              label="Código do Paciente"
              codeError={form.formState.errors.referralCode?.message}
              patientNameError={form.formState.errors.referralName?.message}
            />
          </div>
        )}

        <Button type="submit" className="w-full">
          Lançar Fonte
        </Button>
      </form>
    </Form>
  )
}
