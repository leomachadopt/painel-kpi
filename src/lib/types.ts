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
  country?: 'PT-BR' | 'PT-PT'
  language?: 'pt-BR' | 'pt-PT' | 'it' | 'es' | 'en' | 'fr'
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
  isBillingEntry?: boolean
}

export interface FirstConsultationType {
  id: string
  clinicId: string
  name: string
  description?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface FirstConsultationTypeProcedure {
  id: string
  consultationTypeId: string
  name: string
  description?: string | null
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface CompletedProcedure {
  completed: boolean
  justification?: string
}

export interface CompletedProcedures {
  [procedureId: string]: CompletedProcedure
}

export interface DailyConsultationEntry {
  id: string
  date: string
  patientName: string
  code: string
  consultationTypeId?: string | null
  consultationCompleted: boolean
  consultationCompletedAt?: string | null
  completedProcedures?: CompletedProcedures | null
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
  // Plan not eligible (optional - for tracking non-eligible patients)
  planNotEligible?: boolean
  planNotEligibleAt?: string | null
  planNotEligibleReason?: string | null
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

export interface DailyAdvanceInvoiceEntry {
  id: string
  date: string
  patientName: string
  code: string
  doctorId?: string | null
  billedToThirdParty: boolean
  thirdPartyCode?: string | null
  thirdPartyName?: string | null
  value: number
  batchNumber?: string | null // Número do lote (apenas para entradas de lote)
  batchId?: string | null // ID do lote (apenas para entradas de lote)
}

export interface AccountsPayableEntry {
  id: string
  clinicId: string
  description: string
  supplierId?: string | null
  supplierName?: string | null
  supplierIban?: string | null
  supplierNib?: string | null
  supplierBankName?: string | null
  supplierBankAccount?: string | null
  supplierBankAgency?: string | null
  supplierBankCode?: string | null
  supplierPixKey?: string | null
  amount: number
  dueDate: string
  paid: boolean
  paidDate?: string | null
  category?: string | null
  notes?: string | null
  createdAt?: string
  updatedAt?: string
}

export interface Supplier {
  id: string
  clinicId: string
  name: string
  nif?: string | null // Portugal
  cpf?: string | null // Brasil - Pessoa Física
  cnpj?: string | null // Brasil - Pessoa Jurídica
  address?: string | null
  postalCode?: string | null
  city?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  notes?: string | null
  // Dados bancários Portugal
  bankName?: string | null
  iban?: string | null
  nib?: string | null
  swiftBic?: string | null
  // Dados bancários Brasil
  bankAgency?: string | null
  bankAccount?: string | null
  bankAccountType?: string | null
  bankCode?: string | null
  pixKey?: string | null
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
  approved: boolean
  approvedAt?: string | null
  approvedBy?: string | null
  rejected: boolean
  rejectedAt?: string | null
  rejectedBy?: string | null
  rejectionReason?: string | null
  requiresPrepayment: boolean
  paymentConfirmed: boolean
  paymentConfirmedAt?: string | null
  paymentConfirmedBy?: string | null
  checked: boolean
  checkedAt?: string | null
  conform?: boolean | null
  nonConformReason?: string | null
  checkedBy?: string | null
  checkedByPasswordVerified: boolean
  invoicePending: boolean
  documents?: OrderDocument[]
  createdAt: string
  updatedAt: string
}

export interface OrderDocument {
  id: string
  orderId: string
  filename: string
  originalFilename: string
  filePath: string
  fileSize: number
  mimeType?: string | null
  uploadedBy?: string | null
  uploadedAt: string
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
  expirationDate?: string | null
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

export type PermissionLevel = 'DENIED' | 'IF_RESPONSIBLE' | 'ALLOWED'

export interface ResourcePermission {
  resourceId: string
  permissionLevel: PermissionLevel
}

export interface ResourcePermissions {
  [resourceId: string]: PermissionLevel
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
  canViewReportAdvanceInvoice: boolean
  canViewTargets: boolean
  canViewOrders: boolean
  canViewSuppliers: boolean
  canViewAccountsPayable: boolean
  canEditFinancial: boolean
  canEditBilling: boolean
  canEditConsultations: boolean
  canEditProspecting: boolean
  canEditCabinets: boolean
  canEditServiceTime: boolean
  canEditSources: boolean
  canEditConsultationControl: boolean
  canEditAligners: boolean
  canEditOrders: boolean
  canEditAdvanceInvoice: boolean
  canEditAccountsPayable: boolean
  canEditPatients: boolean
  canEditClinicConfig: boolean
  canEditTargets: boolean
  canViewTickets: boolean
  canEditTickets: boolean
  canViewNPS: boolean
  canEditNPS: boolean
  canEditSuppliers: boolean
  canViewMarketing: boolean
  canEditMarketing: boolean
  canViewAlerts: boolean
  canViewAdvances: boolean
  canEditAdvances: boolean
  canBillAdvances: boolean
  canManageInsuranceProviders: boolean
  hasSpecialAccountsPayableAccess: boolean
  canViewAllDoctorsConsultations: boolean
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  clinicId?: string
  clinic_id?: string
  avatarUrl?: string
  active?: boolean
  language?: 'pt-BR' | 'pt-PT' | 'it' | 'es' | 'en' | 'fr'
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

// ================================
// Advances and Billing System
// ================================

export interface InsuranceProvider {
  id: string
  clinicId: string
  name: string
  code?: string | null
  contactName?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface ProcedureBase {
  id: string
  clinicId: string | null
  code: string
  description: string
  isPericiable: boolean
  adultsOnly: boolean
  category?: string | null
  defaultValue?: number | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface InsuranceProviderProcedure {
  id: string
  insuranceProviderId: string
  procedureBaseId?: string | null
  providerCode: string
  providerDescription?: string | null
  isPericiable: boolean
  coveragePercentage: number
  maxValue?: number | null
  requiresAuthorization: boolean
  notes?: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type ContractStatus = 'ACTIVE' | 'INACTIVE' | 'CANCELLED' | 'EXPIRED'
export type DependentRelationship = 'TITULAR' | 'CONJUGE' | 'FILHO' | 'FILHA' | 'OUTRO'

export interface ContractDependent {
  id: string
  contractId: string
  name: string
  birthDate?: string | null
  age?: number | null
  relationship: DependentRelationship
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface AdvanceContract {
  id: string
  clinicId: string
  patientId: string
  patientCode?: string
  patientName?: string
  insuranceProviderId: string
  insuranceProviderName?: string
  contractNumber?: string | null
  startDate: string
  endDate?: string | null
  status: ContractStatus
  notes?: string | null
  createdAt: string
  updatedAt: string
  // Calculated fields
  totalAdvanced?: number
  totalBilled?: number
  balanceToBill?: number
  dependents?: ContractDependent[]
}

export interface AdvancePayment {
  id: string
  contractId: string
  paymentDate: string
  amount: number
  paymentMethod?: string | null
  referenceNumber?: string | null
  notes?: string | null
  createdBy?: string | null
  createdAt: string
}

export type BillingBatchStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'PARTIALLY_PAID' | 'GLOSED' | 'PARTIALLY_GLOSED' | 'ADJUSTED' | 'CANCELLED'

export interface BillingBatch {
  id: string
  contractId: string
  batchNumber: string
  targetAmount: number
  targetPericiableAmount: number
  totalAmount: number
  totalPericiableAmount: number
  status: BillingBatchStatus
  issuedAt?: string | null
  paidAt?: string | null
  glosedAt?: string | null
  glosedAmount: number
  notes?: string | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  items?: BillingItem[]
}

export type BillingItemStatus = 'INCLUDED' | 'GLOSED' | 'ADJUSTED' | 'REMOVED'
export type ProcedureType = 'BASE' | 'PROVIDER'

export interface BillingItem {
  id: string
  batchId: string
  dependentId?: string | null
  dependentName?: string
  procedureId: string
  procedureType: ProcedureType
  procedureCode: string
  procedureDescription: string
  isPericiable: boolean
  unitValue: number
  quantity: number
  totalValue: number
  serviceDate: string
  status: BillingItemStatus
  glosedAmount: number
  glosedReason?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}

export interface EligibleBillingItem {
  id: string
  dependentId?: string | null
  dependentName?: string
  procedureId: string
  procedureType: ProcedureType
  procedureCode: string
  procedureDescription: string
  isPericiable: boolean
  unitValue: number
  quantity: number
  totalValue: number
  serviceDate: string
  alreadyBilled: boolean
  selected?: boolean
}

export interface InsuranceProviderDocument {
  id: string
  insuranceProviderId: string
  fileName: string
  filePath: string
  fileSize?: number | null
  mimeType?: string | null
  uploadDate: string
  processed: boolean
  processedAt?: string | null
  processingStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  extractedData?: any
  createdBy?: string | null
  createdAt: string
}

export type ProcedureMappingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL'

export interface ProcedureMapping {
  id: string
  documentId: string
  extractedProcedureCode: string
  extractedDescription?: string | null
  extractedIsPericiable?: boolean | null
  extractedValue?: number | null
  mappedProcedureBaseId?: string | null
  mappedProviderProcedureId?: string | null
  confidenceScore?: number | null
  status: ProcedureMappingStatus
  reviewedBy?: string | null
  reviewedAt?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
}
