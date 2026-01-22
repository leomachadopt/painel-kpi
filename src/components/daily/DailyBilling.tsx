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
import { usePatientLookup } from '@/hooks/usePatientLookup'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'
import { Separator } from '@/components/ui/separator'

export function DailyBilling({ clinic }: { clinic: Clinic }) {
  const { addFinancialEntry } = useDataStore()
  const { patient: foundPatient, lookupByCode } = usePatientLookup()
  const { patient: foundThirdParty, lookupByCode: lookupThirdParty } = usePatientLookup()
  const [billToThirdParty, setBillToThirdParty] = useState(false)

  const schema = z.object({
    date: z.string().min(1, 'Data obrigatória'),
    patientCode: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
    patientName: z.string().min(1, 'Nome do paciente obrigatório'),
    doctorId: z.string().min(1, 'Médico responsável obrigatório'),
    value: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
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
    message: 'Quando faturar em nome de 3os, o nome é obrigatório',
    path: ['thirdPartyName'],
  })

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

  // Watch para mudanças nos códigos
  const patientCode = useWatch({ control: form.control, name: 'patientCode' })
  const thirdPartyCode = useWatch({ control: form.control, name: 'thirdPartyCode' })

  // Auto-preencher nome do paciente quando código mudar
  useEffect(() => {
    if (patientCode && /^\d{1,6}$/.test(patientCode)) {
      lookupByCode(clinic.id, patientCode)
    }
  }, [patientCode, clinic.id, lookupByCode])

  // Atualizar nome quando paciente for encontrado
  useEffect(() => {
    if (foundPatient) {
      form.setValue('patientName', foundPatient.name)
    }
  }, [foundPatient, form])

  // Auto-preencher nome do terceiro quando código mudar
  useEffect(() => {
    if (thirdPartyCode && /^\d{1,6}$/.test(thirdPartyCode)) {
      lookupThirdParty(clinic.id, thirdPartyCode)
    } else if (thirdPartyCode === '') {
      // Se limpar o código, limpa o nome também
      form.setValue('thirdPartyName', '')
    }
  }, [thirdPartyCode, clinic.id, lookupThirdParty, form])

  // Atualizar nome do terceiro quando for encontrado
  useEffect(() => {
    if (foundThirdParty) {
      form.setValue('thirdPartyName', foundThirdParty.name)
    }
  }, [foundThirdParty, form])

  // Limpar campos de terceiro quando desmarcar checkbox
  useEffect(() => {
    if (!billToThirdParty) {
      form.setValue('thirdPartyCode', '')
      form.setValue('thirdPartyName', '')
    }
  }, [billToThirdParty])

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      // Se paciente não existe, será criado automaticamente pelo backend
      if (!foundPatient) {
        toast.info(`Paciente ${data.patientName} será criado automaticamente`)
      }

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

      toast.success('Fatura lançada com sucesso!')

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
      toast.error(err?.message || 'Erro ao lançar fatura')
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
              <FormLabel>Data</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Código e Nome do Paciente lado a lado */}
        <div className="grid grid-cols-2 gap-3">
          {/* Código do Paciente */}
          <FormField
            control={form.control}
            name="patientCode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Código</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{1,6}"
                    maxLength={6}
                    placeholder="Ex: 1234"
                    className="font-mono text-lg"
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                      field.onChange(value)
                    }}
                  />
                </FormControl>
                <FormMessage />
                <p className="text-xs text-muted-foreground">1 a 6 dígitos</p>
              </FormItem>
            )}
          />

          {/* Nome do Paciente (auto-preenchido) */}
          <FormField
            control={form.control}
            name="patientName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Paciente</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Nome completo"
                    className={foundPatient ? 'bg-muted' : ''}
                    readOnly={foundPatient ? true : false}
                  />
                </FormControl>
                <FormMessage />
                {patientCode && !foundPatient && (
                  <p className="text-xs text-amber-600">
                    Paciente não encontrado. Será criado automaticamente.
                  </p>
                )}
                {patientCode && foundPatient && (
                  <p className="text-xs text-green-600">
                    ✓ Paciente encontrado
                  </p>
                )}
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Médico Responsável */}
        <FormField
          control={form.control}
          name="doctorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Médico Responsável</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o médico" />
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
            Faturar em nome de 3os?
          </label>
        </div>

        {/* Campos condicionais quando "Faturar em nome de 3os" está marcado */}
        {billToThirdParty && (
          <div className="grid grid-cols-2 gap-3">
            {/* Código do Terceiro (opcional) */}
            <FormField
              control={form.control}
              name="thirdPartyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{1,6}"
                      maxLength={6}
                      placeholder="Ex: 1234"
                      className="font-mono text-lg"
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                  <p className="text-xs text-muted-foreground">1 a 6 dígitos</p>
                </FormItem>
              )}
            />

            {/* Nome do Terceiro */}
            <FormField
              control={form.control}
              name="thirdPartyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Nome do responsável pela fatura"
                      className={foundThirdParty ? 'bg-muted' : ''}
                      readOnly={foundThirdParty ? true : false}
                    />
                  </FormControl>
                  <FormMessage />
                  {thirdPartyCode && !foundThirdParty && (
                    <p className="text-xs text-amber-600">
                      Paciente não encontrado. Digite o nome manualmente.
                    </p>
                  )}
                  {thirdPartyCode && foundThirdParty && (
                    <p className="text-xs text-green-600">
                      ✓ Paciente encontrado
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>
        )}

        <Separator />

        {/* Valor da Fatura - ÚLTIMA OPÇÃO */}
        <FormField
          control={form.control}
          name="value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor (€)</FormLabel>
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
          Lançar Fatura
        </Button>
      </form>
    </Form>
  )
}
