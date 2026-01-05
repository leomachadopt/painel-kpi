import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Lock,
  FileText,
  UserPlus,
  Megaphone,
  Armchair,
  Clock,
  CalendarCheck,
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
import { usePermissions } from '@/hooks/usePermissions'
import { DailyFinancials } from '@/components/daily/DailyFinancials'
import { DailyConsultations } from '@/components/daily/DailyConsultations'
import { DailyProspecting } from '@/components/daily/DailyProspecting'
import { DailyCabinets } from '@/components/daily/DailyCabinets'
import { DailyServiceTime } from '@/components/daily/DailyServiceTime'
import { DailyConsultationControl } from '@/components/daily/DailyConsultationControl'

export default function Inputs() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const navigate = useNavigate()
  const { getClinic } = useDataStore()
  const { user, refreshPermissions } = useAuthStore()
  const { canEdit } = usePermissions()

  // Refresh permissions when component mounts if user is a collaborator
  useEffect(() => {
    if (user?.role === 'COLABORADOR' && refreshPermissions) {
      refreshPermissions()
    }
  }, [user?.role, refreshPermissions])

  const clinic = clinicId ? getClinic(clinicId) : undefined

  // Verificar permissões
  const hasFinancial = canEdit('canEditFinancial')
  const hasConsultations = canEdit('canEditConsultations')
  const hasProspecting = canEdit('canEditProspecting')
  const hasCabinets = canEdit('canEditCabinets')
  const hasServiceTime = canEdit('canEditServiceTime')
  const hasConsultationControl = canEdit('canEditConsultationControl')

  // Determinar primeira aba disponível
  const firstAvailableTab =
    hasFinancial ? 'financial' :
    hasConsultations ? 'consultations' :
    hasProspecting ? 'prospecting' :
    hasCabinets ? 'cabinets' :
    hasServiceTime ? 'serviceTime' :
    hasConsultationControl ? 'consultationControl' : 'financial'

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

      <Tabs defaultValue={firstAvailableTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto">
          {hasFinancial && (
            <TabsTrigger
              value="financial"
              className="flex flex-col gap-1 py-2 h-auto"
            >
              <FileText className="h-4 w-4" />
              Financeiro
            </TabsTrigger>
          )}
          {hasConsultations && (
            <TabsTrigger
              value="consultations"
              className="flex flex-col gap-1 py-2 h-auto"
            >
              <UserPlus className="h-4 w-4" />
              1.ªs Consultas
            </TabsTrigger>
          )}
          {hasProspecting && (
            <TabsTrigger
              value="prospecting"
              className="flex flex-col gap-1 py-2 h-auto"
            >
              <Megaphone className="h-4 w-4" />
              Prospecção
            </TabsTrigger>
          )}
          {hasCabinets && (
            <TabsTrigger
              value="cabinets"
              className="flex flex-col gap-1 py-2 h-auto"
            >
              <Armchair className="h-4 w-4" />
              Gabinetes
            </TabsTrigger>
          )}
          {hasServiceTime && (
            <TabsTrigger
              value="serviceTime"
              className="flex flex-col gap-1 py-2 h-auto"
            >
              <Clock className="h-4 w-4" />
              Tempos
            </TabsTrigger>
          )}
          {hasConsultationControl && (
            <TabsTrigger
              value="consultationControl"
              className="flex flex-col gap-1 py-2 h-auto"
            >
              <CalendarCheck className="h-4 w-4" />
              Controle
            </TabsTrigger>
          )}
        </TabsList>

        <div className="mt-6">
          {hasFinancial && (
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
          )}

          {hasConsultations && (
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
          )}

          {hasProspecting && (
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
          )}

          {hasCabinets && (
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
          )}

          {hasServiceTime && (
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
          )}

          {hasConsultationControl && (
            <TabsContent value="consultationControl">
              <Card>
                <CardHeader>
                  <CardTitle>Controle de Consultas</CardTitle>
                  <CardDescription>
                    Acompanhe não comparecimentos, remarcações, cancelamentos e marcações de pacientes antigos.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DailyConsultationControl clinic={clinic} />
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  )
}
