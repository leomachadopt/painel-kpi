import React, { useState, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { toast } from 'sonner'
import useDataStore from '@/stores/useDataStore'
import { useAuth } from '@/stores/useAuthStore'
import { format, addDays, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import api from '@/services/api'
import { AddProceduresModal } from '@/components/agenda/AddProceduresModal'

interface TimeSlot {
  time: string
  appointment: any | null
}

export default function Agenda() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { clinics, reloadClinics } = useDataStore()
  const { user } = useAuth()
  const clinic = clinics.find((c) => c.id === clinicId)

  // Start with today's date
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return today
  })
  const [appointments, setAppointments] = useState<any[]>([])
  const [doctors, setDoctors] = useState<any[]>([])
  const [cabinets, setCabinets] = useState<any[]>([])
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([])
  const [clinicSchedules, setClinicSchedules] = useState<any[]>([])
  const [sources, setSources] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDoctor, setSelectedDoctor] = useState<string>('')
  const [viewMode, setViewMode] = useState<'day' | '3days' | 'week'>('day')
  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [reloadTrigger, setReloadTrigger] = useState(0)

  // Drag & Resize state
  const [draggingAppointment, setDraggingAppointment] = useState<any | null>(null)
  const [resizingAppointment, setResizingAppointment] = useState<any | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [resizeStartY, setResizeStartY] = useState(0)
  const [resizeStartHeight, setResizeStartHeight] = useState(0)

  // Edit appointment modal
  const [editingAppointment, setEditingAppointment] = useState<any | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [originalAppointment, setOriginalAppointment] = useState<any | null>(null)
  const [rescheduledAppointment, setRescheduledAppointment] = useState<any | null>(null)

  // Plan procedures for the appointment
  const [planProcedures, setPlanProcedures] = useState<any[]>([])
  const [loadingProcedures, setLoadingProcedures] = useState(false)
  const [procedureExecutionData, setProcedureExecutionData] = useState<{
    [procedureId: string]: { date: string; time: string; notes: string }
  }>({})

  // Reschedule modal
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [rescheduleReason, setRescheduleReason] = useState('')

  // Add procedures modal
  const [isAddProceduresModalOpen, setIsAddProceduresModalOpen] = useState(false)
  const [addProceduresConsultationId, setAddProceduresConsultationId] = useState<string | null>(null)
  const [addProceduresPriceTableType, setAddProceduresPriceTableType] = useState<string>('')
  const [addProceduresInsuranceProviderId, setAddProceduresInsuranceProviderId] = useState<string>('')

  // Patient search
  const [patientSearch, setPatientSearch] = useState('')
  const [patientResults, setPatientResults] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any | null>(null)

  // Reschedule from queue
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [rescheduleSearch, setRescheduleSearch] = useState('')
  const [rescheduleResults, setRescheduleResults] = useState<any[]>([])
  const [selectedReschedule, setSelectedReschedule] = useState<any | null>(null)

  // New appointment form
  const [newAppointment, setNewAppointment] = useState({
    scheduledEnd: '',
    cabinetId: '',
    appointmentTypeId: '',
    isNewPatient: false,
    notes: '',
    // New patient fields
    newPatientName: '',
    newPatientWhatsapp: '',
    sourceId: '',
  })

  // Helper functions - defined early to avoid hoisting issues
  const timeToMinutes = (time: string): number => {
    const [hours, mins] = time.split(':').map(Number)
    return hours * 60 + mins
  }

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }

  // Calculate clinic hours from schedules using useMemo to avoid re-calculation
  const clinicHours = useMemo(() => {
    const dayOfWeek = selectedDate.getDay()
    const schedulesForDay = clinicSchedules.filter(s => s.dayOfWeek === dayOfWeek && s.isActive)

    if (schedulesForDay.length === 0) {
      // No schedule configured for this day - return null to indicate closed
      return null
    }

    // Find earliest start and latest end
    const startTimes = schedulesForDay.map(s => timeToMinutes(s.startTime))
    const endTimes = schedulesForDay.map(s => timeToMinutes(s.endTime))

    return {
      start: Math.min(...startTimes),
      end: Math.max(...endTimes)
    }
  }, [selectedDate, clinicSchedules])

  const CLINIC_START = clinicHours?.start ?? 8 * 60
  const CLINIC_END = clinicHours?.end ?? 20 * 60
  const SLOT_DURATION = 15 // minutes

  // Helper to get clinic hours for any date (used in day rendering)
  const getClinicHoursForDate = (date: Date) => {
    const dayOfWeek = date.getDay()
    const schedulesForDay = clinicSchedules.filter(s => s.dayOfWeek === dayOfWeek && s.isActive)

    if (schedulesForDay.length === 0) {
      return null
    }

    const startTimes = schedulesForDay.map(s => timeToMinutes(s.startTime))
    const endTimes = schedulesForDay.map(s => timeToMinutes(s.endTime))

    return {
      start: Math.min(...startTimes),
      end: Math.max(...endTimes)
    }
  }

  useEffect(() => {
    if (clinicId) {
      loadDoctors()
      loadCabinets()
      loadAppointmentTypes()
      loadClinicSchedules()
      loadSources()
    }
  }, [clinicId])

  // Handle mouse move for resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingAppointment) return

      const deltaY = e.clientY - resizeStartY
      const newHeight = Math.max(60, resizeStartHeight + deltaY) // Minimum 1 slot (60px)
      const newDuration = Math.round((newHeight / 60) * SLOT_DURATION)

      // Update visual feedback (you can add a preview here)
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!resizingAppointment) return

      const deltaY = e.clientY - resizeStartY
      const newHeight = Math.max(60, resizeStartHeight + deltaY)

      // Calculate duration in slots (15 min each) and round to nearest slot
      const slots = Math.round(newHeight / 60)
      const newDuration = slots * SLOT_DURATION

      const startMinutes = timeToMinutes(resizingAppointment.scheduledStart)
      const newEndMinutes = startMinutes + newDuration

      // Update appointment
      updateAppointmentTime(
        resizingAppointment.id,
        resizingAppointment.scheduledStart.substring(0, 5),
        minutesToTime(newEndMinutes)
      )

      setResizingAppointment(null)
    }

    if (resizingAppointment) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizingAppointment, resizeStartY, resizeStartHeight])

  // Check and automatically mark no-shows
  const checkAndMarkNoShows = async (appointmentsList: any[]) => {
    const now = new Date()
    const todayStr = format(now, 'yyyy-MM-dd')
    let hasUpdates = false

    for (const appointment of appointmentsList) {
      // Skip if already marked as no-show, cancelled, or completed
      if (appointment.status === 'no_show' || appointment.status === 'cancelled' || appointment.status === 'completed') {
        continue
      }

      // Skip if patient has already arrived
      if (appointment.actualArrival) {
        continue
      }

      // Extract date string from appointment (YYYY-MM-DD format)
      const appointmentDateStr = appointment.date.substring(0, 10)

      // Only mark as no-show if the appointment day has completely passed (not today, but before today)
      // Compare date strings directly (YYYY-MM-DD format allows string comparison)
      if (appointmentDateStr < todayStr) {
        try {
          await fetch(`/api/appointments/${clinicId}/${appointment.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
            },
            body: JSON.stringify({ status: 'no_show' }),
          })

          hasUpdates = true
        } catch (error) {
          console.error('[AGENDA] Error marking appointment as no-show:', error)
        }
      }
    }

    // Trigger reload if any appointments were updated
    if (hasUpdates) {
      setReloadTrigger(prev => prev + 1)
    }
  }

  // Get date range based on view mode
  const getDateRange = () => {
    const dates: Date[] = []
    const daysToShow = viewMode === 'day' ? 1 : viewMode === '3days' ? 3 : 7

    for (let i = 0; i < daysToShow; i++) {
      dates.push(addDays(selectedDate, i))
    }

    return dates
  }

  useEffect(() => {
    if (!clinicId || !selectedDoctor) {
      return
    }

    const abortController = new AbortController()

    const loadAppointmentsWithAbort = async () => {
      setLoading(true)
      try {
        const dates = getDateRange()
        const allAppointments: any[] = []

        // Load appointments for each date in range
        for (const date of dates) {
          const dateStr = format(date, 'yyyy-MM-dd')
          const url = `/api/appointments/${clinicId}?date=${dateStr}&doctorId=${selectedDoctor}`

          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
            },
            signal: abortController.signal,
          })

          const data = await response.json()

          if (data.appointments) {
            allAppointments.push(...data.appointments)
          }
        }

        // Only update if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setAppointments(allAppointments)

          // Check for appointments that should be marked as no-show
          checkAndMarkNoShows(allAppointments)
        }
      } catch (error: any) {
        // Don't show error if request was aborted
        if (error.name !== 'AbortError') {
          console.error('[AGENDA] ❌ Error loading appointments:', error)
          toast.error('Erro ao carregar agendamentos')
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false)
        }
      }
    }

    loadAppointmentsWithAbort()

    // Cleanup: abort request if dependencies change
    return () => {
      abortController.abort()
    }
  }, [clinicId, selectedDate, selectedDoctor, reloadTrigger, viewMode])

  const loadDoctors = async () => {
    if (!clinic?.configuration?.doctors) return
    const allDoctors = clinic.configuration.doctors

    // MENTOR and GESTOR_CLINICA can see all doctors
    const canSeeAllDoctors = user?.role === 'GESTOR_CLINICA' || user?.role === 'MENTOR'

    if (canSeeAllDoctors) {
      // Show all doctors
      setDoctors(allDoctors)
      if (allDoctors.length > 0) {
        setSelectedDoctor(allDoctors[0].id)
      }
    } else if (user?.role === 'MEDICO') {
      // MEDICO can only see their own agenda - find doctor by email
      const userDoctor = allDoctors.find((d: any) => d.email === user.email)
      if (userDoctor) {
        setDoctors([userDoctor])
        setSelectedDoctor(userDoctor.id)
      } else {
        setDoctors([])
      }
    } else {
      // COLABORADOR - show all doctors (permissions will be handled by backend)
      setDoctors(allDoctors)
      if (allDoctors.length > 0) {
        setSelectedDoctor(allDoctors[0].id)
      }
    }
  }

  const loadCabinets = async () => {
    if (!clinic?.configuration?.cabinets) return
    setCabinets(clinic.configuration.cabinets)
  }

  const loadAppointmentTypes = async () => {
    if (!clinicId) return
    try {
      const response = await fetch(`/api/appointments/${clinicId}/types`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })
      const data = await response.json()
      setAppointmentTypes(data.types || [])
    } catch (error) {
      console.error('[AGENDA] Error loading appointment types:', error)
    }
  }

  const loadClinicSchedules = async () => {
    if (!clinicId) return
    try {
      const response = await fetch(`/api/clinic-schedule/${clinicId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })
      const data = await response.json()
      setClinicSchedules(data.schedules || [])
    } catch (error) {
      console.error('[AGENDA] Error loading clinic schedules:', error)
    }
  }

  const loadSources = () => {
    if (!clinic?.configuration?.sources) return
    setSources(clinic.configuration.sources)
  }

  const searchPatients = async (search: string) => {
    if (search.length < 2) {
      setPatientResults([])
      return
    }

    try {
      const response = await fetch(
        `/api/appointments/${clinicId}/patients/search?q=${encodeURIComponent(search)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
          },
        }
      )
      const data = await response.json()
      setPatientResults(data.patients || [])
    } catch (error) {
      console.error('Error searching patients:', error)
    }
  }

  const handlePatientSearch = (value: string) => {
    setPatientSearch(value)
    searchPatients(value)
  }

  const selectPatient = (patient: any) => {
    setSelectedPatient(patient)
    setPatientSearch(`${patient.code} - ${patient.name}`)
    setPatientResults([])
    setNewAppointment({ ...newAppointment })
  }

  // Reschedule queue search
  const searchReschedules = async (search: string) => {
    if (search.length < 2) {
      setRescheduleResults([])
      return
    }

    try {
      const response = await fetch(
        `/api/appointments/${clinicId}/pending-reschedules/search?q=${encodeURIComponent(search)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
          },
        }
      )
      const data = await response.json()
      setRescheduleResults(data.results || [])
    } catch (error) {
      console.error('Error searching reschedules:', error)
    }
  }

  const handleRescheduleSearch = (value: string) => {
    setRescheduleSearch(value)
    searchReschedules(value)
  }

  const selectReschedule = (reschedule: any) => {
    setSelectedReschedule(reschedule)
    setRescheduleSearch(`${reschedule.patientCode} - ${reschedule.patientName}`)
    setRescheduleResults([])

    // Auto-preencher tipo de consulta e observações
    if (reschedule.preferredAppointmentTypeId) {
      setNewAppointment({
        ...newAppointment,
        appointmentTypeId: reschedule.preferredAppointmentTypeId,
        notes: reschedule.reason ? `Remarcação: ${reschedule.reason}` : 'Remarcação'
      })
    }
  }

  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = []

    for (let minutes = CLINIC_START; minutes < CLINIC_END; minutes += SLOT_DURATION) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      const timeStr = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`

      slots.push({
        time: timeStr,
        appointment: null,
      })
    }

    return slots
  }

  // Get appointments for a specific date
  const getAppointmentsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const filtered = appointments.filter((apt) => {
      // Extract only the date part from the appointment date (which might be a full ISO timestamp)
      const aptDateOnly = apt.date.substring(0, 10)
      const matches = aptDateOnly === dateStr
      return matches
    })
    return filtered
  }

  // Navigation functions
  const navigatePrevious = () => {
    const daysToSubtract = viewMode === 'day' ? 1 : viewMode === '3days' ? 3 : 7
    setSelectedDate(subDays(selectedDate, daysToSubtract))
  }

  const navigateNext = () => {
    const daysToAdd = viewMode === 'day' ? 1 : viewMode === '3days' ? 3 : 7
    setSelectedDate(addDays(selectedDate, daysToAdd))
  }

  const handleSlotClick = (timeStr: string, date: Date) => {
    if (!selectedDoctor) {
      toast.error('Selecione um médico primeiro')
      return
    }

    setSelectedDate(date) // Update selected date for the new appointment
    setSelectedSlot(timeStr)
    setSelectedPatient(null)
    setPatientSearch('')
    setPatientResults([])
    setNewAppointment({
      scheduledEnd: '',
      cabinetId: '',
      appointmentTypeId: '',
      isNewPatient: false,
      notes: '',
      newPatientName: '',
      newPatientWhatsapp: '',
      sourceId: '',
    })
    setIsNewAppointmentOpen(true)
  }

  // Check for overlapping appointments
  const checkOverlap = (start: string, end: string, excludeId?: string): boolean => {
    const startMinutes = timeToMinutes(start)
    const endMinutes = timeToMinutes(end)

    return appointments.some((apt) => {
      if (excludeId && apt.id === excludeId) return false // Exclude current appointment when editing

      const aptStart = timeToMinutes(apt.scheduledStart)
      const aptEnd = timeToMinutes(apt.scheduledEnd)

      // Check if time ranges overlap
      return (startMinutes < aptEnd && endMinutes > aptStart)
    })
  }

  const createAppointment = async () => {
    if (!clinicId || !selectedDoctor || !selectedSlot || !newAppointment.scheduledEnd) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    // Validate based on patient type
    if (newAppointment.isNewPatient) {
      if (!newAppointment.newPatientName || !newAppointment.newPatientWhatsapp || !newAppointment.sourceId) {
        toast.error('Preencha o nome, WhatsApp e a fonte de chegada do paciente novo')
        return
      }
    } else if (isRescheduling) {
      if (!selectedReschedule) {
        toast.error('Selecione um paciente do banco de remarcações')
        return
      }
    } else {
      if (!selectedPatient) {
        toast.error('Selecione um paciente existente')
        return
      }
    }

    // Check for overlapping appointments
    if (checkOverlap(selectedSlot, newAppointment.scheduledEnd)) {
      toast.error('Já existe um agendamento neste horário')
      return
    }

    try {
      const requestBody: any = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        scheduledStart: selectedSlot,
        scheduledEnd: newAppointment.scheduledEnd,
        doctorId: selectedDoctor,
        cabinetId: newAppointment.cabinetId || null,
        appointmentTypeId: newAppointment.appointmentTypeId || null,
        isNewPatient: newAppointment.isNewPatient,
        notes: newAppointment.notes,
      }

      // Add patient info based on type
      if (newAppointment.isNewPatient) {
        requestBody.newPatientName = newAppointment.newPatientName
        requestBody.newPatientWhatsapp = newAppointment.newPatientWhatsapp
        requestBody.sourceId = newAppointment.sourceId
      } else if (isRescheduling && selectedReschedule) {
        requestBody.patientName = selectedReschedule.patientName
        requestBody.patientCode = selectedReschedule.patientCode
        requestBody.rescheduledFrom = selectedReschedule.originalAppointmentId
      } else {
        requestBody.patientName = selectedPatient.name
        requestBody.patientCode = selectedPatient.code
      }

      const response = await fetch(`/api/appointments/${clinicId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao criar agendamento')
      }

      // If it was a reschedule, delete from pending_reschedules
      if (isRescheduling && selectedReschedule) {
        try {
          await fetch(`/api/appointments/${clinicId}/pending-reschedules/${selectedReschedule.id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
            },
          })
        } catch (deleteError) {
          console.error('Error deleting pending reschedule:', deleteError)
          // Don't fail the whole operation if this fails
        }
      }

      toast.success(isRescheduling ? 'Remarcação agendada com sucesso' : 'Agendamento criado')
      setIsNewAppointmentOpen(false)
      setIsRescheduling(false)
      setSelectedReschedule(null)
      setRescheduleSearch('')
      setReloadTrigger((prev) => prev + 1) // Trigger reload
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'bg-blue-500',
      confirmed: 'bg-green-500',
      arrived: 'bg-purple-500',
      in_progress: 'bg-yellow-500',
      completed: 'bg-emerald-500',
      no_show: 'bg-red-500',
      cancelled: 'bg-gray-400',
      rescheduled: 'bg-orange-500',
    }
    return colors[status] || colors.scheduled
  }

  // Calculate appointment duration in minutes
  const getAppointmentDuration = (start: string, end: string): number => {
    return timeToMinutes(end) - timeToMinutes(start)
  }

  // Update appointment time
  const updateAppointmentTime = async (appointmentId: string, newStart: string, newEnd: string) => {
    try {
      const response = await fetch(`/api/appointments/${clinicId}/${appointmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
        body: JSON.stringify({
          scheduledStart: newStart,
          scheduledEnd: newEnd,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar agendamento')
      }

      toast.success('Horário atualizado')
      setReloadTrigger((prev) => prev + 1)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Reschedule appointment (envia para banco de remarcações)
  const handleReschedule = async () => {
    if (!editingAppointment) {
      toast.error('Nenhum agendamento selecionado')
      return
    }

    try {
      const response = await fetch(`/api/appointments/${clinicId}/${editingAppointment.id}/reschedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
        body: JSON.stringify({ reason: rescheduleReason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao remarcar consulta')
      }

      toast.success('Paciente adicionado ao banco de remarcações')
      setIsRescheduleModalOpen(false)
      setIsEditModalOpen(false)
      setRescheduleReason('')
      setReloadTrigger((prev) => prev + 1)
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  // Open reschedule modal
  const openRescheduleModal = () => {
    if (!editingAppointment) return
    setRescheduleReason('')
    setIsRescheduleModalOpen(true)
  }

  // Load reschedule history when opening edit modal
  const loadRescheduleHistory = async (appointment: any) => {
    setOriginalAppointment(null)
    setRescheduledAppointment(null)

    // If this appointment was rescheduled FROM another appointment
    if (appointment.rescheduledFrom) {
      try {
        const response = await fetch(`/api/appointments/${clinicId}/appointment/${appointment.rescheduledFrom}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setOriginalAppointment(data.appointment)
        }
      } catch (error) {
        console.error('Error loading original appointment:', error)
      }
    }

    // If this appointment was rescheduled TO another appointment
    if (appointment.rescheduledTo) {
      try {
        const response = await fetch(`/api/appointments/${clinicId}/appointment/${appointment.rescheduledTo}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
          },
        })
        if (response.ok) {
          const data = await response.json()
          setRescheduledAppointment(data.appointment)
        }
      } catch (error) {
        console.error('Error loading rescheduled appointment:', error)
      }
    }
  }

  const loadPlanProcedures = async (appointment: any) => {
    if (!clinicId || !appointment?.id) return

    setLoadingProcedures(true)
    setPlanProcedures([])
    setProcedureExecutionData({})

    try {
      const procedures = await api.appointmentProcedures.getPlanProcedures(clinicId, appointment.id)
      setPlanProcedures(procedures)

      // Initialize execution data with current date/time for uncompleted procedures
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0]
      const timeStr = now.toTimeString().slice(0, 5)

      const initialData: any = {}
      procedures.forEach((proc: any) => {
        if (!proc.completed) {
          initialData[proc.id] = { date: dateStr, time: timeStr, notes: '' }
        }
      })
      setProcedureExecutionData(initialData)
    } catch (error: any) {
      console.error('Error loading plan procedures:', error)
      toast.error('Erro ao carregar procedimentos do plano')
    } finally {
      setLoadingProcedures(false)
    }
  }

  const openAddProceduresModal = async (appointment: any) => {
    if (!clinicId) {
      toast.error('Clínica não identificada')
      return
    }

    try {
      let consultationEntryId = appointment.consultation_entry_id
      let priceTableType = 'clinica'
      let insuranceProviderId = ''

      // Se não tem consultation_entry_id, criar um automaticamente
      if (!consultationEntryId) {
        console.log('[AGENDA] Appointment has no consultation entry. Creating one...')

        const createResponse = await fetch(
          `/api/appointments/${clinicId}/${appointment.id}/create-consultation-entry`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
            },
          }
        )

        if (!createResponse.ok) {
          throw new Error('Erro ao criar entrada de consulta')
        }

        const createData = await createResponse.json()
        consultationEntryId = createData.consultationEntryId
        priceTableType = createData.priceTableType || 'clinica'
        insuranceProviderId = createData.insuranceProviderId || ''

        // Atualizar o estado local do appointment com o novo consultation_entry_id
        setEditingAppointment({
          ...appointment,
          consultationEntryId: consultationEntryId
        })

        // Recarregar a lista de agendamentos para refletir a mudança
        setReloadTrigger(prev => prev + 1)

        console.log('[AGENDA] Consultation entry created:', consultationEntryId)
      } else {
        // Já tem entrada de consulta, buscar as informações
        const createResponse = await fetch(
          `/api/appointments/${clinicId}/${appointment.id}/create-consultation-entry`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
            },
          }
        )

        if (createResponse.ok) {
          const createData = await createResponse.json()
          priceTableType = createData.priceTableType || 'clinica'
          insuranceProviderId = createData.insuranceProviderId || ''
        }
      }

      setAddProceduresConsultationId(consultationEntryId)
      setAddProceduresPriceTableType(priceTableType)
      setAddProceduresInsuranceProviderId(insuranceProviderId)
      setIsAddProceduresModalOpen(true)
    } catch (error: any) {
      console.error('Error opening add procedures modal:', error)
      toast.error(error.message || 'Erro ao abrir modal de procedimentos')
    }
  }

  if (!clinic) {
    return <div className="p-6">Clínica não encontrada</div>
  }

  const timeSlots = generateTimeSlots()
  const selectedDoctorData = doctors.find((d) => d.id === selectedDoctor)

  const handleReloadData = async () => {
    try {
      await reloadClinics()
      toast.success('Dados recarregados com sucesso')
      // Force reload doctors after clinic data is refreshed
      setTimeout(() => {
        loadDoctors()
        loadCabinets()
        loadAppointmentTypes()
      }, 500)
    } catch (error) {
      console.error('[AGENDA] Erro ao recarregar clínicas:', error)
      toast.error('Erro ao recarregar dados')
    }
  }

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">📅 Agenda Clínica</CardTitle>
            <Button onClick={handleReloadData} variant="outline" size="sm">
              🔄 Recarregar Dados
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Doctor Selector and View Mode */}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Médico</Label>
              <Select value={selectedDoctor} onValueChange={setSelectedDoctor}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o médico" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <Label>Visualização</Label>
              <Select value={viewMode} onValueChange={(value: 'day' | '3days' | 'week') => setViewMode(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">1 Dia</SelectItem>
                  <SelectItem value="3days">3 Dias</SelectItem>
                  <SelectItem value="week">Semana (7 dias)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Navigator */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={navigatePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex flex-col items-center">
              <div className="text-lg font-medium">
                {viewMode === 'day'
                  ? format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
                  : `${format(selectedDate, "d 'de' MMM", { locale: ptBR })} - ${format(addDays(selectedDate, viewMode === '3days' ? 2 : 6), "d 'de' MMM 'de' yyyy", { locale: ptBR })}`
                }
              </div>
              {appointments.length > 0 && (
                <div className="text-xs text-muted-foreground mt-1">
                  {appointments.length} {appointments.length === 1 ? 'consulta' : 'consultas'} neste período
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={navigateNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setSelectedDate(new Date())}
          >
            Hoje
          </Button>

          {/* Calendar Grid */}
          {!selectedDoctor ? (
            <div className="text-center py-8 text-muted-foreground">
              Selecione um médico para ver a agenda
            </div>
          ) : loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando...
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-2 font-medium">
                {selectedDoctorData?.name}
              </div>

              {/* Multi-day Grid */}
              <div className="overflow-x-auto">
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `80px repeat(${getDateRange().length}, minmax(200px, 1fr))`,
                    gridTemplateRows: `32px repeat(${timeSlots.length}, 60px)`,
                  }}
                >
                  {/* Time column header (empty) */}
                  <div className="border-b border-r" />

                  {/* Day headers */}
                  {getDateRange().map((date) => {
                    const dateStr = format(date, 'yyyy-MM-dd')
                    const isToday = dateStr === format(new Date(), 'yyyy-MM-dd')
                    return (
                      <div
                        key={dateStr}
                        className={`border-b border-r px-2 text-center text-sm font-medium flex items-center justify-center ${
                          isToday ? 'bg-primary/10 text-primary' : ''
                        }`}
                      >
                        {format(date, 'EEE, dd/MM', { locale: ptBR })}
                        {isToday && <span className="ml-1 text-xs">(Hoje)</span>}
                      </div>
                    )
                  })}

                  {/* Time slots */}
                  {timeSlots.map((slot, slotIndex) => (
                    <React.Fragment key={`slot-${slotIndex}-${slot.time}`}>
                      {/* Time label */}
                      <div
                        className="border-b border-r flex items-center justify-center text-sm text-muted-foreground"
                      >
                        <Clock className="h-3 w-3 mr-1" />
                        {slot.time}
                      </div>

                      {/* Day slots */}
                      {getDateRange().map((date) => {
                        const dayAppointments = getAppointmentsForDate(date)
                        const dateStr = format(date, 'yyyy-MM-dd')
                        const dayHours = getClinicHoursForDate(date)
                        const isClosed = !dayHours

                        return (
                          <div key={`${dateStr}-${slot.time}`} className="border-b border-r relative">
                            {isClosed && slotIndex === 0 ? (
                              <div
                                className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm bg-muted/30"
                                style={{
                                  gridRow: `2 / ${timeSlots.length + 2}`,
                                  gridColumn: 'span 1',
                                }}
                              >
                                <div className="text-center">
                                  <div className="mb-2">🔒</div>
                                  <div>Clínica Fechada</div>
                                </div>
                              </div>
                            ) : !isClosed ? (
                              <>
                                <button
                                  onClick={() => handleSlotClick(slot.time, date)}
                                  className="absolute inset-0 w-full h-full hover:bg-accent/30 cursor-pointer transition-colors z-0"
                                />

                                {/* Appointments overlay - only render on first slot */}
                                {slotIndex === 0 && (
                                  <div
                                    className="absolute pointer-events-none z-10"
                                    style={{
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      height: `${timeSlots.length * 60}px`,
                                    }}
                                  >
                          {dayAppointments.map((appointment) => {
                    const startMinutes = timeToMinutes(appointment.scheduledStart)
                    const endMinutes = timeToMinutes(appointment.scheduledEnd)
                    const duration = endMinutes - startMinutes
                    const offsetFromTop = ((startMinutes - CLINIC_START) / SLOT_DURATION) * 60
                    const height = (duration / SLOT_DURATION) * 60

                    return (
                      <div
                        key={appointment.id}
                        className={`absolute left-0 right-0 pointer-events-auto cursor-move ${getStatusColor(appointment.status)} bg-opacity-20 border-l-4 rounded-r p-2 group hover:shadow-lg transition-shadow overflow-hidden`}
                        style={{
                          top: `${offsetFromTop}px`,
                          height: `${height}px`,
                          borderLeftColor: appointment.appointmentType?.color || '#1D9E75',
                        }}
                        draggable
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingAppointment(appointment)
                          setIsEditModalOpen(true)
                          loadRescheduleHistory(appointment)
                          loadPlanProcedures(appointment)
                        }}
                        onDragStart={(e) => {
                          setDraggingAppointment(appointment)
                          const rect = e.currentTarget.getBoundingClientRect()
                          setDragOffset(e.clientY - rect.top)
                        }}
                        onDragEnd={(e) => {
                          if (!draggingAppointment) return

                          // Calculate new time based on drop position
                          const container = e.currentTarget.parentElement
                          if (!container) return

                          const rect = container.getBoundingClientRect()
                          const y = e.clientY - rect.top - dragOffset

                          // Calculate which slot we're in (rounded to nearest 15min slot)
                          const pixelsFromTop = Math.max(0, y)
                          const slotIndex = Math.round(pixelsFromTop / 60)
                          const newStartMinutes = CLINIC_START + (slotIndex * SLOT_DURATION)
                          const newEndMinutes = newStartMinutes + duration

                          // Ensure we don't go outside clinic hours
                          if (newStartMinutes >= CLINIC_START && newEndMinutes <= CLINIC_END) {
                            // Update appointment
                            updateAppointmentTime(
                              appointment.id,
                              minutesToTime(newStartMinutes),
                              minutesToTime(newEndMinutes)
                            )
                          }

                          setDraggingAppointment(null)
                        }}
                      >
                        <div className="font-medium text-sm">
                          {appointment.patientName}
                        </div>
                        {appointment.patientCode && (
                          <div className="text-xs text-muted-foreground">
                            Código: {appointment.patientCode}
                          </div>
                        )}
                        {appointment.appointmentType && (
                          <div className="text-xs text-muted-foreground">
                            {appointment.appointmentType.name}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-1">
                          {appointment.scheduledStart.substring(0, 5)} - {appointment.scheduledEnd.substring(0, 5)}
                        </div>

                        {/* Metrics badges */}
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {appointment.status === 'no_show' && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800" title="Paciente não compareceu">
                              ✗ Falta
                            </span>
                          )}
                          {appointment.status !== 'no_show' && (
                            <>
                              {appointment.confirmedAt && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800" title="Consulta confirmada">
                                  ✓ Confirmada
                                </span>
                              )}
                              {appointment.actualArrival && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800" title="Paciente chegou">
                                  ✓ Chegou
                                </span>
                              )}
                              {appointment.actualStart && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-800" title="Atendimento iniciou">
                                  ✓ Iniciou
                                </span>
                              )}
                              {appointment.actualEnd && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-green-100 text-green-800" title="Atendimento concluído">
                                  ✓ Concluído
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {/* Resize handle */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-primary/20 transition-opacity"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            e.preventDefault()
                            setResizingAppointment(appointment)
                            setResizeStartY(e.clientY)
                            setResizeStartHeight(height)
                          }}
                        />
                      </div>
                    )
                  })}
                  </div>
                )}
              </>
            ) : null}
          </div>
        )
      })}
    </React.Fragment>
  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Appointment Dialog */}
      <Dialog open={isNewAppointmentOpen} onOpenChange={setIsNewAppointmentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Agendamento</DialogTitle>
            <DialogDescription>
              {selectedSlot} - {format(selectedDate, 'dd/MM/yyyy', { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Checkbox Paciente Novo */}
            <div className="flex items-center space-x-2 pb-2 border-b">
              <input
                type="checkbox"
                id="is-new-patient-toggle"
                checked={newAppointment.isNewPatient}
                onChange={(e) => {
                  setNewAppointment({ ...newAppointment, isNewPatient: e.target.checked })
                  // Clear patient selection when toggling
                  setSelectedPatient(null)
                  setPatientSearch('')
                  // Uncheck reschedule if new patient
                  if (e.target.checked) {
                    setIsRescheduling(false)
                    setSelectedReschedule(null)
                    setRescheduleSearch('')
                  }
                }}
                className="h-4 w-4"
              />
              <Label htmlFor="is-new-patient-toggle" className="font-semibold">
                Paciente Novo (Primeira Consulta)
              </Label>
            </div>

            {/* Checkbox Remarcação */}
            {!newAppointment.isNewPatient && (
              <div className="flex items-center space-x-2 pb-2 border-b">
                <input
                  type="checkbox"
                  id="is-reschedule-toggle"
                  checked={isRescheduling}
                  onChange={(e) => {
                    setIsRescheduling(e.target.checked)
                    // Clear patient selection when toggling
                    setSelectedPatient(null)
                    setPatientSearch('')
                    setSelectedReschedule(null)
                    setRescheduleSearch('')
                  }}
                  className="h-4 w-4"
                />
                <Label htmlFor="is-reschedule-toggle" className="font-semibold text-blue-600">
                  📋 Remarcação (do banco)
                </Label>
              </div>
            )}

            {/* Conditional: New Patient Form OR Reschedule Search OR Existing Patient Search */}
            {newAppointment.isNewPatient ? (
              <>
                {/* New Patient Form */}
                <div>
                  <Label>Nome Completo do Paciente *</Label>
                  <Input
                    value={newAppointment.newPatientName}
                    onChange={(e) => setNewAppointment({ ...newAppointment, newPatientName: e.target.value })}
                    placeholder="Digite o nome completo"
                  />
                </div>

                <div>
                  <Label>WhatsApp *</Label>
                  <Input
                    value={newAppointment.newPatientWhatsapp}
                    onChange={(e) => setNewAppointment({ ...newAppointment, newPatientWhatsapp: e.target.value })}
                    placeholder="Digite o WhatsApp com código do país"
                    type="tel"
                  />
                </div>

                <div>
                  <Label>Fonte de Chegada *</Label>
                  <Select
                    value={newAppointment.sourceId}
                    onValueChange={(val) => setNewAppointment({ ...newAppointment, sourceId: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a fonte" />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : isRescheduling ? (
              <>
                {/* Reschedule Search */}
                <div>
                  <Label>Buscar Paciente no Banco de Remarcações *</Label>
                  <div className="relative">
                    <Input
                      value={rescheduleSearch}
                      onChange={(e) => handleRescheduleSearch(e.target.value)}
                      placeholder="Digite o código ou nome"
                      autoComplete="off"
                    />
                    {rescheduleResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {rescheduleResults.map((reschedule) => (
                          <button
                            key={reschedule.id}
                            onClick={() => selectReschedule(reschedule)}
                            className="w-full text-left px-4 py-2 hover:bg-accent border-b last:border-b-0"
                          >
                            <div className="font-medium">{reschedule.patientCode} - {reschedule.patientName}</div>
                            {reschedule.reason && (
                              <div className="text-xs text-muted-foreground">Motivo: {reschedule.reason}</div>
                            )}
                            {reschedule.preferredDoctorName && (
                              <div className="text-xs text-blue-600">Médico preferido: {reschedule.preferredDoctorName}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedReschedule && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                      <div className="text-sm text-blue-800">
                        ✓ {selectedReschedule.patientCode} - {selectedReschedule.patientName}
                      </div>
                      {selectedReschedule.reason && (
                        <div className="text-xs text-blue-600 mt-1">
                          Motivo: {selectedReschedule.reason}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                {/* Existing Patient Search */}
                <div>
                  <Label>Código ou Nome do Paciente *</Label>
                  <div className="relative">
                    <Input
                      value={patientSearch}
                      onChange={(e) => handlePatientSearch(e.target.value)}
                      placeholder="Digite o código ou nome"
                      autoComplete="off"
                    />
                    {patientResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                        {patientResults.map((patient) => (
                          <button
                            key={patient.id}
                            onClick={() => selectPatient(patient)}
                            className="w-full text-left px-4 py-2 hover:bg-accent"
                          >
                            <div className="font-medium">{patient.code}</div>
                            <div className="text-sm text-muted-foreground">{patient.name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedPatient && (
                    <div className="mt-2 text-sm text-green-600">
                      ✓ {selectedPatient.code} - {selectedPatient.name}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Início</Label>
                <Input type="time" value={selectedSlot} disabled />
              </div>
              <div>
                <Label>Fim *</Label>
                <Input
                  type="time"
                  value={newAppointment.scheduledEnd}
                  onChange={(e) => setNewAppointment({ ...newAppointment, scheduledEnd: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Consultório</Label>
              <Select value={newAppointment.cabinetId} onValueChange={(val) => setNewAppointment({ ...newAppointment, cabinetId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {cabinets.map((cab) => (
                    <SelectItem key={cab.id} value={cab.id}>
                      {cab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Consulta</Label>
              <Select value={newAppointment.appointmentTypeId} onValueChange={(val) => setNewAppointment({ ...newAppointment, appointmentTypeId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {appointmentTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded" style={{ backgroundColor: type.color }} />
                        {type.name} ({type.durationMinutes}min)
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Notas</Label>
              <Input
                value={newAppointment.notes}
                onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                placeholder="Observações (opcional)"
              />
            </div>

            <Button onClick={createAppointment} className="w-full">
              Criar Agendamento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>
              {editingAppointment?.patientName} - {editingAppointment?.patientCode}
            </DialogDescription>
          </DialogHeader>

          {editingAppointment && (
            <div className="space-y-4 mt-4">
              {/* Reschedule History */}
              {originalAppointment && (
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-blue-900">📋 Esta consulta foi remarcada de:</p>
                  <div className="text-sm text-blue-800">
                    <p>Data original: {new Date(originalAppointment.date).toLocaleDateString('pt-BR')}</p>
                    <p>Horário original: {originalAppointment.scheduledStart?.substring(0, 5)} - {originalAppointment.scheduledEnd?.substring(0, 5)}</p>
                    <p className="text-xs mt-1 text-blue-600">Status: Remarcada</p>
                  </div>
                </div>
              )}

              {rescheduledAppointment && (
                <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg space-y-2">
                  <p className="text-sm font-semibold text-orange-900">🔄 Esta consulta foi remarcada para:</p>
                  <div className="text-sm text-orange-800">
                    <p>Nova data: {new Date(rescheduledAppointment.date).toLocaleDateString('pt-BR')}</p>
                    <p>Novo horário: {rescheduledAppointment.scheduledStart?.substring(0, 5)} - {rescheduledAppointment.scheduledEnd?.substring(0, 5)}</p>
                    <p className="text-xs mt-1 text-orange-600">Status: {rescheduledAppointment.status}</p>
                  </div>
                </div>
              )}

              {/* Informações do Agendamento */}
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Agendamento Criado em</Label>
                  <p className="text-sm font-medium">
                    {editingAppointment.createdAt
                      ? new Date(editingAppointment.createdAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Data da Consulta</Label>
                  <p className="text-sm font-medium">
                    {new Date(editingAppointment.date || selectedDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-muted-foreground">Horário da Consulta</Label>
                  <p className="text-sm font-medium">
                    {editingAppointment.scheduledStart?.substring(0, 5)} - {editingAppointment.scheduledEnd?.substring(0, 5)}
                  </p>
                </div>
              </div>

              {/* Métricas de Acompanhamento */}
              <div className="space-y-3 border-t pt-4">
                <Label className="text-base font-semibold">Acompanhamento da Consulta</Label>

                {/* Consulta Confirmada */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="confirmed"
                    checked={!!editingAppointment.confirmedAt}
                    onCheckedChange={async (checked) => {
                      const now = new Date()
                      const newValue = checked ? now.toISOString() : null
                      try {
                        const response = await fetch(`/api/appointments/${clinicId}/${editingAppointment.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
                          },
                          body: JSON.stringify({ confirmedAt: newValue }),
                        })

                        if (!response.ok) {
                          const error = await response.json()
                          throw new Error(error.error || 'Erro ao atualizar')
                        }

                        setEditingAppointment({ ...editingAppointment, confirmedAt: newValue })
                        setReloadTrigger(prev => prev + 1)
                        toast.success(checked ? 'Consulta confirmada' : 'Confirmação removida')
                      } catch (error: any) {
                        console.error('[AGENDA] Error updating confirmedAt:', error)
                        toast.error(error.message || 'Erro ao atualizar')
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor="confirmed" className="cursor-pointer">
                      Consulta confirmada?
                    </Label>
                    {editingAppointment.confirmedAt && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(editingAppointment.confirmedAt).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Paciente Chegou */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="arrived"
                    checked={!!editingAppointment.actualArrival}
                    onCheckedChange={async (checked) => {
                      const now = new Date()
                      const newValue = checked ? now.toISOString() : null
                      try {
                        const response = await fetch(`/api/appointments/${clinicId}/${editingAppointment.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
                          },
                          body: JSON.stringify({ actualArrival: newValue }),
                        })

                        if (!response.ok) {
                          const error = await response.json()
                          throw new Error(error.error || 'Erro ao atualizar')
                        }

                        setEditingAppointment({ ...editingAppointment, actualArrival: newValue })
                        setReloadTrigger(prev => prev + 1)
                        toast.success(checked ? 'Chegada registrada' : 'Chegada removida')
                      } catch (error: any) {
                        console.error('[AGENDA] Error updating actualArrival:', error)
                        toast.error(error.message || 'Erro ao atualizar')
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor="arrived" className="cursor-pointer">
                      Paciente chegou?
                    </Label>
                    {editingAppointment.actualArrival && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(editingAppointment.actualArrival).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Atendimento Iniciou */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="started"
                    checked={!!editingAppointment.actualStart}
                    onCheckedChange={async (checked) => {
                      const now = new Date()
                      const newValue = checked ? now.toISOString() : null
                      try {
                        const response = await fetch(`/api/appointments/${clinicId}/${editingAppointment.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
                          },
                          body: JSON.stringify({ actualStart: newValue }),
                        })

                        if (!response.ok) {
                          const error = await response.json()
                          throw new Error(error.error || 'Erro ao atualizar')
                        }

                        setEditingAppointment({ ...editingAppointment, actualStart: newValue })
                        setReloadTrigger(prev => prev + 1)
                        toast.success(checked ? 'Início registrado' : 'Início removido')
                      } catch (error: any) {
                        console.error('[AGENDA] Error updating actualStart:', error)
                        toast.error(error.message || 'Erro ao atualizar')
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor="started" className="cursor-pointer">
                      Atendimento iniciou?
                    </Label>
                    {editingAppointment.actualStart && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(editingAppointment.actualStart).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Atendimento Concluído */}
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="completed"
                    checked={!!editingAppointment.actualEnd}
                    onCheckedChange={async (checked) => {
                      const now = new Date()
                      const newValue = checked ? now.toISOString() : null
                      try {
                        const response = await fetch(`/api/appointments/${clinicId}/${editingAppointment.id}`, {
                          method: 'PUT',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
                          },
                          body: JSON.stringify({ actualEnd: newValue }),
                        })

                        if (!response.ok) {
                          const error = await response.json()
                          throw new Error(error.error || 'Erro ao atualizar')
                        }

                        setEditingAppointment({ ...editingAppointment, actualEnd: newValue })
                        setReloadTrigger(prev => prev + 1)
                        toast.success(checked ? 'Conclusão registrada' : 'Conclusão removida')
                      } catch (error: any) {
                        console.error('[AGENDA] Error updating actualEnd:', error)
                        toast.error(error.message || 'Erro ao atualizar')
                      }
                    }}
                  />
                  <div className="flex-1">
                    <Label htmlFor="completed" className="cursor-pointer">
                      Atendimento concluído?
                    </Label>
                    {editingAppointment.actualEnd && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(editingAppointment.actualEnd).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {editingAppointment.appointmentType && (
                <div>
                  <Label>Tipo de Consulta</Label>
                  <p className="text-sm font-medium mt-1">
                    {editingAppointment.appointmentType.name}
                  </p>
                </div>
              )}

              {editingAppointment.notes && (
                <div>
                  <Label>Observações</Label>
                  <p className="text-sm mt-1">{editingAppointment.notes}</p>
                </div>
              )}

              {/* Plan Procedures Section - Always show */}
              {editingAppointment && (
                <div className="border-t pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Procedimentos do Plano de Tratamento</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAddProceduresModal(editingAppointment)}
                      className="h-8"
                    >
                      ➕ Adicionar Procedimentos
                    </Button>
                  </div>

                  {loadingProcedures ? (
                    <div className="text-center py-4 text-muted-foreground">Carregando procedimentos...</div>
                  ) : planProcedures.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground border rounded-lg bg-muted/30">
                      <p className="mb-2">Nenhum procedimento cadastrado no plano ainda</p>
                      <p className="text-xs">Clique em "Adicionar Procedimentos" para adicionar</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {planProcedures.map((procedure: any) => {
                        const execData = procedureExecutionData[procedure.id] || { date: '', time: '', notes: '' }
                        const isCompleted = procedure.completed

                        return (
                          <div
                            key={procedure.id}
                            className={`border rounded-lg p-3 ${isCompleted ? 'bg-muted/30 opacity-70' : 'bg-background'}`}
                          >
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`proc-${procedure.id}`}
                                checked={isCompleted}
                                disabled={isCompleted}
                                onCheckedChange={async (checked) => {
                                  if (!checked || !clinicId) return

                                  try {
                                    const executedAtISO = execData.date && execData.time
                                      ? `${execData.date}T${execData.time}:00`
                                      : undefined

                                    await api.appointmentProcedures.executeProcedure(
                                      clinicId,
                                      editingAppointment.id,
                                      procedure.id,
                                      {
                                        executedAt: executedAtISO,
                                        notes: execData.notes || undefined,
                                      }
                                    )

                                    toast.success('Procedimento executado com sucesso')

                                    // Reload procedures and trigger refresh
                                    loadPlanProcedures(editingAppointment)
                                    setReloadTrigger(prev => prev + 1)
                                  } catch (error: any) {
                                    console.error('Error executing procedure:', error)
                                    toast.error(error.message || 'Erro ao executar procedimento')
                                  }
                                }}
                              />
                              <div className="flex-1 space-y-2">
                                <Label htmlFor={`proc-${procedure.id}`} className="cursor-pointer font-medium">
                                  {procedure.procedureCode} - {procedure.procedureDescription}
                                </Label>

                                {isCompleted && procedure.completedAt && (
                                  <p className="text-xs text-muted-foreground">
                                    Executado em: {new Date(procedure.completedAt).toLocaleString('pt-BR', {
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                    {procedure.notes && ` • ${procedure.notes}`}
                                  </p>
                                )}

                                {!isCompleted && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <Label htmlFor={`date-${procedure.id}`} className="text-xs">Data</Label>
                                      <Input
                                        id={`date-${procedure.id}`}
                                        type="date"
                                        value={execData.date}
                                        onChange={(e) => {
                                          setProcedureExecutionData(prev => ({
                                            ...prev,
                                            [procedure.id]: { ...execData, date: e.target.value }
                                          }))
                                        }}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label htmlFor={`time-${procedure.id}`} className="text-xs">Horário</Label>
                                      <Input
                                        id={`time-${procedure.id}`}
                                        type="time"
                                        value={execData.time}
                                        onChange={(e) => {
                                          setProcedureExecutionData(prev => ({
                                            ...prev,
                                            [procedure.id]: { ...execData, time: e.target.value }
                                          }))
                                        }}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                    <div className="col-span-2 space-y-1">
                                      <Label htmlFor={`notes-${procedure.id}`} className="text-xs">Observações</Label>
                                      <Input
                                        id={`notes-${procedure.id}`}
                                        value={execData.notes}
                                        onChange={(e) => {
                                          setProcedureExecutionData(prev => ({
                                            ...prev,
                                            [procedure.id]: { ...execData, notes: e.target.value }
                                          }))
                                        }}
                                        placeholder="Observações sobre a execução"
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-4">
                <Button
                  variant="default"
                  className="w-full"
                  onClick={openRescheduleModal}
                  disabled={editingAppointment.status === 'rescheduled' || editingAppointment.status === 'completed'}
                >
                  📅 Remarcar Consulta
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={async () => {
                      if (confirm('Tem certeza que deseja excluir esta consulta?')) {
                        try {
                          const response = await fetch(`/api/appointments/${clinicId}/${editingAppointment.id}`, {
                            method: 'DELETE',
                            headers: {
                              Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
                            },
                          })

                          if (!response.ok) {
                            throw new Error('Erro ao excluir consulta')
                          }

                          toast.success('Consulta excluída')
                          setIsEditModalOpen(false)
                          setReloadTrigger(prev => prev + 1)
                        } catch (error: any) {
                          toast.error(error.message)
                        }
                      }
                    }}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Modal */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar para Banco de Remarcações</DialogTitle>
            <DialogDescription>
              {editingAppointment?.patientName} - {editingAppointment?.patientCode}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Current appointment info */}
            <div className="bg-muted/50 p-3 rounded-lg space-y-1">
              <p className="text-sm font-medium">Agendamento Atual:</p>
              <p className="text-sm text-muted-foreground">
                {editingAppointment?.date && new Date(editingAppointment.date).toLocaleDateString('pt-BR')} às{' '}
                {editingAppointment?.scheduledStart?.substring(0, 5)} - {editingAppointment?.scheduledEnd?.substring(0, 5)}
              </p>
            </div>

            <div>
              <Label>Motivo da Remarcação (opcional)</Label>
              <Input
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                placeholder="Ex: Paciente solicitou, conflito de agenda..."
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                📋 O paciente será adicionado ao banco de remarcações. Você poderá encaixá-lo posteriormente ao clicar em um horário disponível na agenda.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsRescheduleModalOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                onClick={handleReschedule}
              >
                Adicionar ao Banco
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Procedures Modal */}
      {addProceduresConsultationId && (
        <AddProceduresModal
          open={isAddProceduresModalOpen}
          onClose={() => {
            setIsAddProceduresModalOpen(false)
            setAddProceduresConsultationId(null)
          }}
          clinicId={clinicId!}
          consultationEntryId={addProceduresConsultationId}
          patientName={editingAppointment?.patientName || ''}
          patientCode={editingAppointment?.patientCode || ''}
          priceTableType={addProceduresPriceTableType}
          insuranceProviderId={addProceduresInsuranceProviderId}
          onSuccess={() => {
            // Reload procedures after adding
            if (editingAppointment) {
              loadPlanProcedures(editingAppointment)
            }
            setReloadTrigger(prev => prev + 1)
          }}
        />
      )}
    </div>
  )
}
