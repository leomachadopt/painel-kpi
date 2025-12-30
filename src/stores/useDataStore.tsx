import React, { createContext, useContext, useState } from 'react'
import {
  Clinic,
  MonthlyData,
  KPI,
  Alert,
  DailyFinancialEntry,
  DailyConsultationEntry,
  DailyProspectingEntry,
  DailyCabinetUsageEntry,
  DailyServiceTimeEntry,
  DailySourceEntry,
  ClinicConfiguration,
} from '@/lib/types'
import { MOCK_CLINICS, MOCK_DATA } from '@/lib/mockData'
import { getMonth, getYear, parseISO } from 'date-fns'

interface DataState {
  clinics: Clinic[]
  getClinic: (id: string) => Clinic | undefined
  updateClinicConfig: (clinicId: string, config: ClinicConfiguration) => void

  getMonthlyData: (
    clinicId: string,
    month: number,
    year: number,
  ) => MonthlyData | undefined
  addMonthlyData: (data: MonthlyData) => void
  calculateKPIs: (clinicId: string, month: number, year: number) => KPI[]
  calculateAlerts: (clinicId: string, month: number, year: number) => Alert[]

  // Daily Entries Actions
  addFinancialEntry: (clinicId: string, entry: DailyFinancialEntry) => void
  addConsultationEntry: (
    clinicId: string,
    entry: DailyConsultationEntry,
  ) => void
  saveProspectingEntry: (clinicId: string, entry: DailyProspectingEntry) => void
  addCabinetUsageEntry: (
    clinicId: string,
    entry: DailyCabinetUsageEntry,
  ) => void
  addServiceTimeEntry: (clinicId: string, entry: DailyServiceTimeEntry) => void
  addSourceEntry: (clinicId: string, entry: DailySourceEntry) => void
  getProspectingEntry: (
    clinicId: string,
    date: string,
  ) => DailyProspectingEntry | undefined
}

const DataContext = createContext<DataState | null>(null)

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [clinics, setClinics] = useState<Clinic[]>(MOCK_CLINICS)
  const [monthlyData, setMonthlyData] =
    useState<Record<string, MonthlyData[]>>(MOCK_DATA)

  // Local state for daily entries (In a real app, this would be DB backed)
  const [prospectingEntries, setProspectingEntries] = useState<
    Record<string, DailyProspectingEntry[]>
  >({})

  const getClinic = (id: string) => clinics.find((c) => c.id === id)

  const updateClinicConfig = (
    clinicId: string,
    config: ClinicConfiguration,
  ) => {
    setClinics((prev) =>
      prev.map((c) =>
        c.id === clinicId ? { ...c, configuration: config } : c,
      ),
    )
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

  // Helper to ensure monthly data exists before update
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
      // Deep copy nested structures to ensure immutability
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

  const addFinancialEntry = (clinicId: string, entry: DailyFinancialEntry) => {
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

      // Update dynamic category revenue
      d.revenueByCategory[catName] =
        (d.revenueByCategory[catName] || 0) + entry.value

      const cab = d.cabinets.find((c) => c.id === entry.cabinetId)
      if (cab) {
        cab.revenue += entry.value
      }
    })
  }

  const addConsultationEntry = (
    clinicId: string,
    entry: DailyConsultationEntry,
  ) => {
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

  const saveProspectingEntry = (
    clinicId: string,
    entry: DailyProspectingEntry,
  ) => {
    setProspectingEntries((prev) => {
      const clinicEntries = prev[clinicId] || []
      const idx = clinicEntries.findIndex((e) => e.date === entry.date)
      const newEntries = [...clinicEntries]
      if (idx >= 0) newEntries[idx] = entry
      else newEntries.push(entry)
      return { ...prev, [clinicId]: newEntries }
    })

    const data = ensureMonthlyData(clinicId, entry.date)
    if (!data) return

    updateMonthlyDataState(clinicId, data.month, data.year, (d) => {
      d.entryCounts.prospecting += 1
      d.leads += 1
      d.firstConsultationsScheduled += entry.scheduled > 0 ? 1 : 0

      // Update leads channel distribution
      // This is a rough accumulation for mock. In production, sum all entries.
      d.leadsByChannel.Email = (d.leadsByChannel.Email || 0) + entry.email
      d.leadsByChannel.SMS = (d.leadsByChannel.SMS || 0) + entry.sms
      d.leadsByChannel.WhatsApp =
        (d.leadsByChannel.WhatsApp || 0) + entry.whatsapp
      d.leadsByChannel.Instagram =
        (d.leadsByChannel.Instagram || 0) + entry.instagram
    })
  }

  const getProspectingEntry = (clinicId: string, date: string) => {
    return prospectingEntries[clinicId]?.find((e) => e.date === date)
  }

  const addCabinetUsageEntry = (
    clinicId: string,
    entry: DailyCabinetUsageEntry,
  ) => {
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

  const addServiceTimeEntry = (
    clinicId: string,
    entry: DailyServiceTimeEntry,
  ) => {
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

  const addSourceEntry = (clinicId: string, entry: DailySourceEntry) => {
    const data = ensureMonthlyData(clinicId, entry.date)
    if (!data) return

    updateMonthlyDataState(clinicId, data.month, data.year, (d) => {
      d.entryCounts.sources += 1
      if (entry.isReferral) {
        d.referralsSpontaneous += 1
      }
      // Update Source Distribution
      const clinic = getClinic(clinicId)
      const sourceName =
        clinic?.configuration.sources.find((s) => s.id === entry.sourceId)
          ?.name || 'Desconhecido'

      d.sourceDistribution[sourceName] =
        (d.sourceDistribution[sourceName] || 0) + 1

      // Update Campaign Distribution
      if (entry.campaignId) {
        const campName =
          clinic?.configuration.campaigns.find((c) => c.id === entry.campaignId)
            ?.name || 'Geral'
        d.campaignDistribution[campName] =
          (d.campaignDistribution[campName] || 0) + 1
      }
    })
  }

  const calculateAlerts = (
    clinicId: string,
    month: number,
    year: number,
  ): Alert[] => {
    const current = getMonthlyData(clinicId, month, year)
    const clinic = getClinic(clinicId)

    if (!current || !clinic) return []

    const alerts: Alert[] = []

    if (current.revenueTotal < clinic.targetRevenue * 0.9) {
      alerts.push({
        id: 'billing',
        rule: 'Faturamento',
        message: 'Faturação abaixo da meta.',
        severity: 'destructive',
      })
    }
    if (current.alignersStarted < 11) {
      alerts.push({
        id: 'aligners',
        rule: 'Alinhadores',
        message: 'Alinhadores abaixo da meta.',
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

    kpis.push({
      id: 'revenue_monthly',
      name: 'Faturamento Mensal',
      value: current.revenueTotal,
      unit: 'currency',
      change: calcChange(current.revenueTotal, previous?.revenueTotal),
      status: getStatus(current.revenueTotal, clinic.targetRevenue),
      target: clinic.targetRevenue,
    })

    kpis.push({
      id: 'nps',
      name: 'NPS',
      value: current.nps,
      unit: 'number',
      change: current.nps - (previous?.nps || 0),
      status: getStatus(current.nps, clinic.targetNPS),
      target: clinic.targetNPS,
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
