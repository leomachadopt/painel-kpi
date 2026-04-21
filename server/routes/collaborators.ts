import { Router } from 'express'
import { query } from '../db.js'
import { authRequired, type AuthedRequest } from '../middleware/auth.js'
import { requireGestor, logAudit } from '../middleware/permissions.js'

const router = Router()

// All routes require authentication
router.use(authRequired)

/**
 * GET /api/collaborators
 * List all collaborators for the clinic
 */
router.get('/', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId

    if (!clinicId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    const result = await query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.whatsapp,
        u.role,
        u.clinic_id,
        u.avatar_url,
        u.active,
        u.created_at,
        p.can_view_dashboard_overview,
        p.can_view_dashboard_financial,
        p.can_view_dashboard_commercial,
        p.can_view_dashboard_operational,
        p.can_view_dashboard_marketing,
        p.can_view_reports,
        p.can_view_report_financial,
        p.can_view_report_billing,
        p.can_view_report_consultations,
        p.can_view_report_aligners,
        p.can_view_report_prospecting,
        p.can_view_report_cabinets,
        p.can_view_report_service_time,
        p.can_view_report_sources,
        p.can_view_report_consultation_control,
        p.can_view_report_marketing,
        p.can_view_report_advance_invoice,
        p.can_view_targets,
        p.can_view_orders,
        p.can_view_suppliers,
        p.can_edit_financial,
        p.can_edit_consultations,
        p.can_edit_prospecting,
        p.can_edit_cabinets,
        p.can_edit_service_time,
        p.can_edit_sources,
        p.can_edit_consultation_control,
        p.can_edit_aligners,
        p.can_edit_orders,
        p.can_edit_advance_invoice,
        p.can_edit_accounts_payable,
        p.can_view_accounts_payable,
        p.can_edit_patients,
        p.can_edit_clinic_config,
        p.can_edit_targets,
        p.can_view_tickets,
        p.can_edit_tickets,
        p.can_view_nps,
        p.can_edit_nps,
        p.can_edit_suppliers,
        p.can_view_marketing,
        p.can_edit_marketing,
        p.can_view_alerts,
        p.can_view_advances,
        p.can_edit_advances,
        p.can_bill_advances,
        p.can_manage_insurance_providers,
        p.has_special_accounts_payable_access,
        p.can_view_all_doctors_consultations,
        p.can_view_appointments,
        p.can_edit_appointments
      FROM users u
      LEFT JOIN user_permissions p ON u.id = p.user_id AND p.clinic_id = u.clinic_id
      WHERE u.clinic_id = $1 AND u.role = 'COLABORADOR'
      ORDER BY u.created_at DESC`,
      [clinicId]
    )

    const collaborators = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      whatsapp: row.whatsapp,
      role: row.role,
      clinicId: row.clinic_id,
      avatarUrl: row.avatar_url,
      active: row.active,
      createdAt: row.created_at,
      permissions: {
        canViewDashboardOverview: row.can_view_dashboard_overview || false,
        canViewDashboardFinancial: row.can_view_dashboard_financial || false,
        canViewDashboardCommercial: row.can_view_dashboard_commercial || false,
        canViewDashboardOperational: row.can_view_dashboard_operational || false,
        canViewDashboardMarketing: row.can_view_dashboard_marketing || false,
        canViewReports: row.can_view_reports || false,
        canViewReportFinancial: row.can_view_report_financial || false,
        canViewReportBilling: row.can_view_report_billing || false,
        canViewReportConsultations: row.can_view_report_consultations || false,
        canViewReportAligners: row.can_view_report_aligners || false,
        canViewReportProspecting: row.can_view_report_prospecting || false,
        canViewReportCabinets: row.can_view_report_cabinets || false,
        canViewReportServiceTime: row.can_view_report_service_time || false,
        canViewReportSources: row.can_view_report_sources || false,
        canViewReportConsultationControl: row.can_view_report_consultation_control || false,
        canViewReportMarketing: row.can_view_report_marketing || false,
        canViewReportAdvanceInvoice: row.can_view_report_advance_invoice || false,
        canViewTargets: row.can_view_targets || false,
        canViewOrders: row.can_view_orders || false,
        canViewSuppliers: row.can_view_suppliers || false,
        canEditFinancial: row.can_edit_financial || false,
        canEditConsultations: row.can_edit_consultations || false,
        canEditProspecting: row.can_edit_prospecting || false,
        canEditCabinets: row.can_edit_cabinets || false,
        canEditServiceTime: row.can_edit_service_time || false,
        canEditSources: row.can_edit_sources || false,
        canEditConsultationControl: row.can_edit_consultation_control || false,
        canEditAligners: row.can_edit_aligners || false,
        canEditOrders: row.can_edit_orders || false,
        canEditAdvanceInvoice: row.can_edit_advance_invoice || false,
        canEditAccountsPayable: row.can_edit_accounts_payable || false,
        canViewAccountsPayable: row.can_view_accounts_payable || false,
        canEditPatients: row.can_edit_patients || false,
        canEditClinicConfig: row.can_edit_clinic_config || false,
        canEditTargets: row.can_edit_targets || false,
        canViewTickets: row.can_view_tickets || false,
        canEditTickets: row.can_edit_tickets || false,
        canViewNPS: row.can_view_nps || false,
        canEditNPS: row.can_edit_nps || false,
        canEditSuppliers: row.can_edit_suppliers || false,
        canViewMarketing: row.can_view_marketing || false,
        canEditMarketing: row.can_edit_marketing || false,
        canViewAlerts: row.can_view_alerts || false,
        canViewAdvances: row.can_view_advances || false,
        canEditAdvances: row.can_edit_advances || false,
        canBillAdvances: row.can_bill_advances || false,
        canManageInsuranceProviders: row.can_manage_insurance_providers || false,
        hasSpecialAccountsPayableAccess: row.has_special_accounts_payable_access || false,
        canViewAllDoctorsConsultations: row.can_view_all_doctors_consultations || false,
        canViewAppointments: Boolean(row.can_view_appointments),
        canEditAppointments: Boolean(row.can_edit_appointments),
      },
    }))

    res.json(collaborators)
  } catch (error) {
    console.error('Get collaborators error:', error)
    res.status(500).json({ error: 'Failed to get collaborators' })
  }
})

/**
 * POST /api/collaborators
 * Create a new collaborator
 */
router.post('/', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId
    const userId = req.auth?.sub

    if (!clinicId || !userId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    const { name, email, password, whatsapp } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email])

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' })
    }

    // Create user
    const newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`

    await query(
      `INSERT INTO users (id, name, email, whatsapp, password_hash, role, clinic_id, active)
       VALUES ($1, $2, $3, $4, $5, 'COLABORADOR', $6, true)`,
      [newUserId, name, email, whatsapp || null, password, clinicId]
    )

    // Create default permissions (all false)
    const permissionsId = `perm-${Date.now()}-${Math.random().toString(36).slice(2)}`

    await query(
      `INSERT INTO user_permissions (id, user_id, clinic_id)
       VALUES ($1, $2, $3)`,
      [permissionsId, newUserId, clinicId]
    )

    // Log audit
    await logAudit(
      userId,
      clinicId,
      'CREATE',
      'collaborator',
      newUserId,
      { name, email },
      req.ip
    )

    // Get created user with permissions
    const result = await query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.whatsapp,
        u.role,
        u.clinic_id,
        u.avatar_url,
        u.active,
        u.created_at,
        p.can_view_dashboard_overview,
        p.can_view_dashboard_financial,
        p.can_view_dashboard_commercial,
        p.can_view_dashboard_operational,
        p.can_view_dashboard_marketing,
        p.can_view_reports,
        p.can_view_report_financial,
        p.can_view_report_billing,
        p.can_view_report_consultations,
        p.can_view_report_aligners,
        p.can_view_report_prospecting,
        p.can_view_report_cabinets,
        p.can_view_report_service_time,
        p.can_view_report_sources,
        p.can_view_report_consultation_control,
        p.can_view_report_marketing,
        p.can_view_report_advance_invoice,
        p.can_view_targets,
        p.can_view_orders,
        p.can_view_suppliers,
        p.can_edit_financial,
        p.can_edit_consultations,
        p.can_edit_prospecting,
        p.can_edit_cabinets,
        p.can_edit_service_time,
        p.can_edit_sources,
        p.can_edit_consultation_control,
        p.can_edit_aligners,
        p.can_edit_orders,
        p.can_edit_advance_invoice,
        p.can_edit_accounts_payable,
        p.can_view_accounts_payable,
        p.can_edit_patients,
        p.can_edit_clinic_config,
        p.can_edit_targets,
        p.can_view_tickets,
        p.can_edit_tickets,
        p.can_view_nps,
        p.can_edit_nps,
        p.can_edit_suppliers,
        p.can_view_marketing,
        p.can_edit_marketing,
        p.can_view_alerts,
        p.can_view_advances,
        p.can_edit_advances,
        p.can_bill_advances,
        p.can_manage_insurance_providers,
        p.has_special_accounts_payable_access,
        p.can_view_all_doctors_consultations,
        p.can_view_appointments,
        p.can_edit_appointments
      FROM users u
      LEFT JOIN user_permissions p ON u.id = p.user_id
      WHERE u.id = $1`,
      [newUserId]
    )

    const row = result.rows[0]
    const collaborator = {
      id: row.id,
      name: row.name,
      email: row.email,
      whatsapp: row.whatsapp,
      role: row.role,
      clinicId: row.clinic_id,
      avatarUrl: row.avatar_url,
      active: row.active,
      createdAt: row.created_at,
      permissions: {
        canViewDashboardOverview: row.can_view_dashboard_overview || false,
        canViewDashboardFinancial: row.can_view_dashboard_financial || false,
        canViewDashboardCommercial: row.can_view_dashboard_commercial || false,
        canViewDashboardOperational: row.can_view_dashboard_operational || false,
        canViewDashboardMarketing: row.can_view_dashboard_marketing || false,
        canViewReports: row.can_view_reports || false,
        canViewReportFinancial: row.can_view_report_financial || false,
        canViewReportBilling: row.can_view_report_billing || false,
        canViewReportConsultations: row.can_view_report_consultations || false,
        canViewReportAligners: row.can_view_report_aligners || false,
        canViewReportProspecting: row.can_view_report_prospecting || false,
        canViewReportCabinets: row.can_view_report_cabinets || false,
        canViewReportServiceTime: row.can_view_report_service_time || false,
        canViewReportSources: row.can_view_report_sources || false,
        canViewReportConsultationControl: row.can_view_report_consultation_control || false,
        canViewReportMarketing: row.can_view_report_marketing || false,
        canViewReportAdvanceInvoice: row.can_view_report_advance_invoice || false,
        canViewTargets: row.can_view_targets || false,
        canViewOrders: row.can_view_orders || false,
        canViewSuppliers: row.can_view_suppliers || false,
        canEditFinancial: row.can_edit_financial || false,
        canEditConsultations: row.can_edit_consultations || false,
        canEditProspecting: row.can_edit_prospecting || false,
        canEditCabinets: row.can_edit_cabinets || false,
        canEditServiceTime: row.can_edit_service_time || false,
        canEditSources: row.can_edit_sources || false,
        canEditConsultationControl: row.can_edit_consultation_control || false,
        canEditAligners: row.can_edit_aligners || false,
        canEditOrders: row.can_edit_orders || false,
        canEditAdvanceInvoice: row.can_edit_advance_invoice || false,
        canEditAccountsPayable: row.can_edit_accounts_payable || false,
        canViewAccountsPayable: row.can_view_accounts_payable || false,
        canEditPatients: row.can_edit_patients || false,
        canEditClinicConfig: row.can_edit_clinic_config || false,
        canEditTargets: row.can_edit_targets || false,
        canViewTickets: row.can_view_tickets || false,
        canEditTickets: row.can_edit_tickets || false,
        canViewNPS: row.can_view_nps || false,
        canEditNPS: row.can_edit_nps || false,
        canEditSuppliers: row.can_edit_suppliers || false,
        canViewMarketing: row.can_view_marketing || false,
        canEditMarketing: row.can_edit_marketing || false,
        canViewAlerts: row.can_view_alerts || false,
        canViewAdvances: row.can_view_advances || false,
        canEditAdvances: row.can_edit_advances || false,
        canBillAdvances: row.can_bill_advances || false,
        canManageInsuranceProviders: row.can_manage_insurance_providers || false,
        hasSpecialAccountsPayableAccess: row.has_special_accounts_payable_access || false,
        canViewAllDoctorsConsultations: row.can_view_all_doctors_consultations || false,
        canViewAppointments: Boolean(row.can_view_appointments),
        canEditAppointments: Boolean(row.can_edit_appointments),
      },
    }

    res.status(201).json({
      message: 'Collaborator created successfully',
      collaborator,
    })
  } catch (error) {
    console.error('Create collaborator error:', error)
    res.status(500).json({ error: 'Failed to create collaborator' })
  }
})

/**
 * PUT /api/collaborators/:id
 * Update collaborator basic info
 */
router.put('/:id', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId
    const userId = req.auth?.sub
    const collaboratorId = req.params.id

    if (!clinicId || !userId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    const { name, email, active, password, whatsapp } = req.body

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }

    // Check if collaborator belongs to this clinic
    const checkResult = await query(
      'SELECT id FROM users WHERE id = $1 AND clinic_id = $2 AND role = $3',
      [collaboratorId, clinicId, 'COLABORADOR']
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' })
    }

    // Check if email is already in use by another user
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, collaboratorId]
    )

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' })
    }

    // Update user (with optional password)
    if (password) {
      await query(
        `UPDATE users
         SET name = $1, email = $2, whatsapp = $3, active = $4, password_hash = $5, updated_at = NOW()
         WHERE id = $6`,
        [name, email, whatsapp || null, active !== undefined ? active : true, password, collaboratorId]
      )
    } else {
      await query(
        `UPDATE users
         SET name = $1, email = $2, whatsapp = $3, active = $4, updated_at = NOW()
         WHERE id = $5`,
        [name, email, whatsapp || null, active !== undefined ? active : true, collaboratorId]
      )
    }

    // Log audit (não incluir senha no log por segurança)
    const auditData: any = { name, email, active }
    if (password) {
      auditData.passwordChanged = true
    }
    await logAudit(
      userId,
      clinicId,
      'UPDATE',
      'collaborator',
      collaboratorId,
      auditData,
      req.ip
    )

    res.json({ message: 'Collaborator updated successfully' })
  } catch (error) {
    console.error('Update collaborator error:', error)
    res.status(500).json({ error: 'Failed to update collaborator' })
  }
})

/**
 * PUT /api/collaborators/:id/permissions
 * Update collaborator permissions
 */
router.put('/:id/permissions', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId
    const userId = req.auth?.sub
    const collaboratorId = req.params.id

    if (!clinicId || !userId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    const { permissions } = req.body

    if (!permissions) {
      return res.status(400).json({ error: 'Permissions are required' })
    }

    // Check if collaborator belongs to this clinic
    const checkResult = await query(
      'SELECT id FROM users WHERE id = $1 AND clinic_id = $2 AND role = $3',
      [collaboratorId, clinicId, 'COLABORADOR']
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' })
    }

    // Update or insert permissions
    await query(
      `INSERT INTO user_permissions (
        id, user_id, clinic_id,
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
        can_manage_insurance_providers,
        has_special_accounts_payable_access,
        can_view_all_doctors_consultations,
        can_view_appointments,
        can_edit_appointments
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43, $44, $45, $46, $47, $48, $49, $50, $51, $52, $53, $54
      )
      ON CONFLICT (user_id, clinic_id)
      DO UPDATE SET
        can_view_dashboard_overview = $4,
        can_view_dashboard_financial = $5,
        can_view_dashboard_commercial = $6,
        can_view_dashboard_operational = $7,
        can_view_dashboard_marketing = $8,
        can_view_reports = $9,
        can_view_report_financial = $10,
        can_view_report_billing = $11,
        can_view_report_consultations = $12,
        can_view_report_aligners = $13,
        can_view_report_prospecting = $14,
        can_view_report_cabinets = $15,
        can_view_report_service_time = $16,
        can_view_report_sources = $17,
        can_view_report_consultation_control = $18,
        can_view_report_marketing = $19,
        can_view_report_advance_invoice = $20,
        can_view_targets = $21,
        can_view_orders = $22,
        can_view_suppliers = $23,
        can_edit_financial = $24,
        can_edit_consultations = $25,
        can_edit_prospecting = $26,
        can_edit_cabinets = $27,
        can_edit_service_time = $28,
        can_edit_sources = $29,
        can_edit_consultation_control = $30,
        can_edit_aligners = $31,
        can_edit_orders = $32,
        can_edit_advance_invoice = $33,
        can_edit_accounts_payable = $34,
        can_view_accounts_payable = $35,
        can_edit_patients = $36,
        can_edit_clinic_config = $37,
        can_edit_targets = $38,
        can_view_tickets = $39,
        can_edit_tickets = $40,
        can_view_nps = $41,
        can_edit_nps = $42,
        can_edit_suppliers = $43,
        can_view_marketing = $44,
        can_edit_marketing = $45,
        can_view_alerts = $46,
        can_view_advances = $47,
        can_edit_advances = $48,
        can_bill_advances = $49,
        can_manage_insurance_providers = $50,
        has_special_accounts_payable_access = $51,
        can_view_all_doctors_consultations = $52,
        can_view_appointments = $53,
        can_edit_appointments = $54,
        updated_at = NOW()`,
      [
        `perm-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        collaboratorId,
        clinicId,
        permissions.canViewDashboardOverview || false,
        permissions.canViewDashboardFinancial || false,
        permissions.canViewDashboardCommercial || false,
        permissions.canViewDashboardOperational || false,
        permissions.canViewDashboardMarketing || false,
        permissions.canViewReports || false,
        permissions.canViewReportFinancial || false,
        permissions.canViewReportBilling || false,
        permissions.canViewReportConsultations || false,
        permissions.canViewReportAligners || false,
        permissions.canViewReportProspecting || false,
        permissions.canViewReportCabinets || false,
        permissions.canViewReportServiceTime || false,
        permissions.canViewReportSources || false,
        permissions.canViewReportConsultationControl || false,
        permissions.canViewReportMarketing || false,
        permissions.canViewReportAdvanceInvoice || false,
        permissions.canViewTargets || false,
        permissions.canViewOrders || false,
        permissions.canViewSuppliers || false,
        permissions.canEditFinancial || false,
        permissions.canEditConsultations || false,
        permissions.canEditProspecting || false,
        permissions.canEditCabinets || false,
        permissions.canEditServiceTime || false,
        permissions.canEditSources || false,
        permissions.canEditConsultationControl || false,
        permissions.canEditAligners || false,
        permissions.canEditOrders || false,
        permissions.canEditAdvanceInvoice || false,
        permissions.canEditAccountsPayable || false,
        permissions.canViewAccountsPayable || false,
        permissions.canEditPatients || false,
        permissions.canEditClinicConfig || false,
        permissions.canEditTargets || false,
        permissions.canViewTickets || false,
        permissions.canEditTickets || false,
        permissions.canViewNPS || false,
        permissions.canEditNPS || false,
        permissions.canEditSuppliers || false,
        permissions.canViewMarketing || false,
        permissions.canEditMarketing || false,
        permissions.canViewAlerts || false,
        Boolean(permissions.canViewAdvances),
        Boolean(permissions.canEditAdvances),
        Boolean(permissions.canBillAdvances),
        Boolean(permissions.canManageInsuranceProviders),
        Boolean(permissions.hasSpecialAccountsPayableAccess),
        Boolean(permissions.canViewAllDoctorsConsultations),
        Boolean(permissions.canViewAppointments),
        Boolean(permissions.canEditAppointments),
      ]
    )

    // Log audit
    await logAudit(
      userId,
      clinicId,
      'UPDATE_PERMISSIONS',
      'collaborator',
      collaboratorId,
      permissions,
      req.ip
    )

    res.json({ message: 'Permissions updated successfully' })
  } catch (error) {
    console.error('Update permissions error:', error)
    res.status(500).json({ error: 'Failed to update permissions' })
  }
})

