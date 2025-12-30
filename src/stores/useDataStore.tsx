import React, { createContext, useContext, useState } from 'react'
import { Clinic, MonthlyData, KPI, CabinetData } from '@/lib/types'

// Mock Data
const MOCK_CLINICS: Clinic[] = [
  {
    id: 'clinic-1',
    name: 'Clínica Sorriso Radiante',
    ownerName: 'Dr. Pedro Santos',
    active: true,
    lastUpdate: 'Outubro 2023',
    logoUrl: 'https://img.usecurling.com/i?q=tooth&color=azure',
    targetRevenue: 83500,
    targetAlignersRange: { min: 11, max: 12 },
    targetAvgTicket: 1200,
    targetAcceptanceRate: 65,
    targetOccupancyRate: 70,
    targetNPS: 80,
    targetIntegrationRate: 85,
    targetAgendaDistribution: {
      operational: 30,
      planning: 20,
      sales: 30,
      leadership: 20,
    },
    targetAttendanceRate: 80,
    targetFollowUpRate: 100,
    targetWaitTime: 10,
    targetComplaints: 2,
    targetLeadsRange: { min: 80, max: 100 },
    targetRevenuePerCabinet: 25000,
    targetPlansPresented: { adults: 15, kids: 20 },
  },
  {
    id: 'clinic-2',
    name: 'Centro Médico Vida',
    ownerName: 'Dra. Maria Oliveira',
    active: true,
    lastUpdate: 'Setembro 2023',
    logoUrl: 'https://img.usecurling.com/i?q=heart&color=rose',
    targetRevenue: 100000, // Custom override
    targetAlignersRange: { min: 15, max: 20 },
    targetAvgTicket: 1500,
    targetAcceptanceRate: 70,
    targetOccupancyRate: 75,
    targetNPS: 85,
    targetIntegrationRate: 85,
    targetAgendaDistribution: {
      operational: 40,
      planning: 10,
      sales: 30,
      leadership: 20,
    },
    targetAttendanceRate: 85,
    targetFollowUpRate: 95,
    targetWaitTime: 8,
    targetComplaints: 1,
    targetLeadsRange: { min: 100, max: 120 },
    targetRevenuePerCabinet: 30000,
    targetPlansPresented: { adults: 20, kids: 25 },
  },
]

// Helper to generate random data
const generateMockData = (clinicId: string, year: number): MonthlyData[] => {
  return Array.from({ length: 12 }, (_, i) => {
    const revenueTotal = Math.floor(Math.random() * 50000) + 70000
    const revenueAligners = revenueTotal * 0.4
    const revenuePediatrics = revenueTotal * 0.2
    const revenueDentistry = revenueTotal * 0.3
    const revenueOthers = revenueTotal * 0.1

    const cabinets: CabinetData[] = [
      {
        id: 'gab-1',
        name: 'Gabinete 1',
        revenue: revenueTotal * 0.6,
        hoursAvailable: 160,
        hoursOccupied: Math.floor(Math.random() * 60) + 90,
      },
      {
        id: 'gab-2',
        name: 'Gabinete 2',
        revenue: revenueTotal * 0.4,
        hoursAvailable: 160,
        hoursOccupied: Math.floor(Math.random() * 50) + 80,
      },
    ]

    const plansAccepted = Math.floor(Math.random() * 15) + 15
    const plansPresentedAdults = Math.floor(Math.random() * 20) + 10
    const plansPresentedKids = Math.floor(Math.random() * 15) + 10
    const revenueAcceptedPlans = plansAccepted * (Math.random() * 800 + 1000)

    const plansNotAccepted =
      plansPresentedAdults + plansPresentedKids - plansAccepted
    const plansNotAcceptedFollowUp = Math.floor(plansNotAccepted * 0.8)

    return {
      id: `${clinicId}-${year}-${i + 1}`,
      clinicId,
      month: i + 1,
      year,
      // Financial
      revenueTotal,
      revenueAligners,
      revenuePediatrics,
      revenueDentistry,
      revenueOthers,
      revenueAcceptedPlans,
      cabinets,
      // Commercial
      plansPresentedAdults,
      plansPresentedKids,
      plansAccepted,
      alignersStarted: Math.floor(Math.random() * 8) + 8,
      appointmentsIntegrated: Math.floor(Math.random() * 50) + 140,
      appointmentsTotal: 200,
      leads: Math.floor(Math.random() * 40) + 60,
      firstConsultationsScheduled: 50,
      firstConsultationsAttended: Math.floor(Math.random() * 10) + 35,
      plansNotAccepted: plansNotAccepted > 0 ? plansNotAccepted : 0,
      plansNotAcceptedFollowUp,
      // Operational
      avgWaitTime: Math.floor(Math.random() * 15) + 2,
      agendaOwner: {
        operational: 80,
        planning: 20,
        sales: 40,
        leadership: 20,
      },
      nps: Math.floor(Math.random() * 20) + 75,
      referralsSpontaneous: Math.floor(Math.random() * 5) + 5,
      referralsBase2025: 8,
      complaints: Math.floor(Math.random() * 4),
      // Legacy
      expenses: revenueTotal * 0.6,
      marketingCost: 5000,
    }
  })
}

