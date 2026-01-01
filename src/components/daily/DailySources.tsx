import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
  patientName: z.string().min(1, 'Nome obrigatório'),
  code: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
  isReferral: z.boolean(),
  sourceId: z.string().min(1, 'Selecione uma fonte'),
  referralName: z.string().optional(),
  referralCode: z.string().optional(),
  campaignId: z.string().optional(),
})

export function DailySources({ clinic }: { clinic: Clinic }) {
  const { addSourceEntry } = useDataStore()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      patientName: '',
      code: '',
      isReferral: false,
      sourceId: '',
      referralName: '',
      referralCode: '',
      campaignId: '',
    },
  })

  const watchedSourceId = form.watch('sourceId')

  const selectedSource = clinic.configuration.sources.find(
    (s) => s.id === watchedSourceId,
  )
  const isReferralSource = selectedSource?.name === 'Indicação'
  const isPaidAds =
    selectedSource?.name === 'Google Ads' || selectedSource?.name === 'Meta Ads'

  useEffect(() => {
    // Auto-check referral if source is "Indicação"
    if (isReferralSource) {
      form.setValue('isReferral', true)
    }
  }, [isReferralSource, form])

  const onSubmit = (data: z.infer<typeof schema>) => {
    // Validate conditional fields
    if (isReferralSource) {
      if (!data.referralName || !data.referralCode) {
        form.setError('referralName', {
          message: 'Obrigatório para indicação',
        })
        form.setError('referralCode', {
          message: 'Obrigatório para indicação',
        })
        return
      }
    }

    ;(async () => {
      try {
        await addSourceEntry(clinic.id, {
          id: Math.random().toString(36),
          ...data,
        })
        toast.success('Fonte registada com sucesso!')
        form.reset({
          date: data.date,
          patientName: '',
          code: '',
          isReferral: false,
          sourceId: '',
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
          name="sourceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fonte de Chegada</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
              Dados da Indicação
            </h4>
            <FormField
              control={form.control}
              name="referralName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Indicador</FormLabel>
                  <FormControl>
                    <Input placeholder="Quem indicou?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referralCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código do Indicador</FormLabel>
                  <FormControl>
                    <Input placeholder="ID" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="isReferral"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Marcar como Indicação?
                </FormLabel>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={isReferralSource} // Forced check if source is Referral
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Lançar Fonte
        </Button>
      </form>
    </Form>
  )
}
