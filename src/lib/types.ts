export type Role = 'MENTORA' | 'GESTOR_CLINICA'

export interface AgendaDistribution {
  operational: number
  planning: number
  sales: number
  leadership: number
}

export interface ClinicConfiguration {
  categories: { id: string; name: string }[]
  cabinets: { id: string; name: string; standardHours: number }[]
  doctors: { id: string; name: string }[]
  sources: { id: string; name: string }[]
  campaigns: { id: string; name: string }[]
}

export interface Clinic {
  id: string
  name: string
  ownerName: string
  logoUrl?: string
  active: boolean
  lastUpdate?: string
  configuration: ClinicConfiguration

  // Targets (Metas)
  targetRevenue: number
  targetAlignersRange: { min: number; max: number }
  targetAvgTicket: number
  targetAcceptanceRate: number
  targetOccupancyRate: number
  targetNPS: number
  targetIntegrationRate: number
  targetAgendaDistribution: AgendaDistribution
  targetAttendanceRate: number
  targetFollowUpRate: number
  targetWaitTime: number
  targetComplaints: number
  targetLeadsRange: { min: number; max: number }
  targetRevenuePerCabinet: number
  targetPlansPresented: { adults: number; kids: number }
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

  // Dashboard Aggregates (New)
  revenueByCategory: Record<string, number>
  leadsByChannel: Record<string, number>
  sourceDistribution: Record<string, number>
  campaignDistribution: Record<string, number>
  delayReasons: { patient: number; doctor: number }
  entryCounts: {
    financial: number
    consultations: number
    prospecting: number
    cabinets: number
    serviceTime: number
    sources: number
  }
}

// Daily Event Types
export interface DailyFinancialEntry {
  id: string
  date: string
  patientName: string
  code: string
  categoryId: string
  value: number
  cabinetId: string
}

export interface DailyConsultationEntry {
  id: string
  date: string
  patientName: string
  code: string
  planCreated: boolean
  planPresented: boolean
  planAccepted: boolean
  planValue: number
}

export interface DailyProspectingEntry {
  id: string
  date: string
  scheduled: number
  email: number
  sms: number
  whatsapp: number
  instagram: number
}

export interface DailyCabinetUsageEntry {
  id: string
  date: string
  cabinetId: string
  hoursAvailable: number
  hoursUsed: number
}

export interface DailyServiceTimeEntry {
  id: string
  date: string
  patientName: string
  code: string
  doctorId: string
  scheduledTime: string
  actualStartTime: string
  delayReason?: 'paciente' | 'medico'
}

export interface DailySourceEntry {
  id: string
  date: string
  patientName: string
  code: string
  isReferral: boolean
  sourceId: string
  referralName?: string
  referralCode?: string
  campaignId?: string
}

export interface KPI {
  id: string
  name: string
  value: number
  unit: 'currency' | 'percent' | 'number' | 'ratio' | 'time'
  change: number
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
  clinicId?: string
  avatarUrl?: string
}

export interface Patient {
  id: string
  code: string
  name: string
  email?: string
  phone?: string
  birthDate?: string
  notes?: string
  createdAt: string
}

// ================================
// Marketing / Social / SEO
// ================================

export type MarketingIntegrationProvider = 'META' | 'GBP' | 'RANK_TRACKER'
export type MarketingIntegrationStatus = 'DISCONNECTED' | 'CONNECTED' | 'ERROR'

export interface ClinicIntegration {
  id: string
  clinicId: string
  provider: MarketingIntegrationProvider
  status: MarketingIntegrationStatus
  tokenExpiresAt?: string | null
  externalAccountId?: string | null
  externalLocationId?: string | null
  metadata?: any
  updatedAt?: string
}

export type SocialMetricProvider = 'INSTAGRAM' | 'FACEBOOK' | 'GOOGLE_BUSINESS'

export interface SocialDailyMetric {
  id: string
  clinicId: string
  provider: SocialMetricProvider
  date: string

  followersTotal?: number | null
  followersDelta?: number | null
  likesTotal?: number | null
  likesDelta?: number | null
  commentsTotal?: number | null
  commentsDelta?: number | null

  reviewsTotal?: number | null
  reviewsNew?: number | null
  ratingAvg?: number | null

  profileViews?: number | null
  reach?: number | null
  impressions?: number | null
  websiteClicks?: number | null
  calls?: number | null
  directions?: number | null

  raw?: any
}

export interface GbpSearchTerm {
  term: string
  impressions: number
}

export interface ClinicKeyword {
  id: string
  clinicId: string
  keyword: string
  city: string
  district?: string | null
  active: boolean
  createdAt?: string
  updatedAt?: string
}

export interface KeywordRankingDaily {
  id: string
  keywordId: string
  keyword: string
  city: string
  district?: string | null
  date: string
  provider: string
  position?: number | null
  found: boolean
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
