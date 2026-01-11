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
import { Loader2, Upload, FileCode } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface UploadJSONDialogProps {
  providerId: string
  providerName: string
  clinicId: string
  open: boolean
  onClose: () => void
}

export function UploadJSONDialog({
  providerId,
  providerName,
  clinicId,
  open,
  onClose
}: UploadJSONDialogProps) {
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewData, setPreviewData] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.json') && file.type !== 'application/json') {
        toast.error('Apenas arquivos JSON são permitidos')
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Arquivo muito grande. Tamanho máximo: 5MB')
        return
      }

      // Preview do JSON para validação
      try {
        const text = await file.text()
        const jsonData = JSON.parse(text)
        
        if (!jsonData.procedures || !Array.isArray(jsonData.procedures)) {
          toast.error('Formato JSON inválido. Esperado: { "procedures": [...] }')
          return
        }

        if (jsonData.procedures.length === 0) {
          toast.error('O arquivo JSON não contém procedimentos')
          return
        }

        // Validar que todos têm código
        const invalidProcedures = jsonData.procedures.filter((p: any) => !p.code)
        if (invalidProcedures.length > 0) {
          toast.error(`${invalidProcedures.length} procedimento(s) sem código obrigatório`)
          return
        }

        setPreviewData({
          total: jsonData.procedures.length,
          samples: jsonData.procedures.slice(0, 5)
        })
        setSelectedFile(file)
        toast.success(`Arquivo válido! ${jsonData.procedures.length} procedimentos encontrados.`)
      } catch (parseError: any) {
        toast.error(`Erro ao ler JSON: ${parseError.message}`)
        return
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione um arquivo JSON')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('json', selectedFile)
      formData.append('clinicId', clinicId)

      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const response = await fetch(`${API_BASE_URL}/insurance/${providerId}/upload-json`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.details || 'Erro ao fazer upload do JSON')
      }

      const data = await response.json()
      toast.success(data.message || `JSON carregado com sucesso! ${data.proceduresCount || 0} procedimentos importados.`)
      
      // Fechar o dialog após upload bem-sucedido
      // Os procedimentos podem ser visualizados em "Ver Pareamento"
      setSelectedFile(null)
      setPreviewData(null)
      onClose()
    } catch (err: any) {
      console.error('Error uploading JSON:', err)
      toast.error(err.message || 'Erro ao fazer upload do JSON')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Carregar JSON - {providerName}</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo JSON com os procedimentos já extraídos
          </DialogDescription>
        </DialogHeader>

        <Card className="border-dashed">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center">
                  <FileCode className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                  <h3 className="text-lg font-semibold mb-1">
                    Carregar Dados do JSON
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Faça upload de um arquivo JSON no formato: {"{ \"procedures\": [...] }"}
                  </p>
                </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleFileSelect}
                className="hidden"
              />

              {selectedFile && previewData ? (
                <div className="space-y-3">
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileCode className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{selectedFile.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(selectedFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null)
                          setPreviewData(null)
                        }}
                        disabled={uploading}
                        type="button"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium mb-2">
                      📊 Preview dos Dados
                    </p>
                    <p className="text-sm text-muted-foreground mb-3">
                      Total de procedimentos: <strong>{previewData.total}</strong>
                    </p>
                    {previewData.samples.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Primeiros exemplos:
                        </p>
                        {previewData.samples.map((proc: any, idx: number) => (
                          <div key={idx} className="text-xs bg-white dark:bg-gray-800 p-2 rounded border">
                            <span className="font-mono font-medium">{proc.code}</span>
                            {' - '}
                            <span className="text-muted-foreground">
                              {proc.description?.substring(0, 40) || 'Sem descrição'}
                              {proc.description && proc.description.length > 40 ? '...' : ''}
                            </span>
                            {proc.value && (
                              <span className="ml-2 text-green-600 dark:text-green-400">
                                (€{proc.value})
                              </span>
                            )}
                          </div>
                        ))}
                        {previewData.total > 5 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            ... e mais {previewData.total - 5} procedimentos
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Selecionar JSON
                </Button>
              )}

                <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                  <p className="font-medium mb-1">Formato esperado:</p>
                  <pre className="text-xs overflow-x-auto">
{`{
  "procedures": [
    {
      "code": "61851",
      "description": "CONSULTA ODONTO-ESTOMATOLOGICA",
      "value": 15.75
    },
    ...
  ]
}`}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={uploading}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading || !selectedFile}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Carregar JSON
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

