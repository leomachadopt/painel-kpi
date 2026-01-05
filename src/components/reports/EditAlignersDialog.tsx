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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Textarea } from '@/components/ui/textarea'
import { DailyAlignersEntry, Clinic } from '@/lib/types'
import { PatientCodeInput } from '@/components/PatientCodeInput'
import useDataStore from '@/stores/useDataStore'

const schema = z.object({
  date: z.string(),
  patientName: z.string().min(1, 'Nome obrigatório'),
  code: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
  alignerBrandId: z.string().min(1, 'Tipo de alinhador obrigatório'),
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
  treatmentPlanCreated: z.boolean(),
  treatmentPlanCreatedAt: z.string().optional(),
  observations: z.string().optional(),
})

interface EditAlignersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry: DailyAlignersEntry | null
  clinic: Clinic
  onSuccess?: () => void
}

export function EditAlignersDialog({
  open,
  onOpenChange,
  entry,
  clinic,
  onSuccess,
}: EditAlignersDialogProps) {
  const { updateAlignersEntry } = useDataStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: '',
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
      treatmentPlanCreated: false,
      treatmentPlanCreatedAt: '',
      observations: '',
    },
  })

  useEffect(() => {
    if (entry && open) {
      const toDateInput = (isoDate: string | null | undefined) => {
        if (!isoDate) return ''
        return isoDate.split('T')[0]
      }

      form.reset({
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
        treatmentPlanCreated: !!entry.treatmentPlanCreated,
        treatmentPlanCreatedAt: toDateInput(entry.treatmentPlanCreatedAt),
        observations: entry.observations || '',
      })
    }
  }, [entry, open, form])

  const today = new Date().toISOString().split('T')[0]

  const toggleWithDate = (
    boolField: 'registrationCreated' | 'cckCreated' | 'awaitingPlan' | 'awaitingApproval' | 'approved' | 'treatmentPlanCreated',
    dateField: 'registrationCreatedAt' | 'cckCreatedAt' | 'awaitingPlanAt' | 'awaitingApprovalAt' | 'approvedAt' | 'treatmentPlanCreatedAt',
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

    setIsSubmitting(true)
    try {
      await updateAlignersEntry(clinic.id, entry.id, {
        id: entry.id,
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
        treatmentPlanCreated: data.treatmentPlanCreated,
        treatmentPlanCreatedAt: data.treatmentPlanCreated ? data.treatmentPlanCreatedAt || null : null,
        observations: data.observations || null,
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
          <DialogTitle>Editar Alinhador</DialogTitle>
          <DialogDescription>
            Atualize os dados do alinhador do paciente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
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
              name="alignerBrandId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Alinhador <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de alinhador" />
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
                      <FormLabel>Inserção de Dados</FormLabel>
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
                      <FormLabel>Cadastro Criado</FormLabel>
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
                      <FormLabel>Criar CCK</FormLabel>
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
                      <FormLabel>Aguardando Plano</FormLabel>
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
                      <FormLabel>Aguardando Aprovação</FormLabel>
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
                      <FormLabel>Aprovado</FormLabel>
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
                name="treatmentPlanCreated"
                render={({ field }) => (
                  <div className="space-y-2">
                    <FormItem className="flex items-center justify-between space-y-0">
                      <FormLabel>Plano de Tratamento</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(v) => toggleWithDate('treatmentPlanCreated', 'treatmentPlanCreatedAt', v)}
                        />
                      </FormControl>
                    </FormItem>
                    {form.watch('treatmentPlanCreated') && (
                      <FormField
                        control={form.control}
                        name="treatmentPlanCreatedAt"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              Data de criação do plano de tratamento
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
              name="observations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      placeholder="Adicione observações sobre este alinhador..."
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

