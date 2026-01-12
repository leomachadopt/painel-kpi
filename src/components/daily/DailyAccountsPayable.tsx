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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles: File[] = []
    
    for (const file of files) {
      // Validar apenas PDF
      if (file.type !== 'application/pdf') {
        toast.error(`Arquivo "${file.name}" não é um PDF válido`)
        continue
      }

      // Validar tamanho (max 3MB devido a limitações da plataforma Vercel)
      if (file.size > 3 * 1024 * 1024) {
        toast.error(`Arquivo "${file.name}" excede o tamanho máximo de 3MB`)
        continue
      }

      validFiles.push(file)
    }

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles])
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const clearAllFiles = () => {
    setSelectedFiles([])
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

      // Se houver arquivos, fazer upload de todos
      if (selectedFiles.length > 0 && entry.id) {
        let successCount = 0
        let errorCount = 0

        for (const file of selectedFiles) {
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
              reader.readAsDataURL(file)
            })

            await dailyEntriesApi.accountsPayable.uploadDocument(
              clinic.id,
              entry.id,
              base64,
              file.name,
              file.type
            )
            successCount++
          } catch (err: any) {
            errorCount++
            console.error(`Erro ao enviar arquivo ${file.name}:`, err)
          }
        }

        if (successCount > 0 && errorCount === 0) {
          toast.success(
            `Conta a pagar e ${successCount} documento${successCount > 1 ? 's' : ''} registado${successCount > 1 ? 's' : ''} com sucesso!`
          )
        } else if (successCount > 0 && errorCount > 0) {
          toast.warning(
            `Conta registada. ${successCount} documento${successCount > 1 ? 's' : ''} enviado${successCount > 1 ? 's' : ''} com sucesso, mas ${errorCount} falhou${errorCount > 1 ? 'ram' : ''}.`
          )
        } else {
          toast.error('Conta registada, mas erro ao enviar documentos')
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
      clearAllFiles()
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
          <FormLabel>Documentos PDF (opcional)</FormLabel>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
                className="flex-1"
              />
            </div>
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-md bg-muted/20"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate">{file.name}</span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        ({(file.size / 1024).toFixed(2)} KB)
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={uploading}
                      className="flex-shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {selectedFiles.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearAllFiles}
                    disabled={uploading}
                    className="w-full"
                  >
                    Remover Todos
                  </Button>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Pode selecionar múltiplos arquivos PDF (máximo 10MB cada)
          </p>
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

