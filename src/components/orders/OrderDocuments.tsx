import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, File, Download, Eye, Trash2, Loader2, X } from 'lucide-react'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import { OrderDocument } from '@/lib/types'

interface OrderDocumentsProps {
  orderId: string
  clinicId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function OrderDocuments({
  orderId,
  clinicId,
  open,
  onOpenChange,
}: OrderDocumentsProps) {
  const [documents, setDocuments] = useState<OrderDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open && orderId && clinicId) {
      loadDocuments()
    }
  }, [open, orderId, clinicId])

  const loadDocuments = async () => {
    if (!orderId || !clinicId) return

    setLoading(true)
    try {
      const docs = await dailyEntriesApi.order.getDocuments(clinicId, orderId)
      setDocuments(docs)
    } catch (error: any) {
      console.error('Error loading documents:', error)
      toast.error('Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar tamanho (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 10MB')
      return
    }

    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    if (!orderId || !clinicId) return

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string
          await dailyEntriesApi.order.uploadDocument(
            clinicId,
            orderId,
            base64,
            file.name,
            file.type
          )
          toast.success('Documento enviado com sucesso!')
          loadDocuments()
          // Limpar input
          if (fileInput) {
            fileInput.value = ''
          }
        } catch (error: any) {
          toast.error(error?.message || 'Erro ao enviar documento')
        } finally {
          setUploading(false)
        }
      }
      reader.onerror = () => {
        toast.error('Erro ao ler arquivo')
        setUploading(false)
      }
      reader.readAsDataURL(file)
    } catch (error: any) {
      toast.error('Erro ao processar arquivo')
      setUploading(false)
    }
  }

  const handleDownload = async (document: OrderDocument) => {
    try {
      const blob = await dailyEntriesApi.order.downloadDocument(
        clinicId,
        orderId,
        document.id
      )
      
      // Criar URL temporária e fazer download
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = document.originalFilename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      toast.error('Erro ao baixar documento')
    }
  }

  const handleView = async (document: OrderDocument) => {
    try {
      const blob = await dailyEntriesApi.order.downloadDocument(
        clinicId,
        orderId,
        document.id
      )
      
      // Criar URL temporária e abrir em nova aba
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
      // Não revogar imediatamente para permitir visualização
      setTimeout(() => window.URL.revokeObjectURL(url), 1000)
    } catch (error: any) {
      toast.error('Erro ao visualizar documento')
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return

    setDeletingId(documentId)
    try {
      await dailyEntriesApi.order.deleteDocument(clinicId, orderId, documentId)
      toast.success('Documento excluído com sucesso!')
      loadDocuments()
    } catch (error: any) {
      toast.error('Erro ao excluir documento')
    } finally {
      setDeletingId(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos do Pedido</DialogTitle>
          <DialogDescription>
            Faça upload, visualize ou baixe documentos relacionados a este pedido
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload */}
          <div className="flex items-center gap-2 p-4 border rounded-md bg-muted/20">
            <Input
              ref={setFileInput}
              type="file"
              onChange={handleFileSelect}
              disabled={uploading}
              className="flex-1"
              accept="*/*"
            />
            {uploading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Lista de Documentos */}
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <File className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum documento enviado ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {doc.originalFilename}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.fileSize)} •{' '}
                        {new Date(doc.uploadedAt).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(doc)}
                      title="Visualizar"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(doc.id)}
                      disabled={deletingId === doc.id}
                      title="Excluir"
                      className="text-destructive hover:text-destructive"
                    >
                      {deletingId === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

