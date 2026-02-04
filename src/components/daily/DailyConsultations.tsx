import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertCircle, XCircle } from 'lucide-react'
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
import { Clinic, FirstConsultationType, FirstConsultationTypeProcedure } from '@/lib/types'
import { PatientCodeInput } from '@/components/PatientCodeInput'
import { dailyEntriesApi, configApi } from '@/services/api'
import { useTranslation } from '@/hooks/useTranslation'

const createSchema = (t: (key: string) => string) => z.object({
  date: z.string(),
  patientName: z.string().min(1, t('forms.nameRequired')),
  code: z.string().regex(/^\d{1,6}$/, t('forms.codeInvalid')),
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
  const { t } = useTranslation()
  const { addConsultationEntry } = useDataStore()
  const [lookupLoading, setLookupLoading] = useState(false)
  const [loadedCode, setLoadedCode] = useState<string | null>(null)
  const [consultationTypes, setConsultationTypes] = useState<FirstConsultationType[]>([])
  const [procedures, setProcedures] = useState<FirstConsultationTypeProcedure[]>([])
  const [proceduresLoading, setProceduresLoading] = useState(false)
  const [showValidationErrors, setShowValidationErrors] = useState(false)
  const [showValidationDialog, setShowValidationDialog] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    incompleteProcedures: string[]
    proceduresWithoutJustification: string[]
  }>({ incompleteProcedures: [], proceduresWithoutJustification: [] })

  const schema = createSchema(t)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
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

  const code = form.watch('code')
  const watchedSourceId = form.watch('sourceId')
  const watchedConsultationTypeId = form.watch('consultationTypeId')
  const watchedConsultationCompleted = form.watch('consultationCompleted')
  const selectedSource = clinic.configuration.sources.find(
    (s) => s.id === watchedSourceId,
  )
  const isReferralSource = selectedSource?.name === 'Referência'
  const isPaidAds =
    selectedSource?.name === 'Google Ads' || selectedSource?.name === 'Meta Ads'

  // Load consultation types on component mount
  useEffect(() => {
    configApi.consultationTypes
      .getAll(clinic.id)
      .then((types) => {
        setConsultationTypes(types.filter((t) => t.active))
      })
      .catch((err) => {
        console.error('Erro ao carregar tipos de consulta:', err)
        toast.error('Erro ao carregar tipos de consulta')
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

        // Keep existing completedProcedures but don't initialize new ones
        // This ensures radio buttons start unselected for new procedures
        const currentCompleted = form.getValues('completedProcedures') || {}
        const newCompleted: any = {}
        procs.forEach((proc) => {
          // Only keep if already has a selection
          if (currentCompleted[proc.id]) {
            newCompleted[proc.id] = currentCompleted[proc.id]
          }
        })
        form.setValue('completedProcedures', newCompleted)
      })
      .catch((err) => {
        console.error('Erro ao carregar procedimentos:', err)
        toast.error('Erro ao carregar procedimentos')
      })
      .finally(() => {
        setProceduresLoading(false)
      })
  }, [watchedConsultationTypeId, clinic.id, form])

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
          }
          form.reset(formData)
        })
        .catch((err: any) => {
          // Not found: start a fresh record for this patient/code
          if (err?.message?.includes('404') || err?.message?.includes('not found')) {
            const today = new Date().toISOString().split('T')[0]
            form.setValue('date', today, { shouldValidate: true })
            form.setValue('consultationTypeId', '')
            form.setValue('consultationCompleted', false)
            form.setValue('consultationCompletedAt', '')
            form.setValue('completedProcedures', {})
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
          toast.error(err?.message || `${t('forms.errorLoading')} 1.ª consulta`)
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
          message: t('forms.referralRequired'),
        })
        form.setError('referralCode', {
          message: t('forms.referralRequired'),
        })
        return
      }
    }

    // Validate consultation completed
    if (data.consultationCompleted) {
      if (!data.consultationTypeId) {
        toast.error(t('forms.selectConsultationTypeFirst'))
        return
      }

      // Validate that all procedures are filled
      const completedProcs = data.completedProcedures || {}
      const incompleteProcedures: string[] = []
      const proceduresWithoutJustification: string[] = []

      procedures.forEach((proc) => {
        const procData = completedProcs[proc.id] as { completed: boolean; justification?: string } | undefined

        // Check if procedure was not filled at all
        if (!procData || typeof procData.completed !== 'boolean') {
          incompleteProcedures.push(proc.name)
          return
        }

        // If marked as not completed, must have justification
        if (!procData.completed && (!procData.justification || procData.justification.trim() === '')) {
          proceduresWithoutJustification.push(proc.name)
        }
      })

      if (incompleteProcedures.length > 0 || proceduresWithoutJustification.length > 0) {
        setShowValidationErrors(true)
        setValidationErrors({
          incompleteProcedures,
          proceduresWithoutJustification,
        })
        setShowValidationDialog(true)

        return
      }
    }

    // Clear validation errors if we got past all validations
    setShowValidationErrors(false)
    setValidationErrors({ incompleteProcedures: [], proceduresWithoutJustification: [] })

    // Validate plan not eligible reason
    if (data.planNotEligible && (!data.planNotEligibleReason || data.planNotEligibleReason.trim() === '')) {
      form.setError('planNotEligibleReason', {
        message: t('forms.planNotEligibleReasonRequired'),
      })
      return
    }

    try {
      const id = `consultation-${clinic.id}-${data.code}`

      // Set consultationCompletedAt if marking as completed
      const consultationCompletedAt = data.consultationCompleted
        ? data.consultationCompletedAt || new Date().toISOString()
        : null

      await addConsultationEntry(clinic.id, {
        id,
        date: data.date,
        patientName: data.patientName,
        code: data.code,
        consultationTypeId: data.consultationTypeId || null,
        consultationCompleted: data.consultationCompleted,
        consultationCompletedAt,
        completedProcedures: data.consultationCompleted ? data.completedProcedures || null : null,
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
      toast.success(`1.ª consulta ${t('forms.successSaving')}`)
      setLoadedCode(null)
      form.reset({
        date: data.date,
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
    } catch (err: any) {
      toast.error(err?.message || `${t('forms.errorSaving')} 1.ª consulta`)
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
    <>
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
              <FormLabel>{t('forms.dateFirstConsultation')}</FormLabel>
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
            label={t('forms.code')}
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
              <FormLabel>{t('forms.source')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('forms.selectSource')} />
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
              <FormLabel>{t('forms.doctor')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('forms.selectDoctor')} />
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
                  <FormLabel>{t('forms.campaign')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('forms.selectCampaign')} />
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
              {t('forms.referralPatient')}
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

        {/* Consultation Completed Section */}
        <div className="flex flex-col gap-4 p-4 border rounded-md bg-green-50/50">
          <FormField
            control={form.control}
            name="consultationTypeId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('forms.consultationType')}</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={t('forms.selectTypeOptional')} />
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
                <FormLabel>{t('forms.consultationCompleted')}</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(v) => {
                      field.onChange(v)
                      if (v && !form.getValues('consultationCompletedAt')) {
                        form.setValue('consultationCompletedAt', today, { shouldValidate: true })
                      } else if (!v) {
                        form.setValue('consultationCompletedAt', '', { shouldValidate: true })
                      }
                    }}
                    disabled={!watchedConsultationTypeId}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {watchedConsultationCompleted && watchedConsultationTypeId && (
            <div className="space-y-3 mt-2 animate-fade-in">
              {proceduresLoading ? (
                <p className="text-sm text-muted-foreground">Carregando procedimentos...</p>
              ) : procedures.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum procedimento configurado para este tipo de consulta.</p>
              ) : (
                <>
                  {(() => {
                    const completedProcedures = form.watch('completedProcedures') || {}
                    const totalProcedures = procedures.length
                    const filledProcedures = procedures.filter(proc => {
                      const procData = completedProcedures[proc.id]
                      return procData !== undefined && typeof procData.completed === 'boolean'
                    }).length
                    const hasIncomplete = filledProcedures < totalProcedures

                    return (
                      <>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-green-800">Procedimentos</h4>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            hasIncomplete
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {filledProcedures}/{totalProcedures}
                          </span>
                        </div>
                        {hasIncomplete && (
                          <Alert variant="default" className="bg-yellow-50 border-yellow-200">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-800 text-sm">
                              Preencha todos os procedimentos antes de salvar a consulta
                            </AlertDescription>
                          </Alert>
                        )}
                      </>
                    )
                  })()}
                  {procedures.map((procedure) => {
                    const procedureData = form.watch('completedProcedures')?.[procedure.id]
                    const isCompleted = procedureData?.completed === true
                    const hasSelection = procedureData !== undefined && typeof procedureData.completed === 'boolean'
                    const isIncomplete = showValidationErrors && !hasSelection
                    const needsJustification = showValidationErrors && hasSelection && !isCompleted && (!procedureData?.justification || procedureData.justification.trim() === '')

                    return (
                      <div
                        key={procedure.id}
                        className={`space-y-3 p-3 border rounded-md bg-white transition-all ${
                          isIncomplete || needsJustification
                            ? 'border-red-400 bg-red-50 shadow-md'
                            : ''
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className={`text-sm font-medium ${isIncomplete || needsJustification ? 'text-red-700' : ''}`}>
                                {procedure.name}
                              </p>
                              {procedure.description && (
                                <p className="text-xs text-muted-foreground">{procedure.description}</p>
                              )}
                            </div>
                            {(isIncomplete || needsJustification) && (
                              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          {isIncomplete && (
                            <p className="text-xs text-red-600 font-medium">
                              ⚠️ Selecione "Realizado" ou "Não Realizado"
                            </p>
                          )}
                          {needsJustification && (
                            <p className="text-xs text-red-600 font-medium">
                              ⚠️ Preencha a justificativa
                            </p>
                          )}
                          <RadioGroup
                            value={hasSelection ? (isCompleted ? 'completed' : 'not-completed') : ''}
                            onValueChange={(value) => {
                              // Clear validation errors when user interacts
                              if (showValidationErrors) {
                                setShowValidationErrors(false)
                                setValidationErrors({ incompleteProcedures: [], proceduresWithoutJustification: [] })
                              }
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
                              // Clear validation errors when user types
                              if (showValidationErrors) {
                                setShowValidationErrors(false)
                                setValidationErrors({ incompleteProcedures: [], proceduresWithoutJustification: [] })
                              }
                              const current = form.getValues('completedProcedures') || {}
                              form.setValue('completedProcedures', {
                                ...current,
                                [procedure.id]: {
                                  completed: false,
                                  justification: e.target.value,
                                },
                              })
                            }}
                            className={`min-h-[60px] text-sm ${needsJustification ? 'border-red-400 focus:border-red-500' : ''}`}
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

        <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
          <FormField
            control={form.control}
            name="planCreated"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>{t('forms.planCreated')}</FormLabel>
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
                  <FormLabel>{t('forms.planPresented')}</FormLabel>
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
                  <FormLabel>{t('forms.planAccepted')}</FormLabel>
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
                  <FormLabel className="font-semibold">{t('forms.planNotEligible')}</FormLabel>
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

        {showValidationErrors && (validationErrors.incompleteProcedures.length > 0 || validationErrors.proceduresWithoutJustification.length > 0) && (
          <Alert
            id="consultation-validation-errors"
            variant="destructive"
            className="bg-red-50 border-red-300 border-2 shadow-lg animate-pulse"
          >
            <AlertCircle className="h-5 w-5" />
            <AlertDescription className="space-y-3">
              <p className="font-bold text-base text-red-900">
                ⚠️ Não é possível salvar a consulta!
              </p>
              {validationErrors.incompleteProcedures.length > 0 && (
                <div>
                  <p className="font-semibold text-red-800 mb-1">
                    Procedimentos não preenchidos:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationErrors.incompleteProcedures.map((name) => (
                      <li key={name} className="text-red-700">{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              {validationErrors.proceduresWithoutJustification.length > 0 && (
                <div>
                  <p className="font-semibold text-red-800 mb-1">
                    Procedimentos sem justificativa:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {validationErrors.proceduresWithoutJustification.map((name) => (
                      <li key={name} className="text-red-700">{name}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="text-sm text-red-700 font-medium pt-2 border-t border-red-200">
                Por favor, preencha todos os procedimentos antes de continuar.
              </p>
            </AlertDescription>
          </Alert>
        )}

        <Button
          type="button"
          className="w-full"
          onClick={() => {
            // Check consultation completed validation BEFORE form submit
            const consultationCompleted = form.getValues('consultationCompleted')
            const consultationTypeId = form.getValues('consultationTypeId')
            const completedProcedures = form.getValues('completedProcedures')

            if (consultationCompleted && procedures.length > 0) {
              if (!consultationTypeId) {
                toast.error('Selecione o tipo de consulta antes de marcar como realizada')
                return
              }

              const completedProcs = completedProcedures || {}
              const incompleteProcedures: string[] = []
              const proceduresWithoutJustification: string[] = []

              procedures.forEach((proc) => {
                const procData = completedProcs[proc.id] as { completed: boolean; justification?: string } | undefined

                if (!procData || typeof procData.completed !== 'boolean') {
                  incompleteProcedures.push(proc.name)
                  return
                }

                if (!procData.completed && (!procData.justification || procData.justification.trim() === '')) {
                  proceduresWithoutJustification.push(proc.name)
                }
              })

              if (incompleteProcedures.length > 0 || proceduresWithoutJustification.length > 0) {
                setShowValidationErrors(true)
                setValidationErrors({
                  incompleteProcedures,
                  proceduresWithoutJustification,
                })
                setShowValidationDialog(true)
                return
              }
            }

            // If validation passes, trigger form submit
            form.handleSubmit(onSubmit)()
          }}
        >
          {t('forms.submitConsultation')}
        </Button>
        </form>
      </Form>

      {/* Validation Error Dialog */}
      <AlertDialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-full bg-red-100 p-2">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <AlertDialogTitle className="text-xl text-red-900">
                Consulta Incompleta
              </AlertDialogTitle>
            </div>
          </AlertDialogHeader>

          <div className="space-y-4 text-base text-gray-700 px-6">
            <span className="block">
              Não é possível salvar a consulta. Por favor, preencha todos os procedimentos.
            </span>

            {validationErrors.incompleteProcedures.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <span className="block font-semibold text-red-900 mb-2">
                  📋 Procedimentos não selecionados:
                </span>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.incompleteProcedures.map((name) => (
                    <li key={name} className="text-red-800 text-sm">{name}</li>
                  ))}
                </ul>
              </div>
            )}

            {validationErrors.proceduresWithoutJustification.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <span className="block font-semibold text-orange-900 mb-2">
                  ✏️ Procedimentos sem justificativa:
                </span>
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.proceduresWithoutJustification.map((name) => (
                    <li key={name} className="text-orange-800 text-sm">{name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowValidationDialog(false)}
              className="bg-red-600 hover:bg-red-700"
            >
              Entendi, vou corrigir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
