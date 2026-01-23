import { useEffect, useState, useRef } from 'react'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, CheckCircle, XCircle, Upload, Search, Link as LinkIcon, Save } from 'lucide-react'
import { toast } from 'sonner'

interface ProcessingProgressIndicatorProps {
  documentId: string
  onComplete?: () => void
}

interface ProcessingStatus {
  progress: number
  stage: string
  status: string
}

// ===================================================================
// OTIMIZAÇÃO: Constantes de timeout e backoff
// ===================================================================
const MAX_PROCESSING_DURATION = 5 * 60 * 1000 // 5 minutos
const INITIAL_POLL_INTERVAL = 3000 // 3s (aumentado de 2s)
const SLOW_POLL_INTERVAL = 5000 // 5s para progresso lento

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

  // Refs para controlar timeout e cleanup
  const startTimeRef = useRef(Date.now())
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)
  const hasTimedOutRef = useRef(false)

  useEffect(() => {
    startTimeRef.current = Date.now()
    hasTimedOutRef.current = false

    // ===================================================================
    // OTIMIZAÇÃO: Polling com backoff progressivo e timeout
    // ===================================================================
    // ANTES: 2s fixo = 30 req/min
    // DEPOIS: 3-5s adaptativo = 12-20 req/min + timeout de segurança
    // ===================================================================
    const pollProgress = async () => {
      // Verificar timeout de segurança
      const elapsedTime = Date.now() - startTimeRef.current
      if (elapsedTime > MAX_PROCESSING_DURATION) {
        if (!hasTimedOutRef.current) {
          hasTimedOutRef.current = true
          setStatus(prev => ({ ...prev, status: 'FAILED' }))
          toast.error(
            'Processamento excedeu tempo limite (5 minutos). ' +
            'Por favor, recarregue a página e tente novamente.'
          )
        }
        return
      }

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
          const newStatus = {
            progress: data.processing_progress || 0,
            stage: data.processing_stage || 'UPLOADING',
            status: data.processing_status || 'PROCESSING'
          }
          setStatus(newStatus)

          // Se completou ou falhou, para o polling
          if (data.processing_status === 'COMPLETED' || data.processing_status === 'FAILED') {
            if (data.processing_status === 'COMPLETED' && onComplete) {
              onComplete()
            }
            return
          }

          // Backoff adaptativo baseado no progresso
          let nextInterval = INITIAL_POLL_INTERVAL
          if (newStatus.progress < 20) {
            // Início lento: 5s
            nextInterval = SLOW_POLL_INTERVAL
          } else if (newStatus.progress < 80) {
            // Meio: 3s
            nextInterval = INITIAL_POLL_INTERVAL
          } else {
            // Final rápido: 2s
            nextInterval = 2000
          }

          // Agendar próximo poll
          timeoutIdRef.current = setTimeout(pollProgress, nextInterval)
        } else {
          // Retry em caso de erro HTTP com intervalo maior
          timeoutIdRef.current = setTimeout(pollProgress, SLOW_POLL_INTERVAL)
        }
      } catch (error) {
        console.error('Error polling progress:', error)
        // Retry em caso de erro de rede com intervalo maior
        timeoutIdRef.current = setTimeout(pollProgress, SLOW_POLL_INTERVAL)
      }
    }

    // Iniciar polling
    pollProgress()

    // Cleanup: cancelar timeout pendente
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
        timeoutIdRef.current = null
      }
    }
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
