import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Minus, Plus, Save } from 'lucide-react'
import useDataStore from '@/stores/useDataStore'
import { toast } from 'sonner'
import { Clinic, DailyProspectingEntry } from '@/lib/types'

export function DailyProspecting({ clinic }: { clinic: Clinic }) {
  const { saveProspectingEntry, getProspectingEntry } = useDataStore()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const [counters, setCounters] = useState({
    scheduled: 0,
    email: 0,
    sms: 0,
    whatsapp: 0,
    instagram: 0,
  })

  // Load existing entry when date changes
  useEffect(() => {
    const entry = getProspectingEntry(clinic.id, date)
    if (entry) {
      setCounters({
        scheduled: entry.scheduled,
        email: entry.email,
        sms: entry.sms,
        whatsapp: entry.whatsapp,
        instagram: entry.instagram,
      })
    } else {
      setCounters({ scheduled: 0, email: 0, sms: 0, whatsapp: 0, instagram: 0 })
    }
  }, [date, clinic.id, getProspectingEntry])

  const adjust = (key: keyof typeof counters, delta: number) => {
    setCounters((prev) => ({ ...prev, [key]: Math.max(0, prev[key] + delta) }))
  }

  const handleSave = () => {
    saveProspectingEntry(clinic.id, {
      id: `${clinic.id}-${date}`,
      date,
      ...counters,
    })
    toast.success('Dados de prospecção salvos!')
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
        />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase">
          Canais (Leads Recebidos)
        </h3>
        <CounterRow label="Emails" field="email" />
        <CounterRow label="SMS" field="sms" />
        <CounterRow label="WhatsApp" field="whatsapp" />
        <CounterRow label="Instagram" field="instagram" />
      </div>

      <div className="space-y-3">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase">
          Conversão
        </h3>
        <CounterRow label="1ªs Consultas Agendadas" field="scheduled" />
      </div>

      <Button onClick={handleSave} className="w-full">
        <Save className="mr-2 h-4 w-4" /> Salvar Totais do Dia
      </Button>
    </div>
  )
}
