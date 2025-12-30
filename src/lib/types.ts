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
  targetRevenue: number
  targetAlignersRange: { min: number; max: number }
  targetAvgTicket: number
  targetAcceptanceRate: number // 0-100
  targetOccupancyRate: number // 0-100
  targetNPS: number
  targetIntegrationRate: number // 0-100
  targetAgendaDistribution: AgendaDistribution
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

  // Legacy/Basic (Kept for compatibility or additional calculations)
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
