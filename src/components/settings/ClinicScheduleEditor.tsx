import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, X, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface ClinicSchedule {
  id: string
  dayOfWeek: number
  shiftName: string
  startTime: string
  endTime: string
  isActive: boolean
}

interface ClinicScheduleEditorProps {
  clinicId: string
  readOnly?: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'D', fullLabel: 'Domingo' },
  { value: 1, label: 'S', fullLabel: 'Segunda-feira' },
  { value: 2, label: 'T', fullLabel: 'Terça-feira' },
  { value: 3, label: 'Q', fullLabel: 'Quarta-feira' },
  { value: 4, label: 'Q', fullLabel: 'Quinta-feira' },
  { value: 5, label: 'S', fullLabel: 'Sexta-feira' },
  { value: 6, label: 'S', fullLabel: 'Sábado' },
]

export function ClinicScheduleEditor({ clinicId, readOnly = false }: ClinicScheduleEditorProps) {
  const [schedules, setSchedules] = useState<ClinicSchedule[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSchedules()
  }, [clinicId])

  const loadSchedules = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/clinic-schedule/${clinicId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })
      const data = await response.json()
      setSchedules(data.schedules || [])
    } catch (error) {
      console.error('Error loading schedules:', error)
      toast.error('Erro ao carregar horários')
    } finally {
      setLoading(false)
    }
  }

  const addSchedule = async (dayOfWeek: number, startTime: string, endTime: string) => {
    try {
      const response = await fetch(`/api/clinic-schedule/${clinicId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
        body: JSON.stringify({
          dayOfWeek,
          shiftName: '',
          startTime,
          endTime,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar horário')
      }

      toast.success('Horário adicionado')
      loadSchedules()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const updateSchedule = async (id: string, field: 'startTime' | 'endTime', value: string) => {
    try {
      const response = await fetch(`/api/clinic-schedule/${clinicId}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
        body: JSON.stringify({ [field]: value }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar')
      }

      // Update local state immediately without reloading
      setSchedules(prev => prev.map(s =>
        s.id === id ? { ...s, [field]: value } : s
      ))
      toast.success('Atualizado')
    } catch (error: any) {
      toast.error(error.message)
      loadSchedules() // Reload on error
    }
  }

  const deleteSchedule = async (id: string) => {
    try {
      const response = await fetch(`/api/clinic-schedule/${clinicId}/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir horário')
      }

      toast.success('Horário removido')
      loadSchedules()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const copyToNextDay = async (schedule: ClinicSchedule) => {
    const nextDay = (schedule.dayOfWeek + 1) % 7
    await addSchedule(nextDay, schedule.startTime.substring(0, 5), schedule.endTime.substring(0, 5))
  }

  const groupedByDay = schedules.reduce((acc, schedule) => {
    if (!acc[schedule.dayOfWeek]) {
      acc[schedule.dayOfWeek] = []
    }
    acc[schedule.dayOfWeek].push(schedule)
    return acc
  }, {} as Record<number, ClinicSchedule[]>)

  // Sort schedules by start time
  Object.keys(groupedByDay).forEach(day => {
    groupedByDay[parseInt(day)].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime)
    })
  })

  const addNewSlot = (dayOfWeek: number) => {
    const daySchedules = groupedByDay[dayOfWeek] || []

    let startTime = '09:00'
    let endTime = '12:00'

    if (daySchedules.length > 0) {
      const lastSchedule = daySchedules[daySchedules.length - 1]
      const lastEnd = lastSchedule.endTime.substring(0, 5)
      const [hours, mins] = lastEnd.split(':').map(Number)

      startTime = lastEnd

      let endHours = hours + 3
      let endMins = mins

      if (endHours > 20) {
        endHours = 20
        endMins = 0
      }

      endTime = `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`

      if (startTime >= '20:00') {
        toast.error('Não há mais espaço disponível neste dia')
        return
      }
    }

    addSchedule(dayOfWeek, startTime, endTime)
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium mb-3">🔄 Horários semanais</div>
      <div className="text-xs text-muted-foreground mb-4">
        Defina quando normalmente está disponível para reuniões
      </div>

      {DAYS_OF_WEEK.map((day) => {
        const daySchedules = groupedByDay[day.value] || []
        const isAvailable = daySchedules.length > 0

        return (
          <div key={day.value} className="flex items-start gap-3 py-2">
            {/* Day label */}
            <div className="flex items-center gap-2 w-32">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium">
                {day.label}
              </div>
              <span className="text-sm">{day.fullLabel.substring(0, 3)}</span>
            </div>

            {/* Schedules */}
            <div className="flex-1 space-y-2">
              {!isAvailable && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Indisponível</span>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => addNewSlot(day.value)}
                      className="h-8 w-8 p-0 rounded-full"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              {daySchedules.map((schedule, idx) => (
                <div key={schedule.id} className="flex items-center gap-2">
                  <Input
                    type="time"
                    defaultValue={schedule.startTime.substring(0, 5)}
                    onBlur={(e) => {
                      const newValue = e.target.value
                      if (newValue && newValue !== schedule.startTime.substring(0, 5)) {
                        updateSchedule(schedule.id, 'startTime', newValue)
                      }
                    }}
                    disabled={readOnly}
                    className="w-24"
                  />
                  <span className="text-sm">-</span>
                  <Input
                    type="time"
                    defaultValue={schedule.endTime.substring(0, 5)}
                    onBlur={(e) => {
                      const newValue = e.target.value
                      if (newValue && newValue !== schedule.endTime.substring(0, 5)) {
                        updateSchedule(schedule.id, 'endTime', newValue)
                      }
                    }}
                    disabled={readOnly}
                    className="w-24"
                  />

                  {!readOnly && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteSchedule(schedule.id)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>

                      {idx === 0 && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => addNewSlot(day.value)}
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToNextDay(schedule)}
                        className="h-8 w-8 p-0"
                        title="Copiar para próximo dia"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
