import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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

const schema = z.object({
  date: z.string(),
  patientName: z.string().min(1, 'Nome obrigatório'),
  code: z.string().min(1, 'Código obrigatório'),
  planCreated: z.boolean(),
  planPresented: z.boolean(),
  planAccepted: z.boolean(),
  planValue: z.coerce.number().min(0),
})

export function DailyConsultations({ clinic }: { clinic: Clinic }) {
  const { addConsultationEntry } = useDataStore()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      patientName: '',
      code: '',
      planCreated: false,
      planPresented: false,
      planAccepted: false,
      planValue: 0,
    },
  })

  const onSubmit = (data: z.infer<typeof schema>) => {
    addConsultationEntry(clinic.id, {
      id: Math.random().toString(36),
      ...data,
    })
    toast.success('1ª Consulta registrada!')
    form.reset({
      date: data.date,
      patientName: '',
      code: '',
      planCreated: false,
      planPresented: false,
      planAccepted: false,
      planValue: 0,
    })
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 max-w-lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input placeholder="000" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="patientName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Paciente</FormLabel>
              <FormControl>
                <Input placeholder="Paciente" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-4 p-4 border rounded-md bg-muted/20">
          <FormField
            control={form.control}
            name="planCreated"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between space-y-0">
                <FormLabel>Plano Criado?</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="planPresented"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between space-y-0">
                <FormLabel>Plano Apresentado?</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="planAccepted"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between space-y-0">
                <FormLabel>Plano Aceite?</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="planValue"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor do Plano (R$)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Lançar Consulta
        </Button>
      </form>
    </Form>
  )
}
