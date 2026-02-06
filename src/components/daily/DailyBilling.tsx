import { useState, useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import useDataStore from '@/stores/useDataStore'
import { PatientCodeInput } from '@/components/PatientCodeInput'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'
import { Separator } from '@/components/ui/separator'
import { useTranslation } from '@/hooks/useTranslation'

const createBillingSchema = (t: (key: string) => string, billToThirdParty: boolean) => z.object({
  date: z.string().min(1, t('forms.dateRequired')),
  patientCode: z.string().regex(/^\d{1,6}$/, t('forms.codeInvalid')),
  patientName: z.string().min(1, t('forms.nameRequired')),
  doctorId: z.string().min(1, t('forms.doctorRequired')),
  value: z.coerce.number().min(0.01, t('forms.valuePositive')),
  thirdPartyCode: z.string().optional(),
  thirdPartyName: z.string().optional(),
}).refine((data) => {
  // Se "Faturar em nome de 3os" está marcado, validar nome do terceiro
  if (billToThirdParty) {
    if (!data.thirdPartyName || data.thirdPartyName.trim() === '') {
      return false
    }
  }
  return true
}, {
  message: t('forms.thirdPartyNameRequired'),
  path: ['thirdPartyName'],
})

export function DailyBilling({ clinic }: { clinic: Clinic }) {
  const { t } = useTranslation()
  const { addFinancialEntry } = useDataStore()
  const [billToThirdParty, setBillToThirdParty] = useState(false)

  const schema = createBillingSchema(t, billToThirdParty)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      patientCode: '',
      patientName: '',
      doctorId: '',
      thirdPartyCode: '',
      thirdPartyName: '',
      value: 0,
    },
  })

  // Limpar campos de terceiro quando desmarcar checkbox
  useEffect(() => {
    if (!billToThirdParty) {
      form.setValue('thirdPartyCode', '')
      form.setValue('thirdPartyName', '')
    }
  }, [billToThirdParty, form])

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {

      // Usar valores padrão para campos obrigatórios que não são exibidos
      const defaultCategory = clinic.configuration.categories?.[0]?.id || 'default-category'
      const defaultCabinet = clinic.configuration.cabinets?.[0]?.id || 'default-cabinet'

      // Determinar nome e código para faturação
      // Se marcou "Faturar em nome de 3os", usar dados do terceiro
      // Se não marcou, usar dados do paciente
      const billingName = billToThirdParty && data.thirdPartyName
        ? data.thirdPartyName
        : data.patientName

      const billingCode = billToThirdParty && data.thirdPartyCode
        ? data.thirdPartyCode
        : data.patientCode

      // Lançar fatura usando a estrutura de financial entry
      await addFinancialEntry(clinic.id, {
        id: Math.random().toString(36),
        date: data.date,
        patientName: billingName,
        code: billingCode,
        categoryId: defaultCategory,
        value: data.value,
        cabinetId: defaultCabinet,
        doctorId: data.doctorId,
        paymentSourceId: null,
        isBillingEntry: true, // Identificar como fatura da aba de Faturação
      })

      toast.success(t('forms.invoicePosted'))

      // Reset form mantendo data e médico
      form.reset({
        date: data.date,
        patientCode: '',
        patientName: '',
        doctorId: data.doctorId,
        thirdPartyCode: '',
        thirdPartyName: '',
        value: 0,
      })
      setBillToThirdParty(false)
    } catch (err: any) {
      toast.error(err?.message || t('forms.errorPostingInvoice'))
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-4 max-w-lg"
      >
        {/* Data */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.date')}</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Código e Nome do Paciente */}
        <PatientCodeInput
          clinicId={clinic.id}
          value={form.watch('patientCode')}
          onCodeChange={(c) => form.setValue('patientCode', c, { shouldValidate: true })}
          patientName={form.watch('patientName')}
          onPatientNameChange={(n) =>
            form.setValue('patientName', n, { shouldValidate: true })
          }
          label={t('forms.code')}
          codeError={form.formState.errors.patientCode?.message}
          patientNameError={form.formState.errors.patientName?.message}
        />

        <Separator />

        {/* Médico Responsável */}
        <FormField
          control={form.control}
          name="doctorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.doctor')}</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t('forms.selectDoctor')} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clinic.configuration.doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <Separator />

        {/* Checkbox: Faturar em nome de 3os */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="billToThirdParty"
            checked={billToThirdParty}
            onCheckedChange={(checked) => setBillToThirdParty(checked === true)}
          />
          <label
            htmlFor="billToThirdParty"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            {t('forms.billToThirdParty')}
          </label>
        </div>

        {/* Campos condicionais quando "Faturar em nome de 3os" está marcado */}
        {billToThirdParty && (
          <PatientCodeInput
            clinicId={clinic.id}
            value={form.watch('thirdPartyCode') || ''}
            onCodeChange={(c) => form.setValue('thirdPartyCode', c, { shouldValidate: true })}
            patientName={form.watch('thirdPartyName') || ''}
            onPatientNameChange={(n) =>
              form.setValue('thirdPartyName', n, { shouldValidate: true })
            }
            label={t('forms.codeOptional')}
            required={false}
            codeError={form.formState.errors.thirdPartyCode?.message}
            patientNameError={form.formState.errors.thirdPartyName?.message}
          />
        )}

        <Separator />

        {/* Valor da Fatura - ÚLTIMA OPÇÃO */}
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('forms.valueEuro')}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...field}
                  onFocus={(e) => e.target.select()}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full">
          {t('forms.submitInvoice')}
        </Button>
      </form>
    </Form>
  )
}
