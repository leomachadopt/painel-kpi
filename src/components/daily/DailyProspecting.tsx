import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Minus, Plus, Save } from 'lucide-react'
import useDataStore from '@/stores/useDataStore'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import { Clinic } from '@/lib/types'

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
          setCounters({ scheduled: 0, email: 0, sms: 0, whatsapp: 0, instagram: 0, phone: 0 })
        }
      } catch (error: any) {
        // 404 is expected if no entry exists for this date
        if (error?.status !== 404) {
          console.error('Error loading prospecting entry:', error)
        }
        setCounters({ scheduled: 0, email: 0, sms: 0, whatsapp: 0, instagram: 0, phone: 0 })
      } finally {
        setLoading(false)
      }
    }

    loadEntry()
  }, [date, clinic.id, getProspectingEntry])

  const adjust = (key: keyof typeof counters, delta: number) => {
    setCounters((prev) => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }))
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
              Canais (Leads Recebidos)
            </h3>
            <CounterRow label="Emails" field="email" />
            <CounterRow label="SMS" field="sms" />
            <CounterRow label="WhatsApp" field="whatsapp" />
            <CounterRow label="Instagram" field="instagram" />
            <CounterRow label="Ligação telefônica" field="phone" />
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase">
              Conversão
            </h3>
            <CounterRow label="1.ªs Consultas Agendadas" field="scheduled" />
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" /> Guardar Totais do Dia
          </Button>
        </>
      )}
    </div>
  )
}
