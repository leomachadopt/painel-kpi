import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Save, Loader2 } from 'lucide-react'
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
import useDataStore from '@/stores/useDataStore'
import { MONTHS } from '@/lib/types'
import { toast } from 'sonner'

const formSchema = z.object({
  month: z.string(),
  year: z.string(),
  revenue: z.coerce.number().min(0, 'Valor deve ser positivo'),
  expenses: z.coerce.number().min(0, 'Valor deve ser positivo'),
  marketingCost: z.coerce.number().min(0, 'Valor deve ser positivo'),
  consultations: z.coerce.number().int().min(0),
  newPatients: z.coerce.number().int().min(0),
  leads: z.coerce.number().int().min(0),
  nps: z.coerce.number().min(0).max(100),
  cancellations: z.coerce.number().int().min(0),
  capacity: z.coerce.number().int().min(1),
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
      month: new Date().getMonth().toString(), // Current month index approx (0-11) but schema expects 1-12 logic?
      // Actually let's default to previous month as inputs are usually lagging
      year: '2023',
      revenue: 0,
      expenses: 0,
      marketingCost: 0,
      consultations: 0,
      newPatients: 0,
      leads: 0,
      nps: 0,
      cancellations: 0,
      capacity: 400,
    },
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
      revenue: values.revenue,
      expenses: values.expenses,
      marketingCost: values.marketingCost,
      consultations: values.consultations,
      newPatients: values.newPatients,
      leads: values.leads,
      nps: values.nps,
      cancellations: values.cancellations,
      capacity: values.capacity,
    })

    toast.success('Dados salvos com sucesso!', {
      description: 'Os KPIs foram recalculados.',
    })

    setIsSubmitting(false)
    navigate(`/dashboard/${clinicId}`)
  }

  if (!clinic) return <div className="p-8">Clínica não encontrada.</div>

  return (
    <div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Lançamentos Mensais
        </h1>
        <p className="text-muted-foreground">
          Insira os dados operacionais da {clinic.name}.
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
                          <SelectValue placeholder="Selecione o mês" />
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
                    <FormMessage />
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
                          <SelectValue placeholder="Selecione o ano" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="2023">2023</SelectItem>
                        <SelectItem value="2024">2024</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Financeiro</CardTitle>
              <CardDescription>Valores monetários brutos.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faturamento Total (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
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
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
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
                      <Input type="number" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Operacional</CardTitle>
              <CardDescription>
                Métricas de volume e atendimento.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="consultations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Consultas</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPatients"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Novos Pacientes</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="leads"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Leads</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Qualidade</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-3">
              <FormField
                control={form.control}
                name="nps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>NPS (0-100)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cancellations"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cancelamentos</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidade Máxima</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar Dados
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
