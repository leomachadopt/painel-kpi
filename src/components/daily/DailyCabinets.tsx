import { useMemo } from 'react'
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
import { useTranslation } from '@/hooks/useTranslation'

export function DailyCabinets({ clinic }: { clinic: Clinic }) {
  const { t, locale } = useTranslation()
  const { addCabinetUsageEntry } = useDataStore()
  
  // Capturar mensagem de forma estável para evitar problemas de escopo na minificação
  const selectCabinetMessage = useMemo(() => t('cabinet.selectCabinet'), [t, locale])
  
  const schema = useMemo(() => z.object({
    date: z.string(),
    cabinetId: z.string().min(1, selectCabinetMessage),
    hours: z.coerce.number().min(0).max(23),
    minutes: z.coerce.number().min(0).max(59),
  }), [selectCabinetMessage])
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      cabinetId: '',
      hours: 0,
      minutes: 0,
    },
  })

  const selectedGab = clinic.configuration.cabinets.find(
    (c) => c.id === form.watch('cabinetId'),
  )

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      // Converter horas e minutos para decimal (ex: 2h 30min = 2.5)
      const hoursUsed = data.hours + (data.minutes / 60)

      await addCabinetUsageEntry(clinic.id, {
        id: Math.random().toString(36),
        hoursAvailable: selectedGab?.standardHours || 0,
        date: data.date,
        cabinetId: data.cabinetId,
        hoursUsed,
      })
      toast.success(t('forms.usagePosted'))
      form.reset({
        date: data.date,
        cabinetId: '',
        hours: 0,
        minutes: 0,
      })
    } catch (err: any) {
      toast.error(err?.message || t('forms.errorPostingUsage'))
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
              <FormLabel>{t('forms.date')}</FormLabel>
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
              <FormLabel>{t('financial.cabinet')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('forms.select')} />
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
            {t('forms.standardHoursAvailable')}{' '}
            <strong>{selectedGab.standardHours}h</strong>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horas</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="23"
                    {...field}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="minutes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Minutos</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    step="1"
                    {...field}
                    onFocus={(e) => e.target.select()}
                    placeholder="0"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {(form.watch('hours') > 0 || form.watch('minutes') > 0) && (
          <div className="text-sm text-muted-foreground p-2 bg-blue-50 dark:bg-blue-950 rounded">
            Tempo total:{' '}
            <strong>
              {form.watch('hours')}h {form.watch('minutes')}min
              {' '}({(form.watch('hours') + form.watch('minutes') / 60).toFixed(2)}h decimais)
            </strong>
          </div>
        )}

        <Button type="submit" className="w-full">
          {t('forms.submitUsage')}
        </Button>
      </form>
    </Form>
  )
}
