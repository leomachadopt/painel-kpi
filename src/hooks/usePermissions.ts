import { useEffect } from 'react'
import useAuthStore from '@/stores/useAuthStore'
import type { UserPermissions } from '@/lib/types'

/**
 * Hook to check user permissions
 * Returns functions to check view and edit permissions
 */
export function usePermissions() {
  const { user, refreshPermissions } = useAuthStore()

  // Refresh permissions when component mounts if user is a collaborator
  useEffect(() => {
    if (user?.role === 'COLABORADOR' && refreshPermissions) {
      refreshPermissions()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - refreshPermissions is stable

  // Helper to get all permissions (MENTOR and GESTOR_CLINICA have all permissions)
  const getAllPermissions = (): UserPermissions => {
    if (!user) {
      return createEmptyPermissions()
    }

    if (user.role === 'MENTOR' || user.role === 'GESTOR_CLINICA') {
      return createFullPermissions()
    }

    return user.permissions || createEmptyPermissions()
  }

  const permissions = getAllPermissions()

  /**
   * Check if user can view a specific dashboard section
   */
  const canView = (section: keyof Pick<UserPermissions,
    | 'canViewDashboardOverview'
    | 'canViewDashboardFinancial'
    | 'canViewDashboardCommercial'
    | 'canViewDashboardOperational'
    | 'canViewDashboardMarketing'
    | 'canViewReports'
    | 'canViewTargets'
    | 'canViewOrders'
    | 'canViewSuppliers'
    | 'canViewAccountsPayable'
    | 'canViewTickets'
    | 'canViewNPS'
    | 'canViewMarketing'
    | 'canViewAlerts'
    | 'canViewAdvances'
  >): boolean => {
    if (!user) return false
    if (user.role === 'MENTOR' || user.role === 'GESTOR_CLINICA') return true
    return permissions[section]
  }

  /**
   * Check if user can view a specific report tab
   * Reports are now based on resource permissions, not specific report permissions
   */
  const canViewReport = (reportTab: keyof Pick<UserPermissions,
    | 'canViewReportFinancial'
    | 'canViewReportBilling'
    | 'canViewReportConsultations'
    | 'canViewReportAligners'
    | 'canViewReportProspecting'
    | 'canViewReportCabinets'
    | 'canViewReportServiceTime'
    | 'canViewReportSources'
    | 'canViewReportConsultationControl'
    | 'canViewReportMarketing'
    | 'canViewReportAdvanceInvoice'
  >): boolean => {
    if (!user) return false
    if (user.role === 'MENTOR' || user.role === 'GESTOR_CLINICA') return true

    // Map report tabs to resource permissions
    const reportToResourceMap: Record<string, keyof UserPermissions> = {
      canViewReportFinancial: 'canEditFinancial', // Financial report requires financial edit permission
      canViewReportBilling: 'canEditFinancial', // Billing is part of financial
      canViewReportConsultations: 'canEditConsultations', // Consultations report requires consultations edit permission
      canViewReportAligners: 'canEditAligners', // Aligners report requires aligners edit permission
      canViewReportProspecting: 'canEditProspecting', // Prospecting report requires prospecting edit permission
      canViewReportCabinets: 'canEditCabinets', // Cabinets report requires cabinets edit permission
      canViewReportServiceTime: 'canEditServiceTime', // Service time report requires service time edit permission
      canViewReportSources: 'canEditSources', // Sources report requires sources edit permission
      canViewReportConsultationControl: 'canEditConsultationControl', // Consultation control report requires consultation control edit permission
      canViewReportMarketing: 'canEditMarketing', // Marketing report requires marketing edit permission
      canViewReportAdvanceInvoice: 'canEditAdvances', // Advance invoice report requires advances edit permission
    }

    const resourcePermission = reportToResourceMap[reportTab]
    if (resourcePermission) {
      // Check if user has view or edit permission for the resource
      // For reports, we check if they can edit (which implies they can view)
      return permissions[resourcePermission] || false
    }

    // Fallback to specific report permission if mapping not found
    return permissions[reportTab] || false
  }

  /**
   * Check if user can edit a specific resource
   */
  const canEdit = (resource: keyof Pick<UserPermissions,
    | 'canEditFinancial'
    | 'canEditConsultations'
    | 'canEditProspecting'
    | 'canEditCabinets'
    | 'canEditServiceTime'
    | 'canEditSources'
    | 'canEditConsultationControl'
    | 'canEditAligners'
    | 'canEditOrders'
    | 'canEditAccountsPayable'
    | 'canEditPatients'
    | 'canEditClinicConfig'
    | 'canEditTargets'
    | 'canEditTickets'
    | 'canEditNPS'
    | 'canEditSuppliers'
    | 'canEditMarketing'
    | 'canEditAdvances'
    | 'canBillAdvances'
    | 'canManageInsuranceProviders'
  >): boolean => {
    if (!user) return false
    if (user.role === 'MENTOR' || user.role === 'GESTOR_CLINICA') return true
    return permissions[resource]
  }

  /**
   * Check if user is a clinic manager
   */
  const isGestor = (): boolean => {
    return user?.role === 'GESTOR_CLINICA'
  }

  /**
   * Check if user is a mentor
   */
  const isMentor = (): boolean => {
    return user?.role === 'MENTOR'
  }

  /**
   * Check if user is a collaborator
   */
  const isColaborador = (): boolean => {
    return user?.role === 'COLABORADOR'
  }

  /**
   * Check if user can edit ANY data
   * Useful to show/hide "Lançamentos" section in sidebar
   */
  const canEditAnyData = (): boolean => {
    if (!user) return false
    if (user.role === 'MENTOR' || user.role === 'GESTOR_CLINICA') return true

    return (
      permissions.canEditFinancial ||
      permissions.canEditConsultations ||
      permissions.canEditProspecting ||
      permissions.canEditCabinets ||
      permissions.canEditServiceTime ||
      permissions.canEditSources ||
      permissions.canEditConsultationControl ||
      permissions.canEditAligners ||
      permissions.canEditOrders ||
      permissions.canEditAccountsPayable ||
      permissions.canEditPatients ||
      permissions.canEditClinicConfig ||
      permissions.canEditTargets ||
      permissions.canEditTickets ||
      permissions.canEditNPS ||
      permissions.canEditSuppliers ||
      permissions.canEditMarketing ||
      permissions.canEditAdvances ||
      permissions.canBillAdvances ||
      permissions.canManageInsuranceProviders
    )
  }

  return {
    permissions,
    canView,
    canViewReport,
    canEdit,
    isGestor,
    isMentor,
    isColaborador,
    canEditAnyData,
  }
}

function createEmptyPermissions(): UserPermissions {
  return {
    canViewDashboardOverview: false,
    canViewDashboardFinancial: false,
    canViewDashboardCommercial: false,
    canViewDashboardOperational: false,
    canViewDashboardMarketing: false,
    canViewReports: false,
    canViewReportFinancial: false,
    canViewReportBilling: false,
    canViewReportConsultations: false,
    canViewReportAligners: false,
    canViewReportProspecting: false,
    canViewReportCabinets: false,
    canViewReportServiceTime: false,
    canViewReportSources: false,
    canViewReportConsultationControl: false,
    canViewReportMarketing: false,
    canViewTargets: false,
    canEditFinancial: false,
    canEditConsultations: false,
    canEditProspecting: false,
    canEditCabinets: false,
    canEditServiceTime: false,
    canEditSources: false,
    canEditConsultationControl: false,
    canEditAligners: false,
    canEditOrders: false,
    canEditPatients: false,
    canEditClinicConfig: false,
    canEditTargets: false,
    canViewOrders: false,
    canViewSuppliers: false,
    canViewAccountsPayable: false,
    canEditAccountsPayable: false,
    canEditAdvanceInvoice: false,
    canViewReportAdvanceInvoice: false,
    canViewTickets: false,
    canEditTickets: false,
    canViewNPS: false,
    canEditNPS: false,
    canEditSuppliers: false,
    canViewMarketing: false,
    canEditMarketing: false,
    canViewAlerts: false,
    canViewAdvances: false,
    canEditAdvances: false,
    canBillAdvances: false,
    canManageInsuranceProviders: false,
  }
}

function createFullPermissions(): UserPermissions {
  return {
    canViewDashboardOverview: true,
    canViewDashboardFinancial: true,
    canViewDashboardCommercial: true,
    canViewDashboardOperational: true,
    canViewDashboardMarketing: true,
    canViewReports: true,
    canViewReportFinancial: true,
    canViewReportBilling: true,
    canViewReportConsultations: true,
    canViewReportAligners: true,
    canViewReportProspecting: true,
    canViewReportCabinets: true,
    canViewReportServiceTime: true,
    canViewReportSources: true,
    canViewReportConsultationControl: true,
    canViewReportMarketing: true,
    canViewTargets: true,
    canEditFinancial: true,
    canEditConsultations: true,
    canEditProspecting: true,
    canEditCabinets: true,
    canEditServiceTime: true,
    canEditSources: true,
    canEditConsultationControl: true,
    canEditAligners: true,
    canEditOrders: true,
    canEditPatients: true,
    canEditClinicConfig: true,
    canEditTargets: true,
    canViewOrders: true,
    canViewSuppliers: true,
    canViewAccountsPayable: true,
    canEditAccountsPayable: true,
    canEditAdvanceInvoice: true,
    canViewReportAdvanceInvoice: true,
    canViewTickets: true,
    canEditTickets: true,
    canViewNPS: true,
    canEditNPS: true,
    canEditSuppliers: true,
    canViewMarketing: true,
    canEditMarketing: true,
    canViewAlerts: true,
    canViewAdvances: true,
    canEditAdvances: true,
    canBillAdvances: true,
    canManageInsuranceProviders: true,
  }
}