/**
 * GET /api/collaborators/doctors
 * List all doctors for the clinic
 */
router.get('/doctors', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId

    if (!clinicId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    // Get doctors from users table (with role MEDICO)
    const usersResult = await query(
      `SELECT id, name, email, whatsapp, active, created_at
       FROM users
       WHERE clinic_id = $1 AND role = 'MEDICO'
       ORDER BY name ASC`,
      [clinicId]
    )

    // Get doctors from clinic_doctors table
    const doctorsResult = await query(
      `SELECT id, name, email, whatsapp
       FROM clinic_doctors
       WHERE clinic_id = $1
       ORDER BY name ASC`,
      [clinicId]
    )

    // Merge both lists - users have priority
    const doctorsMap = new Map()

    // Add from clinic_doctors first
    for (const doctor of doctorsResult.rows) {
      doctorsMap.set(doctor.id, {
        id: doctor.id,
        name: doctor.name,
        email: doctor.email || '',
        whatsapp: doctor.whatsapp || '',
        active: true, // clinic_doctors doesn't have active field
        hasUserAccount: false,
        userId: null,
      })
    }

    // Override/add from users table
    for (const user of usersResult.rows) {
      // Find matching doctor by email
      const doctorEntry = doctorsResult.rows.find(d => d.email === user.email)

      if (doctorEntry) {
        // Update existing doctor with user info
        doctorsMap.set(doctorEntry.id, {
          id: doctorEntry.id,
          name: user.name,
          email: user.email,
          whatsapp: user.whatsapp || '',
          active: user.active,
          hasUserAccount: true,
          userId: user.id,
          createdAt: user.created_at,
        })
      } else {
        // User without matching clinic_doctors entry (shouldn't happen but handle it)
        doctorsMap.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email,
          whatsapp: user.whatsapp || '',
          active: user.active,
          hasUserAccount: true,
          userId: user.id,
          createdAt: user.created_at,
        })
      }
    }

    const doctors = Array.from(doctorsMap.values())

    res.json(doctors)
  } catch (error) {
    console.error('Get doctors error:', error)
    res.status(500).json({ error: 'Failed to get doctors' })
  }
})

