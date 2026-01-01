import React, { useState, useEffect } from 'react'
import { Patient } from '@/lib/types'
import { patientsApi } from '@/services/api'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Search, Users, Loader2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface PatientListProps {
  clinicId: string
}

export function PatientList({ clinicId }: PatientListProps) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadPatients()
  }, [clinicId])

  const loadPatients = async (search?: string) => {
    setLoading(true)
    setError(null)
    try {
      const data = await patientsApi.getAll(clinicId, search)
      setPatients(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pacientes')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    if (value.length >= 2 || value.length === 0) {
      loadPatients(value || undefined)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Pacientes
        </CardTitle>
        <CardDescription>
          {patients.length} paciente{patients.length !== 1 ? 's' : ''} cadastrado
          {patients.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-4 text-sm text-destructive">{error}</div>
        )}

        {/* Empty State */}
        {!loading && !error && patients.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {searchTerm
              ? 'Nenhum paciente encontrado'
              : 'Nenhum paciente cadastrado ainda'}
          </div>
        )}

        {/* Patient List */}
        {!loading && !error && patients.length > 0 && (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-2">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {patient.code}
                      </Badge>
                      <p className="font-medium truncate">{patient.name}</p>
                    </div>
                    {(patient.email || patient.phone) && (
                      <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                        {patient.email && <div>{patient.email}</div>}
                        {patient.phone && <div>{patient.phone}</div>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}
