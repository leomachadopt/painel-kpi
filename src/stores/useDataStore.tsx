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
    targetRevenue: 150000,
    targetAlignersRange: { min: 10, max: 15 },
    targetAvgTicket: 2500,
    targetAcceptanceRate: 60,
    targetOccupancyRate: 85,
    targetNPS: 75,
    targetIntegrationRate: 80,
    targetAgendaDistribution: {
      operational: 40,
      planning: 20,
      sales: 20,
      leadership: 20,
    },
  },
  {
    id: 'clinic-2',
    name: 'Centro Médico Vida',
    ownerName: 'Dra. Maria Oliveira',
    active: true,
    lastUpdate: 'Setembro 2023',
    logoUrl: 'https://img.usecurling.com/i?q=heart&color=rose',
    targetRevenue: 200000,
    targetAlignersRange: { min: 20, max: 25 },
    targetAvgTicket: 1800,
    targetAcceptanceRate: 55,
    targetOccupancyRate: 80,
    targetNPS: 80,
    targetIntegrationRate: 75,
    targetAgendaDistribution: {
      operational: 50,
      planning: 10,
      sales: 30,
      leadership: 10,
    },
  },
]

// Helper to generate random data
const generateMockData = (clinicId: string, year: number): MonthlyData[] => {
  return Array.from({ length: 12 }, (_, i) => {
    const revenueTotal = Math.floor(Math.random() * 100000) + 100000
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
        hoursOccupied: Math.floor(Math.random() * 40) + 100,
      },
      {
        id: 'gab-2',
        name: 'Gabinete 2',
        revenue: revenueTotal * 0.4,
        hoursAvailable: 160,
        hoursOccupied: Math.floor(Math.random() * 40) + 80,
      },
    ]

    const plansAccepted = Math.floor(Math.random() * 20) + 20
    const plansPresentedAdults = Math.floor(Math.random() * 30) + 20
    const plansPresentedKids = Math.floor(Math.random() * 10) + 5
    const revenueAcceptedPlans = plansAccepted * (Math.random() * 1000 + 1500)

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
      alignersStarted: Math.floor(Math.random() * 10) + 5,
      appointmentsIntegrated: Math.floor(Math.random() * 100) + 50,
      appointmentsTotal: 200,
      leads: Math.floor(Math.random() * 50) + 20,
      firstConsultationsScheduled: 40,
      firstConsultationsAttended: 35,
      plansNotAccepted: 15,
      plansNotAcceptedFollowUp: 10,
      // Operational
      avgWaitTime: Math.floor(Math.random() * 15) + 5,
      agendaOwner: {
        operational: 80,
        planning: 20,
        sales: 40,
        leadership: 20,
      },
      nps: Math.floor(Math.random() * 20) + 70,
      referralsSpontaneous: Math.floor(Math.random() * 10) + 5,
      referralsBase2025: 10,
      complaints: Math.floor(Math.random() * 3),
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

  const getYTDRevenue = (clinicId: string, month: number, year: number) => {
    const data = monthlyData[clinicId] || []
    return data
      .filter((d) => d.year === year && d.month <= month)
      .reduce((sum, d) => sum + d.revenueTotal, 0)
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

    const kpis: KPI[] = []

    // Helper for percentage change
    const calcChange = (curr: number, prev: number | undefined) => {
      if (!prev || prev === 0) return 0
      return ((curr - prev) / prev) * 100
    }

    // 1. Monthly Revenue
    kpis.push({
      id: 'revenue_monthly',
      name: 'Faturamento Mensal',
      value: current.revenueTotal,
      unit: 'currency',
      change: calcChange(current.revenueTotal, previous?.revenueTotal),
      status:
        current.revenueTotal >= clinic.targetRevenue
          ? 'success'
          : current.revenueTotal >= clinic.targetRevenue * 0.9
            ? 'warning'
            : 'danger',
      target: clinic.targetRevenue,
    })

    // 2. YTD Revenue
    const ytdRevenue = getYTDRevenue(clinicId, month, year)
    // No previous comparison for YTD in this context usually, or vs last year YTD
    kpis.push({
      id: 'revenue_ytd',
      name: 'Faturamento Anual (YTD)',
      value: ytdRevenue,
      unit: 'currency',
      change: 0,
      status: 'success', // Logic could be complex based on annual target
    })

    // 3. Goal vs Actual Comparison
    const goalVsActual =
      clinic.targetRevenue > 0
        ? (current.revenueTotal / clinic.targetRevenue) * 100
        : 0
    kpis.push({
      id: 'goal_vs_actual',
      name: 'Meta vs Realizado',
      value: goalVsActual,
      unit: 'percent',
      change: 0,
      status:
        goalVsActual >= 100
          ? 'success'
          : goalVsActual >= 90
            ? 'warning'
            : 'danger',
    })

    // 4. Number of Aligner Starts
    kpis.push({
      id: 'aligner_starts',
      name: 'Inícios Alinhadores',
      value: current.alignersStarted,
      unit: 'number',
      change: current.alignersStarted - (previous?.alignersStarted || 0),
      status:
        current.alignersStarted >= clinic.targetAlignersRange.min
          ? 'success'
          : 'danger',
      target: `${clinic.targetAlignersRange.min}-${clinic.targetAlignersRange.max}`,
    })

    // 5. Treatment Plans Presented
    const plansPresented =
      current.plansPresentedAdults + current.plansPresentedKids
    const prevPresented =
      (previous?.plansPresentedAdults || 0) +
      (previous?.plansPresentedKids || 0)
    kpis.push({
      id: 'plans_presented',
      name: 'Planos Apresentados',
      value: plansPresented,
      unit: 'number',
      change: plansPresented - prevPresented,
      status: 'success', // No explicit target in clinic model
    })

    // 6. Treatment Plans Accepted
    kpis.push({
      id: 'plans_accepted',
      name: 'Planos Aceitos',
      value: current.plansAccepted,
      unit: 'number',
      change: current.plansAccepted - (previous?.plansAccepted || 0),
      status: 'success',
    })

    // 7. Acceptance Rate
    const acceptanceRate =
      plansPresented > 0 ? (current.plansAccepted / plansPresented) * 100 : 0
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
      status:
        acceptanceRate >= clinic.targetAcceptanceRate
          ? 'success'
          : acceptanceRate >= clinic.targetAcceptanceRate * 0.9
            ? 'warning'
            : 'danger',
      target: clinic.targetAcceptanceRate,
    })

    // 8. Average Ticket
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
      status:
        avgTicket >= clinic.targetAvgTicket
          ? 'success'
          : avgTicket >= clinic.targetAvgTicket * 0.9
            ? 'warning'
            : 'danger',
      target: clinic.targetAvgTicket,
    })

    // 9. Occupancy Rate
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
      status:
        occupancyRate >= clinic.targetOccupancyRate
          ? 'success'
          : occupancyRate >= clinic.targetOccupancyRate * 0.9
            ? 'warning'
            : 'danger',
      target: clinic.targetOccupancyRate,
    })

    // 10. Monthly Leads
    kpis.push({
      id: 'leads',
      name: 'Leads Mensais',
      value: current.leads,
      unit: 'number',
      change: current.leads - (previous?.leads || 0),
      status: 'success', // No explicit target
    })

    // 11. NPS
    kpis.push({
      id: 'nps',
      name: 'NPS',
      value: current.nps,
      unit: 'number',
      change: current.nps - (previous?.nps || 0),
      status:
        current.nps >= clinic.targetNPS
          ? 'success'
          : current.nps >= clinic.targetNPS * 0.9
            ? 'warning'
            : 'danger',
      target: clinic.targetNPS,
    })

    // 12. Revenue per Treatment Room
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
      name: 'Faturamento por Gabinete',
      value: revenuePerCabinet,
      unit: 'currency',
      change: calcChange(revenuePerCabinet, prevRevenuePerCabinet),
      status: 'success', // Target would be targetRevenue / cabinets
    })

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
