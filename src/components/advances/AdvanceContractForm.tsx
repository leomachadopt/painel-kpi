import { useState, useEffect } from 'react'
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
  FormMessage,
} from '@/components/ui/form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useTranslation } from '@/hooks/useTranslation'
import { Textarea } from '@/components/ui/textarea'
import { advancesApi, patientsApi } from '@/services/api'
import { toast } from 'sonner'
import { AdvanceContract, ContractDependent, DependentRelationship } from '@/lib/types'
import { Plus, X, Loader2, Check } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

// Schema dinâmico baseado se é criação ou edição
const createSchema = (isEdit: boolean) => z.object({
  patientCode: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
  patientName: z.string().min(1, 'Nome obrigatório'),
  insuranceProviderId: z.string().min(1, 'Operadora é obrigatória'),
  contractNumber: z.string().optional(),
  advanceAmount: isEdit
    ? z.coerce.number().min(0, 'Valor deve ser maior ou igual a zero').optional()
    : z.coerce.number().min(0.01, 'Valor da fatura de adiantamento é obrigatório'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'CANCELLED', 'EXPIRED']),
  notes: z.string().optional(),
})

interface AdvanceContractFormProps {
  clinicId: string
  contract?: AdvanceContract
  onClose: () => void
}

export function AdvanceContractForm({ clinicId, contract, onClose }: AdvanceContractFormProps) {
  const [insuranceProviders, setInsuranceProviders] = useState<any[]>([])
  const [loadingProviders, setLoadingProviders] = useState(true)
  const [dependents, setDependents] = useState<Partial<ContractDependent & { code?: string }>[]>([])
  const [saving, setSaving] = useState(false)
  const [loadingPatientCodes, setLoadingPatientCodes] = useState<Set<number>>(new Set())
  const [loadingPatient, setLoadingPatient] = useState(false)
  const [patientFound, setPatientFound] = useState(false)

  const isEdit = !!contract
  const schema = createSchema(isEdit)

  const { formatCurrency } = useTranslation()

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientCode: contract?.patientCode || '',
      patientName: contract?.patientName || '',
      insuranceProviderId: contract?.insuranceProviderId || '',
      contractNumber: contract?.contractNumber || '',
      advanceAmount: contract?.totalAdvanced || undefined,
      status: (contract?.status as any) || 'ACTIVE',
      notes: contract?.notes || '',
    },
  })

  useEffect(() => {
    loadInsuranceProviders()
  }, [])

  useEffect(() => {
    if (contract?.id) {
      loadContractDetails()
      setPatientFound(false)
    } else {
      // Se não há contrato (criação), limpa os dependentes
      setDependents([])
      setPatientFound(false)
    }
  }, [contract?.id])

  const loadInsuranceProviders = async () => {
    try {
      const data = await advancesApi.insuranceProviders.getAll(clinicId)
      setInsuranceProviders(data)
    } catch (err: any) {
      toast.error('Erro ao carregar operadoras')
    } finally {
      setLoadingProviders(false)
    }
  }

  const loadContractDetails = async () => {
    if (!contract?.id) return
    
    try {
      const contractDetails = await advancesApi.contracts.getById(clinicId, contract.id)
      if (contractDetails.dependents) {
        // Formatar datas e calcular idades para os dependentes carregados
        const formattedDependents = contractDetails.dependents.map((dep: any) => ({
          ...dep,
          birthDate: formatDateForInput(dep.birthDate),
          age: dep.age || (dep.birthDate ? calculateAge(dep.birthDate) : undefined),
        }))
        setDependents(formattedDependents)
      }
    } catch (err: any) {
      console.error('Erro ao carregar detalhes do contrato:', err)
      // Se falhar, tenta usar os dependentes do contrato passado como prop
      if (contract?.dependents) {
        const formattedDependents = contract.dependents.map((dep: any) => ({
          ...dep,
          birthDate: formatDateForInput(dep.birthDate),
          age: dep.age || (dep.birthDate ? calculateAge(dep.birthDate) : undefined),
        }))
        setDependents(formattedDependents)
      }
    }
  }

  const addDependent = () => {
    setDependents([
      ...dependents,
      {
        name: '',
        code: '',
        relationship: 'OUTRO' as DependentRelationship,
        birthDate: '',
        age: undefined,
      },
    ])
  }

  const handlePatientCodeChange = async (code: string) => {
    const cleanCode = code.replace(/\D/g, '').slice(0, 6)
    form.setValue('patientCode', cleanCode)
    
    if (cleanCode.length >= 1 && cleanCode.length <= 6) {
      setLoadingPatient(true)
      setPatientFound(false)
      try {
        const patient = await patientsApi.getByCode(clinicId, cleanCode)
        if (patient) {
          form.setValue('patientName', patient.name || '')
          setPatientFound(true)
          toast.success(`Paciente encontrado: ${patient.name}`)
        }
      } catch (err: any) {
        if (err?.status !== 404) {
          console.error('Erro ao buscar paciente:', err)
        }
        setPatientFound(false)
      } finally {
        setLoadingPatient(false)
      }
    } else if (cleanCode.length === 0) {
      form.setValue('patientName', '')
      setPatientFound(false)
    }
  }

  const handleDependentCodeChange = async (index: number, code: string) => {
    const updated = [...dependents]
    updated[index] = { ...updated[index], code: code.replace(/\D/g, '').slice(0, 6) }
    setDependents(updated)

    // Se o código tiver 1-6 dígitos, buscar o paciente
    const cleanCode = code.replace(/\D/g, '')
    if (cleanCode.length >= 1 && cleanCode.length <= 6) {
      setLoadingPatientCodes(prev => new Set(prev).add(index))
      try {
        const patient = await patientsApi.getByCode(clinicId, cleanCode)
        if (patient) {
          const updatedWithName = [...dependents]
          updatedWithName[index] = { 
            ...updatedWithName[index], 
            code: cleanCode,
            name: patient.name || '',
            birthDate: patient.birthDate ? formatDateForInput(patient.birthDate) : updatedWithName[index].birthDate,
            age: patient.birthDate ? calculateAge(patient.birthDate) : updatedWithName[index].age,
          }
          setDependents(updatedWithName)
          toast.success(`Nome preenchido automaticamente: ${patient.name}`)
        }
      } catch (err: any) {
        // 404 é esperado quando paciente não existe - não mostrar erro
        if (err?.status !== 404) {
          console.error('Erro ao buscar paciente:', err)
        }
      } finally {
        setLoadingPatientCodes(prev => {
          const newSet = new Set(prev)
          newSet.delete(index)
          return newSet
        })
      }
    } else if (cleanCode.length === 0) {
      // Se o código foi limpo, limpar também o nome se foi preenchido automaticamente
      const updated = [...dependents]
      updated[index] = { ...updated[index], code: '', name: '' }
      setDependents(updated)
    }
  }

  const removeDependent = (index: number) => {
    setDependents(dependents.filter((_, i) => i !== index))
  }

  const calculateAge = (birthDate: string | null | undefined): number | undefined => {
    if (!birthDate) return undefined
    
    try {
      const birth = new Date(birthDate)
      if (isNaN(birth.getTime())) return undefined
      
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      
      return age >= 0 ? age : undefined
    } catch {
      return undefined
    }
  }

  const formatDateForInput = (date: string | null | undefined): string => {
    if (!date) return ''
    
    try {
      // Se já está no formato YYYY-MM-DD, retorna direto
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date
      }
      
      // Tenta converter para Date e formatar
      const dateObj = new Date(date)
      if (isNaN(dateObj.getTime())) return ''
      
      const year = dateObj.getFullYear()
      const month = String(dateObj.getMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getDate()).padStart(2, '0')
      
      return `${year}-${month}-${day}`
    } catch {
      return ''
    }
  }

  const updateDependent = (index: number, field: string, value: any) => {
    const updated = [...dependents]
    updated[index] = { ...updated[index], [field]: value }
    
    // Se a data de nascimento foi alterada, calcular a idade automaticamente
    if (field === 'birthDate') {
      const calculatedAge = calculateAge(value)
      updated[index].age = calculatedAge
    }
    
    setDependents(updated)
  }

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!clinicId) return

    setSaving(true)
    try {
      // Get the real patient ID from the code
      let patientId: string
      try {
        const patient = await patientsApi.getByCode(clinicId, data.patientCode)
        if (!patient || !patient.id) {
          toast.error('Paciente não encontrado. Por favor, verifique o código do paciente.')
          setSaving(false)
          return
        }
        patientId = patient.id
      } catch (err: any) {
        console.error('erro ao buscar paciente:', err)
        toast.error('Paciente não encontrado. Por favor, cadastre o paciente antes de criar o contrato.')
        setSaving(false)
        return
      }

      const contractData = {
        patientId,
        insuranceProviderId: data.insuranceProviderId,
        contractNumber: data.contractNumber || null,
        startDate: new Date().toISOString().split('T')[0], // Data atual como padrão
        endDate: null,
        status: data.status,
        notes: data.notes || null,
        dependents: dependents
          .filter((d) => d.name && d.name.trim())
          .map((d) => ({
            ...d,
            birthDate: d.birthDate || null, // Garantir que está no formato correto
            age: d.age || null,
          })),
      }

      let savedContract
      if (contract) {
        // Update existing contract
        savedContract = await advancesApi.contracts.update(clinicId, contract.id, contractData)
        toast.success('Contrato atualizado com sucesso!')

        // Se um valor de adiantamento foi fornecido e é diferente do atual, atualizar
        if (data.advanceAmount !== undefined && data.advanceAmount !== null) {
          const currentTotal = contract.totalAdvanced || 0
          const newTotal = data.advanceAmount

          if (newTotal !== currentTotal) {
            try {
              console.log('Atualizando valor total de adiantamento:', {
                contractId: contract.id,
                currentTotal,
                newTotal,
                clinicId,
              })
              await advancesApi.contracts.updateTotalAdvanced(clinicId, contract.id, newTotal)
              toast.success(`Valor atualizado para ${formatCurrency(newTotal)}`)
            } catch (paymentErr: any) {
              console.error('Erro ao atualizar valor:', paymentErr)
              toast.error(`Contrato atualizado, mas erro ao atualizar valor: ${paymentErr.message || 'Erro desconhecido'}`)
            }
          }
        }
      } else {
        // Create new contract - validar que o valor foi fornecido
        if (!data.advanceAmount || data.advanceAmount <= 0) {
          form.setError('advanceAmount', {
            message: 'Valor da fatura de adiantamento é obrigatório',
          })
          setSaving(false)
          return
        }

        savedContract = await advancesApi.contracts.create(clinicId, contractData)
        console.log('Contrato criado:', savedContract)
        toast.success('Contrato criado com sucesso!')

        // Criar o pagamento de adiantamento
        try {
          console.log('Criando pagamento:', {
            contractId: savedContract.id,
            amount: data.advanceAmount,
            clinicId,
          })
          const payment = await advancesApi.contracts.addPayment(clinicId, savedContract.id, {
            paymentDate: new Date().toISOString().split('T')[0],
            amount: data.advanceAmount,
            paymentMethod: null,
            referenceNumber: null,
            notes: 'Pagamento inicial do contrato',
          })
          console.log('Pagamento criado com sucesso:', payment)
          toast.success(`Valor de adiantamento de ${formatCurrency(data.advanceAmount)} registrado!`)
        } catch (paymentErr: any) {
          console.error('Erro ao criar pagamento:', paymentErr)
          console.error('Detalhes do erro:', {
            message: paymentErr.message,
            status: paymentErr.status,
            response: paymentErr.response,
          })
          toast.error(`Contrato criado, mas erro ao registrar pagamento: ${paymentErr.message || 'Erro desconhecido'}`)
        }
      }

      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar contrato')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {contract ? 'Editar Contrato' : 'Novo Contrato de Adiantamento'}
          </DialogTitle>
          <DialogDescription>
            {contract
              ? 'Atualize as informações do contrato'
              : 'Cadastre um novo contrato de adiantamento para um paciente'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <FormField
                control={form.control}
                name="patientCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Código do Paciente *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          onChange={(e) => handlePatientCodeChange(e.target.value)}
                          placeholder="Ex: 1234"
                          className="font-mono"
                          maxLength={6}
                          disabled={saving}
                        />
                        {loadingPatient && (
                          <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                        )}
                        {patientFound && !loadingPatient && field.value && (
                          <Check className="absolute right-2 top-2.5 h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground mt-1">1 a 6 dígitos</p>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="patientName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Nome do Paciente *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nome completo"
                        disabled={saving || patientFound}
                        className={patientFound ? 'bg-muted' : ''}
                      />
                    </FormControl>
                    <FormMessage />
                    {patientFound && (
                      <p className="text-xs text-green-600 mt-1">✓ Paciente encontrado</p>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insuranceProviderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Operadora/Seguro *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loadingProviders || saving}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a operadora" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {insuranceProviders.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id}>
                            {provider.name}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={saving}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Ativo</SelectItem>
                        <SelectItem value="INACTIVE">Inativo</SelectItem>
                        <SelectItem value="CANCELLED">Cancelado</SelectItem>
                        <SelectItem value="EXPIRED">Expirado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="contractNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">Número do Contrato</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Opcional" disabled={saving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="advanceAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">
                      {contract ? 'Valor Total Adiantado' : 'Valor da Fatura de Adiantamento *'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        placeholder="0.00"
                        disabled={saving}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                    {contract && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Edite o valor total do contrato
                      </p>
                    )}
                  </FormItem>
                )}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Dependentes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDependent}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Dependente
                </Button>
              </div>
              <ScrollArea className={`border rounded-md p-3 ${dependents.length === 0 ? 'h-20' : 'h-40'}`}>
                {dependents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum dependente adicionado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dependents.map((dep, index) => (
                      <div key={index} className="grid grid-cols-6 gap-2 items-end">
                        <div>
                          <Label className="text-xs">Código</Label>
                          <div className="relative">
                            <Input
                              value={dep.code || ''}
                              onChange={(e) => handleDependentCodeChange(index, e.target.value)}
                              placeholder="Código"
                              className="font-mono text-xs"
                              maxLength={6}
                            />
                            {loadingPatientCodes.has(index) && (
                              <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>
                        </div>
                        <div>
                          <Label className="text-xs">Nome *</Label>
                          <Input
                            value={dep.name || ''}
                            onChange={(e) => updateDependent(index, 'name', e.target.value)}
                            placeholder="Nome do dependente"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Data Nasc.</Label>
                          <Input
                            type="date"
                            value={dep.birthDate || ''}
                            onChange={(e) => updateDependent(index, 'birthDate', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Idade</Label>
                          <Input
                            type="number"
                            value={dep.age || ''}
                            onChange={(e) =>
                              updateDependent(index, 'age', parseInt(e.target.value) || undefined)
                            }
                            placeholder="Idade"
                            readOnly
                            className="bg-muted cursor-not-allowed"
                            title="Idade calculada automaticamente a partir da data de nascimento"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Parentesco</Label>
                          <Select
                            value={dep.relationship || 'OUTRO'}
                            onValueChange={(value) =>
                              updateDependent(index, 'relationship', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="TITULAR">Titular</SelectItem>
                              <SelectItem value="CONJUGE">Cônjuge</SelectItem>
                              <SelectItem value="FILHO">Filho</SelectItem>
                              <SelectItem value="FILHA">Filha</SelectItem>
                              <SelectItem value="OUTRO">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDependent(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm">Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Observações sobre o contrato" rows={2} className="resize-none" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

