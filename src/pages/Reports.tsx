import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  FileText,
  Lock,
  ChevronDown,
  Calendar as CalendarIcon,
  LayoutGrid,
  List,
  CalendarCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useDataStore from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'
import { FinancialTable } from '@/components/reports/FinancialTable'
import { ConsultationTable } from '@/components/reports/ConsultationTable'
import { ConsultationKanban } from '@/components/reports/ConsultationKanban'
import { ProspectingTable } from '@/components/reports/ProspectingTable'
import { CabinetTable } from '@/components/reports/CabinetTable'
import { ServiceTimeTable } from '@/components/reports/ServiceTimeTable'
import { SourceTable } from '@/components/reports/SourceTable'
import { ConsultationControlTable } from '@/components/reports/ConsultationControlTable'
import { MarketingReport } from '@/components/reports/MarketingReport'

export default function Reports() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const navigate = useNavigate()
  const {
    clinics,
    getClinic,
    financialEntries,
    consultationEntries,
    prospectingEntries,
    cabinetEntries,
    serviceTimeEntries,
    sourceEntries,
    consultationControlEntries,
  } = useDataStore()
  const { user } = useAuthStore()

  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split('T')[0],
  )
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [, setReloadTrigger] = useState(0)
  const [consultationView, setConsultationView] = useState<'table' | 'kanban'>('kanban')

  const handleDataChange = () => {
    setReloadTrigger(prev => prev + 1)
    // Recarregar dados da API (a implementar se necessário)
    window.location.reload()
  }

  const clinic = clinicId ? getClinic(clinicId) : undefined

  // Role Access Control
  const isMentor = user?.role === 'MENTOR'
  const hasAccess =
    isMentor || (user?.role === 'GESTOR_CLINICA' && user.clinicId === clinicId)

  if (!clinic) return <div className="p-8">Clínica não encontrada.</div>

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <Lock className="h-12 w-12 text-destructive opacity-50" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <Button onClick={() => navigate(`/relatorios/${user?.clinicId}`)}>
          Voltar aos meus Relatórios
        </Button>
      </div>
    )
  }

  // Generic Filter Function
  const filterByDate = <T extends { date: string }>(entries: T[] = []) => {
    const filtered = entries.filter((e) => {
      // Normalize dates to YYYY-MM-DD format for comparison
      const entryDate = e.date.split('T')[0]
      return entryDate >= startDate && entryDate <= endDate
    })
    return filtered
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Relatórios Detalhados
          </h1>
          <p className="text-muted-foreground">
            Auditoria e conferência de lançamentos diários.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
          {isMentor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-between">
                  {clinic.name}
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                {clinics.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => navigate(`/relatorios/${c.id}`)}
                  >
                    {c.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className="flex items-center gap-2 border rounded-md p-1 bg-background">
            <CalendarIcon className="h-4 w-4 ml-2 text-muted-foreground" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border-0 shadow-none h-8 w-auto p-0 focus-visible:ring-0"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border-0 shadow-none h-8 w-auto p-0 focus-visible:ring-0"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-8 h-auto">
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="consultations">1.ªs Consultas</TabsTrigger>
          <TabsTrigger value="prospecting">Prospecção</TabsTrigger>
          <TabsTrigger value="cabinets">Gabinetes</TabsTrigger>
          <TabsTrigger value="serviceTime">Tempos</TabsTrigger>
          <TabsTrigger value="sources">Fontes</TabsTrigger>
          <TabsTrigger value="consultationControl">Controle</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="financial">
            <FinancialTable
              data={filterByDate(financialEntries[clinic.id])}
              clinic={clinic}
              onDelete={handleDataChange}
            />
          </TabsContent>
          <TabsContent value="consultations">
            <div className="flex flex-col gap-4">
              <div className="flex justify-end">
                <div className="inline-flex rounded-md border">
                  <Button
                    variant={consultationView === 'kanban' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setConsultationView('kanban')}
                    className="rounded-r-none"
                  >
                    <LayoutGrid className="h-4 w-4 mr-2" />
                    Kanban
                  </Button>
                  <Button
                    variant={consultationView === 'table' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setConsultationView('table')}
                    className="rounded-l-none"
                  >
                    <List className="h-4 w-4 mr-2" />
                    Tabela
                  </Button>
                </div>
              </div>
              {consultationView === 'kanban' ? (
                <ConsultationKanban
                  data={filterByDate(consultationEntries[clinic.id])}
                />
              ) : (
                <ConsultationTable
                  data={filterByDate(consultationEntries[clinic.id])}
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="prospecting">
            <ProspectingTable
              data={filterByDate(prospectingEntries[clinic.id])}
              clinic={clinic}
              onDelete={handleDataChange}
            />
          </TabsContent>
          <TabsContent value="cabinets">
            <CabinetTable
              data={filterByDate(cabinetEntries[clinic.id])}
              clinic={clinic}
              onDelete={handleDataChange}
            />
          </TabsContent>
          <TabsContent value="serviceTime">
            <ServiceTimeTable
              data={filterByDate(serviceTimeEntries[clinic.id])}
              clinic={clinic}
              onDelete={handleDataChange}
            />
          </TabsContent>
          <TabsContent value="sources">
            <SourceTable
              data={filterByDate(sourceEntries[clinic.id])}
              clinic={clinic}
              onDelete={handleDataChange}
            />
          </TabsContent>
          <TabsContent value="consultationControl">
            <ConsultationControlTable
              data={filterByDate(consultationControlEntries[clinic.id])}
              clinic={clinic}
              onDelete={handleDataChange}
            />
          </TabsContent>
          <TabsContent value="marketing">
            <MarketingReport
              clinicId={clinic.id}
              startDate={startDate}
              endDate={endDate}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
