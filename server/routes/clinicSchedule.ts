import { Router } from 'express'
import { query } from '../db.js'
import { authRequired } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permissions.js'
import crypto from 'crypto'

const router = Router()

// Apply authentication to all routes
router.use(authRequired)

// GET /api/clinic-schedule/:clinicId - Get clinic schedule
router.get('/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params

    const result = await query(
      `SELECT 
        id,
        day_of_week,
        shift_name,
        start_time,
        end_time,
        is_active
       FROM clinic_schedules
       WHERE clinic_id = $1
       ORDER BY day_of_week ASC, start_time ASC`,
      [clinicId]
    )

    const schedules = result.rows.map((row) => ({
      id: row.id,
      dayOfWeek: row.day_of_week,
      shiftName: row.shift_name,
      startTime: row.start_time,
      endTime: row.end_time,
      isActive: row.is_active,
    }))

    res.json({ schedules })
  } catch (error: any) {
    console.error('Error fetching clinic schedules:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/clinic-schedule/:clinicId - Create schedule shift
router.post('/:clinicId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { dayOfWeek, shiftName, startTime, endTime } = req.body

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate day of week (0-6)
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'Invalid day of week (must be 0-6)' })
    }

    // Check for overlapping shifts on the same day
    // Two time ranges overlap if: start1 < end2 AND end1 > start2
    // But we allow adjacent times (end1 = start2)
    console.log('[CLINIC_SCHEDULE] Checking overlap for:', { clinicId, dayOfWeek, startTime, endTime })
    const overlap = await query(
      `SELECT id, start_time, end_time FROM clinic_schedules
       WHERE clinic_id = $1 AND day_of_week = $2 AND is_active = true
         AND start_time < $4 AND end_time > $3`,
      [clinicId, dayOfWeek, startTime, endTime]
    )

    console.log('[CLINIC_SCHEDULE] Found overlapping schedules:', overlap.rows)

    if (overlap.rows.length > 0) {
      return res.status(409).json({ error: 'Horário sobrepõe outro turno existente' })
    }

    const scheduleId = crypto.randomUUID()

    await query(
      `INSERT INTO clinic_schedules (id, clinic_id, day_of_week, shift_name, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [scheduleId, clinicId, dayOfWeek, shiftName || '', startTime, endTime]
    )

    res.status(201).json({ id: scheduleId })
  } catch (error: any) {
    console.error('Error creating clinic schedule:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/clinic-schedule/:clinicId/:scheduleId - Update schedule shift
router.put('/:clinicId/:scheduleId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, scheduleId } = req.params
    const { dayOfWeek, shiftName, startTime, endTime, isActive } = req.body

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (dayOfWeek !== undefined) {
      if (dayOfWeek < 0 || dayOfWeek > 6) {
        return res.status(400).json({ error: 'Invalid day of week (must be 0-6)' })
      }
      updates.push(`day_of_week = $${paramCount++}`)
      values.push(dayOfWeek)
    }
    if (shiftName !== undefined) {
      updates.push(`shift_name = $${paramCount++}`)
      values.push(shiftName)
    }
    if (startTime !== undefined) {
      updates.push(`start_time = $${paramCount++}`)
      values.push(startTime)
    }
    if (endTime !== undefined) {
      updates.push(`end_time = $${paramCount++}`)
      values.push(endTime)
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`)
      values.push(isActive)
    }

    if (updates.length === 0) {
      return res.json({ success: true })
    }

    updates.push(`updated_at = NOW()`)
    values.push(scheduleId, clinicId)

    await query(
      `UPDATE clinic_schedules SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND clinic_id = $${paramCount++}`,
      values
    )

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error updating clinic schedule:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/clinic-schedule/:clinicId/:scheduleId - Delete schedule shift
router.delete('/:clinicId/:scheduleId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, scheduleId } = req.params

    await query(
      `DELETE FROM clinic_schedules WHERE id = $1 AND clinic_id = $2`,
      [scheduleId, clinicId]
    )

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting clinic schedule:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
