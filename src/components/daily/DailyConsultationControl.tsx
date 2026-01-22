import { useState, useEffect, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Minus, Plus, Save } from 'lucide-react'
import useDataStore from '@/stores/useDataStore'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'
import { useTranslation } from '@/hooks/useTranslation'

// Mover CounterRow para fora do componente para evitar re-criação
const CounterRow = memo(({
  label,
  value,
  onIncrement,
  onDecrement,
}: {
  label: string
  value: number
  onIncrement: () => void
  onDecrement: () => void
}) => (
  <div className="flex items-center justify-between p-3 border rounded-lg">
    <span className="font-medium">{label}</span>
    <div className="flex items-center gap-4">
      <Button
        variant="outline"
        size="icon"
        onClick={onDecrement}
        onMouseDown={(e) => e.preventDefault()} // Previne focus flicker
      >
        <Minus className="h-4 w-4" />
      </Button>
      <span className="w-8 text-center text-lg font-bold">
        {value}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={onIncrement}
        onMouseDown={(e) => e.preventDefault()} // Previne focus flicker
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  </div>
))
CounterRow.displayName = 'CounterRow'

export function DailyConsultationControl({ clinic }: { clinic: Clinic }) {
  const { saveConsultationControlEntry, getConsultationControlEntry } = useDataStore()
  const { t } = useTranslation()
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

  // useCallback para evitar re-criação das funções
  const adjust = useCallback((key: keyof typeof counters, delta: number) => {
    setCounters((prev) => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }))
  }, [])

  // Criar handlers específicos para cada campo usando useCallback
  const handlers = {
    noShow: {
      increment: useCallback(() => adjust('noShow', 1), [adjust]),
      decrement: useCallback(() => adjust('noShow', -1), [adjust]),
    },
    rescheduled: {
      increment: useCallback(() => adjust('rescheduled', 1), [adjust]),
      decrement: useCallback(() => adjust('rescheduled', -1), [adjust]),
    },
    cancelled: {
      increment: useCallback(() => adjust('cancelled', 1), [adjust]),
      decrement: useCallback(() => adjust('cancelled', -1), [adjust]),
    },
    oldPatientBooking: {
      increment: useCallback(() => adjust('oldPatientBooking', 1), [adjust]),
      decrement: useCallback(() => adjust('oldPatientBooking', -1), [adjust]),
    },
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

  return (
    <div className="space-y-6 max-w-lg">
      <div className="grid gap-2">
        <Label>{t('consultation.referenceDate')}</Label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={loading}
        />
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          {t('consultation.loadingData')}
        </div>
      ) : (
        <>
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              {t('consultation.control')}
            </h3>
            <CounterRow
              label={t('consultation.noShow')}
              value={counters.noShow}
              onIncrement={handlers.noShow.increment}
              onDecrement={handlers.noShow.decrement}
            />
            <CounterRow
              label={t('consultation.rescheduled')}
              value={counters.rescheduled}
              onIncrement={handlers.rescheduled.increment}
              onDecrement={handlers.rescheduled.decrement}
            />
            <CounterRow
              label={t('consultation.cancelled')}
              value={counters.cancelled}
              onIncrement={handlers.cancelled.increment}
              onDecrement={handlers.cancelled.decrement}
            />
            <CounterRow
              label={t('consultation.oldPatientBooking')}
              value={counters.oldPatientBooking}
              onIncrement={handlers.oldPatientBooking.increment}
              onDecrement={handlers.oldPatientBooking.decrement}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" /> {t('consultation.saveDayTotals')}
          </Button>
        </>
      )}
    </div>
  )
}