const MOCK_DATA: Record<string, MonthlyData[]> = {
  'clinic-1': generateMockData('clinic-1', 2023),
  'clinic-2': generateMockData('clinic-2', 2023),
}

interface DataState {
  clinics: Clinic[]
  getClinic: (id: string) => Clinic | undefined
  getMonthlyData: (
    clinicId: string,
    month: number,
    year: number,
  ) => MonthlyData | undefined
  addMonthlyData: (data: MonthlyData) => void
  calculateKPIs: (clinicId: string, month: number, year: number) => KPI[]
}

const DataContext = createContext<DataState | null>(null)

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [clinics] = useState<Clinic[]>(MOCK_CLINICS)
  const [monthlyData, setMonthlyData] =
    useState<Record<string, MonthlyData[]>>(MOCK_DATA)

  const getClinic = (id: string) => clinics.find((c) => c.id === id)

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

    // Determine status based on traffic light system
    // Green: >= 100% target. Yellow: 90-99% target. Red: < 90% target.
    // Inverse (Wait/Complaints): Green if <= target. Red if > target.
    const getStatus = (
      value: number,
      target: number,
      type: 'standard' | 'inverse' = 'standard',
    ): 'success' | 'warning' | 'danger' => {
      if (type === 'inverse') {
        return value <= target ? 'success' : 'danger'
      }
      const ratio = target > 0 ? value / target : 0
      if (ratio >= 1) return 'success'
      if (ratio >= 0.9) return 'warning'
      return 'danger'
    }

    const calcChange = (curr: number, prev: number | undefined) => {
      if (!prev || prev === 0) return 0
      return ((curr - prev) / prev) * 100
    }

    const kpis: KPI[] = []

    // 1. Faturamento Mensal
    kpis.push({
      id: 'revenue_monthly',
      name: 'Faturamento Mensal',
      value: current.revenueTotal,
      unit: 'currency',
      change: calcChange(current.revenueTotal, previous?.revenueTotal),
      status: getStatus(current.revenueTotal, clinic.targetRevenue),
      target: clinic.targetRevenue,
    })

    // 2. Ticket Médio
    // revenueAcceptedPlans / plansAccepted
    const avgTicket =
      current.plansAccepted > 0
        ? current.revenueAcceptedPlans / current.plansAccepted
        : 0
    const prevAvgTicket =
      previous && previous.plansAccepted > 0
        ? previous.revenueAcceptedPlans / previous.plansAccepted
        : 0
    kpis.push({
      id: 'avg_ticket',
      name: 'Ticket Médio',
      value: avgTicket,
      unit: 'currency',
      change: calcChange(avgTicket, prevAvgTicket),
      status: getStatus(avgTicket, clinic.targetAvgTicket),
      target: clinic.targetAvgTicket,
    })

    // 3. Taxa de Aceitação
    // plansAccepted / (plansPresentedAdults + plansPresentedKids)
    const totalPresented =
      current.plansPresentedAdults + current.plansPresentedKids
    const prevPresented =
      (previous?.plansPresentedAdults || 0) +
      (previous?.plansPresentedKids || 0)

    const acceptanceRate =
      totalPresented > 0 ? (current.plansAccepted / totalPresented) * 100 : 0
    const prevAcceptanceRate =
      prevPresented > 0
        ? ((previous?.plansAccepted || 0) / prevPresented) * 100
        : 0

    kpis.push({
      id: 'acceptance_rate',
      name: 'Taxa de Aceitação',
      value: acceptanceRate,
      unit: 'percent',
      change: acceptanceRate - prevAcceptanceRate,
      status: getStatus(acceptanceRate, clinic.targetAcceptanceRate),
      target: clinic.targetAcceptanceRate,
    })

    // 4. Taxa de Ocupação
    // hoursOccupied / hoursAvailable
    const totalAvail = current.cabinets.reduce(
      (sum, c) => sum + c.hoursAvailable,
      0,
    )
    const totalOccupied = current.cabinets.reduce(
      (sum, c) => sum + c.hoursOccupied,
      0,
    )
    const occupancyRate =
      totalAvail > 0 ? (totalOccupied / totalAvail) * 100 : 0
    const prevOccupancyRate =
      (previous?.cabinets.reduce((sum, c) => sum + c.hoursAvailable, 0) || 0) >
      0
        ? ((previous?.cabinets.reduce((sum, c) => sum + c.hoursOccupied, 0) ||
            0) /
            previous!.cabinets.reduce((sum, c) => sum + c.hoursAvailable, 0)) *
          100
        : 0

    kpis.push({
      id: 'occupancy_rate',
      name: 'Taxa de Ocupação',
      value: occupancyRate,
      unit: 'percent',
      change: occupancyRate - prevOccupancyRate,
      status: getStatus(occupancyRate, clinic.targetOccupancyRate),
      target: `${clinic.targetOccupancyRate}%`,
    })

    // 5. Taxa de Comparecimento
    // firstConsultationsAttended / firstConsultationsScheduled
    const attendanceRate =
      current.firstConsultationsScheduled > 0
        ? (current.firstConsultationsAttended /
            current.firstConsultationsScheduled) *
          100
        : 0
    const prevAttendanceRate =
      (previous?.firstConsultationsScheduled || 0) > 0
        ? ((previous?.firstConsultationsAttended || 0) /
            previous!.firstConsultationsScheduled) *
          100
        : 0

    kpis.push({
      id: 'attendance_rate',
      name: 'Taxa de Comparecimento',
      value: attendanceRate,
      unit: 'percent',
      change: attendanceRate - prevAttendanceRate,
      status: getStatus(attendanceRate, clinic.targetAttendanceRate),
      target: clinic.targetAttendanceRate,
    })

    // 6. Taxa de Follow-up
    // plansNotAcceptedFollowUp / plansNotAccepted
    const followUpRate =
      current.plansNotAccepted > 0
        ? (current.plansNotAcceptedFollowUp / current.plansNotAccepted) * 100
        : 100 // Assume 100% if no rejections
    const prevFollowUpRate =
      (previous?.plansNotAccepted || 0) > 0
        ? ((previous?.plansNotAcceptedFollowUp || 0) /
            previous!.plansNotAccepted) *
          100
        : 100

    kpis.push({
      id: 'followup_rate',
      name: 'Taxa de Follow-up',
      value: followUpRate,
      unit: 'percent',
      change: followUpRate - prevFollowUpRate,
      status: getStatus(followUpRate, clinic.targetFollowUpRate),
      target: clinic.targetFollowUpRate,
    })

    // 7. Percentual de Casos Integrados
    // appointmentsIntegrated / appointmentsTotal
    const integratedRate =
      current.appointmentsTotal > 0
        ? (current.appointmentsIntegrated / current.appointmentsTotal) * 100
        : 0
    const prevIntegratedRate =
      (previous?.appointmentsTotal || 0) > 0
        ? ((previous?.appointmentsIntegrated || 0) /
            previous!.appointmentsTotal) *
          100
        : 0

    kpis.push({
      id: 'integrated_cases',
      name: 'Casos Integrados',
      value: integratedRate,
      unit: 'percent',
      change: integratedRate - prevIntegratedRate,
      status: getStatus(integratedRate, clinic.targetIntegrationRate),
      target: clinic.targetIntegrationRate,
    })

    // 8. Faturamento por Gabinete
    const revenuePerCabinet =
      current.cabinets.length > 0
        ? current.revenueTotal / current.cabinets.length
        : 0
    const prevRevenuePerCabinet =
      (previous?.cabinets.length || 0) > 0
        ? (previous?.revenueTotal || 0) / previous!.cabinets.length
        : 0

    kpis.push({
      id: 'revenue_per_cabinet',
      name: 'Fat. por Gabinete',
      value: revenuePerCabinet,
      unit: 'currency',
      change: calcChange(revenuePerCabinet, prevRevenuePerCabinet),
      status: getStatus(revenuePerCabinet, clinic.targetRevenuePerCabinet),
      target: clinic.targetRevenuePerCabinet,
    })

    // 9. Inícios Alinhadores
    kpis.push({
      id: 'aligner_starts',
      name: 'Inícios Alinhadores',
      value: current.alignersStarted,
      unit: 'number',
      change: current.alignersStarted - (previous?.alignersStarted || 0),
      status: getStatus(
        current.alignersStarted,
        clinic.targetAlignersRange.min,
      ),
      target: `${clinic.targetAlignersRange.min}-${clinic.targetAlignersRange.max}`,
    })

    // 10. Leads Mensais
    kpis.push({
      id: 'leads',
      name: 'Leads Mensais',
      value: current.leads,
      unit: 'number',
      change: current.leads - (previous?.leads || 0),
      status: getStatus(current.leads, clinic.targetLeadsRange.min),
      target: `${clinic.targetLeadsRange.min}-${clinic.targetLeadsRange.max}`,
    })

    // 11. NPS
    kpis.push({
      id: 'nps',
      name: 'NPS',
      value: current.nps,
      unit: 'number',
      change: current.nps - (previous?.nps || 0),
      status: getStatus(current.nps, clinic.targetNPS),
      target: clinic.targetNPS,
    })

    // 12. Tempo de Espera (Inverse)
    kpis.push({
      id: 'wait_time',
      name: 'Tempo de Espera',
      value: current.avgWaitTime,
      unit: 'time', // treat as minutes
      change: current.avgWaitTime - (previous?.avgWaitTime || 0),
      status: getStatus(current.avgWaitTime, clinic.targetWaitTime, 'inverse'),
      target: `< ${clinic.targetWaitTime} min`,
    })

    // Bonus: Complaints (Inverse) - If needed as 13th or replacement
    // kpis.push({
    //   id: 'complaints',
    //   name: 'Reclamações',
    //   value: current.complaints,
    //   unit: 'number',
    //   change: current.complaints - (previous?.complaints || 0),
    //   status: getStatus(current.complaints, clinic.targetComplaints, 'inverse'),
    //   target: clinic.targetComplaints
    // })

    return kpis
  }

  return React.createElement(
    DataContext.Provider,
    {
      value: {
        clinics,
        getClinic,
        getMonthlyData,
        addMonthlyData,
        calculateKPIs,
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
