import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Save,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Copy,
  Plus,
  Trash2,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import useDataStore from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'
import { MONTHS } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const cabinetSchema = z.object({
  id: z.string(),
  name: z.string(),
  revenue: z.coerce.number().min(0),
  hoursAvailable: z.coerce.number().min(0),
  hoursOccupied: z.coerce.number().min(0),
})

const formSchema = z.object({
  month: z.string(),
  year: z.string(),

  // Step 1: Financial
  revenueTotal: z.coerce.number().min(0),
  revenueAligners: z.coerce.number().min(0),
  revenuePediatrics: z.coerce.number().min(0),
  revenueDentistry: z.coerce.number().min(0),
  revenueOthers: z.coerce.number().min(0),
  revenueAcceptedPlans: z.coerce.number().min(0),
  plansAccepted: z.coerce.number().min(0),
  cabinets: z.array(cabinetSchema),

  // Step 2: Commercial/Clinical
  plansPresentedAdults: z.coerce.number().min(0),
  plansPresentedKids: z.coerce.number().min(0),
  alignersStarted: z.coerce.number().min(0),
  appointmentsIntegrated: z.coerce.number().min(0),
  appointmentsTotal: z.coerce.number().min(0),
  leads: z.coerce.number().min(0),
  firstConsultationsScheduled: z.coerce.number().min(0),
  firstConsultationsAttended: z.coerce.number().min(0),
  plansNotAccepted: z.coerce.number().min(0),
  plansNotAcceptedFollowUp: z.coerce.number().min(0),

  // Step 3: Operational
  avgWaitTime: z.coerce.number().min(0),

  // Step 4: Experience
  nps: z.coerce.number().min(0).max(100),
  referralsSpontaneous: z.coerce.number().min(0),
  complaints: z.coerce.number().min(0),
})

const STEPS = [
  { id: 0, title: 'Financeiro', description: 'Receitas e Gabinetes' },
  { id: 1, title: 'Comercial/Clínico', description: 'Funil e Atendimentos' },
  { id: 2, title: 'Operacional', description: 'Ocupação e Tempos' },
  { id: 3, title: 'Experiência', description: 'NPS e Indicações' },
]

