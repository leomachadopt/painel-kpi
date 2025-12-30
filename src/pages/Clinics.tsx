import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, MapPin, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import useDataStore from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'

export default function Clinics() {
  const { clinics, calculateKPIs } = useDataStore()
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  // Constants for current month simulation
  const CURRENT_MONTH = 12
  const CURRENT_YEAR = 2023

  const filteredClinics = clinics.filter((clinic) =>
    clinic.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (user?.role !== 'MENTORA') {
    return (
      <div className="p-8 flex flex-col items-center justify-center h-full text-center">
        <h1 className="text-3xl font-bold mb-4">Acesso Restrito</h1>
        <p className="text-muted-foreground mb-8">
          Esta área é exclusiva para mentores.
        </p>
        <Button onClick={() => navigate(`/dashboard/${user?.clinicId}`)}>
          Ir para meu Dashboard
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Gestão de Clínicas
          </h1>
          <p className="text-muted-foreground">
            Visão geral de desempenho e alertas da rede.
          </p>
        </div>
        <Button onClick={() => navigate('#')} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Nova Clínica
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar clínicas por nome, responsável..."
          className="pl-9 max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClinics.map((clinic) => {
          const kpis = calculateKPIs(clinic.id, CURRENT_MONTH, CURRENT_YEAR)
          const revenueKPI = kpis.find((k) => k.id === 'revenue_monthly')
          const alignersKPI = kpis.find((k) => k.id === 'aligner_starts')
          const npsKPI = kpis.find((k) => k.id === 'nps')

          const revenuePercent = revenueKPI
            ? (revenueKPI.value / clinic.targetRevenue) * 100
            : 0

          const alertCount = kpis.filter((k) => k.status === 'danger').length

          // Visual status based on revenue KPI Status from calculation engine
          const revenueStatus = revenueKPI?.status || 'danger'
          const statusColor = {
            success: 'bg-emerald-500',
            warning: 'bg-amber-400',
            danger: 'bg-rose-500',
          }[revenueStatus]

          const statusTextColor = {
            success: 'text-emerald-600',
            warning: 'text-amber-500',
            danger: 'text-rose-600',
          }[revenueStatus]

          return (
            <Card
              key={clinic.id}
              className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg relative overflow-hidden"
              onClick={() => navigate(`/dashboard/${clinic.id}`)}
            >
              <div
                className={`absolute top-0 left-0 w-1 h-full ${statusColor}`}
              />
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary/10">
                    <img
                      src={
                        clinic.logoUrl ||
                        'https://img.usecurling.com/i?q=hospital&color=blue'
                      }
                      alt="Logo"
                      className="h-8 w-8 object-contain"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{clinic.name}</CardTitle>
                    <CardDescription className="flex items-center mt-1">
                      <MapPin className="mr-1 h-3 w-3" />
                      {clinic.ownerName}
                    </CardDescription>
                  </div>
                </div>
                {alertCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="flex items-center gap-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    {alertCount} Alert(s)
                  </Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Faturamento vs Meta
                    </span>
                    <span className={`font-bold ${statusTextColor}`}>
                      {revenuePercent.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${statusColor}`}
                      style={{
                        width: `${Math.min(revenuePercent, 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">
                      Alinhadores
                    </span>
                    <span className="text-lg font-bold">
                      {alignersKPI?.value || 0}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">
                      NPS
                    </span>
                    <span className="text-lg font-bold">
                      {npsKPI?.value || 0}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-4 border-t">
                <Button
                  variant="ghost"
                  className="w-full text-primary hover:text-primary/80 font-medium h-8"
                >
                  Acessar Dashboard
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
