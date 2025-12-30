import { useParams, useNavigate } from 'react-router-dom'
import {
  Lock,
  FileText,
  UserPlus,
  Megaphone,
  Armchair,
  Clock,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import useDataStore from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'
import { DailyFinancials } from '@/components/daily/DailyFinancials'
import { DailyConsultations } from '@/components/daily/DailyConsultations'
import { DailyProspecting } from '@/components/daily/DailyProspecting'
import { DailyCabinets } from '@/components/daily/DailyCabinets'
import { DailyServiceTime } from '@/components/daily/DailyServiceTime'
import { DailySources } from '@/components/daily/DailySources'

export default function Inputs() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const navigate = useNavigate()
  const { getClinic } = useDataStore()
  const { user } = useAuthStore()

  const clinic = clinicId ? getClinic(clinicId) : undefined

  if (
    user?.role === 'GESTOR_CLINICA' &&
    clinicId &&
    user.clinicId !== clinicId
  ) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center space-y-4">
        <Lock className="h-12 w-12 text-destructive opacity-50" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <Button onClick={() => navigate(`/dashboard/${user.clinicId}`)}>
          Voltar ao meu Dashboard
        </Button>
      </div>
    )
  }

  if (!clinic) return <div className="p-8">Clínica não encontrada.</div>

  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Diário Clínico</h1>
        <p className="text-muted-foreground">
          {clinic.name} • Registos operacionais diários.
        </p>
      </div>

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
          <TabsTrigger
            value="financial"
            className="flex flex-col gap-1 py-2 h-auto"
          >
            <FileText className="h-4 w-4" />
            Financeiro
          </TabsTrigger>
          <TabsTrigger
            value="consultations"
            className="flex flex-col gap-1 py-2 h-auto"
          >
            <UserPlus className="h-4 w-4" />
            1.ªs Consultas
          </TabsTrigger>
          <TabsTrigger
            value="prospecting"
            className="flex flex-col gap-1 py-2 h-auto"
          >
            <Megaphone className="h-4 w-4" />
            Prospecção
          </TabsTrigger>
          <TabsTrigger
            value="cabinets"
            className="flex flex-col gap-1 py-2 h-auto"
          >
            <Armchair className="h-4 w-4" />
            Gabinetes
          </TabsTrigger>
          <TabsTrigger
            value="serviceTime"
            className="flex flex-col gap-1 py-2 h-auto"
          >
            <Clock className="h-4 w-4" />
            Tempos
          </TabsTrigger>
          <TabsTrigger
            value="sources"
            className="flex flex-col gap-1 py-2 h-auto"
          >
            <MapPin className="h-4 w-4" />
            Fontes
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="financial">
            <Card>
              <CardHeader>
                <CardTitle>Lançamento Financeiro</CardTitle>
                <CardDescription>
                  Registe as receitas diárias por categoria e gabinete.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailyFinancials clinic={clinic} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="consultations">
            <Card>
              <CardHeader>
                <CardTitle>1.ªs Consultas</CardTitle>
                <CardDescription>
                  Acompanhe o desfecho das primeiras consultas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailyConsultations clinic={clinic} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prospecting">
            <Card>
              <CardHeader>
                <CardTitle>Dashboard de Prospecção</CardTitle>
                <CardDescription>
                  Contadores diários de leads e agendamentos.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailyProspecting clinic={clinic} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cabinets">
            <Card>
              <CardHeader>
                <CardTitle>Ocupação de Gabinetes</CardTitle>
                <CardDescription>
                  Registe as horas utilizadas em cada gabinete.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailyCabinets clinic={clinic} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="serviceTime">
            <Card>
              <CardHeader>
                <CardTitle>Tempo de Atendimento</CardTitle>
                <CardDescription>
                  Monitorize a pontualidade e motivos de atraso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailyServiceTime clinic={clinic} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sources">
            <Card>
              <CardHeader>
                <CardTitle>Origem do Paciente</CardTitle>
                <CardDescription>
                  Identifique como o paciente conheceu a clínica.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailySources clinic={clinic} />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
