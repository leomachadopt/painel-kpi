import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
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
  planPresentedValue: z.coerce.number().min(0).optional(),
  planAccepted: z.boolean(),
  planAcceptedAt: z.string().optional(),
  planValue: z.coerce.number().min(0).optional(),
  // Source fields
  sourceId: z.string().optional(),
  isReferral: z.boolean(),
  referralName: z.string().optional(),
  referralCode: z.string().optional(),
  campaignId: z.string().optional(),
  // Doctor field
  doctorId: z.string().optional(),
  // Plan not eligible
  planNotEligible: z.boolean(),
  planNotEligibleAt: z.string().optional(),
  planNotEligibleReason: z.string().optional(),
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
      planPresentedValue: 0,
      planAccepted: false,
      planAcceptedAt: '',
      planValue: 0,
      sourceId: '',
      isReferral: false,
      referralName: '',
      referralCode: '',
      campaignId: '',
      doctorId: '',
      planNotEligible: false,
      planNotEligibleAt: '',
      planNotEligibleReason: '',
    },
  })

  const code = form.watch('code')
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
            planPresentedValue: entry.planPresentedValue ?? 0,
            planAccepted: !!entry.planAccepted,
            planAcceptedAt: toDateInput(entry.planAcceptedAt),
            planValue: entry.planValue ?? 0,
            sourceId: entry.sourceId || '',
            isReferral: entry.isReferral || false,
            referralName: entry.referralName || '',
            referralCode: entry.referralCode || '',
            campaignId: entry.campaignId || '',
            doctorId: entry.doctorId || '',
            planNotEligible: !!entry.planNotEligible,
            planNotEligibleAt: toDateInput(entry.planNotEligibleAt),
            planNotEligibleReason: entry.planNotEligibleReason || '',
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
            form.setValue('planPresentedValue', 0)
            form.setValue('planAccepted', false)
            form.setValue('planAcceptedAt', '')
            form.setValue('planValue', 0)
            form.setValue('sourceId', '')
            form.setValue('isReferral', false)
            form.setValue('referralName', '')
            form.setValue('referralCode', '')
            form.setValue('campaignId', '')
            form.setValue('doctorId', '')
            form.setValue('planNotEligible', false)
            form.setValue('planNotEligibleAt', '')
            form.setValue('planNotEligibleReason', '')
            return
          }
          toast.error(err?.message || 'Erro ao carregar 1.ª consulta')
        })
        .finally(() => setLookupLoading(false))
    }, 350)

    return () => clearTimeout(t)
  }, [code, clinic.id, form, loadedCode])

  const onSubmit = async (data: z.infer<typeof schema>) => {
    // Validate conditional fields for referral
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

    // Validate plan not eligible reason
    if (data.planNotEligible && (!data.planNotEligibleReason || data.planNotEligibleReason.trim() === '')) {
      form.setError('planNotEligibleReason', {
        message: 'Justificativa obrigatória quando plano não-elegível',
      })
      return
    }

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
        planPresentedValue: data.planPresentedValue ?? 0,
        planAccepted: data.planAccepted,
        planAcceptedAt: data.planAccepted ? data.planAcceptedAt || null : null,
        planValue: data.planValue ?? 0,
        sourceId: data.sourceId || null,
        isReferral: data.isReferral || isReferralSource,
        referralName: data.referralName || null,
        referralCode: data.referralCode || null,
        campaignId: data.campaignId || null,
        doctorId: data.doctorId || null,
        planNotEligible: data.planNotEligible,
        planNotEligibleAt: data.planNotEligible ? data.planNotEligibleAt || null : null,
        planNotEligibleReason: data.planNotEligible ? data.planNotEligibleReason || null : null,
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
        planPresentedValue: 0,
        planAccepted: false,
        planAcceptedAt: '',
        planValue: 0,
        sourceId: '',
        isReferral: false,
        referralName: '',
        referralCode: '',
        campaignId: '',
        doctorId: '',
        planNotEligible: false,
        planNotEligibleAt: '',
        planNotEligibleReason: '',
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

        {/* Source fields */}
        <FormField
          control={form.control}
          name="sourceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fonte de Chegada</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fonte (opcional)" />
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

        {/* Doctor field */}
        <FormField
          control={form.control}
          name="doctorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Médico Responsável</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o médico (opcional)" />
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
                  <>
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
                    <FormField
                      control={form.control}
                      name="planPresentedValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Valor previsto do plano (€)
                          </FormLabel>
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
                  </>
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
                  <>
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
                    <FormField
                      control={form.control}
                      name="planValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Valor final do plano aceite (€)
                          </FormLabel>
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
                  </>
                )}
              </div>
            )}
          />
        </div>

        {/* Plan Not Eligible Section - Outside the plan stages box */}
        <div className="flex flex-col gap-4 p-4 border rounded-md bg-amber-50/50">
          <FormField
            control={form.control}
            name="planNotEligible"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel className="font-semibold">Plano Não-Elegível</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => {
                        field.onChange(v)
                        if (v) {
                          const current = form.getValues('planNotEligibleAt')
                          form.setValue('planNotEligibleAt', current || today, { shouldValidate: true })
                        } else {
                          form.setValue('planNotEligibleAt', '', { shouldValidate: true })
                          form.setValue('planNotEligibleReason', '', { shouldValidate: true })
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
                {form.watch('planNotEligible') && (
                  <>
                    <FormField
                      control={form.control}
                      name="planNotEligibleAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Data de marcação como não-elegível
                          </FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="planNotEligibleReason"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            Justificativa <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Descreva o motivo pelo qual o paciente não é elegível..."
                              className="min-h-[80px]"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>
            )}
          />
        </div>

        <Button type="submit" className="w-full">
          Lançar Consulta
        </Button>
      </form>
    </Form>
  )
}
