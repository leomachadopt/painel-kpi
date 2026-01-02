import { useAuthStore } from '@/stores/authStore'
import type { UserPermissions } from '@/lib/types'

/**
 * Hook to check user permissions
 * Returns functions to check view and edit permissions
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user)

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
  >): boolean => {
    if (!user) return false
    if (user.role === 'MENTOR' || user.role === 'GESTOR_CLINICA') return true
    return permissions[section]
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
    | 'canEditPatients'
    | 'canEditClinicConfig'
    | 'canEditTargets'
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
      permissions.canEditPatients ||
      permissions.canEditClinicConfig ||
      permissions.canEditTargets
    )
  }

  return {
    permissions,
    canView,
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
    canViewTargets: false,
    canEditFinancial: false,
    canEditConsultations: false,
    canEditProspecting: false,
    canEditCabinets: false,
    canEditServiceTime: false,
    canEditSources: false,
    canEditPatients: false,
    canEditClinicConfig: false,
    canEditTargets: false,
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
    canViewTargets: true,
    canEditFinancial: true,
    canEditConsultations: true,
    canEditProspecting: true,
    canEditCabinets: true,
    canEditServiceTime: true,
    canEditSources: true,
    canEditPatients: true,
    canEditClinicConfig: true,
    canEditTargets: true,
  }
}
