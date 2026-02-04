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
import { DailyConsultationEntry, Clinic, FirstConsultationType, FirstConsultationTypeProcedure } from '@/lib/types'
import { PatientCodeInput } from '@/components/PatientCodeInput'
import useDataStore from '@/stores/useDataStore'
import { configApi } from '@/services/api'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

const schema = z.object({
  date: z.string(),
  patientName: z.string().min(1, 'Nome obrigatório'),
  code: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
  consultationTypeId: z.string().optional(),
  consultationCompleted: z.boolean(),
  consultationCompletedAt: z.string().optional(),
  completedProcedures: z.record(z.string(), z.object({
    completed: z.boolean(),
    justification: z.string().optional(),
  })).optional().nullable(),
  planCreated: z.boolean(),
  planCreatedAt: z.string().optional(),
  planPresented: z.boolean(),
  planPresentedAt: z.string().optional(),
  planPresentedValue: z.coerce.number().min(0).optional(),
  planAccepted: z.boolean(),
  planAcceptedAt: z.string().optional(),
  planValue: z.coerce.number().min(0).optional(),
  sourceId: z.string().optional(),
  isReferral: z.boolean(),
  referralName: z.string().optional(),
  referralCode: z.string().optional(),
  campaignId: z.string().optional(),
  doctorId: z.string().optional(),
  planNotEligible: z.boolean(),
  planNotEligibleAt: z.string().optional(),
  planNotEligibleReason: z.string().optional(),
})

interface EditConsultationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DailyConsultationEntry | null
  clinic: Clinic
  onSuccess?: () => void
}