/**
 * PUT /api/collaborators/doctors/:id
 * Update doctor basic info (updates both users and clinic_doctors tables)
 */
router.put('/doctors/:id', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId
    const userId = req.auth?.sub
    const doctorId = req.params.id

    if (!clinicId || !userId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    const { name, email, whatsapp, active, password } = req.body

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' })
    }

    // Check if doctor exists in clinic_doctors
    const doctorCheck = await query(
      'SELECT id, email as old_email FROM clinic_doctors WHERE id = $1 AND clinic_id = $2',
      [doctorId, clinicId]
    )

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' })
    }

    const oldEmail = doctorCheck.rows[0].old_email

    // Check if new email is already in use by another user
    if (email !== oldEmail) {
      const existingUser = await query(
        'SELECT id FROM users WHERE email = $1 AND clinic_id = $2',
        [email, clinicId]
      )

      // Allow if it's the same doctor's user account
      const existingDoctor = await query(
        'SELECT id FROM users WHERE email = $1 AND clinic_id = $2 AND role = $3',
        [oldEmail, clinicId, 'MEDICO']
      )

      if (existingUser.rows.length > 0 && existingDoctor.rows.length === 0) {
        return res.status(400).json({ error: 'Email already in use' })
      }
    }

    // Update clinic_doctors table
    await query(
      `UPDATE clinic_doctors
       SET name = $1, email = $2, whatsapp = $3
       WHERE id = $4 AND clinic_id = $5`,
      [name, email, whatsapp || null, doctorId, clinicId]
    )

    // Update users table if doctor has a user account
    const userResult = await query(
      'SELECT id FROM users WHERE email = $1 AND clinic_id = $2 AND role = $3',
      [oldEmail, clinicId, 'MEDICO']
    )

    if (userResult.rows.length > 0) {
      const doctorUserId = userResult.rows[0].id

      // Update user with optional password
      if (password && password.trim() !== '') {
        await query(
          `UPDATE users
           SET name = $1, email = $2, whatsapp = $3, active = $4, password_hash = $5, updated_at = NOW()
           WHERE id = $6`,
          [name, email, whatsapp || null, active !== undefined ? active : true, password, doctorUserId]
        )
      } else {
        await query(
          `UPDATE users
           SET name = $1, email = $2, whatsapp = $3, active = $4, updated_at = NOW()
           WHERE id = $5`,
          [name, email, whatsapp || null, active !== undefined ? active : true, doctorUserId]
        )
      }
    }

    // Log audit
    const auditData: any = { name, email, whatsapp }
    if (password) {
      auditData.passwordChanged = true
    }
    await logAudit(
      userId,
      clinicId,
      'UPDATE',
      'doctor',
      doctorId,
      auditData,
      req.ip
    )

    res.json({ message: 'Doctor updated successfully' })
  } catch (error) {
    console.error('Update doctor error:', error)
    res.status(500).json({ error: 'Failed to update doctor' })
  }
})

