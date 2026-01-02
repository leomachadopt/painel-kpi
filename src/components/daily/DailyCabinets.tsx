import { useForm } from 'react-hook-form'
import * as z from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
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
  cabinetId: z.string().min(1, 'Selecione um gabinete'),
  hoursUsed: z.coerce.number().min(0),
})

export function DailyCabinets({ clinic }: { clinic: Clinic }) {
  const { addCabinetUsageEntry } = useDataStore()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      cabinetId: '',
      hoursUsed: 0,
    },
  })

  const selectedGab = clinic.configuration.cabinets.find(
    (c) => c.id === form.watch('cabinetId'),
  )

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      await addCabinetUsageEntry(clinic.id, {
        id: Math.random().toString(36),
        hoursAvailable: selectedGab?.standardHours || 0,
        ...data,
      })
      toast.success('Ocupação lançada!')
      form.reset({
        date: data.date,
        cabinetId: '',
        hoursUsed: 0,
      })
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao guardar ocupação')
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 max-w-lg"
      >
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
          name="cabinetId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Gabinete</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clinic.configuration.cabinets.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        {selectedGab && (
          <div className="text-sm text-muted-foreground p-2 bg-secondary/20 rounded">
            Horas Disponíveis Padrão:{' '}
            <strong>{selectedGab.standardHours}h</strong>
          </div>
        )}

        <FormField
          control={form.control}
          name="hoursUsed"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Horas Utilizadas (Ocupadas)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.5"
                  {...field}
                  onFocus={(e) => e.target.select()}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          Lançar Utilização
        </Button>
      </form>
    </Form>
  )
}
