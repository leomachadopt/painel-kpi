import { useState, useRef } from 'react'
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
import { Loader2, Upload, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: provider?.name || '',
    },
  })

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!clinicId) return

    // If editing, just update the name
    if (provider) {
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

        await advancesApi.insuranceProviders.update(clinicId, provider.id, providerData)
        toast.success('Seguro atualizado com sucesso!')
        onClose()
      } catch (err: any) {
        toast.error(err.message || 'Erro ao atualizar seguro')
      } finally {
        setProcessing(false)
      }
      return
    }

    // For new provider, require PDF
    if (!selectedFile) {
      toast.error('Por favor, selecione um arquivo PDF')
      return
    }

    setProcessing(true)
    try {
      // Step 1: Create provider
      const providerData = {
        name: data.name.trim(),
        code: null,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        notes: null,
      }

      let newProvider
      try {
        newProvider = await advancesApi.insuranceProviders.create(clinicId, providerData)
      } catch (createErr: any) {
        // Check if provider already exists
        if (createErr.response?.status === 409 || createErr.message?.includes('already exists')) {
          toast.error(
            `Já existe um seguro com o nome "${data.name.trim()}". Por favor:\n\n` +
            `• Use um nome diferente, ou\n` +
            `• Delete o seguro existente na lista e tente novamente, ou\n` +
            `• Selecione o seguro existente e clique em "Ver Procedimentos" para enviar um novo PDF`,
            { duration: 8000 }
          )
          setProcessing(false)
          return
        }
        throw createErr
      }

      // Step 2: Upload PDF
      const formData = new FormData()
      formData.append('pdf', selectedFile)
      formData.append('clinicId', clinicId)

      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const response = await fetch(`${API_BASE_URL}/insurance/${newProvider.id}/upload-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao fazer upload do PDF')
      }

      toast.success('Seguro criado e PDF enviado com sucesso! Processamento iniciado.')

      // Close after a short delay
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error('Error creating insurance provider:', err)
      toast.error(err.message || 'Erro ao criar seguro')
    } finally {
      setProcessing(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.type !== 'application/pdf') {
        toast.error('Apenas arquivos PDF são permitidos')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Tamanho máximo: 10MB')
        return
      }
      setSelectedFile(file)
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
              : 'Cadastre um novo seguro e extraia os procedimentos a partir do PDF'}
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

            {/* PDF Upload (only for new providers) */}
            {!provider && (
              <Card className="border-dashed">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="text-center">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <h3 className="text-lg font-semibold mb-1">
                        Extrair Dados do PDF
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Faça upload da tabela de procedimentos em PDF para extração automática
                      </p>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {selectedFile ? (
                      <div className="bg-muted p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            <div>
                              <p className="font-medium text-sm">{selectedFile.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedFile(null)}
                            disabled={processing}
                            type="button"
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processing}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Selecionar PDF
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={processing}>
                Cancelar
              </Button>
              <Button type="submit" disabled={processing}>
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {provider ? 'Salvando...' : 'Processando...'}
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