export function EditConsultationDialog({
  open,
  onOpenChange,
  entry,
  clinic,
  onSuccess,
}: EditConsultationDialogProps) {
  const { updateConsultationEntry } = useDataStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [consultationTypes, setConsultationTypes] = useState<FirstConsultationType[]>([])
  const [procedures, setProcedures] = useState<FirstConsultationTypeProcedure[]>([])
  const [proceduresLoading, setProceduresLoading] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: '',
      patientName: '',
      code: '',
      consultationTypeId: '',
      consultationCompleted: false,
      consultationCompletedAt: '',
      completedProcedures: {},
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

  const watchedSourceId = form.watch('sourceId')
  const watchedConsultationTypeId = form.watch('consultationTypeId')
  const watchedConsultationCompleted = form.watch('consultationCompleted')
  const selectedSource = clinic.configuration.sources.find(
    (s) => s.id === watchedSourceId,
  )
  const isReferralSource = selectedSource?.name === 'Referência'
  const isPaidAds =
    selectedSource?.name === 'Google Ads' || selectedSource?.name === 'Meta Ads'

  // Load consultation types on mount
  useEffect(() => {
    configApi.consultationTypes
      .getAll(clinic.id)
      .then((types) => {
        setConsultationTypes(types.filter((t) => t.active))
      })
      .catch((err) => {
        console.error('Erro ao carregar tipos de consulta:', err)
      })
  }, [clinic.id])

  // Load procedures when consultation type changes
  useEffect(() => {
    if (!watchedConsultationTypeId) {
      setProcedures([])
      return
    }

    setProceduresLoading(true)
    configApi.procedures
      .getAll(clinic.id, watchedConsultationTypeId)
      .then((procs) => {
        setProcedures(procs.sort((a, b) => a.displayOrder - b.displayOrder))
      })
      .catch((err) => {
        console.error('Erro ao carregar procedimentos:', err)
      })
      .finally(() => {
        setProceduresLoading(false)
      })
  }, [watchedConsultationTypeId, clinic.id])

  // Preencher formulário quando entry mudar
  useEffect(() => {
    if (entry && open) {
      const toDateInput = (isoDate: string | null | undefined) => {
        if (!isoDate) return ''
        return isoDate.split('T')[0]
      }

      // Pequeno delay para garantir que o modal está completamente montado
      setTimeout(() => {
        console.log('📥 Carregando entry:', {
          consultationTypeId: entry.consultationTypeId,
          consultationCompleted: entry.consultationCompleted,
          completedProcedures: entry.completedProcedures,
        })

        form.reset({
          date: toDateInput(entry.date),
          patientName: entry.patientName,
          code: entry.code,
          consultationTypeId: entry.consultationTypeId || '',
          consultationCompleted: !!entry.consultationCompleted,
          consultationCompletedAt: toDateInput(entry.consultationCompletedAt),
          completedProcedures: entry.completedProcedures || {},
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
        })
      }, 0)
    } else if (!open) {
      // Limpar formulário quando modal fecha
      form.reset({
        date: '',
        patientName: '',
        code: '',
        consultationTypeId: '',
        consultationCompleted: false,
        consultationCompletedAt: '',
        completedProcedures: {},
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
    }
  }, [entry, open, form])

  // Auto-check referral if source is "Referência"
  useEffect(() => {
    if (isReferralSource) {
      form.setValue('isReferral', true)
    }
  }, [isReferralSource, form])

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

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!entry) return

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

    // Validate plan value if accepted
    if (data.planAccepted && (!data.planValue || data.planValue <= 0)) {
      form.setError('planValue', {
        message: 'Valor obrigatório quando plano é aceito',
      })
      return
    }

    // Validate plan not eligible reason
    if (data.planNotEligible && (!data.planNotEligibleReason || data.planNotEligibleReason.trim() === '')) {
      form.setError('planNotEligibleReason', {
        message: 'Justificativa obrigatória quando plano não-elegível',
      })
      return
    }

    setIsSubmitting(true)
    try {
      // Preserve completedProcedures if it exists and has data
      const proceduresToSave = data.completedProcedures && Object.keys(data.completedProcedures).length > 0
        ? data.completedProcedures
        : entry.completedProcedures || null

      console.log('📝 Salvando consulta:', {
        consultationCompleted: data.consultationCompleted,
        completedProceduresFromForm: data.completedProcedures,
        completedProceduresFromEntry: entry.completedProcedures,
        proceduresToSave,
      })

      await updateConsultationEntry(clinic.id, entry.id, {
        id: entry.id,
        date: data.date,
        patientName: data.patientName,
        code: data.code,
        consultationTypeId: data.consultationTypeId || null,
        consultationCompleted: data.consultationCompleted,
        consultationCompletedAt: data.consultationCompleted ? data.consultationCompletedAt || null : null,
        completedProcedures: proceduresToSave,
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
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      // Erro já é tratado na store
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar 1.ª Consulta</DialogTitle>
          <DialogDescription>
            Atualize os dados da primeira consulta do paciente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data (1.ª consulta)</FormLabel>
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

            {/* Consultation Type Section */}
            <div className="rounded-md border p-4 bg-green-50/50">
              <h4 className="text-sm font-semibold text-green-800 mb-3">
                Informação da Consulta
              </h4>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="consultationTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Consulta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {consultationTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.name}
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
                  name="consultationCompleted"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel>Consulta Realizada?</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(v) => {
                            field.onChange(v)
                            if (v && !form.getValues('consultationCompletedAt')) {
                              const today = new Date().toISOString().split('T')[0]
                              form.setValue('consultationCompletedAt', today, { shouldValidate: true })
                            } else if (!v) {
                              form.setValue('consultationCompletedAt', '', { shouldValidate: true })
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {form.watch('consultationCompleted') && (
                  <FormField
                    control={form.control}
                    name="consultationCompletedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Data de Realização
                        </FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}

                {/* Procedures Section */}
                {watchedConsultationCompleted && watchedConsultationTypeId && (
                  <div className="mt-4 space-y-3">
                    <h5 className="text-sm font-semibold text-green-800">Procedimentos</h5>
                    {proceduresLoading ? (
                      <p className="text-sm text-muted-foreground">Carregando procedimentos...</p>
                    ) : procedures.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum procedimento configurado para este tipo de consulta.</p>
                    ) : (
                      <>
                        {procedures.map((procedure) => {
                          const procedureData = form.watch('completedProcedures')?.[procedure.id]
                          const isCompleted = procedureData?.completed === true
                          const hasSelection = procedureData !== undefined && typeof procedureData.completed === 'boolean'

                          return (
                            <div
                              key={procedure.id}
                              className="space-y-3 p-3 border rounded-md bg-white"
                            >
                              <div className="flex flex-col gap-2">
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{procedure.name}</p>
                                  {procedure.description && (
                                    <p className="text-xs text-muted-foreground">{procedure.description}</p>
                                  )}
                                </div>
                                <RadioGroup
                                  value={hasSelection ? (isCompleted ? 'completed' : 'not-completed') : ''}
                                  onValueChange={(value) => {
                                    const current = form.getValues('completedProcedures') || {}
                                    const completed = value === 'completed'
                                    form.setValue('completedProcedures', {
                                      ...current,
                                      [procedure.id]: {
                                        completed,
                                        justification: completed ? '' : (current[procedure.id]?.justification || ''),
                                      },
                                    })
                                  }}
                                  className="flex gap-4"
                                >
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="completed" id={`${procedure.id}-completed`} />
                                    <Label htmlFor={`${procedure.id}-completed`} className="cursor-pointer text-sm font-normal">
                                      Realizado
                                    </Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="not-completed" id={`${procedure.id}-not-completed`} />
                                    <Label htmlFor={`${procedure.id}-not-completed`} className="cursor-pointer text-sm font-normal">
                                      Não Realizado
                                    </Label>
                                  </div>
                                </RadioGroup>
                              </div>
                              {hasSelection && !isCompleted && (
                                <Textarea
                                  placeholder="Justificativa para procedimento não realizado..."
                                  value={procedureData?.justification || ''}
                                  onChange={(e) => {
                                    const current = form.getValues('completedProcedures') || {}
                                    form.setValue('completedProcedures', {
                                      ...current,
                                      [procedure.id]: {
                                        completed: false,
                                        justification: e.target.value,
                                      },
                                    })
                                  }}
                                  className="min-h-[60px] text-sm"
                                />
                              )}
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Conditional Campaign Field */}
            {isPaidAds && (
              <div className="rounded-md border p-4 bg-muted/20">
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
              <div className="space-y-4 rounded-md border p-4 bg-blue-50/50">
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

