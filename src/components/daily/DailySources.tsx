import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
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
  isReferral: z.boolean(),
  sourceId: z.string().min(1),
})

export function DailySources({ clinic }: { clinic: Clinic }) {
  const { addSourceEntry } = useDataStore()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      patientName: '',
      code: '',
      isReferral: false,
      sourceId: '',
    },
  })

  const onSubmit = (data: z.infer<typeof schema>) => {
    addSourceEntry(clinic.id, {
      id: Math.random().toString(36),
      ...data,
    })
    toast.success('Fonte registrada!')
    form.reset({
      date: data.date,
      patientName: '',
      code: '',
      isReferral: false,
      sourceId: '',
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
          name="isReferral"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">É Indicação?</FormLabel>
              </div>
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
          name="sourceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Fonte de Chegada</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Lançar Fonte
        </Button>
      </form>
    </Form>
  )
}
