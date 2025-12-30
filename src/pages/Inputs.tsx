import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
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
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useDataStore from '@/stores/useDataStore'
import { MONTHS } from '@/lib/types'
import { toast } from 'sonner'

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

  // Financial
  revenueTotal: z.coerce.number().min(0),
  revenueAligners: z.coerce.number().min(0),
  revenuePediatrics: z.coerce.number().min(0),
  revenueDentistry: z.coerce.number().min(0),
  revenueOthers: z.coerce.number().min(0),
  revenueAcceptedPlans: z.coerce.number().min(0),
  countPlansAccepted: z.coerce.number().min(0), // Financial count
  cabinets: z.array(cabinetSchema),

  // Commercial / Clinical
  plansPresentedAdults: z.coerce.number().min(0),
  plansPresentedKids: z.coerce.number().min(0),
  plansAccepted: z.coerce.number().min(0), // Commercial count
  alignersStarted: z.coerce.number().min(0),
  appointmentsIntegrated: z.coerce.number().min(0),
  appointmentsTotal: z.coerce.number().min(0),
  leads: z.coerce.number().min(0),
  firstConsultationsScheduled: z.coerce.number().min(0),
  firstConsultationsAttended: z.coerce.number().min(0),
  plansNotAccepted: z.coerce.number().min(0),
  plansNotAcceptedFollowUp: z.coerce.number().min(0),

  // Operational
  avgWaitTime: z.coerce.number().min(0),
  agendaOwner: z.object({
    operational: z.coerce.number().min(0),
    planning: z.coerce.number().min(0),
    sales: z.coerce.number().min(0),
    leadership: z.coerce.number().min(0),
  }),
  nps: z.coerce.number().min(0).max(100),
  referralsSpontaneous: z.coerce.number().min(0),
  referralsBase2025: z.coerce.number().min(0),
  complaints: z.coerce.number().min(0),

  // Legacy
  expenses: z.coerce.number().min(0),
  marketingCost: z.coerce.number().min(0),
})

export default function Inputs() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const navigate = useNavigate()
  const { addMonthlyData, getClinic } = useDataStore()
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      countPlansAccepted: 0,
      cabinets: [
        {
          id: 'gab-1',
          name: 'Gabinete 1',
          revenue: 0,
          hoursAvailable: 160,
          hoursOccupied: 0,
        },
        {
          id: 'gab-2',
          name: 'Gabinete 2',
          revenue: 0,
          hoursAvailable: 160,
          hoursOccupied: 0,
        },
      ],
      plansPresentedAdults: 0,
      plansPresentedKids: 0,
      plansAccepted: 0,
      alignersStarted: 0,
      appointmentsIntegrated: 0,
      appointmentsTotal: 0,
      leads: 0,
      firstConsultationsScheduled: 0,
      firstConsultationsAttended: 0,
      plansNotAccepted: 0,
      plansNotAcceptedFollowUp: 0,
      avgWaitTime: 0,
      agendaOwner: {
        operational: 0,
        planning: 0,
        sales: 0,
        leadership: 0,
      },
      nps: 0,
      referralsSpontaneous: 0,
      referralsBase2025: 10,
      complaints: 0,
      expenses: 0,
      marketingCost: 0,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'cabinets',
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!clinicId) return
    setIsSubmitting(true)

    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    addMonthlyData({
      id: `${clinicId}-${values.year}-${values.month}`,
      clinicId,
      month: parseInt(values.month),
      year: parseInt(values.year),
      ...values,
    })

    toast.success('Dados salvos com sucesso!', {
      description: 'Os KPIs foram recalculados.',
    })

    setIsSubmitting(false)
    navigate(`/dashboard/${clinicId}`)
  }

  if (!clinic) return <div className="p-8">Clínica não encontrada.</div>

  return (
    <div className="flex flex-col gap-8 p-8 max-w-5xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Lançamentos Mensais: {clinic.name}
        </h1>
        <p className="text-muted-foreground">
          Insira os dados operacionais para o cálculo de KPIs.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Período de Referência</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mês</FormLabel>
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

          <Tabs defaultValue="financial" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="financial">Financeiro</TabsTrigger>
              <TabsTrigger value="commercial">Comercial / Clínico</TabsTrigger>
              <TabsTrigger value="operational">Operacional</TabsTrigger>
            </TabsList>

            <TabsContent value="financial" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Receitas por Categoria</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
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
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Planos e Custos</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="revenueAcceptedPlans"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Receita Planos Aceitos (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="expenses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custos Fixos (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="marketingCost"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investimento Mkt (R$)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Faturamento por Gabinete</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
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
                    <Plus className="h-4 w-4 mr-2" /> Adicionar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid gap-4 md:grid-cols-4 items-end border p-4 rounded-md"
                    >
                      <FormField
                        control={form.control}
                        name={`cabinets.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`cabinets.${index}.revenue`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Faturamento (R$)</FormLabel>
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
                            <FormLabel>Horas Ocupadas</FormLabel>
                            <FormControl>
                              <Input type="number" {...field} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commercial" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Funil de Vendas</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
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
                    name="plansAccepted"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Planos Aceitos</FormLabel>
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
                    name="plansNotAcceptedFollowUp"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Não Aceitos (c/ FollowUp)</FormLabel>
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
                        <FormLabel>Leads do Mês</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Atendimentos</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
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
                    name="appointmentsTotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Atendimentos</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="alignersStarted"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inícios Alinhadores</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="operational" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Agenda da Liderança (Dr. Cristiane)</CardTitle>
                  <CardDescription>
                    Horas dedicadas por categoria.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-4">
                  <FormField
                    control={form.control}
                    name="agendaOwner.operational"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operacional</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agendaOwner.planning"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Planejamento</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agendaOwner.sales"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vendas/Aval</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="agendaOwner.leadership"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Liderança</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Experiência do Paciente</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="nps"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>NPS</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="avgWaitTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tempo Médio Espera (min)</FormLabel>
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
                        <FormLabel>Reclamações</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
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
                    name="referralsBase2025"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Base Indicações 2025</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end sticky bottom-4 bg-background p-4 border rounded-lg shadow-lg">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              Salvar Todos os Dados
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
