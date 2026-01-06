import { useState, useMemo, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, Bell, Lock, Filter } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import useDataStore from '@/stores/useDataStore'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'

export default function Alerts() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { calculateAlignersAlerts, alignerEntries, getClinic } = useDataStore()
  const { canEdit } = usePermissions()
  const [selectedAlertTypes, setSelectedAlertTypes] = useState<Set<string>>(new Set())

  if (!clinicId) {
    return <div className="p-6">Clínica não encontrada</div>
  }

  const clinic = getClinic(clinicId)
  const allAlerts = calculateAlignersAlerts(clinicId)
  
  // Filtrar alertas apenas se tiver permissão para editar alinhadores
  const alerts = canEdit('canEditAligners') ? allAlerts : []

  // Obter todos os tipos de alertas únicos
  const allAlertTypes = useMemo(() => {
    const types = new Set<string>()
    alerts.forEach(alert => types.add(alert.rule))
    return Array.from(types).sort()
  }, [alerts])

  // Inicializar seleção com todos os tipos se estiver vazio
  useEffect(() => {
    if (selectedAlertTypes.size === 0 && allAlertTypes.length > 0) {
      setSelectedAlertTypes(new Set(allAlertTypes))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allAlertTypes.length])

  // Filtrar alertas pelos tipos selecionados
  const filteredAlerts = useMemo(() => {
    if (selectedAlertTypes.size === 0) return []
    return alerts.filter(alert => selectedAlertTypes.has(alert.rule))
  }, [alerts, selectedAlertTypes])

  // Agrupar alertas por tipo
  const alertsByType = filteredAlerts.reduce((acc, alert) => {
    if (!acc[alert.rule]) {
      acc[alert.rule] = []
    }
    acc[alert.rule].push(alert)
    return acc
  }, {} as Record<string, typeof filteredAlerts>)

  // Ordenar tipos de alertas: "Data de Expiração Próxima" primeiro
  const sortedAlertTypes = Object.keys(alertsByType).sort((a, b) => {
    if (a === 'Data de Expiração Próxima') return -1
    if (b === 'Data de Expiração Próxima') return 1
    return a.localeCompare(b)
  })

  const toggleAlertType = (alertType: string) => {
    setSelectedAlertTypes(prev => {
      const newSet = new Set(prev)
      if (newSet.has(alertType)) {
        newSet.delete(alertType)
      } else {
        newSet.add(alertType)
      }
      return newSet
    })
  }

  const selectAll = () => {
    setSelectedAlertTypes(new Set(allAlertTypes))
  }

  const deselectAll = () => {
    setSelectedAlertTypes(new Set())
  }

  // Se não tiver permissão, mostrar mensagem de acesso negado
  if (!canEdit('canEditAligners')) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
            <p className="text-muted-foreground mt-2">
              Você não tem permissão para visualizar os alertas de alinhadores.
            </p>
          </div>
        </div>
      </div>
    )
  }

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
          {filteredAlerts.length} {filteredAlerts.length === 1 ? 'alerta' : 'alertas'}
        </Badge>
      </div>

      {/* Filtro de Tipos de Alertas */}
      {allAlertTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtrar por Tipo de Alerta
            </CardTitle>
            <CardDescription>
              Selecione os tipos de alertas que deseja visualizar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAll}
                  className="text-xs"
                >
                  Selecionar Todos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={deselectAll}
                  className="text-xs"
                >
                  Desmarcar Todos
                </Button>
              </div>
              <div className="flex flex-wrap gap-4">
                {allAlertTypes.map((alertType) => {
                  const typeAlerts = alerts.filter(a => a.rule === alertType)
                  const isSelected = selectedAlertTypes.has(alertType)
                  return (
                    <div
                      key={alertType}
                      className="flex items-center space-x-2 cursor-pointer"
                      onClick={() => toggleAlertType(alertType)}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleAlertType(alertType)}
                      />
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        {alertType}
                        <Badge variant="secondary" className="ml-2">
                          {typeAlerts.length}
                        </Badge>
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredAlerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              {selectedAlertTypes.size === 0 
                ? 'Nenhum tipo de alerta selecionado' 
                : 'Nenhum alerta encontrado'}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {selectedAlertTypes.size === 0
                ? 'Selecione pelo menos um tipo de alerta no filtro acima para visualizar os alertas.'
                : 'Todos os processos de alinhadores estão em dia. Não há alertas pendentes no momento.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedAlertTypes.map((rule) => {
            const ruleAlerts = alertsByType[rule]
            return (
            <Card 
              key={rule}
              className={rule === 'Data de Expiração Próxima' ? 'border-orange-500 border-2 bg-orange-50/50' : ''}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle
                    className={`h-5 w-5 ${
                      rule === 'Data de Expiração Próxima'
                        ? 'text-orange-600'
                        : ruleAlerts[0]?.severity === 'destructive'
                        ? 'text-destructive'
                        : 'text-yellow-500'
                    }`}
                  />
                  {rule}
                  <Badge
                    variant={
                      rule === 'Data de Expiração Próxima'
                        ? 'default'
                        : ruleAlerts[0]?.severity === 'destructive'
                        ? 'destructive'
                        : 'secondary'
                    }
                    className={`ml-2 ${
                      rule === 'Data de Expiração Próxima'
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : ''
                    }`}
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
                      className={`flex items-start justify-between ${
                        rule === 'Data de Expiração Próxima'
                          ? 'border-orange-500 border-l-4 bg-orange-50/30'
                          : ''
                      }`}
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
            )
          })}
        </div>
      )}
    </div>
  )
}

