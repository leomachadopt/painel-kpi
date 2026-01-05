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
        p.can_view_targets,
        p.can_edit_financial,
        p.can_edit_consultations,
        p.can_edit_prospecting,
        p.can_edit_cabinets,
        p.can_edit_service_time,
        p.can_edit_sources,
        p.can_edit_consultation_control,
        p.can_edit_patients,
        p.can_edit_clinic_config,
        p.can_edit_targets
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
        canViewTargets: row.can_view_targets || false,
        canEditFinancial: row.can_edit_financial || false,
        canEditConsultations: row.can_edit_consultations || false,
        canEditProspecting: row.can_edit_prospecting || false,
        canEditCabinets: row.can_edit_cabinets || false,
        canEditServiceTime: row.can_edit_service_time || false,
        canEditSources: row.can_edit_sources || false,
        canEditConsultationControl: row.can_edit_consultation_control || false,
        canEditPatients: row.can_edit_patients || false,
        canEditClinicConfig: row.can_edit_clinic_config || false,
        canEditTargets: row.can_edit_targets || false,
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

    const { name, email, password } = req.body

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
      `INSERT INTO users (id, name, email, password_hash, role, clinic_id, active)
       VALUES ($1, $2, $3, $4, 'COLABORADOR', $5, true)`,
      [newUserId, name, email, password, clinicId]
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
        p.can_view_targets,
        p.can_edit_financial,
        p.can_edit_consultations,
        p.can_edit_prospecting,
        p.can_edit_cabinets,
        p.can_edit_service_time,
        p.can_edit_sources,
        p.can_edit_consultation_control,
        p.can_edit_patients,
        p.can_edit_clinic_config,
        p.can_edit_targets
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
        canViewTargets: row.can_view_targets || false,
        canEditFinancial: row.can_edit_financial || false,
        canEditConsultations: row.can_edit_consultations || false,
        canEditProspecting: row.can_edit_prospecting || false,
        canEditCabinets: row.can_edit_cabinets || false,
        canEditServiceTime: row.can_edit_service_time || false,
        canEditSources: row.can_edit_sources || false,
        canEditConsultationControl: row.can_edit_consultation_control || false,
        canEditPatients: row.can_edit_patients || false,
        canEditClinicConfig: row.can_edit_clinic_config || false,
        canEditTargets: row.can_edit_targets || false,
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

    const { name, email, active } = req.body

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

    // Update user
    await query(
      `UPDATE users
       SET name = $1, email = $2, active = $3, updated_at = NOW()
       WHERE id = $4`,
      [name, email, active !== undefined ? active : true, collaboratorId]
    )

    // Log audit
    await logAudit(
      userId,
      clinicId,
      'UPDATE',
      'collaborator',
      collaboratorId,
      { name, email, active },
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
        can_view_targets,
        can_edit_financial,
        can_edit_consultations,
        can_edit_prospecting,
        can_edit_cabinets,
        can_edit_service_time,
        can_edit_sources,
        can_edit_consultation_control,
        can_edit_patients,
        can_edit_clinic_config,
        can_edit_targets
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
      )
      ON CONFLICT (user_id, clinic_id)
      DO UPDATE SET
        can_view_dashboard_overview = $4,
        can_view_dashboard_financial = $5,
        can_view_dashboard_commercial = $6,
        can_view_dashboard_operational = $7,
        can_view_dashboard_marketing = $8,
        can_view_reports = $9,
        can_view_targets = $10,
        can_edit_financial = $11,
        can_edit_consultations = $12,
        can_edit_prospecting = $13,
        can_edit_cabinets = $14,
        can_edit_service_time = $15,
        can_edit_sources = $16,
        can_edit_consultation_control = $17,
        can_edit_patients = $18,
        can_edit_clinic_config = $19,
        can_edit_targets = $20,
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
        permissions.canViewTargets || false,
        permissions.canEditFinancial || false,
        permissions.canEditConsultations || false,
        permissions.canEditProspecting || false,
        permissions.canEditCabinets || false,
        permissions.canEditServiceTime || false,
        permissions.canEditSources || false,
        permissions.canEditConsultationControl || false,
        permissions.canEditPatients || false,
        permissions.canEditClinicConfig || false,
        permissions.canEditTargets || false,
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

export default router
