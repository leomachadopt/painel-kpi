import { Router } from 'express'
import { query } from '../db.js'
import { authRequired } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permissions.js'
import crypto from 'crypto'

const router = Router()

// Apply authentication to all routes
router.use(authRequired)

// GET /api/doctor-schedule/:clinicId - Get all doctor schedules for the clinic
router.get('/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params

    const result = await query(
      `SELECT
        id,
        doctor_id,
        day_of_week,
        shift_name,
        start_time,
        end_time,
        is_active
       FROM clinic_doctor_schedule
       WHERE clinic_id = $1 AND is_active = true
       ORDER BY doctor_id ASC, day_of_week ASC, start_time ASC`,
      [clinicId]
    )

    const schedules = result.rows.map((row) => ({
      id: row.id,
      doctorId: row.doctor_id,
      dayOfWeek: row.day_of_week,
      shiftName: row.shift_name,
      startTime: row.start_time,
      endTime: row.end_time,
      isActive: row.is_active,
    }))

    res.json({ schedules })
  } catch (error: any) {
    console.error('Error fetching clinic doctor schedules:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/doctor-schedule/:clinicId/:doctorId - Get doctor schedule
router.get('/:clinicId/:doctorId', async (req, res) => {
  try {
    const { clinicId, doctorId } = req.params

    const result = await query(
      `SELECT
        id,
        day_of_week,
        shift_name,
        start_time,
        end_time,
        is_active
       FROM clinic_doctor_schedule
       WHERE clinic_id = $1 AND doctor_id = $2
       ORDER BY day_of_week ASC, start_time ASC`,
      [clinicId, doctorId]
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
    console.error('Error fetching doctor schedules:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/doctor-schedule/:clinicId/:doctorId - Create schedule shift
router.post('/:clinicId/:doctorId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, doctorId } = req.params
    const { dayOfWeek, shiftName, startTime, endTime } = req.body

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate day of week (0-6)
    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'Invalid day of week (must be 0-6)' })
    }

    // Validate that doctor belongs to clinic
    const doctorCheck = await query(
      `SELECT id FROM clinic_doctors WHERE id = $1 AND clinic_id = $2`,
      [doctorId, clinicId]
    )

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found in this clinic' })
    }

    // Validate that doctor's schedule is within clinic operating hours
    // Let PostgreSQL handle TIME comparison so string formats like "09:00" and "09:00:00" work interchangeably
    const clinicDayCheck = await query(
      `SELECT 1 FROM clinic_schedules
       WHERE clinic_id = $1 AND day_of_week = $2 AND is_active = true
       LIMIT 1`,
      [clinicId, dayOfWeek]
    )

    if (clinicDayCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'Clínica não funciona neste dia da semana. Configure primeiro os horários da clínica.'
      })
    }

    const withinCheck = await query(
      `SELECT 1 FROM clinic_schedules
       WHERE clinic_id = $1 AND day_of_week = $2 AND is_active = true
         AND start_time <= $3::TIME AND end_time >= $4::TIME
       LIMIT 1`,
      [clinicId, dayOfWeek, startTime, endTime]
    )

    if (withinCheck.rows.length === 0) {
      return res.status(400).json({
        error: 'Horário do médico deve estar dentro do horário de funcionamento da clínica'
      })
    }

    // Check for overlapping shifts on the same day for this doctor
    const overlap = await query(
      `SELECT id FROM clinic_doctor_schedule
       WHERE clinic_id = $1 AND doctor_id = $2 AND day_of_week = $3 AND is_active = true
         AND start_time < $5::TIME AND end_time > $4::TIME`,
      [clinicId, doctorId, dayOfWeek, startTime, endTime]
    )

    console.log('[DOCTOR_SCHEDULE] Found overlapping schedules:', overlap.rows)

    if (overlap.rows.length > 0) {
      return res.status(409).json({ error: 'Horário sobrepõe outro turno existente' })
    }

    const scheduleId = crypto.randomUUID()

    await query(
      `INSERT INTO clinic_doctor_schedule (id, clinic_id, doctor_id, day_of_week, shift_name, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [scheduleId, clinicId, doctorId, dayOfWeek, shiftName || '', startTime, endTime]
    )

    res.status(201).json({ id: scheduleId })
  } catch (error: any) {
    console.error('Error creating doctor schedule:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/doctor-schedule/:clinicId/:doctorId/:scheduleId - Update schedule shift
router.put('/:clinicId/:doctorId/:scheduleId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, doctorId, scheduleId } = req.params
    const { dayOfWeek, shiftName, startTime, endTime, isActive } = req.body

    // If updating times, validate against clinic schedule
    if (dayOfWeek !== undefined || startTime !== undefined || endTime !== undefined) {
      // Get current schedule to fill in missing values
      const current = await query(
        `SELECT day_of_week, start_time, end_time FROM clinic_doctor_schedule
         WHERE id = $1 AND clinic_id = $2 AND doctor_id = $3`,
        [scheduleId, clinicId, doctorId]
      )

      if (current.rows.length === 0) {
        return res.status(404).json({ error: 'Schedule not found' })
      }

      const finalDayOfWeek = dayOfWeek !== undefined ? dayOfWeek : current.rows[0].day_of_week
      const finalStartTime = startTime !== undefined ? startTime : current.rows[0].start_time
      const finalEndTime = endTime !== undefined ? endTime : current.rows[0].end_time

      // Validate against clinic schedule (PostgreSQL handles TIME comparison)
      const clinicDayCheck = await query(
        `SELECT 1 FROM clinic_schedules
         WHERE clinic_id = $1 AND day_of_week = $2 AND is_active = true
         LIMIT 1`,
        [clinicId, finalDayOfWeek]
      )

      if (clinicDayCheck.rows.length === 0) {
        return res.status(400).json({
          error: 'Clínica não funciona neste dia da semana'
        })
      }

      const withinCheck = await query(
        `SELECT 1 FROM clinic_schedules
         WHERE clinic_id = $1 AND day_of_week = $2 AND is_active = true
           AND start_time <= $3::TIME AND end_time >= $4::TIME
         LIMIT 1`,
        [clinicId, finalDayOfWeek, finalStartTime, finalEndTime]
      )

      if (withinCheck.rows.length === 0) {
        return res.status(400).json({
          error: 'Horário do médico deve estar dentro do horário de funcionamento da clínica'
        })
      }
    }

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
    values.push(scheduleId, clinicId, doctorId)

    await query(
      `UPDATE clinic_doctor_schedule SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND clinic_id = $${paramCount++} AND doctor_id = $${paramCount++}`,
      values
    )

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error updating doctor schedule:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/doctor-schedule/:clinicId/:doctorId/:scheduleId - Delete schedule shift
router.delete('/:clinicId/:doctorId/:scheduleId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, doctorId, scheduleId } = req.params

    await query(
      `DELETE FROM clinic_doctor_schedule WHERE id = $1 AND clinic_id = $2 AND doctor_id = $3`,
      [scheduleId, clinicId, doctorId]
    )

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting doctor schedule:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
