import React, { createContext, useContext, useState } from 'react'
import { Clinic, MonthlyData, KPI, Alert } from '@/lib/types'
import { MOCK_CLINICS, MOCK_DATA } from '@/lib/mockData'

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
  calculateAlerts: (clinicId: string, month: number, year: number) => Alert[]
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

  const calculateAlerts = (
    clinicId: string,
    month: number,
    year: number,
  ): Alert[] => {
    const current = getMonthlyData(clinicId, month, year)
    const clinic = getClinic(clinicId)

    if (!current || !clinic) return []

    const alerts: Alert[] = []

    // 1. Billing Alert Rule
    if (current.revenueTotal < clinic.targetRevenue * 0.9) {
      alerts.push({
        id: 'billing',
        rule: 'Faturamento',
        message:
          'Faturação abaixo da meta. Verificar taxa de aceitação e número de planos apresentados.',
        severity: 'destructive',
      })
    }

    // 2. Aligners Alert Rule
    if (current.alignersStarted < 11) {
      alerts.push({
        id: 'aligners',
        rule: 'Alinhadores',
        message:
          'Alinhadores abaixo da meta de 11–12. Rever apresentações de planos e campanhas ativas para alinhadores.',
        severity: 'destructive',
      })
    }

    // 3. Ticket Alert Rule
    const currentTicket =
      current.plansAccepted > 0
        ? current.revenueAcceptedPlans / current.plansAccepted
        : 0

    // Check significant drop (vs 3-month average)
    let sumTicket = 0
    let countTicket = 0
    for (let i = 1; i <= 3; i++) {
      let pm = month - i
      let py = year
      if (pm <= 0) {
        pm += 12
        py--
      }
      const prev = getMonthlyData(clinicId, pm, py)
      if (prev && prev.plansAccepted > 0) {
        sumTicket += prev.revenueAcceptedPlans / prev.plansAccepted
        countTicket++
      }
    }
    const avg3Month = countTicket > 0 ? sumTicket / countTicket : 0

    if (
      currentTicket < 1200 ||
      (avg3Month > 0 && currentTicket < avg3Month * 0.85)
    ) {
      alerts.push({
        id: 'ticket',
        rule: 'Ticket Médio',
        message:
          'Ticket médio em queda. Rever planeamento clínico e aplicação do Protocolo 1.',
        severity: 'destructive',
      })
    }

    // 4. Leads Alert Rule
    if (current.leads < 80) {
      alerts.push({
        id: 'leads',
        rule: 'Leads',
        message:
          'Leads abaixo da meta. Reforçar marketing digital e ações de indicação.',
        severity: 'destructive',
      })
    }

    // 5. Occupancy Alert Rule
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

    if (occupancyRate < 70) {
      alerts.push({
        id: 'occupancy',
        rule: 'Ocupação',
        message:
          'Ocupação baixa. Rever fluxos e agendamentos (vagas ociosas, horários de pico, etc.).',
        severity: 'destructive',
      })
    }

    // 6. NPS Alert Rule
    if (current.nps < 80) {
      alerts.push({
        id: 'nps',
        rule: 'NPS',
        message:
          'NPS abaixo de 80. Investigar causas: atendimento, tempo de espera, comunicação ou estrutura.',
        severity: 'destructive',
      })
    }

    // 7. Complaints Alert Rule
    if (current.complaints > 2) {
      alerts.push({
        id: 'complaints',
        rule: 'Reclamações',
        message:
          'Reclamações acima do limite (0–2). Abrir plano de ação específico.',
        severity: 'destructive',
      })
    }

    // 8. Acceptance Rate Alert Rule
    const totalPresented =
      current.plansPresentedAdults + current.plansPresentedKids
    const acceptanceRate =
      totalPresented > 0 ? (current.plansAccepted / totalPresented) * 100 : 0

    if (acceptanceRate < clinic.targetAcceptanceRate) {
      alerts.push({
        id: 'acceptance_rate',
        rule: 'Taxa de Aceitação',
        message:
          'Taxa de aceitação abaixo da meta. Necessário rever apresentação de planos.',
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

    kpis.push({
      id: 'revenue_monthly',
      name: 'Faturamento Mensal',
      value: current.revenueTotal,
      unit: 'currency',
      change: calcChange(current.revenueTotal, previous?.revenueTotal),
      status: getStatus(current.revenueTotal, clinic.targetRevenue),
      target: clinic.targetRevenue,
    })

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

    // Attendance
    const attendanceRate =
      current.firstConsultationsScheduled > 0
        ? (current.firstConsultationsAttended /
            current.firstConsultationsScheduled) *
          100
        : 0
    kpis.push({
      id: 'attendance_rate',
      name: 'Taxa de Comparecimento',
      value: attendanceRate,
      unit: 'percent',
      change:
        attendanceRate -
        ((previous?.firstConsultationsScheduled || 0) > 0
          ? ((previous?.firstConsultationsAttended || 0) /
              previous!.firstConsultationsScheduled) *
            100
          : 0),
      status: getStatus(attendanceRate, clinic.targetAttendanceRate),
      target: clinic.targetAttendanceRate,
    })

    // Follow Up
    const followUpRate =
      current.plansNotAccepted > 0
        ? (current.plansNotAcceptedFollowUp / current.plansNotAccepted) * 100
        : 100
    kpis.push({
      id: 'followup_rate',
      name: 'Taxa de Follow-up',
      value: followUpRate,
      unit: 'percent',
      change:
        followUpRate -
        ((previous?.plansNotAccepted || 0) > 0
          ? ((previous?.plansNotAcceptedFollowUp || 0) /
              previous!.plansNotAccepted) *
            100
          : 100),
      status: getStatus(followUpRate, clinic.targetFollowUpRate),
      target: clinic.targetFollowUpRate,
    })

    // Integrated
    const integratedRate =
      current.appointmentsTotal > 0
        ? (current.appointmentsIntegrated / current.appointmentsTotal) * 100
        : 0
    kpis.push({
      id: 'integrated_cases',
      name: 'Casos Integrados',
      value: integratedRate,
      unit: 'percent',
      change:
        integratedRate -
        ((previous?.appointmentsTotal || 0) > 0
          ? ((previous?.appointmentsIntegrated || 0) /
              previous!.appointmentsTotal) *
            100
          : 0),
      status: getStatus(integratedRate, clinic.targetIntegrationRate),
      target: clinic.targetIntegrationRate,
    })

    // Revenue per Cabinet
    const revenuePerCabinet =
      current.cabinets.length > 0
        ? current.revenueTotal / current.cabinets.length
        : 0
    kpis.push({
      id: 'revenue_per_cabinet',
      name: 'Fat. por Gabinete',
      value: revenuePerCabinet,
      unit: 'currency',
      change: calcChange(
        revenuePerCabinet,
        (previous?.cabinets.length || 0) > 0
          ? (previous?.revenueTotal || 0) / previous!.cabinets.length
          : 0,
      ),
      status: getStatus(revenuePerCabinet, clinic.targetRevenuePerCabinet),
      target: clinic.targetRevenuePerCabinet,
    })

    // Aligners
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

    // Leads
    kpis.push({
      id: 'leads',
      name: 'Leads Mensais',
      value: current.leads,
      unit: 'number',
      change: current.leads - (previous?.leads || 0),
      status: getStatus(current.leads, clinic.targetLeadsRange.min),
      target: `${clinic.targetLeadsRange.min}-${clinic.targetLeadsRange.max}`,
    })

    // NPS
    kpis.push({
      id: 'nps',
      name: 'NPS',
      value: current.nps,
      unit: 'number',
      change: current.nps - (previous?.nps || 0),
      status: getStatus(current.nps, clinic.targetNPS),
      target: clinic.targetNPS,
    })

    // Wait Time
    kpis.push({
      id: 'wait_time',
      name: 'Tempo de Espera',
      value: current.avgWaitTime,
      unit: 'time',
      change: current.avgWaitTime - (previous?.avgWaitTime || 0),
      status: getStatus(current.avgWaitTime, clinic.targetWaitTime, 'inverse'),
      target: `< ${clinic.targetWaitTime} min`,
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
        calculateAlerts,
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
