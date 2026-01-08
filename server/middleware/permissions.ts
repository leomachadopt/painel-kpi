import type { Response, NextFunction } from 'express'
import type { AuthedRequest } from './auth.js'
import { query } from '../db.js'

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
  canEditFinancial: boolean
  canEditConsultations: boolean
  canEditProspecting: boolean
  canEditCabinets: boolean
  canEditServiceTime: boolean
  canEditSources: boolean
  canEditConsultationControl: boolean
  canEditAligners: boolean
  canEditOrders: boolean
  canEditAccountsPayable: boolean
  canViewAccountsPayable: boolean
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
}

/**
 * Get user permissions from database
 * MENTOR and GESTOR_CLINICA have all permissions by default
 * COLABORADOR permissions are loaded from user_permissions table
 */
export async function getUserPermissions(
  userId: string,
  role: string,
  clinicId?: string
): Promise<UserPermissions> {
  // MENTOR and GESTOR_CLINICA have all permissions
  if (role === 'MENTOR' || role === 'GESTOR_CLINICA') {
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
      canViewReportAdvanceInvoice: true,
      canViewTargets: true,
      canViewOrders: true,
      canViewSuppliers: true,
      canEditFinancial: true,
      canEditConsultations: true,
      canEditProspecting: true,
      canEditCabinets: true,
      canEditServiceTime: true,
      canEditSources: true,
      canEditConsultationControl: true,
      canEditAligners: true,
      canEditOrders: true,
      canEditAdvanceInvoice: true,
      canEditAccountsPayable: true,
      canViewAccountsPayable: true,
      canEditPatients: true,
      canEditClinicConfig: true,
      canEditTargets: true,
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

  // COLABORADOR - load from database
  if (!clinicId) {
    // No clinic, no permissions
    return createEmptyPermissions()
  }

  const result = await query(
    `SELECT
      can_view_dashboard_overview,
      can_view_dashboard_financial,
      can_view_dashboard_commercial,
      can_view_dashboard_operational,
      can_view_dashboard_marketing,
      can_view_reports,
      can_view_report_financial,
      can_view_report_billing,
      can_view_report_consultations,
      can_view_report_aligners,
      can_view_report_prospecting,
      can_view_report_cabinets,
      can_view_report_service_time,
      can_view_report_sources,
      can_view_report_consultation_control,
      can_view_report_marketing,
      can_view_report_advance_invoice,
      can_view_targets,
      can_view_orders,
      can_view_suppliers,
      can_edit_financial,
      can_edit_consultations,
      can_edit_prospecting,
      can_edit_cabinets,
      can_edit_service_time,
      can_edit_sources,
      can_edit_consultation_control,
      can_edit_aligners,
      can_edit_orders,
      can_edit_advance_invoice,
      can_edit_accounts_payable,
      can_view_accounts_payable,
      can_edit_patients,
      can_edit_clinic_config,
      can_edit_targets,
      can_view_tickets,
      can_edit_tickets,
      can_view_nps,
      can_edit_nps,
      can_edit_suppliers,
      can_view_marketing,
      can_edit_marketing,
      can_view_alerts,
      can_view_advances,
      can_edit_advances,
      can_bill_advances,
      can_manage_insurance_providers
    FROM user_permissions
    WHERE user_id = $1 AND clinic_id = $2`,
    [userId, clinicId]
  )

  if (result.rows.length === 0) {
    // No permissions record found
    return createEmptyPermissions()
  }

  const perms = result.rows[0]
  return {
    canViewDashboardOverview: perms.can_view_dashboard_overview || false,
    canViewDashboardFinancial: perms.can_view_dashboard_financial || false,
    canViewDashboardCommercial: perms.can_view_dashboard_commercial || false,
    canViewDashboardOperational: perms.can_view_dashboard_operational || false,
    canViewDashboardMarketing: perms.can_view_dashboard_marketing || false,
    canViewReports: perms.can_view_reports || false,
    canViewReportFinancial: perms.can_view_report_financial || false,
    canViewReportBilling: perms.can_view_report_billing || false,
    canViewReportConsultations: perms.can_view_report_consultations || false,
    canViewReportAligners: perms.can_view_report_aligners || false,
    canViewReportProspecting: perms.can_view_report_prospecting || false,
    canViewReportCabinets: perms.can_view_report_cabinets || false,
    canViewReportServiceTime: perms.can_view_report_service_time || false,
    canViewReportSources: perms.can_view_report_sources || false,
    canViewReportConsultationControl: perms.can_view_report_consultation_control || false,
    canViewReportMarketing: perms.can_view_report_marketing || false,
    canViewReportAdvanceInvoice: perms.can_view_report_advance_invoice || false,
    canViewTargets: perms.can_view_targets || false,
    canViewOrders: perms.can_view_orders || false,
    canViewSuppliers: perms.can_view_suppliers || false,
    canEditFinancial: perms.can_edit_financial || false,
    canEditConsultations: perms.can_edit_consultations || false,
    canEditProspecting: perms.can_edit_prospecting || false,
    canEditCabinets: perms.can_edit_cabinets || false,
    canEditServiceTime: perms.can_edit_service_time || false,
    canEditSources: perms.can_edit_sources || false,
    canEditConsultationControl: perms.can_edit_consultation_control || false,
    canEditAligners: perms.can_edit_aligners || false,
    canEditOrders: perms.can_edit_orders || false,
    canEditAdvanceInvoice: perms.can_edit_advance_invoice || false,
    canEditAccountsPayable: perms.can_edit_accounts_payable || false,
    canViewAccountsPayable: perms.can_view_accounts_payable || false,
    canEditPatients: perms.can_edit_patients || false,
    canEditClinicConfig: perms.can_edit_clinic_config || false,
    canEditTargets: perms.can_edit_targets || false,
    canViewTickets: perms.can_view_tickets || false,
    canEditTickets: perms.can_edit_tickets || false,
    canViewNPS: perms.can_view_nps || false,
    canEditNPS: perms.can_edit_nps || false,
    canEditSuppliers: perms.can_edit_suppliers || false,
    canViewMarketing: perms.can_view_marketing || false,
    canEditMarketing: perms.can_edit_marketing || false,
    canViewAlerts: perms.can_view_alerts || false,
    canViewAdvances: perms.can_view_advances || false,
    canEditAdvances: perms.can_edit_advances || false,
    canBillAdvances: perms.can_bill_advances || false,
    canManageInsuranceProviders: perms.can_manage_insurance_providers || false,
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
    canViewReportAdvanceInvoice: false,
    canViewTargets: false,
    canViewOrders: false,
    canViewSuppliers: false,
    canEditFinancial: false,
    canEditConsultations: false,
    canEditProspecting: false,
    canEditCabinets: false,
    canEditServiceTime: false,
    canEditSources: false,
    canEditConsultationControl: false,
    canEditAligners: false,
    canEditOrders: false,
    canEditAdvanceInvoice: false,
    canEditAccountsPayable: false,
    canViewAccountsPayable: false,
    canEditPatients: false,
    canEditClinicConfig: false,
    canEditTargets: false,
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

/**
 * Middleware to check if user has a specific permission
 * Usage: requirePermission('canEditFinancial')
 */
export function requirePermission(permissionKey: keyof UserPermissions) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { sub: userId, role, clinicId } = req.auth

    // Get user permissions
    const permissions = await getUserPermissions(userId, role, clinicId)

    // Check if user has the required permission
    if (!permissions[permissionKey]) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `You don't have permission to perform this action`,
      })
    }

    // Add permissions to request for later use
    ;(req as any).permissions = permissions

    next()
  }
}

/**
 * Middleware to ensure user is a GESTOR_CLINICA
 */
export function requireGestor(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.auth.role !== 'GESTOR_CLINICA') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only clinic managers can perform this action',
    })
  }

  next()
}

/**
 * Middleware to ensure user is a MENTOR
 */
export function requireMentor(req: AuthedRequest, res: Response, next: NextFunction) {
  if (!req.auth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.auth.role !== 'MENTOR') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only mentors can perform this action',
    })
  }

  next()
}

/**
 * Helper to log audit trail
 */
export async function logAudit(
  userId: string,
  clinicId: string,
  action: string,
  resource: string,
  resourceId?: string,
  details?: any,
  ipAddress?: string
) {
  try {
    await query(
      `INSERT INTO audit_logs (id, user_id, clinic_id, action, resource, resource_id, details, ip_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        `log-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        userId,
        clinicId,
        action,
        resource,
        resourceId || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null,
      ]
    )
  } catch (error) {
    console.error('Failed to log audit:', error)
    // Don't throw - audit logging should not break the main operation
  }
}
