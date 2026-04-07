import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, Users, TrendingUp, AlertCircle, BarChart3 } from 'lucide-react'
import api from '@/services/api'
import type {
  ScheduleOccupancy,
  WaitTimes,
  DelayReasons,
  AppointmentConversion,
  OccupancyByDoctor,
  HourlyDistribution,
} from '@/lib/types/dashboardMetrics'

interface AgendaEfficiencySectionProps {
  clinicId: string
}

export function AgendaEfficiencySection({ clinicId }: AgendaEfficiencySectionProps) {
  const [loading, setLoading] = useState(true)
  const [occupancy, setOccupancy] = useState<ScheduleOccupancy | null>(null)
  const [waitTimes, setWaitTimes] = useState<WaitTimes | null>(null)
  const [delayReasons, setDelayReasons] = useState<DelayReasons | null>(null)
  const [conversion, setConversion] = useState<AppointmentConversion | null>(null)
  const [doctorOccupancy, setDoctorOccupancy] = useState<OccupancyByDoctor | null>(null)
  const [hourlyDist, setHourlyDist] = useState<HourlyDistribution | null>(null)

  useEffect(() => {
    loadMetrics()
  }, [clinicId])

  const loadMetrics = async () => {
    try {
      setLoading(true)
      const [occ, wait, delay, conv, docOcc, hourly] = await Promise.all([
        api.dashboardMetrics.getScheduleOccupancy(clinicId),
        api.dashboardMetrics.getWaitTimes(clinicId),
        api.dashboardMetrics.getDelayReasons(clinicId),
        api.dashboardMetrics.getAppointmentConversion(clinicId),
        api.dashboardMetrics.getOccupancyByDoctor(clinicId),
        api.dashboardMetrics.getHourlyDistribution(clinicId),
      ])
      setOccupancy(occ)
      setWaitTimes(wait)
      setDelayReasons(delay)
      setConversion(conv)
      setDoctorOccupancy(docOcc)
      setHourlyDist(hourly)
    } catch (error) {
      console.error('Failed to load agenda metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-muted rounded-lg" />
        <div className="h-32 bg-muted rounded-lg" />
      </div>
    )
  }

  const formatHours = (hours: number) => `${hours.toFixed(1)}h`
  const formatMinutes = (minutes: number) => `${Math.round(minutes)} min`
  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold flex items-center gap-2">
        <Calendar className="h-6 w-6" />
        Eficiência da Agenda
      </h2>

      {/* Taxa de Ocupação */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ocupação - Mês Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatPercent(occupancy?.currentMonth.occupancyRate || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatHours(occupancy?.currentMonth.hoursUsed || 0)} de{' '}
              {formatHours(occupancy?.currentMonth.hoursScheduled || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Semana Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatPercent(occupancy?.currentWeek.occupancyRate || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatHours(occupancy?.currentWeek.hoursUsed || 0)} de{' '}
              {formatHours(occupancy?.currentWeek.hoursScheduled || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hoje
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatPercent(occupancy?.today.occupancyRate || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatHours(occupancy?.today.hoursUsed || 0)} de{' '}
              {formatHours(occupancy?.today.hoursScheduled || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tempo de Espera */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Tempo de Espera dos Pacientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-2xl font-bold">
                {formatMinutes(waitTimes?.avgWaitMinutesMonth || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Média do Mês</p>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {formatMinutes(waitTimes?.avgWaitMinutesWeek || 0)}
              </div>
              <p className="text-sm text-muted-foreground">Média da Semana</p>
            </div>
          </div>
          {waitTimes && waitTimes.dataCount === 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Não há dados de tempo de espera. Certifique-se de registrar a chegada dos pacientes.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Motivos de Atraso */}
      {delayReasons && delayReasons.total > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Análise de Atrasos ({delayReasons.total} casos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {delayReasons.byReason.map((reason) => (
                <div key={reason.reason} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                  <div className="flex-1">
                    <div className="font-medium capitalize">{reason.reason}</div>
                    <div className="text-sm text-muted-foreground">
                      {reason.count} ocorrências • Atraso médio: {formatMinutes(reason.avgDelayMinutes)}
                    </div>
                  </div>
                  <Badge variant={reason.reason === 'medico' ? 'destructive' : 'secondary'}>
                    {formatPercent(reason.percentage)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Taxa de Conversão */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Conversão: Agendamento → Consulta Completa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">
                {formatPercent(conversion?.conversionRate || 0)}
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {conversion?.completedWithEntry || 0} de {conversion?.completedAppointments || 0} consultas completadas geraram entrada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status dos Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <strong>{conversion?.totalAppointments || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completados:</span>
                <strong>{conversion?.completedAppointments || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faltas:</span>
                <strong>{conversion?.noShows || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cancelados:</span>
                <strong>{conversion?.cancelled || 0}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ocupação por Médico */}
      {doctorOccupancy && doctorOccupancy.doctors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Ocupação por Médico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {doctorOccupancy.doctors.slice(0, 10).map((doctor) => (
                <div key={doctor.doctorId} className="flex items-center justify-between p-3 bg-muted/50 rounded">
                  <div className="flex-1">
                    <div className="font-medium">{doctor.doctorName || 'Sem nome'}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatHours(doctor.hoursUsed)} de {formatHours(doctor.hoursScheduled)} •{' '}
                      {doctor.completedAppointments} consultas
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={doctor.occupancyRate >= 80 ? 'default' : 'secondary'}>
                      {formatPercent(doctor.occupancyRate)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Distribuição Horária */}
      {hourlyDist && hourlyDist.hourly.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Horários Mais Produtivos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hourlyDist.hourly
                .filter((h) => h.totalAppointments > 0)
                .sort((a, b) => b.completedAppointments - a.completedAppointments)
                .slice(0, 10)
                .map((hour) => {
                  const completionRate = hour.totalAppointments > 0
                    ? (hour.completedAppointments / hour.totalAppointments) * 100
                    : 0

                  return (
                    <div key={hour.hour} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded">
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium w-16">
                          {String(hour.hour).padStart(2, '0')}:00
                        </div>
                        <div className="flex-1 text-sm text-muted-foreground">
                          {hour.completedAppointments} de {hour.totalAppointments} consultas
                          {hour.noShows > 0 && ` • ${hour.noShows} faltas`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          ~{formatMinutes(hour.avgDurationMinutes)}
                        </div>
                        <Badge variant={completionRate >= 80 ? 'default' : 'secondary'}>
                          {formatPercent(completionRate)}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
