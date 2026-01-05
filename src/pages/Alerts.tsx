import { useParams } from 'react-router-dom'
import { AlertTriangle, Bell } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import useDataStore from '@/stores/useDataStore'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'

export default function Alerts() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { calculateAlignersAlerts, alignerEntries, getClinic } = useDataStore()

  if (!clinicId) {
    return <div className="p-6">Clínica não encontrada</div>
  }

  const clinic = getClinic(clinicId)
  const alerts = calculateAlignersAlerts(clinicId)

  // Agrupar alertas por tipo
  const alertsByType = alerts.reduce((acc, alert) => {
    if (!acc[alert.rule]) {
      acc[alert.rule] = []
    }
    acc[alert.rule].push(alert)
    return acc
  }, {} as Record<string, typeof alerts>)

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Alertas de Alinhadores
          </h1>
          <p className="text-muted-foreground mt-2">
            {clinic?.name || 'Clínica'} - Monitorização de processos de alinhadores
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {alerts.length} {alerts.length === 1 ? 'alerta' : 'alertas'}
        </Badge>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum alerta encontrado</h3>
            <p className="text-muted-foreground text-center max-w-md">
              Todos os processos de alinhadores estão em dia. Não há alertas pendentes no momento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(alertsByType).map(([rule, ruleAlerts]) => (
            <Card key={rule}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      ruleAlerts[0]?.severity === 'destructive'
                        ? 'text-destructive'
                        : 'text-yellow-500'
                    }`}
                  />
                  {rule}
                  <Badge
                    variant={
                      ruleAlerts[0]?.severity === 'destructive' ? 'destructive' : 'secondary'
                    }
                    className="ml-2"
                  >
                    {ruleAlerts.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {ruleAlerts.length === 1
                    ? '1 paciente com este alerta'
                    : `${ruleAlerts.length} pacientes com este alerta`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ruleAlerts.map((alert) => (
                    <Alert
                      key={alert.id}
                      variant={alert.severity}
                      className="flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <AlertTitle className="flex items-center gap-2">
                          {alert.patientName}
                          <span className="text-xs font-mono text-muted-foreground">
                            (Código: {alert.patientCode})
                          </span>
                        </AlertTitle>
                        <AlertDescription className="mt-1">
                          {alert.message}
                        </AlertDescription>
                      </div>
                      {alert.entryId && alert.patientCode && (
                        <Link
                          to={`/lancamentos/${clinicId}?tab=aligners&code=${alert.patientCode}`}
                        >
                          <Button variant="outline" size="sm" className="ml-4">
                            Ver Detalhes
                          </Button>
                        </Link>
                      )}
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

