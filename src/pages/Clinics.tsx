import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Plus, MapPin, Activity } from 'lucide-react'
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

export default function Clinics() {
  const { clinics } = useDataStore()
  const [searchTerm, setSearchTerm] = useState('')
  const navigate = useNavigate()

  const filteredClinics = clinics.filter((clinic) =>
    clinic.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clínicas</h1>
          <p className="text-muted-foreground">
            Gerencie e monitore o desempenho de todas as clínicas mentoradas.
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
          placeholder="Buscar clínicas por nome..."
          className="pl-9 max-w-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredClinics.map((clinic) => (
          <Card
            key={clinic.id}
            className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
            onClick={() => navigate(`/dashboard/${clinic.id}`)}
          >
            <CardHeader className="flex flex-row items-start justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20">
                  <img
                    src={
                      clinic.logoUrl ||
                      'https://img.usecurling.com/i?q=hospital&color=blue'
                    }
                    alt="Logo"
                    className="h-6 w-6"
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
              <Badge variant={clinic.active ? 'default' : 'secondary'}>
                {clinic.active ? 'Ativa' : 'Inativa'}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Última atualização
                  </span>
                  <span className="font-medium">{clinic.lastUpdate}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Status de Dados</span>
                  <span className="flex items-center text-emerald-600 font-medium">
                    <Activity className="mr-1 h-3 w-3" />
                    Em dia
                  </span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-primary hover:text-primary/80 p-0 h-auto font-medium"
              >
                Ver Dashboard Completo &rarr;
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
