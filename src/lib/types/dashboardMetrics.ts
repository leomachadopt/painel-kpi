// Dashboard Metrics Types - Phase 1: Financial Health

export interface GuaranteedRevenue {
  next30Days: {
    total: number
  }
  next60Days: {
    total: number
  }
  next90Days: {
    total: number
  }
  overdue: {
    amount: number
    count: number
  }
  receivable: {
    amount: number
    count: number
  }
  receivedMonth: {
    amount: number
    count: number
  }
  installments: RevenueInstallment[]
}

export interface RevenueInstallment {
  id: string
  revenuePlanId: string
  installmentNumber: number
  dueDate: string
  value: number
  status: 'A_RECEBER' | 'ATRASADO' | 'RECEBIDO'
  receivedDate?: string | null
  daysOverdue: number
}

export interface PendingTreatmentsSummary {
  totalValue: number
  numPatients: number
  numTreatments: number
  pending: {
    value: number
    count: number
  }
  partial: {
    value: number
    count: number
  }
  topPatients: TopPendingPatient[]
}

export interface TopPendingPatient {
  id: string
  patientCode: string
  patientName: string
  totalPendingValue: number
  numTreatments: number
}

export interface PlanConversionRate {
  conversionRate: number
  change: number
  trend: 'up' | 'down'
  thisMonth: {
    presented: number
    inExecution: number
    completed: number
  }
  previousMonth: {
    presented: number
    inExecution: number
    conversionRate: number
  }
  currentStatus: {
    waiting: number
    executing: number
  }
}

export interface PlansAtRisk {
  totalAtRisk: number
  byRiskType: {
    waiting_too_long: number
    stagnated: number
    low_progress: number
    unknown: number
  }
  plans: PlanAtRisk[]
}

export interface PlanAtRisk {
  id: string
  patientName: string
  patientCode: string
  pendingValue: number
  planProceduresTotal: number
  planProceduresCompleted: number
  completionRate: number
  riskType: 'waiting_too_long' | 'stagnated' | 'low_progress' | 'unknown'
  daysSinceLastActivity: number
  suggestedAction: string
  timestamps: {
    planCreated?: string | null
    planPresented?: string | null
    waitingStart?: string | null
    inExecution?: string | null
  }
}

// ============================================================
// Dashboard Metrics Types - Phase 2: Agenda Efficiency
// ============================================================

export interface ScheduleOccupancy {
  currentMonth: {
    hoursUsed: number
    hoursScheduled: number
    occupancyRate: number
  }
  currentWeek: {
    hoursUsed: number
    hoursScheduled: number
    occupancyRate: number
  }
  today: {
    hoursUsed: number
    hoursScheduled: number
    occupancyRate: number
  }
}

export interface WaitTimes {
  avgWaitMinutesMonth: number
  avgWaitMinutesWeek: number
  dataCount: number
}

export interface DelayReasons {
  total: number
  byReason: DelayReason[]
}

export interface DelayReason {
  reason: 'paciente' | 'medico'
  count: number
  percentage: number
  avgDelayMinutes: number
}

export interface AppointmentConversion {
  totalAppointments: number
  completedAppointments: number
  completedWithEntry: number
  noShows: number
  cancelled: number
  rescheduled: number
  completionRate: number
  conversionRate: number
}

export interface OccupancyByDoctor {
  doctors: DoctorOccupancy[]
}

export interface DoctorOccupancy {
  doctorId: string
  doctorName: string
  totalAppointments: number
  completedAppointments: number
  hoursUsed: number
  hoursScheduled: number
  occupancyRate: number
}

export interface HourlyDistribution {
  hourly: HourlyData[]
}

export interface HourlyData {
  hour: number
  totalAppointments: number
  completedAppointments: number
  noShows: number
  avgDurationMinutes: number
}

// ============================================================
// Dashboard Metrics Types - Phase 3: Marketing & Acquisition
// ============================================================

export interface ConversionFunnel {
  contactsThisMonth: number
  firstConsultationsThisMonth: number
  plansCreatedThisMonth: number
  plansPresentedThisMonth: number
  plansInExecutionThisMonth: number
  contactsPrevMonth: number
  firstConsultationsPrevMonth: number
  plansCreatedPrevMonth: number
  plansInExecutionPrevMonth: number
}

export interface SourcePerformance {
  sources: SourceMetric[]
}

export interface SourceMetric {
  sourceId: string
  sourceName: string
  totalPatients: number
  firstConsultations: number
  plansCreated: number
  plansPresented: number
  plansInExecution: number
  totalPlanValue: number
  avgPlanValue: number
  firstConsultLast3m: number
  firstConsultPrev3m: number
  trend: 'up' | 'down' | 'stable'
}

export interface AcquisitionTrends {
  trends: MonthlyTrend[]
}

export interface MonthlyTrend {
  month: string
  newPatients: number
  plansPresented: number
  plansStarted: number
  totalValuePresented: number
}

export interface ProspectingPipeline {
  scheduledMonth: number
  phoneMonth: number
  whatsappMonth: number
  emailMonth: number
  smsMonth: number
  instagramMonth: number
  inPersonMonth: number
  totalContactsMonth: number
  scheduledWeek: number
  phoneWeek: number
  whatsappWeek: number
  inPersonWeek: number
  totalContactsWeek: number
  totalContactsPrevMonth: number
}