/**
 * DELETE /api/collaborators/doctors/:id
 * Delete a doctor (only if they have no associated data)
 */
router.delete('/doctors/:id', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId
    const userId = req.auth?.sub
    const doctorId = req.params.id

    if (!clinicId || !userId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    // Check if doctor exists in clinic_doctors
    const doctorCheck = await query(
      'SELECT id, name, email FROM clinic_doctors WHERE id = $1 AND clinic_id = $2',
      [doctorId, clinicId]
    )

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found' })
    }

    const doctor = doctorCheck.rows[0]

    // Check if doctor has any associated consultations
    const consultationsCheck = await query(
      'SELECT COUNT(*) as count FROM daily_consultation_entries WHERE doctor_id = $1',
      [doctorId]
    )

    if (parseInt(consultationsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete doctor with associated consultations. Please reassign consultations first.'
      })
    }

    // Check if doctor has any associated appointments
    const appointmentsCheck = await query(
      'SELECT COUNT(*) as count FROM appointments WHERE doctor_id = $1',
      [doctorId]
    )

    if (parseInt(appointmentsCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Cannot delete doctor with associated appointments. Please reassign appointments first.'
      })
    }

    // Delete from clinic_doctors table
    await query('DELETE FROM clinic_doctors WHERE id = $1', [doctorId])

    // If doctor has a user account, delete it too
    if (doctor.email) {
      const userResult = await query(
        'SELECT id FROM users WHERE email = $1 AND clinic_id = $2 AND role = $3',
        [doctor.email, clinicId, 'MEDICO']
      )

      if (userResult.rows.length > 0) {
        await query('DELETE FROM users WHERE id = $1', [userResult.rows[0].id])
      }
    }

    // Log audit
    await logAudit(
      userId,
      clinicId,
      'DELETE',
      'doctor',
      doctorId,
      { name: doctor.name, email: doctor.email },
      req.ip
    )

    res.json({ message: 'Doctor deleted successfully' })
  } catch (error) {
    console.error('Delete doctor error:', error)
    res.status(500).json({ error: 'Failed to delete doctor' })
  }
})

