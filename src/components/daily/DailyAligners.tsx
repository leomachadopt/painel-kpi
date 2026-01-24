import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import useDataStore from '@/stores/useDataStore'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'
import { PatientCodeInput } from '@/components/PatientCodeInput'
import { dailyEntriesApi } from '@/services/api'
import { useTranslation } from '@/hooks/useTranslation'

const schema = z.object({
  date: z.string(),
  patientName: z.string().min(1, 'Nome obrigatório'),
  code: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
  alignerBrandId: z.string().min(1, 'Tipo de alinhador obrigatório'),
  // Data insertion fields
  dataInsertionActive: z.boolean(),
  dataInsertionActivatedAt: z.string().optional(),
  hasScanner: z.boolean(),
  scannerCollectionDate: z.string().optional(),
  hasPhotos: z.boolean(),
  photosStatus: z.enum(['marked', 'dispensable']).optional().nullable(),
  hasOrtho: z.boolean(),
  orthoStatus: z.enum(['marked', 'dispensable']).optional().nullable(),
  hasTele: z.boolean(),
  teleStatus: z.enum(['marked', 'dispensable']).optional().nullable(),
  hasCbct: z.boolean(),
  cbctStatus: z.enum(['marked', 'dispensable']).optional().nullable(),
  // Stage fields
  registrationCreated: z.boolean(),
  registrationCreatedAt: z.string().optional(),
  cckCreated: z.boolean(),
  cckCreatedAt: z.string().optional(),
  awaitingPlan: z.boolean(),
  awaitingPlanAt: z.string().optional(),
  awaitingApproval: z.boolean(),
  awaitingApprovalAt: z.string().optional(),
  approved: z.boolean(),
  approvedAt: z.string().optional(),
  expirationDate: z.string().optional(),
  observations: z.string().optional(),
})

