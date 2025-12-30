import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SummaryData } from '@/lib/summary'
import { Copy, Check, FileText } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface SummaryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  summary: SummaryData
}

export function SummaryModal({
  open,
  onOpenChange,
  summary,
}: SummaryModalProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  const handleCopy = () => {
    navigator.clipboard.writeText(summary.fullText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Resumo para Reunião
          </DialogTitle>
          <DialogDescription>
            Resumo gerado automaticamente com base nos KPIs e alertas do mês.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Strengths */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-emerald-600">
                ✅ Pontos Fortes
              </h3>
              <ul className="space-y-2">
                {summary.strengths.length > 0 ? (
                  summary.strengths.map((s, i) => (
                    <li
                      key={i}
                      className="border-l-2 border-emerald-200 pl-3 py-1 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {s.name}
                      </span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span>{s.value}</span>
                      <span
                        className={cn(
                          'ml-2 rounded px-1.5 py-0.5 text-xs',
                          s.change >= 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600',
                        )}
                      >
                        {s.change > 0 ? '+' : ''}
                        {s.change.toFixed(1)}%
                      </span>
                    </li>
                  ))
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    Nenhum ponto forte destacado.
                  </p>
                )}
              </ul>
            </div>

            {/* Critical Points */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-rose-600">
                ⚠️ Pontos Críticos
              </h3>
              <ul className="space-y-2">
                {summary.criticalPoints.length > 0 ? (
                  summary.criticalPoints.map((c, i) => (
                    <li
                      key={i}
                      className="border-l-2 border-rose-200 pl-3 py-1 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {c.name}
                      </span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      <span>{c.value}</span>
                      <span
                        className={cn(
                          'ml-2 rounded px-1.5 py-0.5 text-xs',
                          c.change >= 0
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-rose-50 text-rose-600',
                        )}
                      >
                        {c.change > 0 ? '+' : ''}
                        {c.change.toFixed(1)}%
                      </span>
                    </li>
                  ))
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    Nenhum ponto crítico destacado.
                  </p>
                )}
              </ul>
            </div>

            {/* Actions */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-blue-600">
                🚀 Ações Recomendadas
              </h3>
              <div className="rounded-lg bg-slate-50 p-4">
                <ul className="space-y-2">
                  {summary.actions.length > 0 ? (
                    summary.actions.map((action, i) => (
                      <li key={i} className="flex gap-2 text-sm text-slate-700">
                        <span className="font-bold text-blue-500">•</span>
                        {action}
                      </li>
                    ))
                  ) : (
                    <p className="text-sm italic text-muted-foreground">
                      Manter monitoramento constante.
                    </p>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="items-center border-t pt-4 sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Copie o texto para colar em e-mails ou documentos.
          </p>
          <Button onClick={handleCopy} className="gap-2 min-w-[120px]">
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? 'Copiado!' : 'Copiar Texto'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
