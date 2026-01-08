import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, File, Download, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { AccountsPayableEntry } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'

interface ViewAccountsPayableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entryId: string | null
  clinicId: string
}

export function ViewAccountsPayableDialog({
  open,
  onOpenChange,
  entryId,
  clinicId,
}: ViewAccountsPayableDialogProps) {
  const [entry, setEntry] = useState<AccountsPayableEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [document, setDocument] = useState<any | null>(null)
  const [loadingDoc, setLoadingDoc] = useState(false)

  useEffect(() => {
    if (open && entryId && clinicId) {
      loadEntry()
      loadDocument()
    } else {
      setEntry(null)
      setDocument(null)
    }
  }, [open, entryId, clinicId])

  const loadEntry = async () => {
    if (!entryId || !clinicId) return

    setLoading(true)
    try {
      const entries = await dailyEntriesApi.accountsPayable.getAll(clinicId)
      const foundEntry = entries.find((e) => e.id === entryId)
      setEntry(foundEntry || null)
    } catch (error) {
      console.error('Error loading entry:', error)
      setEntry(null)
    } finally {
      setLoading(false)
    }
  }

  const loadDocument = async () => {
    if (!entryId || !clinicId) return

    setLoadingDoc(true)
    try {
      const docs = await dailyEntriesApi.accountsPayable.getDocuments(clinicId, entryId)
      if (docs && docs.length > 0) {
        setDocument(docs[0]) // Pegar o primeiro documento
      } else {
        setDocument(null)
      }
    } catch (error) {
      console.error('Error loading document:', error)
      setDocument(null)
    } finally {
      setLoadingDoc(false)
    }
  }

  const handleViewDocument = async () => {
    if (!document || !entryId || !clinicId) return

    try {
      const blob = await dailyEntriesApi.accountsPayable.downloadDocument(
        clinicId,
        entryId,
        document.id
      )
      
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error: any) {
      toast.error('Erro ao visualizar documento')
    }
  }

  const handleDownloadDocument = async () => {
    if (!document || !entryId || !clinicId) return

    try {
      const blob = await dailyEntriesApi.accountsPayable.downloadDocument(
        clinicId,
        entryId,
        document.id
      )
      
      const url = window.URL.createObjectURL(blob)
      const a = window.document.createElement('a')
      a.href = url
      a.download = document.originalFilename
      window.document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      window.document.body.removeChild(a)
    } catch (error: any) {
      toast.error('Erro ao baixar documento')
    }
  }

  const getStatusBadge = (entry: AccountsPayableEntry) => {
    if (entry.paid) {
      return { label: 'Paga', variant: 'default' as const, color: 'bg-green-500' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(entry.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { label: 'Vencida', variant: 'destructive' as const, color: 'bg-purple-500' }
    } else if (diffDays === 0) {
      return { label: 'Vence Hoje', variant: 'destructive' as const, color: 'bg-red-500' }
    } else if (diffDays <= 7) {
      return { label: 'Vence em ' + diffDays + ' dias', variant: 'secondary' as const, color: 'bg-yellow-500' }
    } else {
      return { label: 'Pendente', variant: 'outline' as const, color: 'bg-gray-500' }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes da Conta a Pagar</DialogTitle>
          <DialogDescription>
            Visualize todas as informações da conta
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : entry ? (
          <div className="space-y-6">
            {/* Informações Básicas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Descrição</label>
                <p className="text-base font-medium">{entry.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div className="mt-1">
                  {(() => {
                    const status = getStatusBadge(entry)
                    return (
                      <Badge variant={status.variant} className={status.color + ' text-white'}>
                        {status.label}
                      </Badge>
                    )
                  })()}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Fornecedor</label>
                <p className="text-base">{entry.supplierName || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Categoria</label>
                <p className="text-base">{entry.category || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Valor</label>
                <p className="text-base font-semibold">
                  {new Intl.NumberFormat('pt-PT', {
                    style: 'currency',
                    currency: 'EUR',
                  }).format(entry.amount)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Vencimento</label>
                <p className="text-base">
                  {format(new Date(entry.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
              {entry.paid && entry.paidDate && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Pagamento</label>
                  <p className="text-base">
                    {format(new Date(entry.paidDate), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              )}
              {entry.createdAt && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                  <p className="text-base">
                    {format(new Date(entry.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </p>
                </div>
              )}
            </div>

            {/* Observações */}
            {entry.notes && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Observações</label>
                <div className="mt-2 p-4 bg-muted rounded-lg">
                  <p className="text-base whitespace-pre-wrap">{entry.notes}</p>
                </div>
              </div>
            )}

            {!entry.notes && (
              <div className="text-center py-4 text-muted-foreground">
                <p>Nenhuma observação registrada</p>
              </div>
            )}

            {/* Seção de Documento */}
            <div className="border-t pt-4">
              <label className="text-sm font-medium text-muted-foreground mb-2 block">
                Documento
              </label>
              {loadingDoc ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : document ? (
                <div className="flex items-center justify-between p-3 border rounded-md bg-muted/20">
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{document.originalFilename}</p>
                      <p className="text-xs text-muted-foreground">
                        {(document.fileSize / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleViewDocument}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDownloadDocument}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>Nenhum documento anexado</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center p-8 text-muted-foreground">
            <p>Conta a pagar não encontrada</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}



