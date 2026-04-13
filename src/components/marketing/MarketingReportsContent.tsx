import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, FileText, Download, Send, Trash2, Plus } from 'lucide-react'
import { marketingApi } from '@/services/api'
import { format } from 'date-fns'

interface Report {
  id: number
  clinic_id: string
  report_month: string
  report_type: string
  period_start: string | null
  period_end: string | null
  pdf_url: string | null
  pdf_size: number | null
  generated_at: string
  generated_by: string | null
  sent_at: string | null
  sent_to: string | null
  report_data: Record<string, any>
  metadata: Record<string, any>
}

export function MarketingReportsContent({ clinicId }: { clinicId: string }) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [emailList, setEmailList] = useState('')

  const [formData, setFormData] = useState({
    reportMonth: format(new Date(), 'yyyy-MM-01'),
    reportType: 'MONTHLY',
  })

  const loadReports = async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const data = await marketingApi.reports.list(clinicId)
      setReports(data)
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar relatórios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  const handleGenerateReport = async () => {
    if (!clinicId) return

    setLoading(true)
    try {
      await marketingApi.reports.create(clinicId, {
        reportMonth: formData.reportMonth,
        reportType: formData.reportType,
        reportData: {},
      })
      toast.success('Relatório gerado com sucesso')
      setDialogOpen(false)
      loadReports()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao gerar relatório')
    } finally {
      setLoading(false)
    }
  }

  const handleSendReport = async () => {
    if (!clinicId || !selectedReport) return
    if (!emailList.trim()) {
      toast.error('Insira pelo menos um email')
      return
    }

    setLoading(true)
    try {
      await marketingApi.reports.markAsSent(clinicId, selectedReport.id.toString(), emailList)
      toast.success('Relatório marcado como enviado')
      setSendDialogOpen(false)
      setSelectedReport(null)
      setEmailList('')
      loadReports()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao marcar relatório')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteReport = async (reportId: number) => {
    if (!clinicId) return
    if (!confirm('Tem certeza que deseja excluir este relatório?')) return

    setLoading(true)
    try {
      await marketingApi.reports.delete(clinicId, reportId.toString())
      toast.success('Relatório excluído com sucesso')
      loadReports()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir relatório')
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Relatórios de Marketing</h3>
          <p className="text-muted-foreground text-sm">
            Gere e envie relatórios mensais automatizados em PDF
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Gerar Relatório
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gerar Novo Relatório</DialogTitle>
              <DialogDescription>
                Crie um relatório mensal com todas as métricas de marketing
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Mês de Referência</Label>
                <Input
                  type="month"
                  value={formData.reportMonth.slice(0, 7)}
                  onChange={(e) =>
                    setFormData({ ...formData, reportMonth: `${e.target.value}-01` })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGenerateReport} disabled={loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Gerar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Relatórios Gerados ({reports.length})</CardTitle>
          <CardDescription>
            Histórico de relatórios mensais gerados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum relatório gerado ainda</p>
              <p className="text-sm mt-2">
                Clique em "Gerar Relatório" para criar o primeiro
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Gerado em</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enviado para</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {format(new Date(report.report_month), 'MMMM yyyy')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(report.generated_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      {report.sent_at ? (
                        <Badge className="bg-green-500">Enviado</Badge>
                      ) : (
                        <Badge variant="secondary">Pendente</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {report.sent_to || '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {report.pdf_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                          >
                            <a href={report.pdf_url} download target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedReport(report)
                            setEmailList(report.sent_to || '')
                            setSendDialogOpen(true)
                          }}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteReport(report.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como Enviado</DialogTitle>
            <DialogDescription>
              Insira os emails (separados por vírgula) para quem o relatório foi enviado
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Emails</Label>
              <Input
                type="text"
                placeholder="email1@example.com, email2@example.com"
                value={emailList}
                onChange={(e) => setEmailList(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Separe múltiplos emails com vírgula
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSendDialogOpen(false)
                setSelectedReport(null)
                setEmailList('')
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSendReport} disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
