import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, File, Download, Eye, Trash2, Loader2, FileText, Image as ImageIcon, FileCheck, FileQuestion } from 'lucide-react'
import { patientsApi } from '@/services/api'
import { toast } from 'sonner'
import { PatientDocument } from '@/lib/types'
import { Badge } from '@/components/ui/badge'

interface PatientDocumentsProps {
  patientId: string
  clinicId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DOCUMENT_TYPE_LABELS = {
  medical_record: { label: 'Ficha Médica', icon: FileText, color: 'bg-blue-100 text-blue-800' },
  exam: { label: 'Exame', icon: FileCheck, color: 'bg-green-100 text-green-800' },
  image: { label: 'Imagem', icon: ImageIcon, color: 'bg-purple-100 text-purple-800' },
  consent: { label: 'Termo de Consentimento', icon: FileCheck, color: 'bg-orange-100 text-orange-800' },
  other: { label: 'Outro', icon: FileQuestion, color: 'bg-gray-100 text-gray-800' },
}

export function PatientDocuments({
  patientId,
  clinicId,
  open,
  onOpenChange,
}: PatientDocumentsProps) {
  const [documents, setDocuments] = useState<PatientDocument[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [fileInput, setFileInput] = useState<HTMLInputElement | null>(null)
  const [documentType, setDocumentType] = useState<string>('other')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (open && patientId && clinicId) {
      loadDocuments()
    }
  }, [open, patientId, clinicId])

  const loadDocuments = async () => {
    if (!patientId || !clinicId) return

    setLoading(true)
    try {
      const docs = await patientsApi.getDocuments(clinicId, patientId)
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

    // Validar tamanho (max 3MB devido ao limite de 4.5MB do body JSON em base64)
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Arquivo deve ter no máximo 3MB')
      return
    }

    uploadFile(file)
  }

  const uploadFile = async (file: File) => {
    if (!patientId || !clinicId) return

    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string
          await patientsApi.uploadDocument(
            clinicId,
            patientId,
            base64,
            file.name,
            file.type,
            documentType,
            description || undefined
          )
          toast.success('Documento enviado com sucesso!')
          loadDocuments()
          // Limpar input e formulário
          if (fileInput) {
            fileInput.value = ''
          }
          setDescription('')
          setDocumentType('other')
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

  const handleDownload = async (document: PatientDocument) => {
    try {
      const result = await patientsApi.downloadDocument(
        clinicId,
        patientId,
        document.id
      )

      // Usar a URL do Cloudinary diretamente para download
      const a = window.document.createElement('a')
      a.href = result.url
      a.download = result.filename || document.originalFilename
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      window.document.body.appendChild(a)
      a.click()
      window.document.body.removeChild(a)
    } catch (error: any) {
      toast.error('Erro ao baixar documento')
    }
  }

  const handleView = async (document: PatientDocument) => {
    try {
      const result = await patientsApi.downloadDocument(
        clinicId,
        patientId,
        document.id
      )

      // Abrir URL do Cloudinary diretamente em nova aba
      window.open(result.url, '_blank')
    } catch (error: any) {
      toast.error('Erro ao visualizar documento')
    }
  }

  const handleDelete = async (documentId: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return

    setDeletingId(documentId)
    try {
      await patientsApi.deleteDocument(clinicId, patientId, documentId)
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

  const getDocumentTypeInfo = (type: string | null | undefined) => {
    const key = (type || 'other') as keyof typeof DOCUMENT_TYPE_LABELS
    return DOCUMENT_TYPE_LABELS[key] || DOCUMENT_TYPE_LABELS.other
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Documentos do Paciente</DialogTitle>
          <DialogDescription>
            Faça upload, visualize ou baixe documentos relacionados a este paciente (fichas médicas, exames, imagens, etc.)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload */}
          <div className="p-4 border rounded-md bg-muted/20 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="documentType">Tipo de Documento</Label>
              <Select value={documentType} onValueChange={setDocumentType}>
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medical_record">Ficha Médica</SelectItem>
                  <SelectItem value="exam">Exame</SelectItem>
                  <SelectItem value="image">Imagem</SelectItem>
                  <SelectItem value="consent">Termo de Consentimento</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Radiografia panorâmica de 05/01/2024"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2">
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
            <p className="text-xs text-muted-foreground">
              Tamanho máximo: 3MB
            </p>
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
              {documents.map((doc) => {
                const typeInfo = getDocumentTypeInfo(doc.documentType)
                const TypeIcon = typeInfo.icon
                return (
                  <div
                    key={doc.id}
                    className="flex items-start justify-between p-3 border rounded-md hover:bg-muted/50"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <TypeIcon className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {doc.originalFilename}
                          </p>
                          <Badge variant="outline" className={`text-xs ${typeInfo.color}`}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                        {doc.description && (
                          <p className="text-xs text-muted-foreground mb-1">
                            {doc.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.fileSize)} •{' '}
                          {new Date(doc.uploadedAt).toLocaleDateString('pt-PT', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
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
                )
              })}
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
