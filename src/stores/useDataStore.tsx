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

    // Helpers
    const calcChange = (curr: number, prev: number | undefined) => {
      if (!prev || prev === 0) return 0
      return ((curr - prev) / prev) * 100
    }

    // 1. Ticket Médio: receitaTotalPlanosAceitos / plansAccepted
    const ticketMedio =
      current.plansAccepted > 0
        ? current.revenueAcceptedPlans / current.plansAccepted
        : 0
    const prevTicket =
      previous && previous.plansAccepted > 0
        ? previous.revenueAcceptedPlans / previous.plansAccepted
        : 0

    kpis.push({
      id: 'ticket_medio',
      name: 'Ticket Médio',
      value: ticketMedio,
      unit: 'currency',
      change: calcChange(ticketMedio, prevTicket),
      status: ticketMedio >= clinic.targetAvgTicket ? 'success' : 'warning',
      description: 'Média de valor dos planos aceitos.',
      target: clinic.targetAvgTicket,
    })

    // 2. Taxa de Aceitação
    const plansPresented =
      current.plansPresentedAdults + current.plansPresentedKids
    const acceptanceRate =
      plansPresented > 0 ? (current.plansAccepted / plansPresented) * 100 : 0
    const prevPresented =
      (previous?.plansPresentedAdults || 0) +
      (previous?.plansPresentedKids || 0)
    const prevAcceptance =
      prevPresented > 0
        ? ((previous?.plansAccepted || 0) / prevPresented) * 100
        : 0

    kpis.push({
      id: 'acceptance_rate',
      name: 'Taxa de Aceitação',
      value: acceptanceRate,
      unit: 'percent',
      change: acceptanceRate - prevAcceptance,
      status:
        acceptanceRate >= clinic.targetAcceptanceRate ? 'success' : 'danger',
      description: 'Percentual de planos apresentados que foram aceitos.',
      target: clinic.targetAcceptanceRate,
    })

    // 3. Taxa de Ocupação (Global)
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
    const prevAvail =
      previous?.cabinets.reduce((sum, c) => sum + c.hoursAvailable, 0) || 0
    const prevOccupied =
      previous?.cabinets.reduce((sum, c) => sum + c.hoursOccupied, 0) || 0
    const prevOccupancy = prevAvail > 0 ? (prevOccupied / prevAvail) * 100 : 0

    kpis.push({
      id: 'occupancy_rate',
      name: 'Taxa de Ocupação',
      value: occupancyRate,
      unit: 'percent',
      change: occupancyRate - prevOccupancy,
      status:
        occupancyRate >= clinic.targetOccupancyRate ? 'success' : 'warning',
      description: 'Ocupação média dos gabinetes.',
      target: clinic.targetOccupancyRate,
    })

    // 4. Taxa de Integração
    const integrationRate =
      current.appointmentsTotal > 0
        ? (current.appointmentsIntegrated / current.appointmentsTotal) * 100
        : 0
    const prevIntegration =
      (previous?.appointmentsTotal || 0) > 0
        ? ((previous?.appointmentsIntegrated || 0) /
            (previous?.appointmentsTotal || 1)) *
          100
        : 0

    kpis.push({
      id: 'integration_rate',
      name: 'Taxa de Integração',
      value: integrationRate,
      unit: 'percent',
      change: integrationRate - prevIntegration,
      status:
        integrationRate >= clinic.targetIntegrationRate ? 'success' : 'warning',
      description: 'Atendimentos integrados vs total.',
      target: clinic.targetIntegrationRate,
    })

    // 5. NPS
    kpis.push({
      id: 'nps',
      name: 'NPS',
      value: current.nps,
      unit: 'number',
      change: current.nps - (previous?.nps || 0),
      status: current.nps >= clinic.targetNPS ? 'success' : 'danger',
      description: 'Net Promoter Score.',
      target: clinic.targetNPS,
    })

    // 6. Taxa de Comparecimento (Attendance)
    const attendanceRate =
      current.firstConsultationsScheduled > 0
        ? (current.firstConsultationsAttended /
            current.firstConsultationsScheduled) *
          100
        : 0
    const prevAttendance =
      (previous?.firstConsultationsScheduled || 0) > 0
        ? ((previous?.firstConsultationsAttended || 0) /
            (previous?.firstConsultationsScheduled || 1)) *
          100
        : 0

    kpis.push({
      id: 'attendance_rate',
      name: 'Comparecimento (1ª Cons)',
      value: attendanceRate,
      unit: 'percent',
      change: attendanceRate - prevAttendance,
      status: attendanceRate >= 80 ? 'success' : 'warning',
      description: 'Pacientes que compareceram à primeira consulta.',
    })

    // 7. Crescimento Indicações
    const referralGrowth =
      current.referralsBase2025 > 0
        ? ((current.referralsSpontaneous - current.referralsBase2025) /
            current.referralsBase2025) *
          100
        : 0

    kpis.push({
      id: 'referral_growth',
      name: 'Crescimento Indicações',
      value: referralGrowth,
      unit: 'percent',
      change: 0, // Vs Base Year, not last month
      status: referralGrowth > 0 ? 'success' : 'warning',
      description: 'Indicações espontâneas vs Base 2025.',
    })

    // 8. Faturamento Total
    kpis.push({
      id: 'revenue_total',
      name: 'Faturamento Total',
      value: current.revenueTotal,
      unit: 'currency',
      change: calcChange(current.revenueTotal, previous?.revenueTotal),
      status:
        current.revenueTotal >= clinic.targetRevenue ? 'success' : 'warning',
      description: 'Receita bruta total.',
      target: clinic.targetRevenue,
    })

    // 9. ROI Marketing (Simplified check)
    const roi =
      current.marketingCost > 0
        ? (current.revenueTotal - current.marketingCost) / current.marketingCost
        : 0
    kpis.push({
      id: 'roi',
      name: 'ROI Marketing',
      value: roi,
      unit: 'ratio',
      change: 0,
      status: roi > 10 ? 'success' : 'warning',
      description: 'Retorno sobre investimento.',
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