/**
 * DELETE /api/collaborators/:id
 * Delete a collaborator
 */
router.delete('/:id', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId
    const userId = req.auth?.sub
    const collaboratorId = req.params.id

    if (!clinicId || !userId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    // Check if collaborator belongs to this clinic
    const checkResult = await query(
      'SELECT id, name, email FROM users WHERE id = $1 AND clinic_id = $2 AND role = $3',
      [collaboratorId, clinicId, 'COLABORADOR']
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Collaborator not found' })
    }

    const collaborator = checkResult.rows[0]

    // Delete user (CASCADE will delete permissions)
    await query('DELETE FROM users WHERE id = $1', [collaboratorId])

    // Log audit
    await logAudit(
      userId,
      clinicId,
      'DELETE',
      'collaborator',
      collaboratorId,
      { name: collaborator.name, email: collaborator.email },
      req.ip
    )

    res.json({ message: 'Collaborator deleted successfully' })
  } catch (error) {
    console.error('Delete collaborator error:', error)
    res.status(500).json({ error: 'Failed to delete collaborator' })
  }
})

// ================================
// UNIFIED TEAM MANAGEMENT ROUTES
// ================================

/**
 * GET /api/collaborators/team
 * List ALL team members unified (owners, doctors, collaborators)
 * Includes role badges and links to clinic_doctors
 */
