import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Plus, TrendingUp, Clock, AlertCircle, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useAuthStore from '@/stores/useAuthStore'
import api from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/useTranslation'
import { RevenueForecastPlansSection } from '@/components/revenue-forecast/PlansSection'
import { PendingTreatmentsSection } from '@/components/revenue-forecast/PendingTreatmentsSection'
import { MonthlyCashFlowSection } from '@/components/revenue-forecast/MonthlyCashFlowSection'
import { NewRevenuePlanDialog } from '@/components/revenue-forecast/NewRevenuePlanDialog'
import { NewPendingPatientDialog } from '@/components/revenue-forecast/NewPendingPatientDialog'

export default function RevenueForecast() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { user } = useAuthStore()
  const { toast } = useToast()
  const { formatCurrency } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [treatmentsDashboard, setTreatmentsDashboard] = useState<any>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [activeTab, setActiveTab] = useState('cashflow')

  const [showNewPlanDialog, setShowNewPlanDialog] = useState(false)
  const [showNewPatientDialog, setShowNewPatientDialog] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [clinicId, refreshTrigger])

  const loadDashboardData = async () => {
    if (!clinicId) return

    setLoading(true)
    try {
      const [revenueData, treatmentsData] = await Promise.all([
        api.revenueForecast.getDashboard(clinicId),
        api.pendingTreatments.getDashboard(clinicId),
      ])

      setDashboardData(revenueData)
      setTreatmentsDashboard(treatmentsData)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar dados do dashboard',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando previsão de receitas...</p>
        </div>
      </div>
    )
  }

  const totalPotential =
    (dashboardData?.totalPending?.value || 0) + (treatmentsDashboard?.totalPendingValue || 0)

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Previsão de Receitas</h1>
          <p className="text-muted-foreground">
            Controle de receitas futuras e tratamentos pendentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNewPlanDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Receita
          </Button>
          <Button onClick={() => setShowNewPatientDialog(true)} variant="outline">
            <Plus className="w-4 h-4 mr-2" />
            Novo Tratamento Pendente
          </Button>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total A Receber */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total a Receber</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData?.totalPending?.value || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.totalPending?.count || 0} parcelas futuras
            </p>
          </CardContent>
        </Card>

        {/* Próximos 30 Dias */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos 30 Dias</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData?.next30Days?.value || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.next30Days?.count || 0} parcelas
            </p>
          </CardContent>
        </Card>

        {/* Atrasados */}
        <Card className="border-destructive/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atrasados</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(dashboardData?.overdue?.value || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData?.overdue?.count || 0} parcelas ⚠️
            </p>
          </CardContent>
        </Card>

        {/* Tratamentos Pendentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tratamentos Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(treatmentsDashboard?.totalPendingValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {treatmentsDashboard?.patientCount || 0} pacientes •{' '}
              {treatmentsDashboard?.treatmentCount || 0} tratamentos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Receita Potencial Total */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Receita Potencial Total</p>
              <p className="text-3xl font-bold text-primary">{formatCurrency(totalPotential)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Parcelas futuras + Tratamentos pendentes
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-primary/20" />
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cashflow">Fluxo de Caixa Mensal</TabsTrigger>
          <TabsTrigger value="revenues">Receitas Recorrentes</TabsTrigger>
          <TabsTrigger value="treatments">Tratamentos Pendentes</TabsTrigger>
        </TabsList>

        <TabsContent value="cashflow">
          <MonthlyCashFlowSection clinicId={clinicId!} refreshTrigger={refreshTrigger} />
        </TabsContent>

        <TabsContent value="revenues">
          <RevenueForecastPlansSection
            clinicId={clinicId!}
            refreshTrigger={refreshTrigger}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="treatments">
          <PendingTreatmentsSection
            clinicId={clinicId!}
            refreshTrigger={refreshTrigger}
            onRefresh={handleRefresh}
          />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <NewRevenuePlanDialog
        open={showNewPlanDialog}
        onOpenChange={setShowNewPlanDialog}
        clinicId={clinicId!}
        onSuccess={handleRefresh}
      />

      <NewPendingPatientDialog
        open={showNewPatientDialog}
        onOpenChange={setShowNewPatientDialog}
        clinicId={clinicId!}
        onSuccess={handleRefresh}
      />
    </div>
  )
}
