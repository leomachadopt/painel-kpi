import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Loader2, Upload, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface UploadPDFDialogProps {
  providerId: string
  providerName: string
  clinicId: string
  open: boolean
  onClose: () => void
}

export function UploadPDFDialog({
  providerId,
  providerName,
  clinicId,
  open,
  onClose
}: UploadPDFDialogProps) {
  const [processing, setProcessing] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione um arquivo PDF')
      return
    }

    setProcessing(true)
    try {
      const formData = new FormData()
      formData.append('pdf', selectedFile)
      formData.append('clinicId', clinicId)

      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const response = await fetch(`${API_BASE_URL}/insurance/${providerId}/upload-pdf`, {
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

      toast.success('PDF enviado com sucesso! Processamento iniciado.')

      // Close after a short delay
      setTimeout(() => {
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error('Error uploading PDF:', err)
      toast.error(err.message || 'Erro ao fazer upload do PDF')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enviar PDF - {providerName}</DialogTitle>
          <DialogDescription>
            Faça upload da tabela de procedimentos em PDF para extração automática pela IA
          </DialogDescription>
        </DialogHeader>

        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                <h3 className="text-lg font-semibold mb-1">
                  Extrair Dados do PDF
                </h3>
                <p className="text-sm text-muted-foreground">
                  A IA irá ler o PDF e extrair automaticamente os códigos, descrições e valores dos procedimentos
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

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={processing || !selectedFile}
          >
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar PDF
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
