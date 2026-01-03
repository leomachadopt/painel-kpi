import React, { createContext, useContext, useState, useEffect } from 'react'
import {
  Clinic,
  MonthlyData,
  MonthlyTargets,
  KPI,
  Alert,
  DailyFinancialEntry,
  DailyConsultationEntry,
  DailyProspectingEntry,
  DailyCabinetUsageEntry,
  DailyServiceTimeEntry,
  DailySourceEntry,
  ClinicConfiguration,
  DEFAULT_MONTHLY_TARGETS,
} from '@/lib/types'
import { MOCK_CLINICS, MOCK_DATA } from '@/lib/mockData'
import { getMonth, getYear, parseISO } from 'date-fns'
import { clinicsApi, dailyEntriesApi, patientsApi, targetsApi } from '@/services/api'
import { toast } from 'sonner'
import { useAuth } from './useAuthStore'

interface DataState {
  clinics: Clinic[]
  getClinic: (id: string) => Clinic | undefined
  updateClinicConfig: (clinicId: string, config: ClinicConfiguration) => Promise<void>

  // Monthly Targets
  getMonthlyTargets: (clinicId: string, month: number, year: number) => MonthlyTargets
  loadMonthlyTargets: (clinicId: string, month: number, year: number) => Promise<void>
  updateMonthlyTargets: (targets: MonthlyTargets) => Promise<void>

  getMonthlyData: (
    clinicId: string,
    month: number,
    year: number,
  ) => MonthlyData | undefined
  addMonthlyData: (data: MonthlyData) => void
  calculateKPIs: (clinicId: string, month: number, year: number) => KPI[]
  calculateAlerts: (clinicId: string, month: number, year: number) => Alert[]

  // Daily Entries Actions
  addFinancialEntry: (clinicId: string, entry: DailyFinancialEntry) => Promise<void>
  addConsultationEntry: (
    clinicId: string,
    entry: DailyConsultationEntry,
  ) => Promise<void>
  saveProspectingEntry: (clinicId: string, entry: DailyProspectingEntry) => Promise<void>
  addCabinetUsageEntry: (
    clinicId: string,
    entry: DailyCabinetUsageEntry,
  ) => Promise<void>
  addServiceTimeEntry: (clinicId: string, entry: DailyServiceTimeEntry) => Promise<void>
  addSourceEntry: (clinicId: string, entry: DailySourceEntry) => Promise<void>
  getProspectingEntry: (
    clinicId: string,
    date: string,
  ) => DailyProspectingEntry | undefined

  // Delete operations
  deleteFinancialEntry: (clinicId: string, entryId: string) => Promise<void>
  deleteConsultationEntry: (clinicId: string, entryId: string) => Promise<void>
  deleteProspectingEntry: (clinicId: string, entryId: string) => Promise<void>
  deleteCabinetEntry: (clinicId: string, entryId: string) => Promise<void>
  deleteServiceTimeEntry: (clinicId: string, entryId: string) => Promise<void>
  deleteSourceEntry: (clinicId: string, entryId: string) => Promise<void>
  deletePatient: (clinicId: string, patientId: string) => Promise<void>

  // Entries Access
  financialEntries: Record<string, DailyFinancialEntry[]>
  consultationEntries: Record<string, DailyConsultationEntry[]>
  prospectingEntries: Record<string, DailyProspectingEntry[]>
  cabinetEntries: Record<string, DailyCabinetUsageEntry[]>
  serviceTimeEntries: Record<string, DailyServiceTimeEntry[]>
  sourceEntries: Record<string, DailySourceEntry[]>
}

