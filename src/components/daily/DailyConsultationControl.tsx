import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Minus, Plus, Save } from 'lucide-react'
import useDataStore from '@/stores/useDataStore'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'

export function DailyConsultationControl({ clinic }: { clinic: Clinic }) {
  const { saveConsultationControlEntry, getConsultationControlEntry } = useDataStore()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const [counters, setCounters] = useState({
    noShow: 0,
    rescheduled: 0,
    cancelled: 0,
    oldPatientBooking: 0,
  })

  // Load existing entry when date changes
  useEffect(() => {
    const loadEntry = async () => {
      // First try to get from local state
      const localEntry = getConsultationControlEntry(clinic.id, date)
      if (localEntry) {
        setCounters({
          noShow: localEntry.noShow,
          rescheduled: localEntry.rescheduled,
          cancelled: localEntry.cancelled,
          oldPatientBooking: localEntry.oldPatientBooking,
        })
        return
      }

      // If not in local state, try to fetch from API
      setLoading(true)
      try {
        const apiEntry = await dailyEntriesApi.consultationControl.getByDate(clinic.id, date)
        if (apiEntry) {
          setCounters({
            noShow: apiEntry.noShow || 0,
            rescheduled: apiEntry.rescheduled || 0,
            cancelled: apiEntry.cancelled || 0,
            oldPatientBooking: apiEntry.oldPatientBooking || 0,
          })
        } else {
          // null ou undefined significa que não existe entrada para esta data
          setCounters({ noShow: 0, rescheduled: 0, cancelled: 0, oldPatientBooking: 0 })
        }
      } catch (error: any) {
        // Agora só vai entrar aqui em erros reais (não 404)
        console.error('Error loading consultation control entry:', error)
        setCounters({ noShow: 0, rescheduled: 0, cancelled: 0, oldPatientBooking: 0 })
      } finally {
        setLoading(false)
      }
    }

    loadEntry()
  }, [date, clinic.id])

  const adjust = (key: keyof typeof counters, delta: number) => {
    setCounters((prev) => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }))
  }

  const handleSave = async () => {
    try {
      await saveConsultationControlEntry(clinic.id, {
        id: `${clinic.id}-${date}`,
        date,
        ...counters,
      })
      toast.success('Dados de controle de consultas guardados!')
    } catch (error) {
      // Error toast already shown by saveConsultationControlEntry
      console.error('Failed to save consultation control entry:', error)
    }
  }

  const CounterRow = ({
    label,
    field,
  }: {
    label: string
    field: keyof typeof counters
  }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => adjust(field, -1)}>
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center text-lg font-bold">
          {counters[field]}
        </span>
        <Button variant="outline" size="icon" onClick={() => adjust(field, 1)}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-lg">
      <div className="grid gap-2">
        <Label>Data de Referência</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={loading}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando dados...
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              Controle de Consultas
            </h3>
            <CounterRow label="Não Comparecimento" field="noShow" />
            <CounterRow label="Remarcação de Horário" field="rescheduled" />
            <CounterRow label="Cancelamento de Consulta" field="cancelled" />
            <CounterRow label="Marcação (Paciente Antigo)" field="oldPatientBooking" />
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" /> Guardar Totais do Dia
          </Button>
        </>
      )}
    </div>
  )
}

