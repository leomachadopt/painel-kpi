import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { advancesApi } from '@/services/api'
import { toast } from 'sonner'
import { InsuranceProvider } from '@/lib/types'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
})

interface InsuranceProviderFormProps {
  clinicId: string
  provider?: InsuranceProvider
  onClose: () => void
}

export function InsuranceProviderForm({ clinicId, provider, onClose }: InsuranceProviderFormProps) {
  const [processing, setProcessing] = useState(false)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: provider?.name || '',
    },
  })

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!clinicId) return

    setProcessing(true)
    try {
      const providerData = {
        name: data.name.trim(),
        code: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        notes: null,
      }

      if (provider) {
        // Update existing provider
        await advancesApi.insuranceProviders.update(clinicId, provider.id, providerData)
        toast.success('Seguro atualizado com sucesso!')
      } else {
        // Create new provider
        try {
          await advancesApi.insuranceProviders.create(clinicId, providerData)
          toast.success('Seguro criado com sucesso! Agora você pode fazer upload do PDF.')
        } catch (createErr: any) {
          // Check if provider already exists
          if (createErr.response?.status === 409 || createErr.message?.includes('already exists')) {
            toast.error(
              `Já existe um seguro com o nome "${data.name.trim()}". Por favor, use um nome diferente.`,
              { duration: 5000 }
            )
            setProcessing(false)
            return
          }
          throw createErr
        }
      }

      onClose()
    } catch (err: any) {
      console.error('Error saving insurance provider:', err)
      toast.error(err.message || 'Erro ao salvar seguro')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {provider ? 'Editar Seguro' : 'Novo Seguro'}
          </DialogTitle>
          <DialogDescription>
            {provider
              ? 'Atualize as informações do seguro'
              : 'Cadastre um novo seguro. Após criado, você poderá fazer upload do PDF para extrair os procedimentos.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Provider Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Seguro *</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: Unimed, Bradesco Saúde"
                      disabled={processing}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
                Cancelar
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  provider ? 'Salvar' : 'Criar Seguro'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}



