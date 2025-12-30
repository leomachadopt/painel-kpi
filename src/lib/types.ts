export type Role = 'MENTORA' | 'GESTOR_CLINICA'

export interface AgendaDistribution {
  operational: number
  planning: number
  sales: number
  leadership: number
}

export interface Clinic {
  id: string
  name: string
  ownerName: string
  logoUrl?: string
  active: boolean
  lastUpdate?: string

  // Targets (Metas)
  targetRevenue: number // Default 83500
  targetAlignersRange: { min: number; max: number } // Default 11-12
  targetAvgTicket: number // Default 1200
  targetAcceptanceRate: number // Default 65
  targetOccupancyRate: number // Default 70-80 (use min 70 for calculation threshold)
  targetNPS: number // Default 80
  targetIntegrationRate: number // Default 85
  targetAgendaDistribution: AgendaDistribution

  // New Targets defined in User Story
  targetAttendanceRate: number // Default 80
  targetFollowUpRate: number // Default 100
  targetWaitTime: number // Default 10 (Inverse)
  targetComplaints: number // Default 2 (Inverse)
  targetLeadsRange: { min: number; max: number } // Default 80-100
  targetRevenuePerCabinet: number // Default 25000
  targetPlansPresented: { adults: number; kids: number } // Default 15, 20
}

export interface CabinetData {
  id: string
  name: string
  revenue: number
  hoursAvailable: number
  hoursOccupied: number
}

export interface MonthlyData {
  id: string
  clinicId: string
  month: number
  year: number

  // Financial
  revenueTotal: number
  revenueAligners: number
  revenuePediatrics: number
  revenueDentistry: number
  revenueOthers: number
  revenueAcceptedPlans: number
  cabinets: CabinetData[]

  // Clinical/Commercial
  plansPresentedAdults: number
  plansPresentedKids: number
  plansAccepted: number
  alignersStarted: number
  appointmentsIntegrated: number
  appointmentsTotal: number
  leads: number
  firstConsultationsScheduled: number
  firstConsultationsAttended: number
  plansNotAccepted: number
  plansNotAcceptedFollowUp: number

  // Operational/Experience
  avgWaitTime: number
  agendaOwner: AgendaDistribution
  nps: number
  referralsSpontaneous: number
  referralsBase2025: number
  complaints: number

  // Legacy/Basic
  expenses: number
  marketingCost: number
}

export interface KPI {
  id: string
  name: string
  value: number
  unit: 'currency' | 'percent' | 'number' | 'ratio' | 'time'
  change: number // percentage vs last month
  status: 'success' | 'warning' | 'danger'
  description?: string
  target?: number | string
}

export interface Alert {
  id: string
  rule: string
  message: string
  severity: 'warning' | 'destructive'
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  clinicId?: string // Only for gestor
  avatarUrl?: string
}

export const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]
