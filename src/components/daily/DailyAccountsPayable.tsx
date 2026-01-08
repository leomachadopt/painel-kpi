import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SupplierInput } from '@/components/SupplierInput'
import { CategoryInput } from '@/components/CategoryInput'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import useDataStore from '@/stores/useDataStore'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'
import { useState, useRef } from 'react'
import { File, X, Loader2 } from 'lucide-react'
import { dailyEntriesApi } from '@/services/api'

const schema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  supplierId: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  category: z.string().optional(),
  notes: z.string().optional(),
})

export function DailyAccountsPayable({ clinic }: { clinic: Clinic }) {
  const { addAccountsPayableEntry } = useDataStore()
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      description: '',
      supplierId: '',
      amount: 0,
      dueDate: new Date().toISOString().split('T')[0],
      category: '',
      notes: '',
    },
  })

  const [supplierName, setSupplierName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar apenas PDF
    if (file.type !== 'application/pdf') {
      toast.error('Apenas arquivos PDF são permitidos')
      return
    }

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 10MB')
      return
    }

    setSelectedFile(file)
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      setUploading(true)
      
      // Criar a conta a pagar
      const entry = await addAccountsPayableEntry(clinic.id, {
        id: Math.random().toString(36),
        clinicId: clinic.id,
        description: data.description,
        supplierId: data.supplierId || null,
        amount: data.amount,
        dueDate: data.dueDate,
        paid: false,
        category: data.category || null,
        notes: data.notes || null,
      })

      // Se houver arquivo, fazer upload
      if (selectedFile && entry.id) {
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => {
              if (reader.result) {
                resolve(reader.result as string)
              } else {
                reject(new Error('Erro ao ler arquivo'))
              }
            }
            reader.onerror = () => reject(new Error('Erro ao ler arquivo'))
            reader.readAsDataURL(selectedFile)
          })

          await dailyEntriesApi.accountsPayable.uploadDocument(
            clinic.id,
            entry.id,
            base64,
            selectedFile.name,
            selectedFile.type
          )
          toast.success('Conta a pagar e documento registados com sucesso!')
        } catch (err: any) {
          toast.error('Conta registada, mas erro ao enviar documento: ' + (err?.message || ''))
        }
      } else {
        toast.success('Conta a pagar registada com sucesso!')
      }

      form.reset({
        description: '',
        supplierId: '',
        amount: 0,
        dueDate: new Date().toISOString().split('T')[0],
        category: '',
        notes: '',
      })
      setSupplierName('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao registar conta a pagar')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="space-y-4 max-w-lg"
      >
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Aluguer do mês" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <SupplierInput
                  clinicId={clinic.id}
                  value={field.value || ''}
                  onValueChange={(value) => {
                    field.onChange(value)
                  }}
                  supplierName={supplierName}
                  onSupplierNameChange={setSupplierName}
                  label="Fornecedor"
                  required={false}
                  error={form.formState.errors.supplierId?.message}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor (€)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onFocus={(e) => e.target.select()}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Vencimento</FormLabel>
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
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <CategoryInput
                  clinicId={clinic.id}
                  value={field.value || ''}
                  onValueChange={(value) => {
                    field.onChange(value)
                  }}
                  label="Categoria (opcional)"
                  required={false}
                  error={form.formState.errors.category?.message}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações (opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Notas adicionais..."
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Campo de Upload de PDF */}
        <div className="space-y-2">
          <FormLabel>Documento PDF (opcional)</FormLabel>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                disabled={uploading}
                className="flex-1"
              />
            </div>
            {selectedFile && (
              <div className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                <div className="flex items-center gap-2">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm truncate">{selectedFile.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  disabled={uploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            'Guardar Conta a Pagar'
          )}
        </Button>
      </form>
    </Form>
  )
}

