import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PatientCodeInput } from '@/components/PatientCodeInput'
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
import { Textarea } from '@/components/ui/textarea'
import { advancesApi } from '@/services/api'
import { toast } from 'sonner'
import { AdvanceContract, ContractDependent, DependentRelationship } from '@/lib/types'
import { Plus, X, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

const schema = z.object({
  patientCode: z.string().regex(/^\d{1,6}$/, 'Código deve ter 1 a 6 dígitos'),
  patientName: z.string().min(1, 'Nome obrigatório'),
  insuranceProviderId: z.string().min(1, 'Operadora é obrigatória'),
  contractNumber: z.string().optional(),
  startDate: z.string().min(1, 'Data de início é obrigatória'),
  endDate: z.string().optional(),
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
  const [dependents, setDependents] = useState<Partial<ContractDependent>[]>([])
  const [saving, setSaving] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      patientCode: contract?.patientCode || '',
      patientName: contract?.patientName || '',
      insuranceProviderId: contract?.insuranceProviderId || '',
      contractNumber: contract?.contractNumber || '',
      startDate: contract?.startDate || new Date().toISOString().split('T')[0],
      endDate: contract?.endDate || '',
      status: (contract?.status as any) || 'ACTIVE',
      notes: contract?.notes || '',
    },
  })

  useEffect(() => {
    loadInsuranceProviders()
    if (contract?.dependents) {
      setDependents(contract.dependents)
    }
  }, [])

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

  const addDependent = () => {
    setDependents([
      ...dependents,
      {
        name: '',
        relationship: 'OUTRO' as DependentRelationship,
        birthDate: '',
        age: undefined,
      },
    ])
  }

  const removeDependent = (index: number) => {
    setDependents(dependents.filter((_, i) => i !== index))
  }

  const updateDependent = (index: number, field: string, value: any) => {
    const updated = [...dependents]
    updated[index] = { ...updated[index], [field]: value }
    setDependents(updated)
  }

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!clinicId) return

    setSaving(true)
    try {
      // First, we need to get the patient ID from the code
      // For now, we'll assume the patient exists or create a simplified version
      const patientId = `patient-${clinicId}-${data.patientCode}`

      const contractData = {
        patientId,
        insuranceProviderId: data.insuranceProviderId,
        contractNumber: data.contractNumber || null,
        startDate: data.startDate,
        endDate: data.endDate || null,
        status: data.status,
        notes: data.notes || null,
        dependents: dependents.filter((d) => d.name && d.name.trim()),
      }

      if (contract) {
        // Update existing contract
        await advancesApi.contracts.update(clinicId, contract.id, contractData)
        toast.success('Contrato atualizado com sucesso!')
      } else {
        // Create new contract
        await advancesApi.contracts.create(clinicId, contractData)
        toast.success('Contrato criado com sucesso!')
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="patientCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código do Paciente *</FormLabel>
                    <FormControl>
                      <PatientCodeInput
                        clinicId={clinicId}
                        value={field.value}
                        onCodeChange={field.onChange}
                        patientName={form.watch('patientName')}
                        onPatientNameChange={(name) => form.setValue('patientName', name)}
                        label=""
                        codeError={form.formState.errors.patientCode?.message}
                        patientNameError={form.formState.errors.patientName?.message}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="insuranceProviderId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Operadora/Seguro *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={loadingProviders}
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
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="contractNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número do Contrato</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Opcional" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Início *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Término</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Dependentes</Label>
                <Button type="button" variant="outline" size="sm" onClick={addDependent}>
                  <Plus className="h-4 w-4 mr-1" />
                  Adicionar Dependente
                </Button>
              </div>
              <ScrollArea className="h-48 border rounded-md p-4">
                {dependents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum dependente adicionado
                  </p>
                ) : (
                  <div className="space-y-3">
                    {dependents.map((dep, index) => (
                      <div key={index} className="grid grid-cols-5 gap-2 items-end">
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
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDependent(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
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
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Observações sobre o contrato" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
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

