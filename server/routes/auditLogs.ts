import { Router } from 'express'
import { query } from '../db.js'
import { authRequired, type AuthedRequest } from '../middleware/auth.js'
import { requireGestor } from '../middleware/permissions.js'

const router = Router()

// All routes require authentication and gestor role
router.use(authRequired)
router.use(requireGestor)

/**
 * GET /api/audit-logs
 * Get audit logs for the clinic
 * Query params:
 *   - limit: number of logs to return (default 100, max 500)
 *   - offset: offset for pagination (default 0)
 *   - resource: filter by resource type
 *   - userId: filter by user ID
 */
router.get('/', async (req: AuthedRequest, res) => {
  try {
    const clinicId = req.auth?.clinicId

    if (!clinicId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500)
    const offset = parseInt(req.query.offset as string) || 0
    const resourceFilter = req.query.resource as string | undefined
    const userIdFilter = req.query.userId as string | undefined

    // Build query
    let queryText = `
      SELECT
        l.id,
        l.user_id,
        l.clinic_id,
        l.action,
        l.resource,
        l.resource_id,
        l.details,
        l.ip_address,
        l.created_at,
        u.name as user_name,
        u.email as user_email
      FROM audit_logs l
      LEFT JOIN users u ON l.user_id = u.id
      WHERE l.clinic_id = $1
    `

    const params: any[] = [clinicId]
    let paramIndex = 2

    if (resourceFilter) {
      queryText += ` AND l.resource = $${paramIndex}`
      params.push(resourceFilter)
      paramIndex++
    }

    if (userIdFilter) {
      queryText += ` AND l.user_id = $${paramIndex}`
      params.push(userIdFilter)
      paramIndex++
    }

    queryText += ` ORDER BY l.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
    params.push(limit, offset)

    const result = await query(queryText, params)

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) FROM audit_logs WHERE clinic_id = $1'
    const countParams: any[] = [clinicId]
    let countParamIndex = 2

    if (resourceFilter) {
      countQuery += ` AND resource = $${countParamIndex}`
      countParams.push(resourceFilter)
      countParamIndex++
    }

    if (userIdFilter) {
      countQuery += ` AND user_id = $${countParamIndex}`
      countParams.push(userIdFilter)
    }

    const countResult = await query(countQuery, countParams)
    const total = parseInt(countResult.rows[0].count)

    const logs = result.rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      clinicId: row.clinic_id,
      action: row.action,
      resource: row.resource,
      resourceId: row.resource_id,
      details: row.details,
      ipAddress: row.ip_address,
      createdAt: row.created_at,
      userName: row.user_name,
      userEmail: row.user_email,
    }))

    res.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    })
  } catch (error) {
    console.error('Get audit logs error:', error)
    res.status(500).json({ error: 'Failed to get audit logs' })
  }
})

export default router
