import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Loader2, File, X } from 'lucide-react'
import { AccountsPayableEntry } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import useDataStore from '@/stores/useDataStore'

const schema = z.object({
  description: z.string().min(1, 'Descrição obrigatória'),
  supplierId: z.string().optional(),
  amount: z.coerce.number().min(0.01, 'Valor deve ser positivo'),
  dueDate: z.string().min(1, 'Data de vencimento obrigatória'),
  category: z.string().optional(),
  notes: z.string().optional(),
})

interface EditAccountsPayableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryId: string | null
  clinicId: string
  onSuccess?: () => void
}

export function EditAccountsPayableDialog({
  open,
  onOpenChange,
  entryId,
  clinicId,
  onSuccess,
}: EditAccountsPayableDialogProps) {
  const { updateAccountsPayableEntry } = useDataStore()
  const [entry, setEntry] = useState<AccountsPayableEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [supplierName, setSupplierName] = useState('')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [existingDocuments, setExistingDocuments] = useState<any[]>([])
  const [loadingDoc, setLoadingDoc] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (open && entryId && clinicId) {
      loadEntry()
      loadDocument()
    } else {
      setEntry(null)
      setSupplierName('')
      setSelectedFiles([])
      setExistingDocuments([])
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }, [open, entryId, clinicId])

  const loadDocument = async () => {
    if (!entryId || !clinicId) return

    setLoadingDoc(true)
    try {
      const docs = await dailyEntriesApi.accountsPayable.getDocuments(clinicId, entryId)
      setExistingDocuments(docs || [])
    } catch (error) {
      console.error('Error loading documents:', error)
      setExistingDocuments([])
    } finally {
      setLoadingDoc(false)
    }
  }

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

      // Validar tamanho (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`Arquivo "${file.name}" excede o tamanho máximo de 10MB`)
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

  const loadEntry = async () => {
    if (!entryId || !clinicId) return

    setLoading(true)
    try {
      const entries = await dailyEntriesApi.accountsPayable.getAll(clinicId)
      const foundEntry = entries.find((e) => e.id === entryId)
      if (foundEntry) {
        setEntry(foundEntry)
        // Formatar a data corretamente para o input type="date"
        let formattedDueDate = new Date().toISOString().split('T')[0]
        if (foundEntry.dueDate) {
          const dueDate = new Date(foundEntry.dueDate)
          if (!isNaN(dueDate.getTime())) {
            formattedDueDate = dueDate.toISOString().split('T')[0]
          }
        }
        form.reset({
          description: foundEntry.description || '',
          supplierId: foundEntry.supplierId || '',
          amount: foundEntry.amount || 0,
          dueDate: formattedDueDate,
          category: foundEntry.category || '',
          notes: foundEntry.notes || '',
        })
        setSupplierName(foundEntry.supplierName || '')
      }
    } catch (error) {
      console.error('Error loading entry:', error)
      toast.error('Erro ao carregar conta a pagar')
      setEntry(null)
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!entry || !entryId || !clinicId) return

    try {
      setSaving(true)

      const updatedEntry: AccountsPayableEntry = {
        ...entry,
        description: data.description,
        supplierId: data.supplierId || null,
        amount: data.amount,
        dueDate: data.dueDate,
        category: data.category || null,
        notes: data.notes || null,
        // Manter o status de pagamento e data de pagamento
        paid: entry.paid,
        paidDate: entry.paidDate,
      }

      await updateAccountsPayableEntry(clinicId, entryId, updatedEntry)

      // Se houver arquivos, fazer upload de todos
      if (selectedFiles.length > 0 && entryId) {
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
              clinicId,
              entryId,
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
            `Conta a pagar e ${successCount} documento${successCount > 1 ? 's' : ''} atualizado${successCount > 1 ? 's' : ''} com sucesso!`
          )
        } else if (successCount > 0 && errorCount > 0) {
          toast.warning(
            `Conta atualizada. ${successCount} documento${successCount > 1 ? 's' : ''} enviado${successCount > 1 ? 's' : ''} com sucesso, mas ${errorCount} falhou${errorCount > 1 ? 'ram' : ''}.`
          )
        } else {
          toast.error('Conta atualizada, mas erro ao enviar documentos')
        }
      } else {
        toast.success('Conta a pagar atualizada com sucesso!')
      }
      
      onOpenChange(false)
      onSuccess?.()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar conta a pagar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Conta a Pagar</DialogTitle>
          <DialogDescription>
            Atualize as informações da conta a pagar
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : entry ? (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              noValidate
              className="space-y-4"
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
                        clinicId={clinicId}
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
                        clinicId={clinicId}
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
                  {loadingDoc ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : existingDocuments.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Documentos existentes ({existingDocuments.length}):
                      </p>
                      {existingDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-md bg-muted/20"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <File className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{doc.originalFilename}</p>
                              <p className="text-xs text-muted-foreground">
                                {(doc.fileSize / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      multiple
                      onChange={handleFileSelect}
                      disabled={saving}
                      className="flex-1"
                    />
                  </div>
                  {selectedFiles.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        Novos documentos a adicionar ({selectedFiles.length}):
                      </p>
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
                            disabled={saving}
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
                          disabled={saving}
                          className="w-full"
                        >
                          Remover Todos os Novos
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pode selecionar múltiplos arquivos PDF para adicionar (máximo 10MB cada)
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    'Guardar Alterações'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <p>Conta a pagar não encontrada</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

