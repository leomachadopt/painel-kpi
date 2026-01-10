import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, Upload, Search, Link as LinkIcon, Save } from 'lucide-react'

interface ProcessingProgressIndicatorProps {
  documentId: string
  onComplete?: () => void
}

interface ProcessingStatus {
  progress: number
  stage: string
  status: string
}

const stageIcons = {
  UPLOADING: Upload,
  EXTRACTING: Search,
  MATCHING: LinkIcon,
  SAVING: Save,
  COMPLETED: CheckCircle,
  FAILED: XCircle
}

const stageLabels = {
  UPLOADING: 'Enviando PDF...',
  EXTRACTING: 'Extraindo procedimentos...',
  MATCHING: 'Pareando com tabela base...',
  SAVING: 'Salvando mapeamentos...',
  COMPLETED: 'Concluído!',
  FAILED: 'Erro no processamento'
}

export function ProcessingProgressIndicator({ documentId, onComplete }: ProcessingProgressIndicatorProps) {
  const [status, setStatus] = useState<ProcessingStatus>({
    progress: 0,
    stage: 'UPLOADING',
    status: 'PROCESSING'
  })

  useEffect(() => {
    const pollProgress = async () => {
      try {
        const token = localStorage.getItem('kpi_token')
        const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

        const response = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/status`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const data = await response.json()
          setStatus({
            progress: data.processing_progress || 0,
            stage: data.processing_stage || 'UPLOADING',
            status: data.processing_status || 'PROCESSING'
          })

          // Se completou ou falhou, para o polling
          if (data.processing_status === 'COMPLETED' || data.processing_status === 'FAILED') {
            if (data.processing_status === 'COMPLETED' && onComplete) {
              onComplete()
            }
            return
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error)
      }
    }

    // Poll inicial
    pollProgress()

    // Poll a cada 2 segundos
    const interval = setInterval(pollProgress, 2000)

    return () => clearInterval(interval)
  }, [documentId, onComplete])

  const Icon = stageIcons[status.stage] || Loader2
  const isCompleted = status.status === 'COMPLETED'
  const isFailed = status.status === 'FAILED'

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {isCompleted ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : isFailed ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : (
              <Icon className="h-5 w-5 text-blue-600 animate-spin" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">
                {stageLabels[status.stage] || 'Processando...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {status.progress}% completo
              </p>
            </div>
          </div>

          <Progress
            value={status.progress}
            className={`h-2 ${
              isCompleted ? 'bg-green-100' :
              isFailed ? 'bg-red-100' :
              'bg-blue-100'
            }`}
          />

          {isCompleted && (
            <p className="text-xs text-green-600 font-medium">
              ✓ Procedimentos extraídos e pareados com sucesso
            </p>
          )}

          {isFailed && (
            <p className="text-xs text-red-600 font-medium">
              ✗ Houve um erro no processamento. Tente novamente.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
