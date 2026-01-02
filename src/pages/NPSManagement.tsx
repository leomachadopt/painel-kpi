import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import {
  Plus,
  Send,
  Copy,
  Trash2,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { MONTHS } from '@/lib/types'

// Helper to get auth token
const getAuthToken = () => localStorage.getItem('kpi_token')

interface NPSSurvey {
  id: string
  patientName: string
  patientEmail?: string
  patientCode?: string
  token: string
  score?: number
  feedback?: string
  status: 'PENDING' | 'SENT' | 'RESPONDED' | 'EXPIRED'
  sentAt?: string
  respondedAt?: string
  expiresAt: string
  surveyMonth: number
  surveyYear: number
  createdAt: string
}

interface NPSStats {
  nps: number
  promoters: number
  passives: number
  detractors: number
  total: number
  averageScore: string
}

export default function NPSManagement() {
  const { clinicId } = useParams<{ clinicId: string }>()

  const [surveys, setSurveys] = useState<NPSSurvey[]>([])
  const [stats, setStats] = useState<NPSStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  const currentMonth = new Date().getMonth() + 1
  const currentYear = new Date().getFullYear()

  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString())
  const [selectedYear, setSelectedYear] = useState(currentYear.toString())

  // Form state
  const [patientName, setPatientName] = useState('')
  const [patientEmail, setPatientEmail] = useState('')
  const [patientCode, setPatientCode] = useState('')

  useEffect(() => {
    loadSurveys()
    loadStats()
  }, [clinicId, selectedMonth, selectedYear])

  const loadSurveys = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(
        `/api/nps/${clinicId}/surveys?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) throw new Error('Failed to load surveys')

      const data = await response.json()
      setSurveys(data.surveys)
    } catch (error) {
      console.error('Error loading surveys:', error)
      toast.error('Erro ao carregar pesquisas NPS')
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(
        `/api/nps/${clinicId}/calculate?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      )

      if (!response.ok) throw new Error('Failed to load stats')

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const createSurvey = async () => {
    if (!patientName.trim()) {
      toast.error('Nome do paciente é obrigatório')
      return
    }

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/nps/${clinicId}/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          patientName: patientName.trim(),
          patientEmail: patientEmail.trim() || undefined,
          patientCode: patientCode.trim() || undefined,
          surveyMonth: parseInt(selectedMonth),
          surveyYear: parseInt(selectedYear),
        }),
      })

      if (!response.ok) throw new Error('Failed to create survey')

      const data = await response.json()

      toast.success('Pesquisa NPS criada com sucesso!')

      // Generate correct link (using /survey instead of /nps)
      const surveyLink = `${window.location.origin}/survey/${data.token}`

      // Copy link to clipboard
      navigator.clipboard.writeText(surveyLink)
      toast.success('Link copiado para área de transferência!')

      setIsCreateDialogOpen(false)
      setPatientName('')
      setPatientEmail('')
      setPatientCode('')

      loadSurveys()
    } catch (error) {
      console.error('Error creating survey:', error)
      toast.error('Erro ao criar pesquisa NPS')
    }
  }

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/survey/${token}`
    navigator.clipboard.writeText(link)
    toast.success('Link copiado!')
  }

  const deleteSurvey = async (surveyId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta pesquisa?')) return

    try {
      const token = getAuthToken()
      const response = await fetch(`/api/nps/${clinicId}/surveys/${surveyId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })

      if (!response.ok) throw new Error('Failed to delete survey')

      toast.success('Pesquisa excluída com sucesso!')
      loadSurveys()
      loadStats()
    } catch (error) {
      console.error('Error deleting survey:', error)
      toast.error('Erro ao excluir pesquisa')
    }
  }

  const getScoreColor = (score?: number) => {
    if (score === undefined) return 'text-gray-400'
    if (score >= 9) return 'text-green-600 font-semibold'
    if (score >= 7) return 'text-yellow-600'
    return 'text-red-600 font-semibold'
  }

  const getScoreLabel = (score?: number) => {
    if (score === undefined) return '-'
    if (score >= 9) return 'Promotor'
    if (score >= 7) return 'Neutro'
    return 'Detrator'
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: { variant: 'secondary', label: 'Pendente' },
      SENT: { variant: 'default', label: 'Enviado' },
      RESPONDED: { variant: 'success', label: 'Respondido' },
      EXPIRED: { variant: 'destructive', label: 'Expirado' },
    }

    const config = variants[status] || { variant: 'secondary', label: status }
    return (
      <Badge variant={config.variant as any}>{config.label}</Badge>
    )
  }

  const getNPSIcon = () => {
    if (!stats) return <Minus className="h-4 w-4" />
    if (stats.nps >= 50) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (stats.nps >= 0) return <Minus className="h-4 w-4 text-yellow-600" />
    return <TrendingDown className="h-4 w-4 text-red-600" />
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestão NPS</h1>
          <p className="text-muted-foreground">
            Net Promoter Score - Satisfação dos Pacientes
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Pesquisa
            </Button>
          </DialogTrigger>
          <DialogContent aria-describedby="nps-dialog-description">
            <DialogHeader>
              <DialogTitle>Criar Pesquisa NPS</DialogTitle>
              <p id="nps-dialog-description" className="text-sm text-muted-foreground">
                Preencha os dados do paciente para gerar um link de avaliação NPS
              </p>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Nome do Paciente *</Label>
                <Input
                  id="patientName"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Digite o nome do paciente"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientEmail">Email (opcional)</Label>
                <Input
                  id="patientEmail"
                  type="email"
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="patientCode">Código do Paciente (opcional)</Label>
                <Input
                  id="patientCode"
                  value={patientCode}
                  onChange={(e) => setPatientCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
              </div>

              <Button onClick={createSurvey} className="w-full">
                Criar e Copiar Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>Mês</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month, idx) => (
                    <SelectItem key={idx} value={(idx + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                loadSurveys()
                loadStats()
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">NPS Score</CardTitle>
              {getNPSIcon()}
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.nps}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.total} respostas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">
                Promotores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.promoters}</div>
              <p className="text-xs text-muted-foreground">Score 9-10</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">
                Neutros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.passives}</div>
              <p className="text-xs text-muted-foreground">Score 7-8</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">
                Detratores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.detractors}</div>
              <p className="text-xs text-muted-foreground">Score 0-6</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Surveys Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pesquisas Enviadas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">
              Carregando...
            </p>
          ) : surveys.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              Nenhuma pesquisa encontrada para este período
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data Criação</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {surveys.map((survey) => (
                  <TableRow key={survey.id}>
                    <TableCell className="font-medium">
                      {survey.patientName}
                    </TableCell>
                    <TableCell>{survey.patientCode || '-'}</TableCell>
                    <TableCell>{getStatusBadge(survey.status)}</TableCell>
                    <TableCell>
                      <span className={getScoreColor(survey.score)}>
                        {survey.score ?? '-'}
                      </span>
                      {survey.score !== undefined && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({getScoreLabel(survey.score)})
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {survey.feedback && (
                        <div className="max-w-xs truncate" title={survey.feedback}>
                          {survey.feedback}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(survey.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(survey.expiresAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLink(survey.token)}
                          title="Copiar link"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSurvey(survey.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
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
    </div>
  )
}