router.get('/team', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId

    if (!clinicId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    // Get all users from the clinic
    const usersResult = await query(
      `SELECT
        u.id,
        u.name,
        u.email,
        u.whatsapp,
        u.role,
        u.is_owner,
        u.active,
        u.created_at,
        cd.id as doctor_id,
        p.can_view_dashboard_overview,
        p.can_view_dashboard_financial,
        p.can_view_dashboard_commercial,
        p.can_view_dashboard_operational,
        p.can_view_dashboard_marketing,
        p.can_view_reports,
        p.can_view_report_financial,
        p.can_view_report_billing,
        p.can_view_report_consultations,
        p.can_view_report_aligners,
        p.can_view_report_prospecting,
        p.can_view_report_cabinets,
        p.can_view_report_service_time,
        p.can_view_report_sources,
        p.can_view_report_consultation_control,
        p.can_view_report_marketing,
        p.can_view_report_advance_invoice,
        p.can_view_targets,
        p.can_view_orders,
        p.can_view_suppliers,
        p.can_edit_financial,
        p.can_edit_consultations,
        p.can_edit_prospecting,
        p.can_edit_cabinets,
        p.can_edit_service_time,
        p.can_edit_sources,
        p.can_edit_consultation_control,
        p.can_edit_aligners,
        p.can_edit_orders,
        p.can_edit_advance_invoice,
        p.can_edit_accounts_payable,
        p.can_view_accounts_payable,
        p.can_edit_patients,
        p.can_edit_clinic_config,
        p.can_edit_targets,
        p.can_view_tickets,
        p.can_edit_tickets,
        p.can_view_nps,
        p.can_edit_nps,
        p.can_edit_suppliers,
        p.can_view_marketing,
        p.can_edit_marketing,
        p.can_view_alerts,
        p.can_view_advances,
        p.can_edit_advances,
        p.can_bill_advances,
        p.can_manage_insurance_providers,
        p.has_special_accounts_payable_access,
        p.can_view_all_doctors_consultations,
        p.can_view_appointments,
        p.can_edit_appointments
      FROM users u
      LEFT JOIN user_permissions p ON u.id = p.user_id AND p.clinic_id = u.clinic_id
      LEFT JOIN clinic_doctors cd ON u.id = cd.user_id
      WHERE u.clinic_id = $1 AND u.role != 'MENTOR'
      ORDER BY u.is_owner DESC, u.created_at DESC`,
      [clinicId]
    )

    const teamMembers = usersResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      whatsapp: row.whatsapp,
      role: row.role,
      isOwner: row.is_owner || false,
      isDoctor: !!row.doctor_id,
      doctorId: row.doctor_id,
      active: row.active,
      createdAt: row.created_at,
      permissions: {
        canViewDashboardOverview: row.can_view_dashboard_overview || false,
        canViewDashboardFinancial: row.can_view_dashboard_financial || false,
        canViewDashboardCommercial: row.can_view_dashboard_commercial || false,
        canViewDashboardOperational: row.can_view_dashboard_operational || false,
        canViewDashboardMarketing: row.can_view_dashboard_marketing || false,
        canViewReports: row.can_view_reports || false,
        canViewReportFinancial: row.can_view_report_financial || false,
        canViewReportBilling: row.can_view_report_billing || false,
        canViewReportConsultations: row.can_view_report_consultations || false,
        canViewReportAligners: row.can_view_report_aligners || false,
        canViewReportProspecting: row.can_view_report_prospecting || false,
        canViewReportCabinets: row.can_view_report_cabinets || false,
        canViewReportServiceTime: row.can_view_report_service_time || false,
        canViewReportSources: row.can_view_report_sources || false,
        canViewReportConsultationControl: row.can_view_report_consultation_control || false,
        canViewReportMarketing: row.can_view_report_marketing || false,
        canViewReportAdvanceInvoice: row.can_view_report_advance_invoice || false,
        canViewTargets: row.can_view_targets || false,
        canViewOrders: row.can_view_orders || false,
        canViewSuppliers: row.can_view_suppliers || false,
        canEditFinancial: row.can_edit_financial || false,
        canEditConsultations: row.can_edit_consultations || false,
        canEditProspecting: row.can_edit_prospecting || false,
        canEditCabinets: row.can_edit_cabinets || false,
        canEditServiceTime: row.can_edit_service_time || false,
        canEditSources: row.can_edit_sources || false,
        canEditConsultationControl: row.can_edit_consultation_control || false,
        canEditAligners: row.can_edit_aligners || false,
        canEditOrders: row.can_edit_orders || false,
        canEditAdvanceInvoice: row.can_edit_advance_invoice || false,
        canEditAccountsPayable: row.can_edit_accounts_payable || false,
        canViewAccountsPayable: row.can_view_accounts_payable || false,
        canEditPatients: row.can_edit_patients || false,
        canEditClinicConfig: row.can_edit_clinic_config || false,
        canEditTargets: row.can_edit_targets || false,
        canViewTickets: row.can_view_tickets || false,
        canEditTickets: row.can_edit_tickets || false,
        canViewNPS: row.can_view_nps || false,
        canEditNPS: row.can_edit_nps || false,
        canEditSuppliers: row.can_edit_suppliers || false,
        canViewMarketing: row.can_view_marketing || false,
        canEditMarketing: row.can_edit_marketing || false,
        canViewAlerts: row.can_view_alerts || false,
        canViewAdvances: row.can_view_advances || false,
        canEditAdvances: row.can_edit_advances || false,
        canBillAdvances: row.can_bill_advances || false,
        canManageInsuranceProviders: row.can_manage_insurance_providers || false,
        hasSpecialAccountsPayableAccess: row.has_special_accounts_payable_access || false,
        canViewAllDoctorsConsultations: row.can_view_all_doctors_consultations || false,
        canViewAppointments: Boolean(row.can_view_appointments),
        canEditAppointments: Boolean(row.can_edit_appointments),
      },
    }))

    res.json(teamMembers)
  } catch (error) {
    console.error('Get team members error:', error)
    res.status(500).json({ error: 'Failed to get team members' })
  }
})

