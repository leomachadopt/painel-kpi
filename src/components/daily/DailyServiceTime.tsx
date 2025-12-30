import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
} from '@/components/ui/form'
import useDataStore from '@/stores/useDataStore'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'

const schema = z.object({
  date: z.string(),
  patientName: z.string().min(1),
  code: z.string().min(1),
  doctorId: z.string().min(1),
  scheduledTime: z.string(),
  actualStartTime: z.string(),
  delayReason: z.enum(['paciente', 'medico']).optional(),
})

export function DailyServiceTime({ clinic }: { clinic: Clinic }) {
  const { addServiceTimeEntry } = useDataStore()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      patientName: '',
      code: '',
      doctorId: '',
      scheduledTime: '09:00',
      actualStartTime: '09:00',
    },
  })

  const onSubmit = (data: z.infer<typeof schema>) => {
    addServiceTimeEntry(clinic.id, {
      id: Math.random().toString(36),
      ...data,
    })
    toast.success('Tempo de atendimento registado!')
    form.reset({
      date: data.date,
      patientName: '',
      code: '',
      doctorId: '',
      scheduledTime: '09:00',
      actualStartTime: '09:00',
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
              <FormLabel>Paciente</FormLabel>
              <FormControl>
                <Input placeholder="Nome" {...field} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="doctorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Médico</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="scheduledTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hora Agendada</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="actualStartTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Início Real</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="delayReason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo Atraso (Se houver)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="paciente">Paciente</SelectItem>
                  <SelectItem value="medico">Médico</SelectItem>
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Lançar Atendimento
        </Button>
      </form>
    </Form>
  )
}
