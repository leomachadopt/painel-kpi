import { useState, useEffect, useCallback, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Minus, Plus, Save } from 'lucide-react'
import useDataStore from '@/stores/useDataStore'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'

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

export function DailyProspecting({ clinic }: { clinic: Clinic }) {
  const { saveProspectingEntry, getProspectingEntry } = useDataStore()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const [counters, setCounters] = useState({
    scheduled: 0,
    email: 0,
    sms: 0,
    whatsapp: 0,
    instagram: 0,
    phone: 0,
  })

  // Load existing entry when date changes
  useEffect(() => {
    const loadEntry = async () => {
      // First try to get from local state
      const localEntry = getProspectingEntry(clinic.id, date)
      if (localEntry) {
        setCounters({
          scheduled: localEntry.scheduled,
          email: localEntry.email,
          sms: localEntry.sms,
          whatsapp: localEntry.whatsapp,
          instagram: localEntry.instagram,
          phone: localEntry.phone || 0,
        })
        return
      }

      // If not in local state, try to fetch from API
      setLoading(true)
      try {
        const apiEntry = await dailyEntriesApi.prospecting.getByDate(clinic.id, date)
        if (apiEntry) {
          setCounters({
            scheduled: apiEntry.scheduled || 0,
            email: apiEntry.email || 0,
            sms: apiEntry.sms || 0,
            whatsapp: apiEntry.whatsapp || 0,
            instagram: apiEntry.instagram || 0,
            phone: apiEntry.phone || 0,
          })
        } else {
          // null ou undefined significa que não existe entrada para esta data
          setCounters({ scheduled: 0, email: 0, sms: 0, whatsapp: 0, instagram: 0, phone: 0 })
        }
      } catch (error: any) {
        // Agora só vai entrar aqui em erros reais (não 404)
        console.error('Error loading prospecting entry:', error)
        setCounters({ scheduled: 0, email: 0, sms: 0, whatsapp: 0, instagram: 0, phone: 0 })
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
    scheduled: {
      increment: useCallback(() => adjust('scheduled', 1), [adjust]),
      decrement: useCallback(() => adjust('scheduled', -1), [adjust]),
    },
    email: {
      increment: useCallback(() => adjust('email', 1), [adjust]),
      decrement: useCallback(() => adjust('email', -1), [adjust]),
    },
    sms: {
      increment: useCallback(() => adjust('sms', 1), [adjust]),
      decrement: useCallback(() => adjust('sms', -1), [adjust]),
    },
    whatsapp: {
      increment: useCallback(() => adjust('whatsapp', 1), [adjust]),
      decrement: useCallback(() => adjust('whatsapp', -1), [adjust]),
    },
    instagram: {
      increment: useCallback(() => adjust('instagram', 1), [adjust]),
      decrement: useCallback(() => adjust('instagram', -1), [adjust]),
    },
    phone: {
      increment: useCallback(() => adjust('phone', 1), [adjust]),
      decrement: useCallback(() => adjust('phone', -1), [adjust]),
    },
  }

  const handleSave = async () => {
    try {
      await saveProspectingEntry(clinic.id, {
        id: `${clinic.id}-${date}`,
        date,
        ...counters,
      })
      toast.success('Dados de prospecção guardados!')
    } catch (error) {
      // Error toast already shown by saveProspectingEntry
      console.error('Failed to save prospecting entry:', error)
    }
  }

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
              Canais (Leads Recebidos)
            </h3>
            <CounterRow
              label="Emails"
              value={counters.email}
              onIncrement={handlers.email.increment}
              onDecrement={handlers.email.decrement}
            />
            <CounterRow
              label="SMS"
              value={counters.sms}
              onIncrement={handlers.sms.increment}
              onDecrement={handlers.sms.decrement}
            />
            <CounterRow
              label="WhatsApp"
              value={counters.whatsapp}
              onIncrement={handlers.whatsapp.increment}
              onDecrement={handlers.whatsapp.decrement}
            />
            <CounterRow
              label="Instagram"
              value={counters.instagram}
              onIncrement={handlers.instagram.increment}
              onDecrement={handlers.instagram.decrement}
            />
            <CounterRow
              label="Ligação telefônica"
              value={counters.phone}
              onIncrement={handlers.phone.increment}
              onDecrement={handlers.phone.decrement}
            />
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              Conversão
            </h3>
            <CounterRow
              label="1.ªs Consultas Agendadas"
              value={counters.scheduled}
              onIncrement={handlers.scheduled.increment}
              onDecrement={handlers.scheduled.decrement}
            />
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" /> Guardar Totais do Dia
          </Button>
        </>
      )}
    </div>
  )
}
