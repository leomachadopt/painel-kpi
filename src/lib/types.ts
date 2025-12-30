export type Role = 'mentor' | 'gestor'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  clinicId?: string // Only for gestor
  avatarUrl?: string
}

export interface Clinic {
  id: string
  name: string
  ownerName: string
  logoUrl?: string
  active: boolean
  lastUpdate?: string
}

export interface MonthlyData {
  id: string
  clinicId: string
  month: number // 1-12
  year: number
  // Financial
  revenue: number // Faturamento
  expenses: number // Custos Fixos
  marketingCost: number // Investimento em Marketing
  // Operational
  consultations: number // Total de consultas realizadas
  newPatients: number // Novos pacientes
  leads: number // Leads gerados
  // Quality
  nps: number // 0-100
  cancellations: number // Número de cancelamentos
  capacity: number // Capacidade total de atendimentos
}

export interface KPI {
  id: string
  name: string
  value: number
  unit: string
  change: number // percentage vs last month
  status: 'success' | 'warning' | 'danger'
  description?: string
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