const DataContext = createContext<DataState | null>(null)

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] =
    useState<Record<string, MonthlyData[]>>(MOCK_DATA)
  const [monthlyTargets, setMonthlyTargets] = useState<
    Record<string, MonthlyTargets[]>
  >({})
  const [dailyEntriesLoaded, setDailyEntriesLoaded] = useState(false)

  // Initialize daily entries state - will be populated from API
  const [financialEntries, setFinancialEntries] = useState<
    Record<string, DailyFinancialEntry[]>
  >({})
  const [consultationEntries, setConsultationEntries] = useState<
    Record<string, DailyConsultationEntry[]>
  >({})
  const [prospectingEntries, setProspectingEntries] = useState<
    Record<string, DailyProspectingEntry[]>
  >({})
  const [cabinetEntries, setCabinetEntries] = useState<
    Record<string, DailyCabinetUsageEntry[]>
  >({})
  const [serviceTimeEntries, setServiceTimeEntries] = useState<
    Record<string, DailyServiceTimeEntry[]>
  >({})
  const [sourceEntries, setSourceEntries] = useState<
    Record<string, DailySourceEntry[]>
  >({})

  // Load clinics from API on mount (only if authenticated)
  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }

    const loadClinics = async () => {
      try {
        const data = await clinicsApi.getAll()
        setClinics(data)
      } catch (error) {
        console.error('Failed to load clinics:', error)
        // Fallback to mock data
        setClinics(MOCK_CLINICS)
      } finally {
        setLoading(false)
      }
    }
    loadClinics()
  }, [isAuthenticated])

  const aggregateDailyToMonthly = (
    clinic: Clinic,
    financial: DailyFinancialEntry[],
    consultations: DailyConsultationEntry[],
    cabinets: DailyCabinetUsageEntry[],
    serviceTime: DailyServiceTimeEntry[],
    sources: DailySourceEntry[],
    prospecting: DailyProspectingEntry[],
  ) => {
    // Group entries by month/year
    const monthlyMap = new Map<string, any>()

    // Helper to initialize monthly data
    const initMonthData = (month: number, year: number) => ({
      id: `${clinic.id}-${year}-${month}`,
      clinicId: clinic.id,
      month,
      year,
      revenueTotal: 0,
      revenueAligners: 0,
      revenuePediatrics: 0,
      revenueDentistry: 0,
      revenueOthers: 0,
      revenueAcceptedPlans: 0,
      cabinets: [],
      plansPresentedAdults: 0,
      plansPresentedKids: 0,
      plansAccepted: 0,
      alignersStarted: 0,
      appointmentsIntegrated: 0,
      appointmentsTotal: 0,
      leads: 0,
      firstConsultationsScheduled: 0,
      firstConsultationsAttended: 0,
      plansNotAccepted: 0,
      plansNotAcceptedFollowUp: 0,
      avgWaitTime: 0,
      agendaOwner: { consultations: 0, management: 0, operations: 0 },
      sources: {},
      revenueByCategory: {},
      leadsByChannel: {},
      sourceDistribution: {},
      campaignDistribution: {},
      delayReasons: {},
      referralsSpontaneous: 0,
      entryCounts: { financial: 0, consultations: 0, prospecting: 0, cabinets: 0, serviceTime: 0, sources: 0 },
    })

    // Process financial entries
    financial.forEach(entry => {
      const date = parseISO(entry.date)
      const month = getMonth(date) + 1
      const year = getYear(date)
      const key = `${year}-${month}`

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, initMonthData(month, year))
      }

      const data = monthlyMap.get(key)
      data.revenueTotal += entry.value
      data.entryCounts.financial++
      
      // Aggregate by category
      const category = clinic.configuration.categories.find(c => c.id === entry.categoryId)
      const catName = category?.name || 'Outros'
      data.revenueByCategory[catName] = (data.revenueByCategory[catName] || 0) + entry.value

      // Aggregate by category type
      if (catName.toLowerCase().includes('alinhador')) {
        data.revenueAligners += entry.value
      } else if (catName.toLowerCase().includes('odontopediatria') || catName.toLowerCase().includes('pediatr')) {
        data.revenuePediatrics += entry.value
      } else if (catName.toLowerCase().includes('dentisteria') || catName.toLowerCase().includes('dentist')) {
        data.revenueDentistry += entry.value
      } else {
        data.revenueOthers += entry.value
      }

      // Aggregate by cabinet
      if (entry.cabinetId) {
        let cabinet = data.cabinets.find((c: any) => c.id === entry.cabinetId)
        if (!cabinet) {
          const cabinetConfig = clinic.configuration.cabinets.find(c => c.id === entry.cabinetId)
          cabinet = {
            id: entry.cabinetId,
            name: cabinetConfig?.name || `Gabinete ${entry.cabinetId}`,
            revenue: 0,
            hoursAvailable: 0,
            hoursOccupied: 0,
          }
          data.cabinets.push(cabinet)
        }
        cabinet.revenue += entry.value
      }
    })

    // Process consultation entries
    consultations.forEach(entry => {
      const date = parseISO(entry.date)
      const month = getMonth(date) + 1
      const year = getYear(date)
      const key = `${year}-${month}`

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, initMonthData(month, year))
      }

      const data = monthlyMap.get(key)
      data.entryCounts.consultations++

      if (entry.stage === 'scheduled') data.firstConsultationsScheduled++
      if (entry.stage === 'attended') data.firstConsultationsAttended++
      if (entry.stage === 'plan_presented_adult') data.plansPresentedAdults++
      if (entry.stage === 'plan_presented_kid') data.plansPresentedKids++
      if (entry.stage === 'plan_accepted') data.plansAccepted++
      if (entry.stage === 'aligners_started') data.alignersStarted++
      if (entry.stage === 'not_accepted') data.plansNotAccepted++
      if (entry.stage === 'follow_up') data.plansNotAcceptedFollowUp++
    })

    // Process prospecting entries
    prospecting.forEach(entry => {
      const date = parseISO(entry.date)
      const month = getMonth(date) + 1
      const year = getYear(date)
      const key = `${year}-${month}`

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, initMonthData(month, year))
      }

      const data = monthlyMap.get(key)
      data.entryCounts.prospecting++

      // Aggregate leads by channel
      data.leadsByChannel.Email = (data.leadsByChannel.Email || 0) + (entry.email || 0)
      data.leadsByChannel.SMS = (data.leadsByChannel.SMS || 0) + (entry.sms || 0)
      data.leadsByChannel.WhatsApp = (data.leadsByChannel.WhatsApp || 0) + (entry.whatsapp || 0)
      data.leadsByChannel.Instagram = (data.leadsByChannel.Instagram || 0) + (entry.instagram || 0)

      // Total leads
      data.leads += (entry.email || 0) + (entry.sms || 0) + (entry.whatsapp || 0) + (entry.instagram || 0)

      // Scheduled consultations
      if (entry.scheduled > 0) {
        data.firstConsultationsScheduled += entry.scheduled
      }
    })

    // Process source entries
    sources.forEach(entry => {
      const date = parseISO(entry.date)
      const month = getMonth(date) + 1
      const year = getYear(date)
      const key = `${year}-${month}`

      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, initMonthData(month, year))
      }

      const data = monthlyMap.get(key)
      data.entryCounts.sources++

      // Get source name
      const sourceName = clinic.configuration.sources.find(s => s.id === entry.sourceId)?.name || 'Desconhecido'
      data.sourceDistribution[sourceName] = (data.sourceDistribution[sourceName] || 0) + 1

      // Aggregate campaign distribution
      if (entry.campaignId) {
        const campaignName = clinic.configuration.campaigns.find(c => c.id === entry.campaignId)?.name || 'Geral'
        data.campaignDistribution[campaignName] = (data.campaignDistribution[campaignName] || 0) + 1
      }

      // Count referrals
      if (entry.isReferral) {
        data.referralsSpontaneous += 1
      }
    })

    // Save aggregated data
    monthlyMap.forEach((data, key) => {
      setMonthlyData((prev) => {
        const clinicData = prev[clinic.id] || []
        const existingIndex = clinicData.findIndex(
          (d) => d.month === data.month && d.year === data.year,
        )
        let newData = [...clinicData]
        if (existingIndex >= 0) {
          newData[existingIndex] = { ...newData[existingIndex], ...data }
        } else {
          newData.push(data)
        }
        return { ...prev, [clinic.id]: newData }
      })
    })
  }

  const loadDailyEntriesForClinic = async (clinicId: string) => {
    const [financial, consultations, cabinets, serviceTime, sources, prospecting] =
      await Promise.all([
        dailyEntriesApi.financial.getAll(clinicId),
        dailyEntriesApi.consultation.getAll(clinicId),
        dailyEntriesApi.cabinet.getAll(clinicId),
        dailyEntriesApi.serviceTime.getAll(clinicId),
        dailyEntriesApi.source.getAll(clinicId),
        dailyEntriesApi.prospecting.getAll(clinicId),
      ])

    setFinancialEntries((prev) => ({ ...prev, [clinicId]: financial }))
    setConsultationEntries((prev) => ({ ...prev, [clinicId]: consultations }))
    setCabinetEntries((prev) => ({ ...prev, [clinicId]: cabinets }))
    setServiceTimeEntries((prev) => ({ ...prev, [clinicId]: serviceTime }))
    setSourceEntries((prev) => ({ ...prev, [clinicId]: sources }))
    setProspectingEntries((prev) => ({ ...prev, [clinicId]: prospecting }))
  }

  // Load daily entries once clinics are known (backend source of truth)
  // Only load if user is authenticated
  useEffect(() => {
    if (!isAuthenticated) return
    if (dailyEntriesLoaded) return
    if (clinics.length === 0) return

    ;(async () => {
      try {
        await Promise.all(clinics.map((c) => loadDailyEntriesForClinic(c.id)))
        setDailyEntriesLoaded(true)
      } catch (error) {
        console.error('Failed to load daily entries:', error)
        // Keep local mock entries as fallback
      }
    })()
  }, [clinics, dailyEntriesLoaded, isAuthenticated])

  // Aggregate daily entries into monthly data after loading
  useEffect(() => {
    if (!dailyEntriesLoaded) return
    if (clinics.length === 0) return

    clinics.forEach(clinic => {
      const financial = financialEntries[clinic.id] || []
      const consultations = consultationEntries[clinic.id] || []
      const cabinets = cabinetEntries[clinic.id] || []
      const serviceTime = serviceTimeEntries[clinic.id] || []
      const sources = sourceEntries[clinic.id] || []
      const prospecting = prospectingEntries[clinic.id] || []

      if (financial.length > 0 || consultations.length > 0 || prospecting.length > 0) {
        aggregateDailyToMonthly(clinic, financial, consultations, cabinets, serviceTime, sources, prospecting)
      }
    })
  }, [dailyEntriesLoaded, clinics, financialEntries, consultationEntries, cabinetEntries, serviceTimeEntries, sourceEntries, prospectingEntries])

  const ensurePatientExists = async (
    clinicId: string,
    code: string,
    patientName: string,
  ) => {
    if (!code || !patientName) return
    
    try {
      // Verificar se o paciente já existe
      const existing = await patientsApi.getByCode(clinicId, code)
      return existing
    } catch (error: any) {
      // Se 404, criar o paciente
      if (error?.status === 404) {
        try {
          const newPatient = await patientsApi.create(clinicId, {
            code,
            name: patientName,
          })
          return newPatient
        } catch (createError: any) {
          // Se 403 ou 409, apenas logar e continuar (não bloquear o lançamento)
          if (createError?.status === 403 || createError?.status === 409) {
            return null
          }
          throw createError
        }
      }
      // Outros erros, apenas continuar
      return null
    }
  }

  const getClinic = (id: string) => clinics.find((c) => c.id === id)

  const updateClinicConfig = async (
    clinicId: string,
    config: ClinicConfiguration,
  ) => {
    // Update local state first for immediate feedback
    setClinics((prev) =>
      prev.map((c) =>
        c.id === clinicId ? { ...c, configuration: config } : c,
      ),
    )

    // Optionally reload from API to ensure sync
    try {
      const updatedClinic = await clinicsApi.getById(clinicId)
      setClinics((prev) =>
        prev.map((c) => (c.id === clinicId ? updatedClinic : c))
      )
    } catch (error) {
      console.error('Failed to reload clinic after update:', error)
    }
  }

  const getMonthlyTargets = (
    clinicId: string,
    month: number,
    year: number,
  ): MonthlyTargets => {
    const targets = monthlyTargets[clinicId]?.find(
      (t) => t.month === month && t.year === year,
    )
    
    if (targets) return targets

    // Se não existir, retorna valores padrão sem fazer setState (para evitar setState durante renderização)
    // Os targets serão criados quando necessário via updateMonthlyTargets
    const clinic = getClinic(clinicId)
    return {
      id: `${clinicId}-${year}-${month}`,
      clinicId,
      month,
      year,
      targetRevenue: clinic?.targetRevenue || DEFAULT_MONTHLY_TARGETS.targetRevenue,
      targetAlignersRange: clinic?.targetAlignersRange || DEFAULT_MONTHLY_TARGETS.targetAlignersRange,
      targetAvgTicket: clinic?.targetAvgTicket || DEFAULT_MONTHLY_TARGETS.targetAvgTicket,
      targetAcceptanceRate: clinic?.targetAcceptanceRate || DEFAULT_MONTHLY_TARGETS.targetAcceptanceRate,
      targetOccupancyRate: clinic?.targetOccupancyRate || DEFAULT_MONTHLY_TARGETS.targetOccupancyRate,
      targetNPS: clinic?.targetNPS || DEFAULT_MONTHLY_TARGETS.targetNPS,
      targetIntegrationRate: clinic?.targetIntegrationRate || DEFAULT_MONTHLY_TARGETS.targetIntegrationRate,
      targetAttendanceRate: clinic?.targetAttendanceRate || DEFAULT_MONTHLY_TARGETS.targetAttendanceRate,
      targetFollowUpRate: clinic?.targetFollowUpRate || DEFAULT_MONTHLY_TARGETS.targetFollowUpRate,
      targetWaitTime: clinic?.targetWaitTime || DEFAULT_MONTHLY_TARGETS.targetWaitTime,
      targetComplaints: clinic?.targetComplaints || DEFAULT_MONTHLY_TARGETS.targetComplaints,
      targetLeadsRange: clinic?.targetLeadsRange || DEFAULT_MONTHLY_TARGETS.targetLeadsRange,
      targetRevenuePerCabinet: clinic?.targetRevenuePerCabinet || DEFAULT_MONTHLY_TARGETS.targetRevenuePerCabinet,
      targetPlansPresented: clinic?.targetPlansPresented || DEFAULT_MONTHLY_TARGETS.targetPlansPresented,
      targetAgendaDistribution: clinic?.targetAgendaDistribution || DEFAULT_MONTHLY_TARGETS.targetAgendaDistribution,
    }
  }

  const loadMonthlyTargets = async (clinicId: string, month: number, year: number) => {
    try {
      const targets = await targetsApi.get(clinicId, year, month)

      // Update local state
      setMonthlyTargets((prev) => {
        const clinicTargets = prev[clinicId] || []
        const existingIndex = clinicTargets.findIndex(
          (t) => t.month === month && t.year === year,
        )

        let newTargets = [...clinicTargets]
        if (existingIndex >= 0) {
          newTargets[existingIndex] = targets
        } else {
          newTargets.push(targets)
        }

        return { ...prev, [clinicId]: newTargets }
      })
    } catch (error: any) {
      // If 404, targets don't exist yet - that's ok, will use defaults
      if (!error.message?.includes('404')) {
        console.error('Error loading targets:', error)
      }
    }
  }

  const updateMonthlyTargets = async (targets: MonthlyTargets) => {
    try {
      // Save to API
      await targetsApi.update(targets.clinicId, targets.year, targets.month, targets)

      // Update local state
      setMonthlyTargets((prev) => {
        const clinicTargets = prev[targets.clinicId] || []
        const existingIndex = clinicTargets.findIndex(
          (t) => t.month === targets.month && t.year === targets.year,
        )

        let newTargets = [...clinicTargets]
        if (existingIndex >= 0) {
          newTargets[existingIndex] = targets
        } else {
          newTargets.push(targets)
        }

        return { ...prev, [targets.clinicId]: newTargets }
      })

      toast.success('Metas atualizadas com sucesso')
    } catch (error: any) {
      console.error('Error saving targets:', error)
      toast.error(error.message || 'Erro ao guardar metas')
      throw error
    }
  }

  const getMonthlyData = (clinicId: string, month: number, year: number) => {
    return monthlyData[clinicId]?.find(
      (d) => d.month === month && d.year === year,
    )
  }

  const addMonthlyData = (data: MonthlyData) => {
    setMonthlyData((prev) => {
      const clinicData = prev[data.clinicId] || []
      const existingIndex = clinicData.findIndex(
        (d) => d.month === data.month && d.year === data.year,
      )
      let newData = [...clinicData]
      if (existingIndex >= 0) {
        newData[existingIndex] = data
      } else {
        newData.push(data)
      }
      return { ...prev, [data.clinicId]: newData }
    })
  }

  const ensureMonthlyData = (clinicId: string, date: string) => {
    const d = parseISO(date)
    const month = getMonth(d) + 1
    const year = getYear(d)
    const current = getMonthlyData(clinicId, month, year)

    if (!current) {
      return undefined
    }
    return { month, year, current: { ...current } }
  }

  const updateMonthlyDataState = (
    clinicId: string,
    month: number,
    year: number,
    updater: (data: MonthlyData) => void,
  ) => {
    setMonthlyData((prev) => {
      const clinicData = prev[clinicId] || []
      const idx = clinicData.findIndex(
        (d) => d.month === month && d.year === year,
      )
      if (idx === -1) return prev

      const newData = [...clinicData]
      const dataCopy = { ...newData[idx] }
      // Deep copy nested structures
      dataCopy.cabinets = dataCopy.cabinets.map((c) => ({ ...c }))
      dataCopy.revenueByCategory = { ...dataCopy.revenueByCategory }
      dataCopy.leadsByChannel = { ...dataCopy.leadsByChannel }
      dataCopy.sourceDistribution = { ...dataCopy.sourceDistribution }
      dataCopy.campaignDistribution = { ...dataCopy.campaignDistribution }
      dataCopy.delayReasons = { ...dataCopy.delayReasons }
      dataCopy.entryCounts = { ...dataCopy.entryCounts }

      updater(dataCopy)
      newData[idx] = dataCopy
      return { ...prev, [clinicId]: newData }
    })
  }

  const hasAuthToken = () => {
    if (typeof window === 'undefined') return false
    const token = localStorage.getItem('kpi_token')
    return !!token
  }

  const addFinancialEntry = async (
    clinicId: string,
    entry: DailyFinancialEntry,
  ) => {
    // Otimista local (sempre, para UX); mas se 403 e houver token, fazemos rollback.
    setFinancialEntries((prev) => ({
      ...prev,
      [clinicId]: [...(prev[clinicId] || []), entry],
    }))

    // Se não há token (ex.: ambiente demo), mantemos apenas local e não chamamos API.
    if (!hasAuthToken()) {
      toast.warning('Sessão expirada. Por favor, faça login novamente para salvar os dados permanentemente.', {
        duration: 5000,
      })
      const data = ensureMonthlyData(clinicId, entry.date)
      if (!data) return
      updateMonthlyDataState(clinicId, data.month, data.year, (d) => {
        d.revenueTotal += entry.value
        d.entryCounts.financial += 1
        const clinic = getClinic(clinicId)
        const catName =
          clinic?.configuration.categories.find((c) => c.id === entry.categoryId)?.name || 'Outros'
        if (catName.includes('Alinhadores')) d.revenueAligners += entry.value
        else if (catName.includes('Odontopediatria')) d.revenuePediatrics += entry.value
        else if (catName.includes('Dentisteria')) d.revenueDentistry += entry.value
        else d.revenueOthers += entry.value
        d.revenueByCategory[catName] = (d.revenueByCategory[catName] || 0) + entry.value
        const cab = d.cabinets.find((c) => c.id === entry.cabinetId)
        if (cab) cab.revenue += entry.value
      })
      return
    }

    try {
      await ensurePatientExists(clinicId, entry.code, entry.patientName)
      await dailyEntriesApi.financial.create(clinicId, entry)
      toast.success('Receita lançada com sucesso!')
    } catch (error: any) {
      const msg = String(error?.message || '').toLowerCase()
      const isForbidden = error?.status === 403 || msg.includes('forbidden')

      // Rollback otimista apenas quando tentamos de fato chamar a API e ela negou.
      setFinancialEntries((prev) => ({
        ...prev,
        [clinicId]: (prev[clinicId] || []).filter((e) => e.id !== entry.id),
      }))

      if (isForbidden) {
        toast.error('Sem permissão para lançar receita.')
        return
      }
      toast.error(error?.message || 'Erro ao lançar receita.')
      return
    }

    const data = ensureMonthlyData(clinicId, entry.date)
    if (!data) return

    updateMonthlyDataState(clinicId, data.month, data.year, (d) => {
      d.revenueTotal += entry.value
      d.entryCounts.financial += 1
      const clinic = getClinic(clinicId)
      const catName =
        clinic?.configuration.categories.find((c) => c.id === entry.categoryId)
          ?.name || 'Outros'

      if (catName.includes('Alinhadores')) d.revenueAligners += entry.value
      else if (catName.includes('Odontopediatria'))
        d.revenuePediatrics += entry.value
      else if (catName.includes('Dentisteria'))
        d.revenueDentistry += entry.value
      else d.revenueOthers += entry.value

      d.revenueByCategory[catName] =
        (d.revenueByCategory[catName] || 0) + entry.value
      const cab = d.cabinets.find((c) => c.id === entry.cabinetId)
      if (cab) cab.revenue += entry.value
    })
  }

  const addConsultationEntry = async (
    clinicId: string,
    entry: DailyConsultationEntry,
  ) => {
    const prevEntries = consultationEntries[clinicId] || []
    const optimistic = prevEntries.some((e) => e.code === entry.code)
      ? prevEntries.map((e) => (e.code === entry.code ? entry : e))
      : [...prevEntries, entry]

    setConsultationEntries((prev) => ({ ...prev, [clinicId]: optimistic }))

    try {
      await ensurePatientExists(clinicId, entry.code, entry.patientName)
      const saved = await dailyEntriesApi.consultation.create(clinicId, entry)
      setConsultationEntries((prev) => {
        const list = prev[clinicId] || []
        const next = list.some((e) => e.code === saved.code)
          ? list.map((e) => (e.code === saved.code ? saved : e))
          : [...list, saved]
        return { ...prev, [clinicId]: next }
      })
    } catch (error) {
      // Rollback optimistic update
      setConsultationEntries((prev) => ({ ...prev, [clinicId]: prevEntries }))
      throw error
    }

    const data = ensureMonthlyData(clinicId, entry.date)
    if (!data) return

    updateMonthlyDataState(clinicId, data.month, data.year, (d) => {
      d.entryCounts.consultations += 1
      if (entry.planPresented) d.plansPresentedAdults += 1
      if (entry.planAccepted) {
        d.plansAccepted += 1
        d.revenueAcceptedPlans += entry.planValue
        if (entry.planValue > 3000) d.alignersStarted += 1
      } else if (entry.planPresented) {
        d.plansNotAccepted += 1
      }
    })
  }

  const saveProspectingEntry = async (
    clinicId: string,
    entry: DailyProspectingEntry,
  ) => {
    // Optimistic update
    const prevEntries = prospectingEntries[clinicId] || []
    setProspectingEntries((prev) => {
      const clinicEntries = prev[clinicId] || []
      const idx = clinicEntries.findIndex((e) => e.date === entry.date)
      const newEntries = [...clinicEntries]
      if (idx >= 0) newEntries[idx] = entry
      else newEntries.push(entry)
      return { ...prev, [clinicId]: newEntries }
    })

    try {
      // Save to API
      await dailyEntriesApi.prospecting.save(clinicId, entry)

      // Re-aggregate monthly data after saving
      const clinic = getClinic(clinicId)
      if (clinic) {
        const financial = financialEntries[clinicId] || []
        const consultations = consultationEntries[clinicId] || []
        const cabinets = cabinetEntries[clinicId] || []
        const serviceTime = serviceTimeEntries[clinicId] || []
        const sources = sourceEntries[clinicId] || []
        const prospecting = prospectingEntries[clinicId] || []

        aggregateDailyToMonthly(clinic, financial, consultations, cabinets, serviceTime, sources, prospecting)
      }
    } catch (error: any) {
      // Rollback on error
      setProspectingEntries((prev) => ({ ...prev, [clinicId]: prevEntries }))
      toast.error(error?.message || 'Erro ao guardar dados de prospecção')
      throw error
    }
  }

  const getProspectingEntry = (clinicId: string, date: string) => {
    return prospectingEntries[clinicId]?.find((e) => e.date === date)
  }

  const addCabinetUsageEntry = async (
    clinicId: string,
    entry: DailyCabinetUsageEntry,
  ) => {
    setCabinetEntries((prev) => ({
      ...prev,
      [clinicId]: [...(prev[clinicId] || []), entry],
    }))

    try {
      await dailyEntriesApi.cabinet.create(clinicId, entry)
    } catch (error) {
      setCabinetEntries((prev) => ({
        ...prev,
        [clinicId]: (prev[clinicId] || []).filter((e) => e.id !== entry.id),
      }))
      throw error
    }

    const data = ensureMonthlyData(clinicId, entry.date)
    if (!data) return

    updateMonthlyDataState(clinicId, data.month, data.year, (d) => {
      d.entryCounts.cabinets += 1
      const cab = d.cabinets.find((c) => c.id === entry.cabinetId)
      if (cab) {
        cab.hoursOccupied += entry.hoursUsed
      }
    })
  }

  const addServiceTimeEntry = async (
    clinicId: string,
    entry: DailyServiceTimeEntry,
  ) => {
    setServiceTimeEntries((prev) => ({
      ...prev,
      [clinicId]: [...(prev[clinicId] || []), entry],
    }))

    try {
      await ensurePatientExists(clinicId, entry.code, entry.patientName)
      await dailyEntriesApi.serviceTime.create(clinicId, entry)
    } catch (error) {
      setServiceTimeEntries((prev) => ({
        ...prev,
        [clinicId]: (prev[clinicId] || []).filter((e) => e.id !== entry.id),
      }))
      throw error
    }

    const data = ensureMonthlyData(clinicId, entry.date)
    if (!data) return

    const [scheduledH, scheduledM] = entry.scheduledTime.split(':').map(Number)
    const [actualH, actualM] = entry.actualStartTime.split(':').map(Number)
    const diffMinutes = actualH * 60 + actualM - (scheduledH * 60 + scheduledM)

    updateMonthlyDataState(clinicId, data.month, data.year, (d) => {
      d.entryCounts.serviceTime += 1
      if (diffMinutes > 0) {
        d.avgWaitTime = Math.floor((d.avgWaitTime * 10 + diffMinutes) / 11)
      }
      if (entry.delayReason === 'medico') d.delayReasons.doctor += 1
      if (entry.delayReason === 'paciente') d.delayReasons.patient += 1
      d.firstConsultationsAttended += 1
    })
  }

  const addSourceEntry = async (clinicId: string, entry: DailySourceEntry) => {
    setSourceEntries((prev) => ({
      ...prev,
      [clinicId]: [...(prev[clinicId] || []), entry],
    }))

    try {
      await ensurePatientExists(clinicId, entry.code, entry.patientName)
      await dailyEntriesApi.source.create(clinicId, entry)
    } catch (error) {
      setSourceEntries((prev) => ({
        ...prev,
        [clinicId]: (prev[clinicId] || []).filter((e) => e.id !== entry.id),
      }))
      throw error
    }

    const data = ensureMonthlyData(clinicId, entry.date)
    if (!data) return

    updateMonthlyDataState(clinicId, data.month, data.year, (d) => {
      d.entryCounts.sources += 1
      if (entry.isReferral) {
        d.referralsSpontaneous += 1
      }
      const clinic = getClinic(clinicId)
      const sourceName =
        clinic?.configuration.sources.find((s) => s.id === entry.sourceId)
          ?.name || 'Desconhecido'

      d.sourceDistribution[sourceName] =
        (d.sourceDistribution[sourceName] || 0) + 1

      if (entry.campaignId) {
        const campName =
          clinic?.configuration.campaigns.find((c) => c.id === entry.campaignId)
            ?.name || 'Geral'
        d.campaignDistribution[campName] =
          (d.campaignDistribution[campName] || 0) + 1
      }
    })
  }

  const deleteFinancialEntry = async (
    clinicId: string,
    entryId: string,
  ) => {
    // Encontrar a entrada antes de deletar para reverter os cálculos
    const entry = financialEntries[clinicId]?.find((e) => e.id === entryId)
    if (!entry) {
      throw new Error('Entrada não encontrada')
    }

    // Remover da lista local (otimista)
    setFinancialEntries((prev) => ({
      ...prev,
      [clinicId]: (prev[clinicId] || []).filter((e) => e.id !== entryId),
    }))

    try {
      await dailyEntriesApi.financial.delete(clinicId, entryId)
      toast.success('Lançamento excluído com sucesso!')
    } catch (error: any) {
      // Rollback otimista
      setFinancialEntries((prev) => ({
        ...prev,
        [clinicId]: [...(prev[clinicId] || []), entry],
      }))
      const msg = String(error?.message || '').toLowerCase()
      const isForbidden = error?.status === 403 || msg.includes('forbidden')
      if (isForbidden) {
        toast.error('Sem permissão para excluir lançamento.')
      } else {
        toast.error(error?.message || 'Erro ao excluir lançamento.')
      }
      throw error
    }

    // Reverter os cálculos mensais
    const data = ensureMonthlyData(clinicId, entry.date)
    if (!data) return

    updateMonthlyDataState(clinicId, data.month, data.year, (d) => {
      d.revenueTotal -= entry.value
      d.entryCounts.financial -= 1
      const clinic = getClinic(clinicId)
      const catName =
        clinic?.configuration.categories.find((c) => c.id === entry.categoryId)
          ?.name || 'Outros'

      if (catName.includes('Alinhadores')) d.revenueAligners -= entry.value
      else if (catName.includes('Odontopediatria'))
        d.revenuePediatrics -= entry.value
      else if (catName.includes('Dentisteria'))
        d.revenueDentistry -= entry.value
      else d.revenueOthers -= entry.value

      d.revenueByCategory[catName] =
        Math.max(0, (d.revenueByCategory[catName] || 0) - entry.value)
      const cab = d.cabinets.find((c) => c.id === entry.cabinetId)
      if (cab) cab.revenue = Math.max(0, cab.revenue - entry.value)
    })
  }

  const deleteConsultationEntry = async (
    clinicId: string,
    entryId: string,
  ) => {
    // Encontrar a entrada antes de deletar para reverter os cálculos
    const entry = consultationEntries[clinicId]?.find((e) => e.id === entryId)
    if (!entry) {
      throw new Error('Entrada não encontrada')
    }

    // Remover da lista local (otimista)
    setConsultationEntries((prev) => ({
      ...prev,
      [clinicId]: (prev[clinicId] || []).filter((e) => e.id !== entryId),
    }))

    try {
      await dailyEntriesApi.consultation.delete(clinicId, entryId)
      toast.success('Consulta excluída com sucesso!')
    } catch (error: any) {
      // Rollback otimista
      setConsultationEntries((prev) => ({
        ...prev,
        [clinicId]: [...(prev[clinicId] || []), entry],
      }))
      const msg = String(error?.message || '').toLowerCase()
      const isForbidden = error?.status === 403 || msg.includes('forbidden')
      if (isForbidden) {
        toast.error('Sem permissão para excluir consulta.')
      } else {
        toast.error(error?.message || 'Erro ao excluir consulta.')
      }
      throw error
    }

    // Reverter os cálculos mensais
    const data = ensureMonthlyData(clinicId, entry.date)
    if (!data) return

    updateMonthlyDataState(clinicId, data.month, data.year, (d) => {
      d.entryCounts.consultations -= 1
      if (entry.planPresented) d.plansPresentedAdults = Math.max(0, d.plansPresentedAdults - 1)
      if (entry.planAccepted) {
        d.plansAccepted = Math.max(0, d.plansAccepted - 1)
        d.revenueAcceptedPlans = Math.max(0, d.revenueAcceptedPlans - entry.planValue)
        if (entry.planValue > 3000) d.alignersStarted = Math.max(0, d.alignersStarted - 1)
      } else if (entry.planPresented) {
        d.plansNotAccepted = Math.max(0, d.plansNotAccepted - 1)
      }
    })
  }

  const deleteProspectingEntry = async (
    clinicId: string,
    entryId: string,
  ) => {
    // Encontrar a entrada antes de deletar
    const entry = prospectingEntries[clinicId]?.find((e) => e.id === entryId)
    if (!entry) {
      throw new Error('Entrada não encontrada')
    }

    // Remover da lista local (otimista)
    setProspectingEntries((prev) => ({
      ...prev,
      [clinicId]: (prev[clinicId] || []).filter((e) => e.id !== entryId),
    }))

    try {
      await dailyEntriesApi.prospecting.delete(clinicId, entryId)
      toast.success('Entrada de prospecção excluída com sucesso!')

      // Re-aggregate monthly data after deletion
      const clinic = getClinic(clinicId)
      if (clinic) {
        const financial = financialEntries[clinicId] || []
        const consultations = consultationEntries[clinicId] || []
        const cabinets = cabinetEntries[clinicId] || []
        const serviceTime = serviceTimeEntries[clinicId] || []
        const sources = sourceEntries[clinicId] || []
        const prospecting = prospectingEntries[clinicId] || []

        aggregateDailyToMonthly(clinic, financial, consultations, cabinets, serviceTime, sources, prospecting)
      }
    } catch (error: any) {
      // Rollback otimista
      setProspectingEntries((prev) => ({
        ...prev,
        [clinicId]: [...(prev[clinicId] || []), entry],
      }))
      const msg = String(error?.message || '').toLowerCase()
      const isForbidden = error?.status === 403 || msg.includes('forbidden')
      if (isForbidden) {
        toast.error('Sem permissão para excluir entrada de prospecção.')
      } else {
        toast.error(error?.message || 'Erro ao excluir entrada de prospecção.')
      }
      throw error
    }
  }

  const deleteCabinetEntry = async (
    clinicId: string,
    entryId: string,
  ) => {
    const entry = cabinetEntries[clinicId]?.find((e) => e.id === entryId)
    if (!entry) {
      throw new Error('Entrada não encontrada')
    }

    setCabinetEntries((prev) => ({
      ...prev,
      [clinicId]: (prev[clinicId] || []).filter((e) => e.id !== entryId),
    }))

    try {
      await dailyEntriesApi.cabinet.delete(clinicId, entryId)
      toast.success('Entrada de gabinete excluída com sucesso!')
    } catch (error: any) {
      setCabinetEntries((prev) => ({
        ...prev,
        [clinicId]: [...(prev[clinicId] || []), entry],
      }))
      const msg = String(error?.message || '').toLowerCase()
      const isForbidden = error?.status === 403 || msg.includes('forbidden')
      if (isForbidden) {
        toast.error('Sem permissão para excluir entrada de gabinete.')
      } else {
        toast.error(error?.message || 'Erro ao excluir entrada de gabinete.')
      }
      throw error
    }
  }

  const deleteServiceTimeEntry = async (
    clinicId: string,
    entryId: string,
  ) => {
    const entry = serviceTimeEntries[clinicId]?.find((e) => e.id === entryId)
    if (!entry) {
      throw new Error('Entrada não encontrada')
    }

    setServiceTimeEntries((prev) => ({
      ...prev,
      [clinicId]: (prev[clinicId] || []).filter((e) => e.id !== entryId),
    }))

    try {
      await dailyEntriesApi.serviceTime.delete(clinicId, entryId)
      toast.success('Entrada de tempo excluída com sucesso!')
    } catch (error: any) {
      setServiceTimeEntries((prev) => ({
        ...prev,
        [clinicId]: [...(prev[clinicId] || []), entry],
      }))
      const msg = String(error?.message || '').toLowerCase()
      const isForbidden = error?.status === 403 || msg.includes('forbidden')
      if (isForbidden) {
        toast.error('Sem permissão para excluir entrada de tempo.')
      } else {
        toast.error(error?.message || 'Erro ao excluir entrada de tempo.')
      }
      throw error
    }
  }

  const deleteSourceEntry = async (
    clinicId: string,
    entryId: string,
  ) => {
    const entry = sourceEntries[clinicId]?.find((e) => e.id === entryId)
    if (!entry) {
      throw new Error('Entrada não encontrada')
    }

    setSourceEntries((prev) => ({
      ...prev,
      [clinicId]: (prev[clinicId] || []).filter((e) => e.id !== entryId),
    }))

    try {
      await dailyEntriesApi.source.delete(clinicId, entryId)
      toast.success('Entrada de fonte excluída com sucesso!')
    } catch (error: any) {
      setSourceEntries((prev) => ({
        ...prev,
        [clinicId]: [...(prev[clinicId] || []), entry],
      }))
      const msg = String(error?.message || '').toLowerCase()
      const isForbidden = error?.status === 403 || msg.includes('forbidden')
      if (isForbidden) {
        toast.error('Sem permissão para excluir entrada de fonte.')
      } else {
        toast.error(error?.message || 'Erro ao excluir entrada de fonte.')
      }
      throw error
    }
  }

  const deletePatient = async (clinicId: string, patientId: string) => {
    try {
      await patientsApi.delete(clinicId, patientId)
      toast.success('Paciente excluído com sucesso!')
    } catch (error: any) {
      const msg = String(error?.message || '').toLowerCase()
      const isForbidden = error?.status === 403 || msg.includes('forbidden')
      if (isForbidden) {
        toast.error('Sem permissão para excluir paciente.')
      } else {
        toast.error(error?.message || 'Erro ao excluir paciente.')
      }
      throw error
    }
  }

  const calculateAlerts = (
    clinicId: string,
    month: number,
    year: number,
  ): Alert[] => {
    const current = getMonthlyData(clinicId, month, year)
    const clinic = getClinic(clinicId)
    const targets = getMonthlyTargets(clinicId, month, year)
    if (!current || !clinic) return []
    
    const alerts: Alert[] = []

    // 1. Faturação Crítica
    if (current.revenueTotal < clinic.targetRevenue * 0.9) {
      alerts.push({
        id: 'billing',
        rule: 'Faturação',
        message: `Faturação abaixo de 90% da meta (${(current.revenueTotal / clinic.targetRevenue * 100).toFixed(0)}%). Rever estratégia comercial e volume de primeiras consultas.`,
        severity: 'destructive',
      })
    }

    // 2. Alinhadores Insuficientes
    if (current.alignersStarted < clinic.targetAlignersRange.min) {
      alerts.push({
        id: 'aligners',
        rule: 'Alinhadores',
        message: `Apenas ${current.alignersStarted} alinhadores iniciados (meta: ${clinic.targetAlignersRange.min}-${clinic.targetAlignersRange.max}). Focar em campanhas de alinhadores.`,
        severity: 'destructive',
      })
    }

    // 3. Taxa de Aceitação Baixa
    const plansPresentedTotal = current.plansPresentedAdults + current.plansPresentedKids
    const acceptanceRate = plansPresentedTotal > 0
      ? (current.plansAccepted / plansPresentedTotal) * 100
      : 0
    if (acceptanceRate < targets.targetAcceptanceRate - 10) {
      alerts.push({
        id: 'acceptance_rate',
        rule: 'Taxa de Aceitação',
        message: `Taxa de aceitação em ${acceptanceRate.toFixed(0)}% (meta: ${targets.targetAcceptanceRate}%). Agendar treino de apresentação de planos.`,
        severity: 'warning',
      })
    }

    // 4. Leads Insuficientes
    if (current.leads < targets.targetLeadsRange.min) {
      alerts.push({
        id: 'leads',
        rule: 'Leads',
        message: `Apenas ${current.leads} leads no mês (meta: ${targets.targetLeadsRange.min}-${targets.targetLeadsRange.max}). Aumentar investimento em marketing.`,
        severity: 'destructive',
      })
    }

    // 5. Taxa de Ocupação Baixa
    const totalOccupied = current.cabinets.reduce((sum, c) => sum + c.hoursOccupied, 0)
    const totalAvailable = current.cabinets.reduce((sum, c) => sum + c.hoursAvailable, 0)
    const occupancyRate = totalAvailable > 0 ? (totalOccupied / totalAvailable) * 100 : 0
    if (occupancyRate < targets.targetOccupancyRate - 15) {
      alerts.push({
        id: 'occupancy',
        rule: 'Ocupação de Gabinetes',
        message: `Ocupação em ${occupancyRate.toFixed(0)}% (meta: ${targets.targetOccupancyRate}%). Otimizar agenda e confirmar presenças.`,
        severity: 'warning',
      })
    }

    // 6. NPS Baixo
    if (current.nps < targets.targetNPS - 10) {
      alerts.push({
        id: 'nps',
        rule: 'NPS',
        message: `NPS em ${current.nps} (meta: ${targets.targetNPS}). Realizar inquérito de satisfação detalhado.`,
        severity: 'warning',
      })
    }

    // 7. Tempo de Espera Alto
    if (current.avgWaitTime > targets.targetWaitTime + 5) {
      alerts.push({
        id: 'wait_time',
        rule: 'Tempo de Espera',
        message: `Tempo médio de ${current.avgWaitTime} min (meta: ≤${targets.targetWaitTime} min). Revisar pontualidade da equipa.`,
        severity: 'warning',
      })
    }

    // 8. Reclamações Acima da Meta
    if (current.complaints > targets.targetComplaints) {
      alerts.push({
        id: 'complaints',
        rule: 'Reclamações',
        message: `${current.complaints} reclamações no mês (meta: ≤${targets.targetComplaints}). Gestão imediata necessária.`,
        severity: 'destructive',
      })
    }

    return alerts
  }

  const calculateKPIs = (
    clinicId: string,
    month: number,
    year: number,
  ): KPI[] => {
    const current = getMonthlyData(clinicId, month, year)
    const previous = getMonthlyData(
      clinicId,
      month === 1 ? 12 : month - 1,
      month === 1 ? year - 1 : year,
    )
    const clinic = getClinic(clinicId)
    const targets = getMonthlyTargets(clinicId, month, year)
    if (!current || !clinic) return []
    
    const getStatus = (
      v: number,
      t: number,
      inv = false,
    ): 'success' | 'warning' | 'danger' => {
      if (inv) return v <= t ? 'success' : 'danger'
      const r = t > 0 ? v / t : 0
      if (r >= 1) return 'success'
      if (r >= 0.9) return 'warning'
      return 'danger'
    }
    const calcChange = (c: number, p: number | undefined) =>
      !p ? 0 : ((c - p) / p) * 100

    const kpis: KPI[] = []

    // ===== FINANCEIRO (4 KPIs) =====
    kpis.push({
      id: 'revenue_monthly',
      name: 'Faturação Mensal',
      value: current.revenueTotal,
      unit: 'currency',
      change: calcChange(current.revenueTotal, previous?.revenueTotal),
      status: getStatus(current.revenueTotal, targets.targetRevenue),
      target: targets.targetRevenue,
    })

    const avgTicket = current.firstConsultationsAttended > 0
      ? current.revenueTotal / current.firstConsultationsAttended
      : 0
    const prevAvgTicket = previous && previous.firstConsultationsAttended > 0
      ? previous.revenueTotal / previous.firstConsultationsAttended
      : 0
    kpis.push({
      id: 'avg_ticket',
      name: 'Ticket Médio',
      value: avgTicket,
      unit: 'currency',
      change: calcChange(avgTicket, prevAvgTicket),
      status: getStatus(avgTicket, targets.targetAvgTicket),
      target: targets.targetAvgTicket,
    })

    const revenuePerCabinet = current.cabinets.length > 0
      ? current.cabinets.reduce((sum, c) => sum + c.revenue, 0) / current.cabinets.length
      : 0
    const prevRevenuePerCabinet = previous && previous.cabinets.length > 0
      ? previous.cabinets.reduce((sum, c) => sum + c.revenue, 0) / previous.cabinets.length
      : 0
    kpis.push({
      id: 'revenue_per_cabinet',
      name: 'Receita/Gabinete',
      value: revenuePerCabinet,
      unit: 'currency',
      change: calcChange(revenuePerCabinet, prevRevenuePerCabinet),
      status: getStatus(revenuePerCabinet, targets.targetRevenuePerCabinet),
      target: targets.targetRevenuePerCabinet,
    })

    kpis.push({
      id: 'aligners_started',
      name: 'Alinhadores Iniciados',
      value: current.alignersStarted,
      unit: 'number',
      change: calcChange(current.alignersStarted, previous?.alignersStarted),
      status: current.alignersStarted >= targets.targetAlignersRange.min &&
              current.alignersStarted <= targets.targetAlignersRange.max
        ? 'success'
        : current.alignersStarted >= targets.targetAlignersRange.min * 0.9
        ? 'warning'
        : 'danger',
      target: `${targets.targetAlignersRange.min}-${targets.targetAlignersRange.max}`,
    })

    // ===== COMERCIAL/VENDAS (4 KPIs) =====
    const plansPresentedTotal = current.plansPresentedAdults + current.plansPresentedKids
    const acceptanceRate = plansPresentedTotal > 0
      ? (current.plansAccepted / plansPresentedTotal) * 100
      : 0
    const prevPlansPresentedTotal = previous
      ? previous.plansPresentedAdults + previous.plansPresentedKids
      : 0
    const prevAcceptanceRate = prevPlansPresentedTotal > 0
      ? (previous!.plansAccepted / prevPlansPresentedTotal) * 100
      : 0
    kpis.push({
      id: 'acceptance_rate',
      name: 'Taxa de Aceitação',
      value: acceptanceRate,
      unit: 'percent',
      change: acceptanceRate - prevAcceptanceRate,
      status: getStatus(acceptanceRate, targets.targetAcceptanceRate),
      target: targets.targetAcceptanceRate,
    })

    kpis.push({
      id: 'plans_presented',
      name: 'Planos Apresentados',
      value: plansPresentedTotal,
      unit: 'number',
      change: calcChange(plansPresentedTotal, prevPlansPresentedTotal),
      status: plansPresentedTotal >=
        (targets.targetPlansPresented.adults + targets.targetPlansPresented.kids) * 0.9
        ? 'success'
        : plansPresentedTotal >=
          (targets.targetPlansPresented.adults + targets.targetPlansPresented.kids) * 0.8
        ? 'warning'
        : 'danger',
      target: targets.targetPlansPresented.adults + targets.targetPlansPresented.kids,
    })

    const conversionRate = current.leads > 0
      ? (current.firstConsultationsScheduled / current.leads) * 100
      : 0
    const prevConversionRate = previous && previous.leads > 0
      ? (previous.firstConsultationsScheduled / previous.leads) * 100
      : 0
    kpis.push({
      id: 'conversion_rate',
      name: 'Taxa Conversão Lead→Consulta',
      value: conversionRate,
      unit: 'percent',
      change: conversionRate - prevConversionRate,
      status: conversionRate >= 60 ? 'success' : conversionRate >= 50 ? 'warning' : 'danger',
      target: 60,
    })

    const followUpRate = current.plansNotAccepted > 0
      ? (current.plansNotAcceptedFollowUp / current.plansNotAccepted) * 100
      : 0
    const prevFollowUpRate = previous && previous.plansNotAccepted > 0
      ? (previous.plansNotAcceptedFollowUp / previous.plansNotAccepted) * 100
      : 0
    kpis.push({
      id: 'follow_up_rate',
      name: 'Follow-up Não Aceites',
      value: followUpRate,
      unit: 'percent',
      change: followUpRate - prevFollowUpRate,
      status: getStatus(followUpRate, targets.targetFollowUpRate),
      target: targets.targetFollowUpRate,
    })

    // ===== OPERACIONAL (4 KPIs) =====
    const totalOccupied = current.cabinets.reduce((sum, c) => sum + c.hoursOccupied, 0)
    const totalAvailable = current.cabinets.reduce((sum, c) => sum + c.hoursAvailable, 0)
    const occupancyRate = totalAvailable > 0 ? (totalOccupied / totalAvailable) * 100 : 0
    const prevTotalOccupied = previous
      ? previous.cabinets.reduce((sum, c) => sum + c.hoursOccupied, 0)
      : 0
    const prevTotalAvailable = previous
      ? previous.cabinets.reduce((sum, c) => sum + c.hoursAvailable, 0)
      : 0
    const prevOccupancyRate = prevTotalAvailable > 0
      ? (prevTotalOccupied / prevTotalAvailable) * 100
      : 0
    kpis.push({
      id: 'occupancy_rate',
      name: 'Taxa de Ocupação',
      value: occupancyRate,
      unit: 'percent',
      change: occupancyRate - prevOccupancyRate,
      status: getStatus(occupancyRate, targets.targetOccupancyRate),
      target: targets.targetOccupancyRate,
    })

    const attendanceRate = current.firstConsultationsScheduled > 0
      ? (current.firstConsultationsAttended / current.firstConsultationsScheduled) * 100
      : 0
    const prevAttendanceRate = previous && previous.firstConsultationsScheduled > 0
      ? (previous.firstConsultationsAttended / previous.firstConsultationsScheduled) * 100
      : 0
    kpis.push({
      id: 'attendance_rate',
      name: 'Taxa de Comparência',
      value: attendanceRate,
      unit: 'percent',
      change: attendanceRate - prevAttendanceRate,
      status: getStatus(attendanceRate, targets.targetAttendanceRate),
      target: targets.targetAttendanceRate,
    })

    kpis.push({
      id: 'avg_wait_time',
      name: 'Tempo Médio Espera',
      value: current.avgWaitTime,
      unit: 'time',
      change: calcChange(current.avgWaitTime, previous?.avgWaitTime),
      status: getStatus(current.avgWaitTime, targets.targetWaitTime, true), // inverso
      target: targets.targetWaitTime,
    })

    const integrationRate = current.appointmentsTotal > 0
      ? (current.appointmentsIntegrated / current.appointmentsTotal) * 100
      : 0
    const prevIntegrationRate = previous && previous.appointmentsTotal > 0
      ? (previous.appointmentsIntegrated / previous.appointmentsTotal) * 100
      : 0
    kpis.push({
      id: 'integration_rate',
      name: 'Taxa de Integração',
      value: integrationRate,
      unit: 'percent',
      change: integrationRate - prevIntegrationRate,
      status: getStatus(integrationRate, targets.targetIntegrationRate),
      target: targets.targetIntegrationRate,
    })

    // ===== EXPERIÊNCIA (2 KPIs) =====
    kpis.push({
      id: 'nps',
      name: 'NPS',
      value: current.nps,
      unit: 'number',
      change: current.nps - (previous?.nps || 0),
      status: getStatus(current.nps, targets.targetNPS),
      target: targets.targetNPS,
    })

    kpis.push({
      id: 'referrals',
      name: 'Indicações Espontâneas',
      value: current.referralsSpontaneous,
      unit: 'number',
      change: calcChange(current.referralsSpontaneous, previous?.referralsSpontaneous),
      status: current.referralsSpontaneous > (previous?.referralsSpontaneous || 0)
        ? 'success'
        : current.referralsSpontaneous === (previous?.referralsSpontaneous || 0)
        ? 'warning'
        : 'danger',
    })

    // ===== MARKETING (1 KPI) =====
    kpis.push({
      id: 'leads_total',
      name: 'Leads Mensais',
      value: current.leads,
      unit: 'number',
      change: calcChange(current.leads, previous?.leads),
      status: current.leads >= targets.targetLeadsRange.min &&
              current.leads <= targets.targetLeadsRange.max
        ? 'success'
        : current.leads >= targets.targetLeadsRange.min * 0.9
        ? 'warning'
        : 'danger',
      target: `${targets.targetLeadsRange.min}-${targets.targetLeadsRange.max}`,
    })

    return kpis
  }

  return React.createElement(
    DataContext.Provider,
    {
      value: {
        clinics,
        getClinic,
        updateClinicConfig,
        getMonthlyTargets,
        loadMonthlyTargets,
        updateMonthlyTargets,
        getMonthlyData,
        addMonthlyData,
        calculateKPIs,
        calculateAlerts,
        addFinancialEntry,
        addConsultationEntry,
        saveProspectingEntry,
        addCabinetUsageEntry,
        addServiceTimeEntry,
        addSourceEntry,
        getProspectingEntry,
        deleteFinancialEntry,
        deleteConsultationEntry,
        deleteProspectingEntry,
        deleteCabinetEntry,
        deleteServiceTimeEntry,
        deleteSourceEntry,
        deletePatient,
        financialEntries,
        consultationEntries,
        prospectingEntries,
        cabinetEntries,
        serviceTimeEntries,
        sourceEntries,
      },
    },
    children,
  )
}

const useDataStore = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useDataStore must be used within a DataProvider')
  }
  return context
}

export default useDataStore
