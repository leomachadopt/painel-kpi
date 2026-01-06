export type Role = 'MENTOR' | 'GESTOR_CLINICA' | 'COLABORADOR'

export interface AgendaDistribution {
  operational: number
  planning: number
  sales: number
  leadership: number
}

export interface MonthlyTargets {
  id: string
  clinicId: string
  month: number
  year: number
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

export const DEFAULT_MONTHLY_TARGETS: Omit<MonthlyTargets, 'id' | 'clinicId' | 'month' | 'year'> = {
  targetRevenue: 50000,
  targetAlignersRange: { min: 10, max: 15 },
  targetAvgTicket: 2500,
  targetAcceptanceRate: 70,
  targetOccupancyRate: 80,
  targetNPS: 90,
  targetIntegrationRate: 85,
  targetAgendaDistribution: {
    operational: 60,
    planning: 15,
    sales: 15,
    leadership: 10,
  },
  targetAttendanceRate: 90,
  targetFollowUpRate: 80,
  targetWaitTime: 10,
  targetComplaints: 5,
  targetLeadsRange: { min: 50, max: 80 },
  targetRevenuePerCabinet: 25000,
  targetPlansPresented: { adults: 20, kids: 10 },
}

export interface ClinicConfiguration {
  categories: { id: string; name: string }[]
  cabinets: { id: string; name: string; standardHours: number }[]
  doctors: { id: string; name: string }[]
  sources: { id: string; name: string }[]
  campaigns: { id: string; name: string }[]
  paymentSources: { id: string; name: string }[]
  alignerBrands: { id: string; name: string }[]
}

export interface Clinic {
  id: string
  name: string
  ownerName: string
  logoUrl?: string
  active: boolean
  lastUpdate?: string
  configuration: ClinicConfiguration

  // Deprecated - mantido para compatibilidade, use MonthlyTargets
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
  plansCreated: number
  plansCreatedTotalValue: number
  plansAccepted: number
  plansAcceptedTotalValue: number
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
    consultationControl: number
    aligners: number
  }
  
  // Consultation Control Metrics
  consultationControl?: {
    noShow: number
    rescheduled: number
    cancelled: number
    oldPatientBooking: number
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
  doctorId?: string | null
  paymentSourceId?: string | null
}

export interface DailyConsultationEntry {
  id: string
  date: string
  patientName: string
  code: string
  planCreated: boolean
  planCreatedAt?: string | null
  planPresented: boolean
  planPresentedAt?: string | null
  planPresentedValue?: number
  planAccepted: boolean
  planAcceptedAt?: string | null
  planValue?: number
  // Source fields (optional - for tracking patient origin)
  sourceId?: string | null
  isReferral?: boolean
  referralName?: string | null
  referralCode?: string | null
  campaignId?: string | null
  // Doctor field (optional - for tracking responsible doctor)
  doctorId?: string | null
}

export interface DailyProspectingEntry {
  id: string
  date: string
  scheduled: number
  email: number
  sms: number
  whatsapp: number
  instagram: number
  phone: number
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

export interface DailyConsultationControlEntry {
  id: string
  date: string
  noShow: number
  rescheduled: number
  cancelled: number
  oldPatientBooking: number
}

export interface Supplier {
  id: string
  clinicId: string
  name: string
  nif?: string | null
  address?: string | null
  postalCode?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  clinicId: string
  name: string
  description?: string | null
  unit?: string | null
  createdAt: string
  updatedAt: string
}

export interface OrderItemEntry {
  id: string
  orderId: string
  itemId: string
  itemName?: string
  quantity: number
  unitPrice?: number | null
  notes?: string | null
  createdAt: string
}

export interface DailyOrderEntry {
  id: string
  clinicId: string
  date: string
  supplierId: string
  supplierName?: string
  orderNumber?: string | null
  requested: boolean
  requestedAt?: string | null
  confirmed: boolean
  confirmedAt?: string | null
  inProduction: boolean
  inProductionAt?: string | null
  ready: boolean
  readyAt?: string | null
  delivered: boolean
  deliveredAt?: string | null
  cancelled: boolean
  cancelledAt?: string | null
  observations?: string | null
  total?: number
  items?: OrderItemEntry[]
  createdAt: string
  updatedAt: string
}

export interface DailyAlignersEntry {
  id: string
  date: string
  patientName: string
  code: string
  alignerBrandId: string
  dataInsertionActive: boolean
  dataInsertionActivatedAt?: string | null
  hasScanner: boolean
  scannerCollectionDate?: string | null
  hasPhotos: boolean
  photosStatus?: 'marked' | 'dispensable' | null
  hasOrtho: boolean
  orthoStatus?: 'marked' | 'dispensable' | null
  hasTele: boolean
  teleStatus?: 'marked' | 'dispensable' | null
  hasCbct: boolean
  cbctStatus?: 'marked' | 'dispensable' | null
  registrationCreated: boolean
  registrationCreatedAt?: string | null
  cckCreated: boolean
  cckCreatedAt?: string | null
  awaitingPlan: boolean
  awaitingPlanAt?: string | null
  awaitingApproval: boolean
  awaitingApprovalAt?: string | null
  approved: boolean
  approvedAt?: string | null
  treatmentPlanCreated: boolean
  treatmentPlanCreatedAt?: string | null
  observations?: string | null
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
  patientName?: string
  patientCode?: string
  entryId?: string
}

export interface UserPermissions {
  canViewDashboardOverview: boolean
  canViewDashboardFinancial: boolean
  canViewDashboardCommercial: boolean
  canViewDashboardOperational: boolean
  canViewDashboardMarketing: boolean
  canViewReports: boolean
  canViewReportFinancial: boolean
  canViewReportBilling: boolean
  canViewReportConsultations: boolean
  canViewReportAligners: boolean
  canViewReportProspecting: boolean
  canViewReportCabinets: boolean
  canViewReportServiceTime: boolean
  canViewReportSources: boolean
  canViewReportConsultationControl: boolean
  canViewReportMarketing: boolean
  canViewTargets: boolean
  canViewOrders: boolean
  canViewSuppliers: boolean
  canEditFinancial: boolean
  canEditConsultations: boolean
  canEditProspecting: boolean
  canEditCabinets: boolean
  canEditServiceTime: boolean
  canEditSources: boolean
  canEditConsultationControl: boolean
  canEditAligners: boolean
  canEditOrders: boolean
  canEditPatients: boolean
  canEditClinicConfig: boolean
  canEditTargets: boolean
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  clinicId?: string
  avatarUrl?: string
  active?: boolean
  permissions?: UserPermissions
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