/**
 * POST /api/collaborators/team
 * Create new team member with multiple roles support
 */
router.post('/team', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId
    const userId = req.auth?.sub

    if (!clinicId || !userId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    const { name, email, password, whatsapp, isOwner, isDoctor, role } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' })
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email])

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' })
    }

    // Determine role: if isOwner, use GESTOR_CLINICA, else if isDoctor use MEDICO, else COLABORADOR
    let userRole = role || 'COLABORADOR'
    if (isOwner) {
      userRole = 'GESTOR_CLINICA'
    } else if (isDoctor && !role) {
      userRole = 'MEDICO'
    }

    // Create user
    const newUserId = `user-${Date.now()}-${Math.random().toString(36).slice(2)}`

    await query(
      `INSERT INTO users (id, name, email, whatsapp, password_hash, role, clinic_id, is_owner, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)`,
      [newUserId, name, email, whatsapp || null, password, userRole, clinicId, isOwner || false]
    )

    // Create default permissions if not owner
    if (!isOwner) {
      const permissionsId = `perm-${Date.now()}-${Math.random().toString(36).slice(2)}`

      // If doctor, apply default doctor permissions
      if (userRole === 'MEDICO') {
        await query(
          `INSERT INTO user_permissions (
            id, user_id, clinic_id,
            can_edit_consultations, can_view_reports, can_edit_patients
          ) VALUES ($1, $2, $3, true, true, true)`,
          [permissionsId, newUserId, clinicId]
        )
      } else {
        // Empty permissions for collaborators
        await query(
          `INSERT INTO user_permissions (id, user_id, clinic_id)
           VALUES ($1, $2, $3)`,
          [permissionsId, newUserId, clinicId]
        )
      }
    }

    // If isDoctor, create entry in clinic_doctors linked to user
    let doctorId = null
    if (isDoctor) {
      doctorId = `${clinicId}-doc-${Date.now()}-${Math.random().toString(36).slice(2)}`
      await query(
        `INSERT INTO clinic_doctors (id, clinic_id, name, email, whatsapp, user_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [doctorId, clinicId, name, email, whatsapp || null, newUserId]
      )
    }

    // Log audit
    await logAudit(
      userId,
      clinicId,
      'CREATE',
      'team_member',
      newUserId,
      { name, email, role: userRole, isOwner, isDoctor },
      req.ip
    )

    res.status(201).json({
      message: 'Team member created successfully',
      member: {
        id: newUserId,
        name,
        email,
        whatsapp: whatsapp || null,
        role: userRole,
        isOwner: isOwner || false,
        isDoctor: isDoctor || false,
        doctorId,
        active: true,
      },
    })
  } catch (error) {
    console.error('Create team member error:', error)
    res.status(500).json({ error: 'Failed to create team member' })
  }
})

/**
 * PUT /api/collaborators/team/:id/roles
 * Update team member roles (promote/demote owner/doctor)
 */
router.put('/team/:id/roles', requireGestor, async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId
    const userId = req.auth?.sub
    const memberId = req.params.id

    if (!clinicId || !userId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    const { isOwner, isDoctor } = req.body

    // Check if member belongs to this clinic
    const checkResult = await query(
      'SELECT id, name, email, whatsapp, role, is_owner FROM users WHERE id = $1 AND clinic_id = $2',
      [memberId, clinicId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Team member not found' })
    }

    const member = checkResult.rows[0]

    // Update is_owner flag
    if (isOwner !== undefined) {
      await query(
        'UPDATE users SET is_owner = $1, updated_at = NOW() WHERE id = $2',
        [isOwner, memberId]
      )

      // If promoting to owner, change role to GESTOR_CLINICA
      if (isOwner) {
        await query(
          'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
          ['GESTOR_CLINICA', memberId]
        )
      }
    }

    // Handle doctor role
    if (isDoctor !== undefined) {
      if (isDoctor) {
        // Check if already a doctor in clinic_doctors
        const doctorCheck = await query(
          'SELECT id FROM clinic_doctors WHERE user_id = $1',
          [memberId]
        )

        if (doctorCheck.rows.length === 0) {
          // Create doctor entry linked to user
          const doctorId = `${clinicId}-doc-${Date.now()}-${Math.random().toString(36).slice(2)}`
          await query(
            `INSERT INTO clinic_doctors (id, clinic_id, name, email, whatsapp, user_id)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [doctorId, clinicId, member.name, member.email, member.whatsapp, memberId]
          )
        }

        // Update role to MEDICO if not owner
        if (!member.is_owner && !isOwner) {
          await query(
            'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
            ['MEDICO', memberId]
          )
        }
      } else {
        // Remove doctor entry
        await query('DELETE FROM clinic_doctors WHERE user_id = $1', [memberId])

        // Change role to COLABORADOR if not owner
        if (!member.is_owner) {
          await query(
            'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2',
            ['COLABORADOR', memberId]
          )
        }
      }
    }

    // Log audit
    await logAudit(
      userId,
      clinicId,
      'UPDATE_ROLES',
      'team_member',
      memberId,
      { isOwner, isDoctor },
      req.ip
    )

    res.json({ message: 'Team member roles updated successfully' })
  } catch (error) {
    console.error('Update team member roles error:', error)
    res.status(500).json({ error: 'Failed to update team member roles' })
  }
})

export default router
