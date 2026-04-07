import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { LayoutGrid, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import useDataStore from '@/stores/useDataStore'
import { ConsultationKanban } from '@/components/reports/ConsultationKanban'
import { ConsultationTable } from '@/components/reports/ConsultationTable'
import { useTranslation } from '@/hooks/useTranslation'

export default function PlansAndConsultations() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { getClinic, consultationEntries, reloadConsultations } = useDataStore()
  const { t } = useTranslation()
  const [consultationView, setConsultationView] = useState<'table' | 'kanban'>('kanban')
  const [, setReloadTrigger] = useState(0)

  const clinic = clinicId ? getClinic(clinicId) : null

  if (!clinic) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Clínica não encontrada</p>
      </div>
    )
  }

  const handleDataChange = async () => {
    if (clinicId) {
      await reloadConsultations(clinicId)
      setReloadTrigger((prev) => prev + 1)
    }
  }

  const consultations = consultationEntries[clinic.id] || []

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">Planos e Consultas</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={consultationView === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setConsultationView('kanban')}
                className="rounded-r-none"
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                {t('reports.kanban')}
              </Button>
              <Button
                variant={consultationView === 'table' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setConsultationView('table')}
                className="rounded-l-none"
              >
                <List className="h-4 w-4 mr-2" />
                {t('reports.table')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {consultationView === 'kanban' ? (
            <ConsultationKanban
              data={consultations}
              clinic={clinic}
              onDelete={handleDataChange}
            />
          ) : (
            <ConsultationTable
              data={consultations}
              clinic={clinic}
              onDelete={handleDataChange}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