export function DailyAligners({
  clinic,
  initialCode
}: {
  clinic: Clinic
  initialCode?: string
}) {
  const { t } = useTranslation()
  const { addAlignersEntry } = useDataStore()
  const [lookupLoading, setLookupLoading] = useState(false)
  const [loadedCode, setLoadedCode] = useState<string | null>(null)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      patientName: '',
      code: '',
      alignerBrandId: '',
      dataInsertionActive: false,
      dataInsertionActivatedAt: '',
      hasScanner: false,
      scannerCollectionDate: '',
      hasPhotos: false,
      photosStatus: null,
      hasOrtho: false,
      orthoStatus: null,
      hasTele: false,
      teleStatus: null,
      hasCbct: false,
      cbctStatus: null,
      registrationCreated: false,
      registrationCreatedAt: '',
      cckCreated: false,
      cckCreatedAt: '',
      awaitingPlan: false,
      awaitingPlanAt: '',
      awaitingApproval: false,
      awaitingApprovalAt: '',
      approved: false,
      approvedAt: '',
      expirationDate: '',
      observations: '',
    },
  })

  const code = form.watch('code')
  const today = new Date().toISOString().split('T')[0]

  // Pré-preencher código quando initialCode for fornecido
  useEffect(() => {
    if (initialCode && /^\d{1,6}$/.test(initialCode) && !code) {
      form.setValue('code', initialCode, { shouldValidate: true })
    }
  }, [initialCode, form, code])

  // Revisit / preload aligner entry by patient code (unique record)
  useEffect(() => {
    if (!/^\d{1,6}$/.test(code)) {
      setLoadedCode(null)
      return
    }
    if (loadedCode === code) return

    const t = setTimeout(() => {
      setLookupLoading(true)
      setLoadedCode(code)

      dailyEntriesApi.aligner
        .getByCode(clinic.id, code)
        .then((entry) => {
          const toDateInput = (isoDate: string | null | undefined) => {
            if (!isoDate) return ''
            return isoDate.split('T')[0]
          }

          const formData = {
            date: toDateInput(entry.date),
            patientName: entry.patientName,
            code: entry.code,
            alignerBrandId: entry.alignerBrandId,
            dataInsertionActive: !!entry.dataInsertionActive,
            dataInsertionActivatedAt: toDateInput(entry.dataInsertionActivatedAt),
            hasScanner: !!entry.hasScanner,
            scannerCollectionDate: toDateInput(entry.scannerCollectionDate),
            hasPhotos: !!entry.hasPhotos,
            photosStatus: entry.photosStatus || null,
            hasOrtho: !!entry.hasOrtho,
            orthoStatus: entry.orthoStatus || null,
            hasTele: !!entry.hasTele,
            teleStatus: entry.teleStatus || null,
            hasCbct: !!entry.hasCbct,
            cbctStatus: entry.cbctStatus || null,
            registrationCreated: !!entry.registrationCreated,
            registrationCreatedAt: toDateInput(entry.registrationCreatedAt),
            cckCreated: !!entry.cckCreated,
            cckCreatedAt: toDateInput(entry.cckCreatedAt),
            awaitingPlan: !!entry.awaitingPlan,
            awaitingPlanAt: toDateInput(entry.awaitingPlanAt),
            awaitingApproval: !!entry.awaitingApproval,
            awaitingApprovalAt: toDateInput(entry.awaitingApprovalAt),
            approved: !!entry.approved,
            approvedAt: toDateInput(entry.approvedAt),
            expirationDate: toDateInput(entry.expirationDate),
            observations: entry.observations || '',
          }
          form.reset(formData)
        })
        .catch((err: any) => {
          if (err?.message?.includes('404') || err?.message?.includes('not found')) {
            const today = new Date().toISOString().split('T')[0]
            form.setValue('date', today, { shouldValidate: true })
            form.setValue('alignerBrandId', '')
            form.setValue('dataInsertionActive', false)
            form.setValue('dataInsertionActivatedAt', '')
            form.setValue('hasScanner', false)
            form.setValue('scannerCollectionDate', '')
            form.setValue('hasPhotos', false)
            form.setValue('photosStatus', null)
            form.setValue('hasOrtho', false)
            form.setValue('orthoStatus', null)
            form.setValue('hasTele', false)
            form.setValue('teleStatus', null)
            form.setValue('hasCbct', false)
            form.setValue('cbctStatus', null)
            form.setValue('registrationCreated', false)
            form.setValue('registrationCreatedAt', '')
            form.setValue('cckCreated', false)
            form.setValue('cckCreatedAt', '')
            form.setValue('awaitingPlan', false)
            form.setValue('awaitingPlanAt', '')
            form.setValue('awaitingApproval', false)
            form.setValue('awaitingApprovalAt', '')
            form.setValue('approved', false)
            form.setValue('approvedAt', '')
            form.setValue('expirationDate', '')
            form.setValue('observations', '')
            return
          }
          toast.error(err?.message || 'Erro ao carregar alinhador')
        })
        .finally(() => setLookupLoading(false))
    }, 350)

    return () => clearTimeout(t)
  }, [code, clinic.id, form, loadedCode])

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const id = `aligner-${clinic.id}-${data.code}`
      await addAlignersEntry(clinic.id, {
        id,
        date: data.date,
        patientName: data.patientName,
        code: data.code,
        alignerBrandId: data.alignerBrandId,
        dataInsertionActive: data.dataInsertionActive,
        dataInsertionActivatedAt: data.dataInsertionActive ? data.dataInsertionActivatedAt || null : null,
        hasScanner: data.hasScanner,
        scannerCollectionDate: data.hasScanner ? data.scannerCollectionDate || null : null,
        hasPhotos: data.hasPhotos,
        photosStatus: data.hasPhotos ? data.photosStatus || null : null,
        hasOrtho: data.hasOrtho,
        orthoStatus: data.hasOrtho ? data.orthoStatus || null : null,
        hasTele: data.hasTele,
        teleStatus: data.hasTele ? data.teleStatus || null : null,
        hasCbct: data.hasCbct,
        cbctStatus: data.hasCbct ? data.cbctStatus || null : null,
        registrationCreated: data.registrationCreated,
        registrationCreatedAt: data.registrationCreated ? data.registrationCreatedAt || null : null,
        cckCreated: data.cckCreated,
        cckCreatedAt: data.cckCreated ? data.cckCreatedAt || null : null,
        awaitingPlan: data.awaitingPlan,
        awaitingPlanAt: data.awaitingPlan ? data.awaitingPlanAt || null : null,
        awaitingApproval: data.awaitingApproval,
        awaitingApprovalAt: data.awaitingApproval ? data.awaitingApprovalAt || null : null,
        approved: data.approved,
        approvedAt: data.approved ? data.approvedAt || null : null,
        expirationDate: data.expirationDate || null,
        observations: data.observations || null,
      })
      toast.success('Alinhador guardado!')
      setLoadedCode(null)
      form.reset({
        date: data.date,
        patientName: '',
        code: '',
        alignerBrandId: '',
        dataInsertionActive: false,
        dataInsertionActivatedAt: '',
        hasScanner: false,
        scannerCollectionDate: '',
        hasPhotos: false,
        photosStatus: null,
        hasOrtho: false,
        orthoStatus: null,
        hasTele: false,
        teleStatus: null,
        hasCbct: false,
        cbctStatus: null,
        registrationCreated: false,
        registrationCreatedAt: '',
        cckCreated: false,
        cckCreatedAt: '',
        awaitingPlan: false,
        awaitingPlanAt: '',
        awaitingApproval: false,
        awaitingApprovalAt: '',
        approved: false,
        approvedAt: '',
        expirationDate: '',
        observations: '',
      })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar alinhador')
    }
  }

  const toggleWithDate = (
    boolField: 'registrationCreated' | 'cckCreated' | 'awaitingPlan' | 'awaitingApproval' | 'approved',
    dateField: 'registrationCreatedAt' | 'cckCreatedAt' | 'awaitingPlanAt' | 'awaitingApprovalAt' | 'approvedAt',
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
              <FormLabel>{t('forms.date')}</FormLabel>
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

        <FormField
          control={form.control}
          name="alignerBrandId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.alignerType')} <span className="text-destructive">*</span></FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('forms.selectAlignerType')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clinic.configuration.alignerBrands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Data Insertion Section */}
        <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
          <FormField
            control={form.control}
            name="dataInsertionActive"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Dados Coletados (Assistente)</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => {
                        form.setValue('dataInsertionActive', v, { shouldValidate: true })
                        if (v) {
                          const current = form.getValues('dataInsertionActivatedAt')
                          form.setValue('dataInsertionActivatedAt', current || today, { shouldValidate: true })
                        } else {
                          form.setValue('dataInsertionActivatedAt', '', { shouldValidate: true })
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
                {form.watch('dataInsertionActive') && (
                  <FormField
                    control={form.control}
                    name="dataInsertionActivatedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Data de ativação
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

          <div className="space-y-3">
            <FormLabel className="text-sm">Checkboxes de Dados</FormLabel>
            
            {/* Scanner */}
            <FormField
              control={form.control}
              name="hasScanner"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none flex-1">
                    <FormLabel>Scanner</FormLabel>
                    {form.watch('hasScanner') && (
                      <FormField
                        control={form.control}
                        name="scannerCollectionDate"
                        render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormControl>
                              <Input type="date" {...field} placeholder="Data de coleta" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </FormItem>
              )}
            />

            {/* Photos */}
            <FormField
              control={form.control}
              name="hasPhotos"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none flex-1">
                    <FormLabel>Fotos</FormLabel>
                    {form.watch('hasPhotos') && (
                      <FormField
                        control={form.control}
                        name="photosStatus"
                        render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormControl>
                              <RadioGroup
                                onValueChange={(v) => field.onChange(v === 'marked' ? 'marked' : 'dispensable')}
                                value={field.value || undefined}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="marked" id="photos-marked" />
                                  <label htmlFor="photos-marked">Marcado</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="dispensable" id="photos-dispensable" />
                                  <label htmlFor="photos-dispensable">Dispensável</label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </FormItem>
              )}
            />

            {/* Orto */}
            <FormField
              control={form.control}
              name="hasOrtho"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none flex-1">
                    <FormLabel>Orto</FormLabel>
                    {form.watch('hasOrtho') && (
                      <FormField
                        control={form.control}
                        name="orthoStatus"
                        render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormControl>
                              <RadioGroup
                                onValueChange={(v) => field.onChange(v === 'marked' ? 'marked' : 'dispensable')}
                                value={field.value || undefined}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="marked" id="ortho-marked" />
                                  <label htmlFor="ortho-marked">Marcado</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="dispensable" id="ortho-dispensable" />
                                  <label htmlFor="ortho-dispensable">Dispensável</label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </FormItem>
              )}
            />

            {/* Tele */}
            <FormField
              control={form.control}
              name="hasTele"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none flex-1">
                    <FormLabel>Tele</FormLabel>
                    {form.watch('hasTele') && (
                      <FormField
                        control={form.control}
                        name="teleStatus"
                        render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormControl>
                              <RadioGroup
                                onValueChange={(v) => field.onChange(v === 'marked' ? 'marked' : 'dispensable')}
                                value={field.value || undefined}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="marked" id="tele-marked" />
                                  <label htmlFor="tele-marked">Marcado</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="dispensable" id="tele-dispensable" />
                                  <label htmlFor="tele-dispensable">Dispensável</label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </FormItem>
              )}
            />

            {/* CBCT */}
            <FormField
              control={form.control}
              name="hasCbct"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none flex-1">
                    <FormLabel>CBCT</FormLabel>
                    {form.watch('hasCbct') && (
                      <FormField
                        control={form.control}
                        name="cbctStatus"
                        render={({ field }) => (
                          <FormItem className="mt-2">
                            <FormControl>
                              <RadioGroup
                                onValueChange={(v) => field.onChange(v === 'marked' ? 'marked' : 'dispensable')}
                                value={field.value || undefined}
                                className="flex gap-4"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="marked" id="cbct-marked" />
                                  <label htmlFor="cbct-marked">Marcado</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="dispensable" id="cbct-dispensable" />
                                  <label htmlFor="cbct-dispensable">Dispensável</label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Stages Section */}
        <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
          <FormField
            control={form.control}
            name="registrationCreated"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Cadastro Criado (Assistente)</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('registrationCreated', 'registrationCreatedAt', v)}
                    />
                  </FormControl>
                </FormItem>
                {form.watch('registrationCreated') && (
                  <FormField
                    control={form.control}
                    name="registrationCreatedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Data de criação do cadastro
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
            name="cckCreated"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>CCK Criado (Médico (a))</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('cckCreated', 'cckCreatedAt', v)}
                    />
                  </FormControl>
                </FormItem>
                {form.watch('cckCreated') && (
                  <FormField
                    control={form.control}
                    name="cckCreatedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Data de criação do CCK
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
            name="awaitingPlan"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Aguardando Plano (Empresa)</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('awaitingPlan', 'awaitingPlanAt', v)}
                    />
                  </FormControl>
                </FormItem>
                {form.watch('awaitingPlan') && (
                  <FormField
                    control={form.control}
                    name="awaitingPlanAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Data de início de espera do plano
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
            name="awaitingApproval"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Plano Aprovado (Médico (a))</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('awaitingApproval', 'awaitingApprovalAt', v)}
                    />
                  </FormControl>
                </FormItem>
                {form.watch('awaitingApproval') && (
                  <FormField
                    control={form.control}
                    name="awaitingApprovalAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Data de início de espera de aprovação
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
            name="approved"
            render={({ field }) => (
              <div className="space-y-2">
                <FormItem className="flex items-center justify-between space-y-0">
                  <FormLabel>Alinhadores entregues (Assistente)</FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(v) => toggleWithDate('approved', 'approvedAt', v)}
                    />
                  </FormControl>
                </FormItem>
                {form.watch('approved') && (
                  <FormField
                    control={form.control}
                    name="approvedAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs text-muted-foreground">
                          Data de aprovação
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
            name="expirationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de expiração</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="observations"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.observations')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  rows={4}
                  placeholder={t('forms.observationsPlaceholder')}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {t('forms.submitAligner')}
        </Button>
      </form>
    </Form>
  )
}