export default function Inputs() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const navigate = useNavigate()
  const { addMonthlyData, getClinic, getMonthlyData } = useDataStore()
  const { user } = useAuthStore()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const clinic = clinicId ? getClinic(clinicId) : undefined

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      month: (new Date().getMonth() + 1).toString(),
      year: '2023',
      revenueTotal: 0,
      revenueAligners: 0,
      revenuePediatrics: 0,
      revenueDentistry: 0,
      revenueOthers: 0,
      revenueAcceptedPlans: 0,
      plansAccepted: 0,
      cabinets: [
        {
          id: 'gab-1',
          name: 'Gabinete 1',
          revenue: 0,
          hoursAvailable: 160,
          hoursOccupied: 0,
        },
      ],
      plansPresentedAdults: 0,
      plansPresentedKids: 0,
      alignersStarted: 0,
      appointmentsIntegrated: 0,
      appointmentsTotal: 0,
      leads: 0,
      firstConsultationsScheduled: 0,
      firstConsultationsAttended: 0,
      plansNotAccepted: 0,
      plansNotAcceptedFollowUp: 0,
      avgWaitTime: 0,
      nps: 0,
      referralsSpontaneous: 0,
      complaints: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'cabinets',
  })

  // Access Control Check
  if (
    user?.role === 'GESTOR_CLINICA' &&
    clinicId &&
    user.clinicId !== clinicId
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <Lock className="h-6 w-6 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
          <p className="text-muted-foreground mt-2">
            Você não tem permissão para editar dados desta clínica.
          </p>
        </div>
        <Button onClick={() => navigate(`/dashboard/${user.clinicId}`)}>
          Voltar para meu Dashboard
        </Button>
      </div>
    )
  }

  if (!clinic) return <div className="p-8">Clínica não encontrada.</div>

  const handleCopyPreviousMonth = () => {
    if (!clinicId) return
    const month = parseInt(form.getValues('month'))
    const year = parseInt(form.getValues('year'))

    let prevMonth = month - 1
    let prevYear = year
    if (prevMonth === 0) {
      prevMonth = 12
      prevYear -= 1
    }

    const prevData = getMonthlyData(clinicId, prevMonth, prevYear)

    if (prevData) {
      // We iterate keys to set values safely
      Object.keys(prevData).forEach((key) => {
        if (key in form.getValues()) {
          // @ts-expect-error - dynamic key access
          form.setValue(key, prevData[key])
        }
      })
      // Explicitly set cabinets deep copy
      form.setValue(
        'cabinets',
        prevData.cabinets.map((c) => ({ ...c })),
      )

      toast.success(`Dados copiados de ${MONTHS[prevMonth - 1]} ${prevYear}.`)
    } else {
      toast.error('Nenhum dado encontrado no mês anterior.')
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!clinicId) return
    setIsSubmitting(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Merge with legacy/default structure
    addMonthlyData({
      id: `${clinicId}-${values.year}-${values.month}`,
      clinicId,
      month: parseInt(values.month),
      year: parseInt(values.year),
      ...values,
      agendaOwner: {
        operational: 0,
        planning: 0,
        sales: 0,
        leadership: 0,
      }, // Default
      referralsBase2025: 10, // Default
      expenses: values.revenueTotal * 0.6, // Mock logic
      marketingCost: 5000, // Mock logic
    })

    toast.success('Lançamento realizado!', {
      description: 'Os KPIs foram recalculados com sucesso.',
    })

    setIsSubmitting(false)
    navigate(`/dashboard/${clinicId}`)
  }

  const nextStep = () =>
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0))

  return (
    <div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Assistente de Lançamentos
          </h1>
          <p className="text-muted-foreground">
            {clinic.name} • Insira os dados do mês.
          </p>
        </div>
        <Button variant="outline" onClick={handleCopyPreviousMonth}>
          <Copy className="mr-2 h-4 w-4" />
          Copiar mês anterior
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Period Selector - Always Visible */}
          <Card>
            <CardContent className="p-4 grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mês de Referência</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTHS.map((month, index) => (
                          <SelectItem
                            key={index}
                            value={(index + 1).toString()}
                          >
                            {month}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ano</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Stepper Indicators */}
          <div className="flex justify-between relative">
            <div className="absolute top-1/2 left-0 w-full h-1 bg-secondary/20 -z-10 -translate-y-1/2 rounded-full" />
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  'flex flex-col items-center gap-2 bg-background px-2 transition-all',
                  index === currentStep
                    ? 'scale-110 text-primary'
                    : index < currentStep
                      ? 'text-primary/70'
                      : 'text-muted-foreground',
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 font-bold text-sm',
                    index === currentStep
                      ? 'border-primary bg-primary text-primary-foreground'
                      : index < currentStep
                        ? 'border-primary bg-background text-primary'
                        : 'border-muted bg-background',
                  )}
                >
                  {index + 1}
                </div>
                <span className="hidden sm:block text-xs font-medium">
                  {step.title}
                </span>
              </div>
            ))}
          </div>

          <Card className="min-h-[400px]">
            <CardHeader>
              <CardTitle>{STEPS[currentStep].title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Financial */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="revenueTotal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Faturamento Total (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="revenueAligners"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Alinhadores (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="revenuePediatrics"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Odontopediatria (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="revenueDentistry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dentisteria (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="revenueOthers"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Outros (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                    <FormField
                      control={form.control}
                      name="revenueAcceptedPlans"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receita de Planos Aceitos (R$)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="plansAccepted"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Planos Aceitos</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/20">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-sm">
                        Receita por Gabinete
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          append({
                            id: `gab-${fields.length + 1}`,
                            name: `Gabinete ${fields.length + 1}`,
                            revenue: 0,
                            hoursAvailable: 160,
                            hoursOccupied: 0,
                          })
                        }
                      >
                        <Plus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-center">
                          <FormField
                            control={form.control}
                            name={`cabinets.${index}.name`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input {...field} placeholder="Nome" />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`cabinets.${index}.revenue`}
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input
                                    type="number"
                                    {...field}
                                    placeholder="Receita"
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Clinical / Commercial */}
              {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm border-b pb-2">
                      Funil de Vendas
                    </h3>
                    <FormField
                      control={form.control}
                      name="plansPresentedAdults"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Planos Apres. (Adulto)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="plansPresentedKids"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Planos Apres. (Criança)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="plansNotAccepted"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Planos Não Aceitos</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="leads"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leads (Total)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm border-b pb-2">
                      Atendimentos e Produção
                    </h3>
                    <FormField
                      control={form.control}
                      name="firstConsultationsScheduled"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>1ª Cons. Agendadas</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="firstConsultationsAttended"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>1ª Cons. Realizadas</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="alignersStarted"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inícios de Alinhadores</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={form.control}
                        name="appointmentsTotal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Atend.</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="appointmentsIntegrated"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Atend. Integrados</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Operational */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm border-b pb-2">
                      Ocupação de Gabinetes
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Informe as horas disponíveis e ocupadas para cada gabinete
                      definido no passo financeiro.
                    </p>
                    {fields.map((field, index) => (
                      <div
                        key={field.id}
                        className="grid grid-cols-3 gap-4 items-end border p-4 rounded-md bg-muted/20"
                      >
                        <div className="font-medium text-sm pt-2">
                          {form.watch(`cabinets.${index}.name`)}
                        </div>
                        <FormField
                          control={form.control}
                          name={`cabinets.${index}.hoursAvailable`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Horas Disponíveis
                              </FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`cabinets.${index}.hoursOccupied`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-xs">
                                Horas Ocupadas
                              </FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="max-w-xs">
                    <FormField
                      control={form.control}
                      name="avgWaitTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempo Médio de Espera (min)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Experience */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="nps"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>NPS do Mês</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="referralsSpontaneous"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Indicações Espontâneas</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="complaints"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Número de Reclamações</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            {currentStep < STEPS.length - 1 ? (
              <Button type="button" onClick={nextStep}>
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar e Calcular KPIs
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  )
}
