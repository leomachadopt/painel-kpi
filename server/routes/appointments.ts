import { Router } from 'express'
import { query } from '../db.js'
import { authRequired } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permissions.js'
import crypto from 'crypto'

const router = Router()

// Log all requests to appointments routes
router.use((req, res, next) => {
  console.log('[APPOINTMENTS] Request:', req.method, req.url, 'Headers:', req.headers)
  next()
})

// Apply authentication to all appointment routes
router.use(authRequired)

/**
 * Helper to extract user info from request
 */
function getUserInfo(req: any): { userId: string; role: string } {
  const userId = req.user?.id || req.auth?.sub
  const role = req.user?.role || req.auth?.role
  return { userId, role }
}

/**
 * Helper function to check if a doctor can edit an appointment
 * MEDICO can only edit their own appointments
 * GESTOR_CLINICA and MENTOR can edit all appointments
 */
async function canDoctorEditAppointment(
  userId: string,
  role: string,
  clinicId: string,
  doctorId: string | null
): Promise<boolean> {
  console.log('[canDoctorEditAppointment] Input:', { userId, role, clinicId, doctorId })

  // GESTOR_CLINICA and MENTOR can edit all appointments
  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    console.log('[canDoctorEditAppointment] GESTOR/MENTOR - returning true')
    return true
  }

  // MEDICO can only edit their own appointments
  if (role === 'MEDICO') {
    if (!doctorId) {
      console.log('[canDoctorEditAppointment] MEDICO with no doctorId - returning true')
      // Appointment has no doctor assigned - allow if the doctor is creating it for themselves
      return true
    }

    // Check if the doctorId matches the logged-in user's doctor record
    const doctorCheck = await query(
      `SELECT id FROM clinic_doctors WHERE id = $1 AND email = (SELECT email FROM users WHERE id = $2)`,
      [doctorId, userId]
    )

    const result = doctorCheck.rows.length > 0
    console.log('[canDoctorEditAppointment] MEDICO doctor check - rows:', doctorCheck.rows.length, 'result:', result)
    return result
  }

  // COLABORADOR can edit if they have permission (already checked by middleware)
  console.log('[canDoctorEditAppointment] COLABORADOR - returning true')
  return true
}

/**
 * Middleware to check if user can edit appointments
 * - GESTOR_CLINICA and MENTOR: can edit all appointments
 * - MEDICO: can edit only their own appointments
 * - COLABORADOR: needs canEditAppointments permission
 */
async function requireAppointmentEditPermission(req: any, res: any, next: any) {
  try {
    const { userId, role } = getUserInfo(req)
    const clinicId = req.params.clinicId

    console.log('[requireAppointmentEditPermission] Checking permission:', { userId, role, clinicId })

    // GESTOR and MENTOR always have permission
    if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
      console.log('[requireAppointmentEditPermission] GESTOR/MENTOR - allowed')
      return next()
    }

    // MEDICO always has permission to edit (their own appointments will be validated in each endpoint)
    if (role === 'MEDICO') {
      console.log('[requireAppointmentEditPermission] MEDICO - allowed')
      return next()
    }

    // COLABORADOR needs explicit permission
    if (role === 'COLABORADOR') {
      const permissionResult = await query(
        `SELECT can_edit_appointments FROM user_permissions WHERE user_id = $1 AND clinic_id = $2`,
        [userId, clinicId]
      )

      const hasPermission = permissionResult.rows.length > 0 &&
                           permissionResult.rows[0].can_edit_appointments === true

      if (hasPermission) {
        console.log('[requireAppointmentEditPermission] COLABORADOR with permission - allowed')
        return next()
      }

      console.log('[requireAppointmentEditPermission] COLABORADOR without permission - denied')
      return res.status(403).json({ error: 'Forbidden: No permission to edit appointments' })
    }

    // Unknown role
    console.log('[requireAppointmentEditPermission] Unknown role - denied')
    return res.status(403).json({ error: 'Forbidden' })
  } catch (error) {
    console.error('[requireAppointmentEditPermission] Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// Helper function to update metrics based on appointment status changes
async function updateMetricsOnStatusChange(
  clinicId: string,
  appointment: any,
  previousStatus: string | null
) {
  // Only update if status actually changed
  if (previousStatus === appointment.status) {
    return
  }

  const date = appointment.date

  // Update daily_consultation_control_entries
  if (appointment.status === 'no_show') {
    await query(
      `INSERT INTO daily_consultation_control_entries
        (id, clinic_id, date, no_show, rescheduled, cancelled, old_patient_booking)
       VALUES ($1, $2, $3, 1, 0, 0, 0)
       ON CONFLICT (clinic_id, date)
       DO UPDATE SET no_show = daily_consultation_control_entries.no_show + 1`,
      [crypto.randomUUID(), clinicId, date]
    )
  }

  if (appointment.status === 'cancelled') {
    await query(
      `INSERT INTO daily_consultation_control_entries
        (id, clinic_id, date, no_show, rescheduled, cancelled, old_patient_booking)
       VALUES ($1, $2, $3, 0, 0, 1, 0)
       ON CONFLICT (clinic_id, date)
       DO UPDATE SET cancelled = daily_consultation_control_entries.cancelled + 1`,
      [crypto.randomUUID(), clinicId, date]
    )
  }

  if (appointment.status === 'rescheduled') {
    await query(
      `INSERT INTO daily_consultation_control_entries
        (id, clinic_id, date, no_show, rescheduled, cancelled, old_patient_booking)
       VALUES ($1, $2, $3, 0, 1, 0, 0)
       ON CONFLICT (clinic_id, date)
       DO UPDATE SET rescheduled = daily_consultation_control_entries.rescheduled + 1`,
      [crypto.randomUUID(), clinicId, date]
    )
  }

  if (appointment.status === 'completed' && appointment.is_new_patient === false) {
    await query(
      `INSERT INTO daily_consultation_control_entries
        (id, clinic_id, date, no_show, rescheduled, cancelled, old_patient_booking)
       VALUES ($1, $2, $3, 0, 0, 0, 1)
       ON CONFLICT (clinic_id, date)
       DO UPDATE SET old_patient_booking = daily_consultation_control_entries.old_patient_booking + 1`,
      [crypto.randomUUID(), clinicId, date]
    )
  }

  // Update daily_service_time_entries when appointment starts
  if ((appointment.status === 'in_progress' || appointment.status === 'arrived') && appointment.actual_start && appointment.doctor_id) {
    // Check if entry already exists for this appointment
    const existing = await query(
      `SELECT id FROM daily_service_time_entries
       WHERE clinic_id = $1 AND date = $2 AND code = $3 AND doctor_id = $4`,
      [clinicId, date, appointment.patient_code || appointment.id, appointment.doctor_id]
    )

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO daily_service_time_entries
          (id, clinic_id, date, patient_name, code, doctor_id, scheduled_time, actual_start_time, delay_reason)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          crypto.randomUUID(),
          clinicId,
          date,
          appointment.patient_name,
          appointment.patient_code || appointment.id,
          appointment.doctor_id,
          appointment.scheduled_start,
          appointment.actual_start,
          appointment.delay_reason
        ]
      )
    }
  }

  // Update daily_cabinet_usage_entries when appointment completes
  if (appointment.status === 'completed' && appointment.actual_start && appointment.actual_end && appointment.cabinet_id) {
    // Calculate duration in hours
    const startParts = appointment.actual_start.split(':')
    const endParts = appointment.actual_end.split(':')
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1])
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1])
    const durationHours = (endMinutes - startMinutes) / 60

    // Get current hours_used for this cabinet/date
    const existing = await query(
      `SELECT hours_used FROM daily_cabinet_usage_entries
       WHERE clinic_id = $1 AND date = $2 AND cabinet_id = $3`,
      [clinicId, date, appointment.cabinet_id]
    )

    if (existing.rows.length > 0) {
      await query(
        `UPDATE daily_cabinet_usage_entries
         SET hours_used = hours_used + $1
         WHERE clinic_id = $2 AND date = $3 AND cabinet_id = $4`,
        [durationHours, clinicId, date, appointment.cabinet_id]
      )
    } else {
      // Get standard hours for this cabinet
      const cabinetResult = await query(
        `SELECT standard_hours FROM clinic_cabinets WHERE id = $1`,
        [appointment.cabinet_id]
      )
      const hoursAvailable = cabinetResult.rows[0]?.standard_hours || 8

      await query(
        `INSERT INTO daily_cabinet_usage_entries
          (id, clinic_id, date, cabinet_id, hours_available, hours_used)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [crypto.randomUUID(), clinicId, date, appointment.cabinet_id, hoursAvailable, durationHours]
      )
    }
  }
}

// GET /api/appointments/:clinicId - List appointments for a date
router.get('/:clinicId', requirePermission('canViewAppointments'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { date, doctorId } = req.query

    console.log('[APPOINTMENTS] GET request:', { clinicId, date, doctorId })

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' })
    }

    // Build query with optional doctor filter
    let sqlQuery = `SELECT
        a.*,
        json_build_object('id', d.id, 'name', d.name) as doctor,
        json_build_object('id', c.id, 'name', c.name) as cabinet,
        json_build_object(
          'id', at.id,
          'name', at.name,
          'color', at.color,
          'durationMinutes', at.duration_minutes
        ) as appointment_type
       FROM appointments a
       LEFT JOIN clinic_doctors d ON a.doctor_id = d.id
       LEFT JOIN clinic_cabinets c ON a.cabinet_id = c.id
       LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
       WHERE a.clinic_id = $1 AND a.date = $2`

    const params: any[] = [clinicId, date]

    if (doctorId) {
      sqlQuery += ` AND a.doctor_id = $3`
      params.push(doctorId)
    }

    sqlQuery += ` ORDER BY a.scheduled_start ASC`

    const result = await query(sqlQuery, params)

    console.log('[APPOINTMENTS] Raw query result:', {
      rowCount: result.rows.length,
      firstRow: result.rows[0] ? {
        date: result.rows[0].date,
        dateType: typeof result.rows[0].date,
        dateIsDate: result.rows[0].date instanceof Date,
        patientName: result.rows[0].patient_name
      } : null
    })

    const appointments = result.rows.map((row) => {
      // Fix: Use toLocaleDateString to avoid timezone issues
      let dateStr: string
      if (row.date instanceof Date) {
        // Extract just YYYY-MM-DD without timezone conversion
        const year = row.date.getFullYear()
        const month = String(row.date.getMonth() + 1).padStart(2, '0')
        const day = String(row.date.getDate()).padStart(2, '0')
        dateStr = `${year}-${month}-${day}`
      } else {
        dateStr = row.date
      }

      console.log('[APPOINTMENTS] Date conversion:', {
        original: row.date,
        converted: dateStr,
        patient: row.patient_name
      })

      return {
        id: row.id,
        date: dateStr,
        patientName: row.patient_name,
        patientCode: row.patient_code,
        scheduledStart: row.scheduled_start,
        scheduledEnd: row.scheduled_end,
        confirmedAt: row.confirmed_at,
        actualArrival: row.actual_arrival,
        actualStart: row.actual_start,
        actualEnd: row.actual_end,
        roomFreedAt: row.room_freed_at,
        status: row.status,
        isNewPatient: row.is_new_patient,
        delayReason: row.delay_reason,
        doctor: row.doctor?.id ? row.doctor : null,
        cabinet: row.cabinet?.id ? row.cabinet : null,
        appointmentType: row.appointment_type?.id ? row.appointment_type : null,
        consultationEntryId: row.consultation_entry_id,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        rescheduledFrom: row.rescheduled_from,
        rescheduledTo: row.rescheduled_to,
      }
    })

    console.log('[APPOINTMENTS] Returning', appointments.length, 'appointments')

    res.json({
      date,
      appointments,
    })
  } catch (error: any) {
    console.error('Error fetching appointments:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/appointments/:clinicId/appointment/:appointmentId - Get single appointment details
router.get('/:clinicId/appointment/:appointmentId', requirePermission('canViewAppointments'), async (req, res) => {
  try {
    const { clinicId, appointmentId } = req.params

    const result = await query(
      `SELECT
        a.*,
        json_build_object('id', d.id, 'name', d.name) as doctor,
        json_build_object('id', c.id, 'name', c.name) as cabinet,
        json_build_object(
          'id', at.id,
          'name', at.name,
          'color', at.color,
          'durationMinutes', at.duration_minutes
        ) as appointment_type
       FROM appointments a
       LEFT JOIN clinic_doctors d ON a.doctor_id = d.id
       LEFT JOIN clinic_cabinets c ON a.cabinet_id = c.id
       LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
       WHERE a.id = $1 AND a.clinic_id = $2`,
      [appointmentId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const row = result.rows[0]
    const appointment = {
      id: row.id,
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
      patientName: row.patient_name,
      patientCode: row.patient_code,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      confirmedAt: row.confirmed_at,
      actualArrival: row.actual_arrival,
      actualStart: row.actual_start,
      actualEnd: row.actual_end,
      roomFreedAt: row.room_freed_at,
      status: row.status,
      isNewPatient: row.is_new_patient,
      delayReason: row.delay_reason,
      doctor: row.doctor?.id ? row.doctor : null,
      cabinet: row.cabinet?.id ? row.cabinet : null,
      appointmentType: row.appointment_type?.id ? row.appointment_type : null,
      consultationEntryId: row.consultation_entry_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      rescheduledFrom: row.rescheduled_from,
      rescheduledTo: row.rescheduled_to,
    }

    res.json({ appointment })
  } catch (error: any) {
    console.error('Error fetching appointment:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/appointments/:clinicId/week - List appointments for a week
router.get('/:clinicId/week', requirePermission('canViewAppointments'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { startDate } = req.query

    if (!startDate) {
      return res.status(400).json({ error: 'startDate parameter is required' })
    }

    const result = await query(
      `SELECT
        a.*,
        json_build_object('id', d.id, 'name', d.name) as doctor,
        json_build_object('id', c.id, 'name', c.name) as cabinet,
        json_build_object(
          'id', at.id,
          'name', at.name,
          'color', at.color,
          'durationMinutes', at.duration_minutes
        ) as appointment_type
       FROM appointments a
       LEFT JOIN clinic_doctors d ON a.doctor_id = d.id
       LEFT JOIN clinic_cabinets c ON a.cabinet_id = c.id
       LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
       WHERE a.clinic_id = $1
         AND a.date >= $2::date
         AND a.date < ($2::date + INTERVAL '7 days')
       ORDER BY a.date ASC, a.scheduled_start ASC`,
      [clinicId, startDate]
    )

    const appointments = result.rows.map((row) => ({
      id: row.id,
      date: row.date instanceof Date ? row.date.toISOString().split('T')[0] : row.date,
      patientName: row.patient_name,
      patientCode: row.patient_code,
      scheduledStart: row.scheduled_start,
      scheduledEnd: row.scheduled_end,
      actualStart: row.actual_start,
      actualEnd: row.actual_end,
      status: row.status,
      isNewPatient: row.is_new_patient,
      delayReason: row.delay_reason,
      doctor: row.doctor?.id ? row.doctor : null,
      cabinet: row.cabinet?.id ? row.cabinet : null,
      appointmentType: row.appointment_type?.id ? row.appointment_type : null,
      consultationEntryId: row.consultation_entry_id,
      notes: row.notes,
    }))

    res.json({ appointments })
  } catch (error: any) {
    console.error('Error fetching week appointments:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/appointments/:clinicId - Create new appointment
router.post('/:clinicId', requireAppointmentEditPermission, async (req, res) => {
  try {
    const { clinicId } = req.params
    const {
      patientName,
      patientCode,
      date,
      scheduledStart,
      scheduledEnd,
      doctorId,
      cabinetId,
      appointmentTypeId,
      isNewPatient,
      isOldPatientReturn,
      notes,
      // New patient fields
      newPatientName,
      newPatientWhatsapp,
      sourceId,
      // Reschedule field
      rescheduledFrom,
    } = req.body

    if (!date || !scheduledStart || !scheduledEnd) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate if doctor can create appointment for this doctorId
    const { userId, role } = getUserInfo(req as any)
    console.log('[APPOINTMENTS] Create - userId:', userId, 'role:', role, 'doctorId:', doctorId)
    const canEdit = await canDoctorEditAppointment(userId, role, clinicId, doctorId || null)
    console.log('[APPOINTMENTS] Create - canEdit:', canEdit)

    if (!canEdit) {
      return res.status(403).json({
        error: 'Médicos só podem criar agendamentos para si mesmos',
        debug: { userId, role, doctorId }
      })
    }

    // Validate patient data based on type
    if (isNewPatient) {
      if (!newPatientName || !newPatientWhatsapp || !sourceId) {
        return res.status(400).json({ error: 'New patient requires name, whatsapp and source' })
      }
    } else {
      if (!patientName || !patientCode) {
        return res.status(400).json({ error: 'Existing patient requires name and code' })
      }
    }

    // Check for conflicts - same doctor at same time
    if (doctorId) {
      const doctorConflict = await query(
        `SELECT id FROM appointments
         WHERE clinic_id = $1 AND date = $2 AND doctor_id = $3
           AND status NOT IN ('cancelled', 'no_show')
           AND (
             (scheduled_start < $5 AND scheduled_end > $4) OR
             (scheduled_start >= $4 AND scheduled_start < $5)
           )`,
        [clinicId, date, doctorId, scheduledStart, scheduledEnd]
      )

      if (doctorConflict.rows.length > 0) {
        return res.status(409).json({ error: 'Médico já tem consulta agendada neste horário' })
      }
    }

    // Check for conflicts - same cabinet at same time
    if (cabinetId) {
      const cabinetConflict = await query(
        `SELECT id FROM appointments
         WHERE clinic_id = $1 AND date = $2 AND cabinet_id = $3
           AND status NOT IN ('cancelled', 'no_show')
           AND (
             (scheduled_start < $5 AND scheduled_end > $4) OR
             (scheduled_start >= $4 AND scheduled_start < $5)
           )`,
        [clinicId, date, cabinetId, scheduledStart, scheduledEnd]
      )

      if (cabinetConflict.rows.length > 0) {
        return res.status(409).json({ error: 'Consultório já está ocupado neste horário' })
      }
    }

    const appointmentId = crypto.randomUUID()
    const createdByUserId = (req as any).user?.id || null
    let finalPatientName = patientName
    let finalPatientCode = patientCode
    let consultationEntryId: string | null = null

    // If new patient, create temp patient record and consultation entry
    if (isNewPatient && newPatientName && sourceId) {
      // 1. Generate temporary patient code (P-0001, P-0002, etc.)
      const existingPatientsResult = await query(
        `SELECT code FROM patients
         WHERE clinic_id = $1 AND code LIKE 'P-%'
         ORDER BY code DESC LIMIT 1`,
        [clinicId]
      )

      let nextNumber = 1
      if (existingPatientsResult.rows.length > 0) {
        const lastCode = existingPatientsResult.rows[0].code
        const match = lastCode.match(/P-(\d+)/)
        if (match) {
          nextNumber = parseInt(match[1]) + 1
        }
      }

      const tempPatientCode = `P-${String(nextNumber).padStart(4, '0')}`
      const patientId = crypto.randomUUID()

      // 2. Create patient record
      await query(
        `INSERT INTO patients (id, clinic_id, code, name, phone, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [patientId, clinicId, tempPatientCode, newPatientName, newPatientWhatsapp]
      )

      // 3. Create consultation entry (first consultation - goes to Kanban)
      consultationEntryId = crypto.randomUUID()
      await query(
        `INSERT INTO daily_consultation_entries (
          id, clinic_id, date, patient_name, code,
          source_id, doctor_id,
          consultation_completed,
          plan_created, plan_presented, plan_accepted,
          plan_value, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, false, false, false, 0, NOW())`,
        [
          consultationEntryId,
          clinicId,
          date,
          newPatientName,
          tempPatientCode,
          sourceId,
          doctorId || null,
        ]
      )

      finalPatientName = newPatientName
      finalPatientCode = tempPatientCode

      console.log(`[APPOINTMENTS] Created new patient: ${tempPatientCode} - ${newPatientName}`)
      console.log(`[APPOINTMENTS] Created consultation entry: ${consultationEntryId}`)
    }

    await query(
      `INSERT INTO appointments (
        id, clinic_id, doctor_id, cabinet_id, appointment_type_id,
        patient_name, patient_code, date, scheduled_start, scheduled_end,
        status, is_new_patient, notes, created_by, consultation_entry_id, rescheduled_from
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        appointmentId,
        clinicId,
        doctorId || null,
        cabinetId || null,
        appointmentTypeId || null,
        finalPatientName,
        finalPatientCode || null,
        date,
        scheduledStart,
        scheduledEnd,
        'scheduled',
        isNewPatient !== undefined ? isNewPatient : true,
        notes || null,
        createdByUserId,
        consultationEntryId, // Link to consultation entry
        rescheduledFrom || null,
      ]
    )

    // If this is a reschedule, update the original appointment with rescheduled_to
    if (rescheduledFrom) {
      await query(
        `UPDATE appointments
         SET rescheduled_to = $1
         WHERE id = $2 AND clinic_id = $3`,
        [appointmentId, rescheduledFrom, clinicId]
      )
    }

    // If this is an old patient return, increment the metric
    if (isOldPatientReturn === true) {
      await query(
        `INSERT INTO daily_consultation_control_entries
          (id, clinic_id, date, no_show, rescheduled, cancelled, old_patient_booking)
         VALUES ($1, $2, $3, 0, 0, 0, 1)
         ON CONFLICT (clinic_id, date)
         DO UPDATE SET old_patient_booking = daily_consultation_control_entries.old_patient_booking + 1`,
        [crypto.randomUUID(), clinicId, date]
      )
      console.log(`[APPOINTMENTS] Old patient return metric incremented for date: ${date}`)
    }

    res.status(201).json({
      id: appointmentId,
      patientCode: finalPatientCode,
      consultationEntryId
    })
  } catch (error: any) {
    console.error('Error creating appointment:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/appointments/:clinicId/:appointmentId/status - Update appointment status
router.patch('/:clinicId/:appointmentId/status', requirePermission('canEditAppointments'), async (req, res) => {
  try {
    const { clinicId, appointmentId } = req.params
    const { status, delayReason, actualStart, actualEnd } = req.body

    if (!status) {
      return res.status(400).json({ error: 'Status is required' })
    }

    // Get current appointment to check previous status
    const current = await query(
      `SELECT * FROM appointments WHERE id = $1 AND clinic_id = $2`,
      [appointmentId, clinicId]
    )

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    // Validate if doctor can edit this appointment
    const { userId, role } = getUserInfo(req as any)
    const canEdit = await canDoctorEditAppointment(userId, role, clinicId, current.rows[0].doctor_id)

    if (!canEdit) {
      return res.status(403).json({
        error: 'Médicos só podem editar seus próprios agendamentos'
      })
    }

    const previousStatus = current.rows[0].status

    // Update appointment
    await query(
      `UPDATE appointments
       SET status = $1,
           delay_reason = $2,
           actual_start = COALESCE($3, actual_start),
           actual_end = COALESCE($4, actual_end)
       WHERE id = $5 AND clinic_id = $6`,
      [status, delayReason || null, actualStart || null, actualEnd || null, appointmentId, clinicId]
    )

    // Get updated appointment
    const updated = await query(
      `SELECT * FROM appointments WHERE id = $1 AND clinic_id = $2`,
      [appointmentId, clinicId]
    )

    const appointment = updated.rows[0]

    // Update metrics based on status change
    await updateMetricsOnStatusChange(clinicId, appointment, previousStatus)

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error updating appointment status:', error)
    res.status(500).json({ error: error.message })
  }
})

// PATCH /api/appointments/:clinicId/:appointmentId - Edit appointment details
router.patch('/:clinicId/:appointmentId', requirePermission('canEditAppointments'), async (req, res) => {
  try {
    const { clinicId, appointmentId } = req.params
    const {
      patientName,
      patientCode,
      date,
      scheduledStart,
      scheduledEnd,
      doctorId,
      cabinetId,
      appointmentTypeId,
      isNewPatient,
      notes,
    } = req.body

    // Get current appointment
    const current = await query(
      `SELECT * FROM appointments WHERE id = $1 AND clinic_id = $2`,
      [appointmentId, clinicId]
    )

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const currentAppointment = current.rows[0]

    // Validate if doctor can edit this appointment
    const { userId, role } = getUserInfo(req as any)
    const canEdit = await canDoctorEditAppointment(userId, role, clinicId, currentAppointment.doctor_id)

    if (!canEdit) {
      return res.status(403).json({
        error: 'Médicos só podem editar seus próprios agendamentos'
      })
    }

    // If trying to change doctorId, validate the new doctor
    if (doctorId !== undefined && doctorId !== currentAppointment.doctor_id) {
      const canEditNewDoctor = await canDoctorEditAppointment(userId, role, clinicId, doctorId)
      if (!canEditNewDoctor) {
        return res.status(403).json({
          error: 'Médicos só podem atribuir agendamentos para si mesmos'
        })
      }
    }

    // Check if date/time changed (this is a reschedule for metrics)
    const isReschedule =
      (date && date !== currentAppointment.date) ||
      (scheduledStart && scheduledStart !== currentAppointment.scheduled_start)

    if (isReschedule && currentAppointment.status !== 'rescheduled') {
      // Update status to rescheduled and trigger metrics
      await query(
        `UPDATE appointments SET status = 'rescheduled' WHERE id = $1 AND clinic_id = $2`,
        [appointmentId, clinicId]
      )

      const reschedAppointment = { ...currentAppointment, status: 'rescheduled' }
      await updateMetricsOnStatusChange(clinicId, reschedAppointment, currentAppointment.status)
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (patientName !== undefined) {
      updates.push(`patient_name = $${paramCount++}`)
      values.push(patientName)
    }
    if (patientCode !== undefined) {
      updates.push(`patient_code = $${paramCount++}`)
      values.push(patientCode)
    }
    if (date !== undefined) {
      updates.push(`date = $${paramCount++}`)
      values.push(date)
    }
    if (scheduledStart !== undefined) {
      updates.push(`scheduled_start = $${paramCount++}`)
      values.push(scheduledStart)
    }
    if (scheduledEnd !== undefined) {
      updates.push(`scheduled_end = $${paramCount++}`)
      values.push(scheduledEnd)
    }
    if (doctorId !== undefined) {
      updates.push(`doctor_id = $${paramCount++}`)
      values.push(doctorId)
    }
    if (cabinetId !== undefined) {
      updates.push(`cabinet_id = $${paramCount++}`)
      values.push(cabinetId)
    }
    if (appointmentTypeId !== undefined) {
      updates.push(`appointment_type_id = $${paramCount++}`)
      values.push(appointmentTypeId)
    }
    if (isNewPatient !== undefined) {
      updates.push(`is_new_patient = $${paramCount++}`)
      values.push(isNewPatient)
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`)
      values.push(notes)
    }

    if (updates.length === 0) {
      return res.json({ success: true })
    }

    values.push(appointmentId, clinicId)

    await query(
      `UPDATE appointments SET ${updates.join(', ')} WHERE id = $${paramCount++} AND clinic_id = $${paramCount++}`,
      values
    )

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error updating appointment:', error)
    res.status(500).json({ error: error.message })
  }
})

// ================ APPOINTMENT TYPES ================

// GET /api/appointments/:clinicId/types - List appointment types
router.get('/:clinicId/types', requirePermission('canViewAppointments'), async (req, res) => {
  try {
    const { clinicId } = req.params

    const result = await query(
      `SELECT * FROM appointment_types
       WHERE clinic_id = $1 AND is_active = true
       ORDER BY name ASC`,
      [clinicId]
    )

    const types = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      durationMinutes: row.duration_minutes,
      color: row.color,
      isActive: row.is_active,
    }))

    res.json({ types })
  } catch (error: any) {
    console.error('Error fetching appointment types:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/appointments/:clinicId/types - Create appointment type
router.post('/:clinicId/types', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { name, durationMinutes, color } = req.body

    if (!name || !durationMinutes) {
      return res.status(400).json({ error: 'Name and duration are required' })
    }

    const typeId = crypto.randomUUID()

    await query(
      `INSERT INTO appointment_types (id, clinic_id, name, duration_minutes, color)
       VALUES ($1, $2, $3, $4, $5)`,
      [typeId, clinicId, name, durationMinutes, color || '#1D9E75']
    )

    res.status(201).json({ id: typeId })
  } catch (error: any) {
    console.error('Error creating appointment type:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /api/appointments/:clinicId/types/:typeId - Update appointment type
router.put('/:clinicId/types/:typeId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, typeId } = req.params
    const { name, durationMinutes, color, isActive } = req.body

    // Build update query
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`)
      values.push(name)
    }
    if (durationMinutes !== undefined) {
      updates.push(`duration_minutes = $${paramCount++}`)
      values.push(durationMinutes)
    }
    if (color !== undefined) {
      updates.push(`color = $${paramCount++}`)
      values.push(color)
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`)
      values.push(isActive)
    }

    if (updates.length === 0) {
      return res.json({ success: true })
    }

    values.push(typeId, clinicId)

    await query(
      `UPDATE appointment_types SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND clinic_id = $${paramCount++}`,
      values
    )

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error updating appointment type:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /api/appointments/:clinicId/types/:typeId - Delete appointment type
router.delete('/:clinicId/types/:typeId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, typeId } = req.params

    // Soft delete by marking as inactive
    await query(
      `UPDATE appointment_types SET is_active = false
       WHERE id = $1 AND clinic_id = $2`,
      [typeId, clinicId]
    )

    res.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting appointment type:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/appointments/:clinicId/:appointmentId/reschedule - Reschedule appointment (envia para banco)
router.post('/:clinicId/:appointmentId/reschedule', requireAppointmentEditPermission, async (req, res) => {
  try {
    const { clinicId, appointmentId } = req.params
    const { reason } = req.body

    // Get original appointment
    const originalResult = await query(
      `SELECT * FROM appointments WHERE id = $1 AND clinic_id = $2`,
      [appointmentId, clinicId]
    )

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Consulta não encontrada' })
    }

    const original = originalResult.rows[0]

    // Create entry in pending_reschedules
    const pendingRescheduleId = crypto.randomUUID()
    const userId = (req as any).user?.id || null

    await query(
      `INSERT INTO pending_reschedules (
        id, clinic_id, original_appointment_id,
        patient_name, patient_code,
        preferred_doctor_id, preferred_appointment_type_id,
        reason, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        pendingRescheduleId,
        clinicId,
        appointmentId,
        original.patient_name,
        original.patient_code,
        original.doctor_id,
        original.appointment_type_id,
        reason || 'Paciente solicitou remarcação',
        userId,
      ]
    )

    // Update original appointment status
    await query(
      `UPDATE appointments
       SET status = 'rescheduled'
       WHERE id = $1 AND clinic_id = $2`,
      [appointmentId, clinicId]
    )

    // Trigger metrics update for original appointment
    const updatedOriginal = { ...original, status: 'rescheduled', date: original.date }
    await updateMetricsOnStatusChange(clinicId, updatedOriginal, original.status)

    res.status(201).json({
      success: true,
      pendingRescheduleId,
      message: 'Paciente adicionado ao banco de remarcações'
    })
  } catch (error: any) {
    console.error('Error adding to reschedule queue:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/appointments/:clinicId/patients/search - Search patients by code or name
router.get('/:clinicId/patients/search', requirePermission('canViewAppointments'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { q } = req.query

    if (!q || (q as string).length < 2) {
      return res.json({ patients: [] })
    }

    const searchTerm = `%${q}%`
    const result = await query(
      `SELECT id, code, name
       FROM patients
       WHERE clinic_id = $1
         AND (code ILIKE $2 OR name ILIKE $2)
       ORDER BY code ASC
       LIMIT 20`,
      [clinicId, searchTerm]
    )

    const patients = result.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
    }))

    res.json({ patients })
  } catch (error: any) {
    console.error('Error searching patients:', error)
    res.status(500).json({ error: error.message })
  }
})

// Update appointment (for drag & drop / resize)
router.put('/:clinicId/:appointmentId', requireAppointmentEditPermission, async (req, res) => {
  try {
    const { clinicId, appointmentId } = req.params
    const { scheduledStart, scheduledEnd, status, confirmedAt, actualArrival, actualStart, actualEnd, roomFreedAt } = req.body

    console.log('[APPOINTMENTS] Updating appointment:', appointmentId, req.body)

    // Get current appointment to validate permissions
    const current = await query(
      `SELECT doctor_id FROM appointments WHERE id = $1 AND clinic_id = $2`,
      [appointmentId, clinicId]
    )

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    // Validate if doctor can edit this appointment
    const { userId, role } = getUserInfo(req as any)
    const canEdit = await canDoctorEditAppointment(userId, role, clinicId, current.rows[0].doctor_id)

    if (!canEdit) {
      return res.status(403).json({
        error: 'Médicos só podem editar seus próprios agendamentos'
      })
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (scheduledStart !== undefined) {
      updates.push(`scheduled_start = $${paramCount++}`)
      values.push(scheduledStart)
    }

    if (scheduledEnd !== undefined) {
      updates.push(`scheduled_end = $${paramCount++}`)
      values.push(scheduledEnd)
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`)
      values.push(status)
    }

    if (confirmedAt !== undefined) {
      updates.push(`confirmed_at = $${paramCount++}`)
      values.push(confirmedAt === null ? null : confirmedAt)
    }

    if (actualArrival !== undefined) {
      updates.push(`actual_arrival = $${paramCount++}`)
      values.push(actualArrival === null ? null : actualArrival)
    }

    if (actualStart !== undefined) {
      updates.push(`actual_start = $${paramCount++}`)
      values.push(actualStart === null ? null : actualStart)
    }

    if (actualEnd !== undefined) {
      updates.push(`actual_end = $${paramCount++}`)
      values.push(actualEnd === null ? null : actualEnd)
    }

    if (roomFreedAt !== undefined) {
      updates.push(`room_freed_at = $${paramCount++}`)
      values.push(roomFreedAt === null ? null : roomFreedAt)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)

    // Add WHERE clause parameters
    values.push(appointmentId)
    values.push(clinicId)

    console.log('[APPOINTMENTS] UPDATE query:', {
      updates: updates.join(', '),
      values,
      appointmentId,
      clinicId
    })

    const result = await query(
      `UPDATE appointments
       SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND clinic_id = $${paramCount++}
       RETURNING *`,
      values
    )

    console.log('[APPOINTMENTS] UPDATE result:', result.rows.length, 'rows affected')

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const appointment = result.rows[0]

    console.log('[APPOINTMENTS] Appointment updated successfully:', appointment.id)

    res.json({
      appointment: {
        id: appointment.id,
        date: appointment.date,
        patientName: appointment.patient_name,
        patientCode: appointment.patient_code,
        scheduledStart: appointment.scheduled_start,
        scheduledEnd: appointment.scheduled_end,
        confirmedAt: appointment.confirmed_at,
        actualArrival: appointment.actual_arrival,
        actualStart: appointment.actual_start,
        actualEnd: appointment.actual_end,
        roomFreedAt: appointment.room_freed_at,
        status: appointment.status,
        doctorId: appointment.doctor_id,
        cabinetId: appointment.cabinet_id,
        appointmentTypeId: appointment.appointment_type_id,
        isNewPatient: appointment.is_new_patient,
        notes: appointment.notes,
        delayReason: appointment.delay_reason,
        createdAt: appointment.created_at,
        updatedAt: appointment.updated_at,
      },
    })
  } catch (error: any) {
    console.error('[APPOINTMENTS] Error updating appointment:', error)
    console.error('[APPOINTMENTS] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail
    })
    res.status(500).json({ error: error.message, detail: error.detail })
  }
})

// Delete appointment (contabiliza como cancelamento)
router.delete('/:clinicId/:appointmentId', requireAppointmentEditPermission, async (req, res) => {
  try {
    const { clinicId, appointmentId } = req.params

    console.log('[APPOINTMENTS] Deleting appointment:', appointmentId)

    // Get current appointment to validate permissions
    const current = await query(
      `SELECT doctor_id FROM appointments WHERE id = $1 AND clinic_id = $2`,
      [appointmentId, clinicId]
    )

    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    // Validate if doctor can delete this appointment
    const { userId, role } = getUserInfo(req as any)
    const canEdit = await canDoctorEditAppointment(userId, role, clinicId, current.rows[0].doctor_id)

    if (!canEdit) {
      return res.status(403).json({
        error: 'Médicos só podem excluir seus próprios agendamentos'
      })
    }

    const result = await query(
      `DELETE FROM appointments
       WHERE id = $1 AND clinic_id = $2
       RETURNING *`,
      [appointmentId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const deletedAppointment = result.rows[0]

    // Incrementar métrica de cancelamento
    await query(
      `INSERT INTO daily_consultation_control_entries
        (id, clinic_id, date, no_show, rescheduled, cancelled, old_patient_booking)
       VALUES ($1, $2, $3, 0, 0, 1, 0)
       ON CONFLICT (clinic_id, date)
       DO UPDATE SET cancelled = daily_consultation_control_entries.cancelled + 1`,
      [crypto.randomUUID(), clinicId, deletedAppointment.date]
    )

    console.log('[APPOINTMENTS] Appointment deleted and cancelled metric updated:', appointmentId)

    res.json({ message: 'Appointment deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting appointment:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/appointments/:clinicId/:appointmentId/plan-procedures
 * Retorna procedimentos pendentes do plano de tratamento associado ao agendamento
 */
router.get('/:clinicId/:appointmentId/plan-procedures', async (req, res) => {
  try {
    const { clinicId, appointmentId } = req.params

    console.log('[APPOINTMENTS] Fetching plan procedures for appointment:', appointmentId)

    // Busca o agendamento e sua consultation_entry_id
    const appointmentResult = await query(
      `SELECT
        id, consultation_entry_id, patient_name, patient_code
       FROM appointments
       WHERE id = $1 AND clinic_id = $2`,
      [appointmentId, clinicId]
    )

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const appointment = appointmentResult.rows[0]

    // Se não tem consultation_entry_id, retorna vazio
    if (!appointment.consultation_entry_id) {
      return res.json({
        hasConsultationEntry: false,
        patientName: appointment.patient_name,
        patientCode: appointment.patient_code,
        procedures: [],
        summary: {
          total: 0,
          pending: 0,
          completed: 0,
          completionPercent: 0
        }
      })
    }

    // Busca procedimentos pendentes do plano
    const proceduresResult = await query(
      `SELECT
        pp.id,
        pp.procedure_code,
        pp.procedure_description,
        pp.price_at_creation,
        pp.completed,
        pp.completed_at,
        pp.sort_order,
        pp.notes
       FROM plan_procedures pp
       WHERE pp.consultation_entry_id = $1
       ORDER BY pp.sort_order ASC, pp.created_at ASC`,
      [appointment.consultation_entry_id]
    )

    const allProcedures = proceduresResult.rows.map(row => ({
      id: row.id,
      procedureCode: row.procedure_code,
      procedureDescription: row.procedure_description,
      priceAtCreation: parseFloat(row.price_at_creation),
      completed: row.completed,
      completedAt: row.completed_at,
      sortOrder: row.sort_order,
      notes: row.notes
    }))

    const total = allProcedures.length
    const completed = allProcedures.filter(p => p.completed).length
    const pending = total - completed
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0

    res.json({
      hasConsultationEntry: true,
      consultationEntryId: appointment.consultation_entry_id,
      patientName: appointment.patient_name,
      patientCode: appointment.patient_code,
      procedures: allProcedures,
      summary: {
        total,
        pending,
        completed,
        completionPercent
      }
    })
  } catch (error: any) {
    console.error('Error fetching plan procedures for appointment:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PATCH /api/appointments/:clinicId/:appointmentId/complete-procedures
 * Marca procedimentos como realizados neste agendamento
 * Body: { procedureIds: string[], doctorId: string }
 */
router.patch('/:clinicId/:appointmentId/complete-procedures', async (req, res) => {
  try {
    const { clinicId, appointmentId } = req.params
    const { procedureIds, doctorId } = req.body

    console.log('[APPOINTMENTS] Completing procedures:', { appointmentId, procedureIds, doctorId })

    if (!Array.isArray(procedureIds) || procedureIds.length === 0) {
      return res.status(400).json({ error: 'procedureIds deve ser um array não vazio' })
    }

    // Verifica se appointment existe
    const appointmentCheck = await query(
      'SELECT id FROM appointments WHERE id = $1 AND clinic_id = $2',
      [appointmentId, clinicId]
    )

    if (appointmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    // Marca procedimentos como completos
    let updatedCount = 0
    for (const procedureId of procedureIds) {
      const result = await query(
        `UPDATE plan_procedures
         SET completed = true,
             completed_at = NOW(),
             completed_by_doctor_id = $1,
             appointment_id = $2
         WHERE id = $3 AND completed = false`,
        [doctorId || null, appointmentId, procedureId]
      )

      updatedCount += result.rowCount || 0
    }

    // Trigger vai atualizar métricas e transições automaticamente

    console.log(`[APPOINTMENTS] ${updatedCount} procedimentos marcados como completos`)

    res.json({
      message: `${updatedCount} procedimentos marcados como realizados`,
      updatedCount
    })
  } catch (error: any) {
    console.error('Error completing procedures:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Get plan procedures for an appointment
 * GET /api/appointments/:clinicId/:appointmentId/procedures
 */
router.get('/:clinicId/:appointmentId/procedures', async (req, res) => {
  try {
    const { clinicId, appointmentId } = req.params

    // Get appointment and its consultation_entry_id
    const appointmentResult = await query(
      `SELECT consultation_entry_id FROM appointments
       WHERE id = $1 AND clinic_id = $2`,
      [appointmentId, clinicId]
    )

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const consultationEntryId = appointmentResult.rows[0].consultation_entry_id

    if (!consultationEntryId) {
      // No consultation entry linked yet - no procedures
      return res.json([])
    }

    // Get plan procedures
    const proceduresResult = await query(
      `SELECT
        pp.id,
        pp.procedure_code,
        pp.procedure_description,
        pp.price_at_creation,
        pp.completed,
        pp.completed_at,
        pp.notes,
        pp.pending_treatment_id
       FROM plan_procedures pp
       WHERE pp.consultation_entry_id = $1
       ORDER BY pp.sort_order ASC`,
      [consultationEntryId]
    )

    const procedures = proceduresResult.rows.map(p => ({
      id: p.id,
      procedureCode: p.procedure_code,
      procedureDescription: p.procedure_description,
      procedureValue: parseFloat(p.price_at_creation || 0),
      completed: p.completed,
      completedAt: p.completed_at,
      notes: p.notes,
      pendingTreatmentId: p.pending_treatment_id,
    }))

    res.json(procedures)
  } catch (error: any) {
    console.error('Error fetching appointment procedures:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Execute a procedure from the appointment schedule
 * POST /api/appointments/:clinicId/:appointmentId/procedures/:procedureId/execute
 */
router.post('/:clinicId/:appointmentId/procedures/:procedureId/execute', async (req, res) => {
  try {
    const { clinicId, appointmentId, procedureId } = req.params
    const { executedAt, notes } = req.body

    // Get the procedure and verify it belongs to this appointment's consultation
    const procResult = await query(
      `SELECT
        pp.id,
        pp.consultation_entry_id,
        pp.pending_treatment_id,
        pp.completed,
        a.consultation_entry_id as appointment_consultation_id
       FROM plan_procedures pp
       INNER JOIN appointments a ON a.consultation_entry_id = pp.consultation_entry_id
       WHERE pp.id = $1 AND a.id = $2 AND a.clinic_id = $3`,
      [procedureId, appointmentId, clinicId]
    )

    if (procResult.rows.length === 0) {
      return res.status(404).json({ error: 'Procedure not found for this appointment' })
    }

    const procedure = procResult.rows[0]

    if (procedure.completed) {
      return res.status(400).json({ error: 'Procedure already completed' })
    }

    const completedAtValue = executedAt || new Date().toISOString()

    // 1. Update plan_procedure
    await query(
      `UPDATE plan_procedures
       SET completed = true,
           completed_at = $1,
           notes = $2
       WHERE id = $3`,
      [completedAtValue, notes || null, procedureId]
    )

    // 2. SYNC: Update pending_treatment if linked
    if (procedure.pending_treatment_id) {
      const treatmentResult = await query(
        `SELECT pending_quantity, total_quantity FROM pending_treatments WHERE id = $1`,
        [procedure.pending_treatment_id]
      )

      if (treatmentResult.rows.length > 0) {
        const treatment = treatmentResult.rows[0]
        const newPending = treatment.pending_quantity - 1
        const newStatus = newPending === 0 ? 'CONCLUIDO' : (newPending < treatment.total_quantity ? 'PARCIAL' : 'PENDENTE')

        await query(
          `UPDATE pending_treatments
           SET pending_quantity = $1::integer,
               status = $2,
               pending_value = unit_value * $1::integer
           WHERE id = $3`,
          [newPending, newStatus, procedure.pending_treatment_id]
        )
      }
    }

    // 3. Update consultation entry counters and status
    const statsResult = await query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed
       FROM plan_procedures
       WHERE consultation_entry_id = $1`,
      [procedure.consultation_entry_id]
    )

    const stats = statsResult.rows[0]
    const completedCount = parseInt(stats.completed)
    const totalCount = parseInt(stats.total)
    const allCompleted = completedCount === totalCount

    if (completedCount === 1 && !allCompleted) {
      // First procedure completed → Move to "Em Execução"
      await query(
        `UPDATE daily_consultation_entries
         SET in_execution = true,
             in_execution_at = $1,
             waiting_start = false,
             plan_procedures_completed = $2,
             plan_procedures_total = $3
         WHERE id = $4`,
        [completedAtValue, completedCount, totalCount, procedure.consultation_entry_id]
      )
    } else if (allCompleted) {
      // All procedures completed → Move to "Finalizado"
      await query(
        `UPDATE daily_consultation_entries
         SET plan_finished = true,
             plan_finished_at = $1,
             in_execution = false,
             waiting_start = false,
             plan_procedures_completed = $2,
             plan_procedures_total = $3
         WHERE id = $4`,
        [completedAtValue, completedCount, totalCount, procedure.consultation_entry_id]
      )
    } else {
      // Just update counters
      await query(
        `UPDATE daily_consultation_entries
         SET plan_procedures_completed = $1,
             plan_procedures_total = $2
         WHERE id = $3`,
        [completedCount, totalCount, procedure.consultation_entry_id]
      )
    }

    res.json({
      message: 'Procedure executed successfully',
      completedCount,
      totalCount,
      allCompleted,
    })
  } catch (error: any) {
    console.error('Error executing procedure from appointment:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/appointments/:clinicId/:appointmentId/create-consultation-entry
 * Creates a consultation entry for an existing appointment that doesn't have one yet
 */
router.post('/:clinicId/:appointmentId/create-consultation-entry', requireAppointmentEditPermission, async (req, res) => {
  try {
    const { clinicId, appointmentId } = req.params

    console.log('[APPOINTMENTS] Creating consultation entry for appointment:', appointmentId)

    // Get appointment details
    const appointmentResult = await query(
      `SELECT
        id, consultation_entry_id, patient_name, patient_code,
        date, doctor_id, is_new_patient
       FROM appointments
       WHERE id = $1 AND clinic_id = $2`,
      [appointmentId, clinicId]
    )

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' })
    }

    const appointment = appointmentResult.rows[0]

    // Check if already has a consultation entry
    if (appointment.consultation_entry_id) {
      // Fetch the existing entry to get priceTableType and insuranceProviderId
      const entryResult = await query(
        `SELECT price_table_type, insurance_provider_id
         FROM daily_consultation_entries
         WHERE id = $1`,
        [appointment.consultation_entry_id]
      )

      const entry = entryResult.rows[0] || {}

      return res.json({
        consultationEntryId: appointment.consultation_entry_id,
        priceTableType: entry.price_table_type || 'clinica',
        insuranceProviderId: entry.insurance_provider_id || null,
        message: 'Consultation entry already exists',
        alreadyExists: true
      })
    }

    // Check if there's already a consultation entry for this patient (clinic_id, code)
    const existingEntryResult = await query(
      `SELECT id, price_table_type, insurance_provider_id
       FROM daily_consultation_entries
       WHERE clinic_id = $1 AND code = $2`,
      [clinicId, appointment.patient_code]
    )

    let consultationEntryId: string

    if (existingEntryResult.rows.length > 0) {
      // Reuse existing consultation entry
      const existingEntry = existingEntryResult.rows[0]
      consultationEntryId = existingEntry.id

      console.log(`[APPOINTMENTS] Reusing existing consultation entry: ${consultationEntryId} for patient ${appointment.patient_code}`)

      // Link appointment to existing consultation entry
      await query(
        `UPDATE appointments
         SET consultation_entry_id = $1
         WHERE id = $2`,
        [consultationEntryId, appointmentId]
      )

      res.json({
        consultationEntryId,
        priceTableType: existingEntry.price_table_type || 'clinica',
        insuranceProviderId: existingEntry.insurance_provider_id || null,
        message: 'Linked to existing consultation entry',
        alreadyExists: true,
        reuseExisting: true
      })
    } else {
      // Create new consultation entry
      consultationEntryId = crypto.randomUUID()

      await query(
        `INSERT INTO daily_consultation_entries (
          id, clinic_id, date, patient_name, code,
          doctor_id, consultation_completed,
          plan_created, plan_presented, plan_accepted,
          plan_value, price_table_type, insurance_provider_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, false, false, false, false, 0, 'clinica', $7, NOW())`,
        [
          consultationEntryId,
          clinicId,
          appointment.date,
          appointment.patient_name,
          appointment.patient_code,
          appointment.doctor_id || null,
          null, // insurance_provider_id must be null when price_table_type is 'clinica'
        ]
      )

      // Link consultation entry to appointment
      await query(
        `UPDATE appointments
         SET consultation_entry_id = $1
         WHERE id = $2`,
        [consultationEntryId, appointmentId]
      )

      console.log(`[APPOINTMENTS] Created new consultation entry: ${consultationEntryId} for appointment ${appointmentId}`)

      res.json({
        consultationEntryId,
        priceTableType: 'clinica',
        insuranceProviderId: null,
        message: 'Consultation entry created successfully',
        alreadyExists: false,
        reuseExisting: false
      })
    }
  } catch (error: any) {
    console.error('Error creating consultation entry:', error)
    res.status(500).json({ error: error.message })
  }
})

// ============================================================================
// PENDING RESCHEDULES - Banco de Remarcações
// ============================================================================

/**
 * GET /api/appointments/:clinicId/pending-reschedules
 * Lista todas as remarcações pendentes da clínica
 */
router.get('/:clinicId/pending-reschedules', requirePermission('canViewAppointments'), async (req, res) => {
  try {
    const { clinicId } = req.params

    const result = await query(
      `SELECT
        pr.id,
        pr.patient_name,
        pr.patient_code,
        pr.reason,
        pr.notes,
        pr.requested_at,
        pr.created_at,
        pr.original_appointment_id,
        json_build_object('id', d.id, 'name', d.name) as preferred_doctor,
        json_build_object(
          'id', at.id,
          'name', at.name,
          'color', at.color,
          'durationMinutes', at.duration_minutes
        ) as preferred_appointment_type
       FROM pending_reschedules pr
       LEFT JOIN clinic_doctors d ON d.id = pr.preferred_doctor_id
       LEFT JOIN appointment_types at ON at.id = pr.preferred_appointment_type_id
       WHERE pr.clinic_id = $1
       ORDER BY pr.requested_at DESC`,
      [clinicId]
    )

    const pendingReschedules = result.rows.map(row => ({
      id: row.id,
      patientName: row.patient_name,
      patientCode: row.patient_code,
      reason: row.reason,
      notes: row.notes,
      requestedAt: row.requested_at,
      createdAt: row.created_at,
      originalAppointmentId: row.original_appointment_id,
      preferredDoctor: row.preferred_doctor?.id ? row.preferred_doctor : null,
      preferredAppointmentType: row.preferred_appointment_type?.id ? row.preferred_appointment_type : null,
    }))

    res.json({ pendingReschedules })
  } catch (error: any) {
    console.error('Error fetching pending reschedules:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/appointments/:clinicId/pending-reschedules/search
 * Busca remarcações pendentes por código ou nome do paciente
 */
router.get('/:clinicId/pending-reschedules/search', requirePermission('canViewAppointments'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { q } = req.query

    if (!q || (q as string).length < 2) {
      return res.json({ results: [] })
    }

    const searchTerm = `%${q}%`
    const result = await query(
      `SELECT
        pr.id,
        pr.patient_name,
        pr.patient_code,
        pr.reason,
        pr.notes,
        pr.requested_at,
        pr.original_appointment_id,
        pr.preferred_doctor_id,
        pr.preferred_appointment_type_id,
        d.name as preferred_doctor_name,
        at.name as preferred_appointment_type_name,
        at.duration_minutes as preferred_duration
       FROM pending_reschedules pr
       LEFT JOIN clinic_doctors d ON d.id = pr.preferred_doctor_id
       LEFT JOIN appointment_types at ON at.id = pr.preferred_appointment_type_id
       WHERE pr.clinic_id = $1
         AND (pr.patient_code ILIKE $2 OR pr.patient_name ILIKE $2)
       ORDER BY pr.requested_at DESC
       LIMIT 20`,
      [clinicId, searchTerm]
    )

    const results = result.rows.map(row => ({
      id: row.id,
      patientName: row.patient_name,
      patientCode: row.patient_code,
      reason: row.reason,
      notes: row.notes,
      requestedAt: row.requested_at,
      originalAppointmentId: row.original_appointment_id,
      preferredDoctorId: row.preferred_doctor_id,
      preferredDoctorName: row.preferred_doctor_name,
      preferredAppointmentTypeId: row.preferred_appointment_type_id,
      preferredAppointmentTypeName: row.preferred_appointment_type_name,
      preferredDuration: row.preferred_duration,
    }))

    res.json({ results })
  } catch (error: any) {
    console.error('Error searching pending reschedules:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/appointments/:clinicId/pending-reschedules/count
 * Retorna contador de remarcações pendentes
 */
router.get('/:clinicId/pending-reschedules/count', requirePermission('canViewAppointments'), async (req, res) => {
  try {
    const { clinicId } = req.params

    const result = await query(
      'SELECT COUNT(*) as count FROM pending_reschedules WHERE clinic_id = $1',
      [clinicId]
    )

    res.json({ count: parseInt(result.rows[0].count) })
  } catch (error: any) {
    console.error('Error counting pending reschedules:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/appointments/:clinicId/pending-reschedules
 * Adiciona uma remarcação ao banco
 */
router.post('/:clinicId/pending-reschedules', requireAppointmentEditPermission, async (req, res) => {
  try {
    const { clinicId } = req.params
    const {
      originalAppointmentId,
      patientName,
      patientCode,
      preferredDoctorId,
      preferredAppointmentTypeId,
      reason,
      notes,
    } = req.body

    if (!patientName) {
      return res.status(400).json({ error: 'Nome do paciente é obrigatório' })
    }

    const id = crypto.randomUUID()
    const userId = (req as any).user?.id || null

    await query(
      `INSERT INTO pending_reschedules (
        id, clinic_id, original_appointment_id,
        patient_name, patient_code,
        preferred_doctor_id, preferred_appointment_type_id,
        reason, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        clinicId,
        originalAppointmentId || null,
        patientName,
        patientCode || null,
        preferredDoctorId || null,
        preferredAppointmentTypeId || null,
        reason || null,
        notes || null,
        userId,
      ]
    )

    res.status(201).json({
      id,
      message: 'Remarcação adicionada ao banco com sucesso'
    })
  } catch (error: any) {
    console.error('Error creating pending reschedule:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/appointments/:clinicId/pending-reschedules/:rescheduleId
 * Remove uma remarcação do banco (usado quando agendamento é criado ou cancelado)
 */
router.delete('/:clinicId/pending-reschedules/:rescheduleId', requireAppointmentEditPermission, async (req, res) => {
  try {
    const { clinicId, rescheduleId } = req.params

    const result = await query(
      'DELETE FROM pending_reschedules WHERE id = $1 AND clinic_id = $2 RETURNING *',
      [rescheduleId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Remarcação não encontrada' })
    }

    res.json({ message: 'Remarcação removida do banco' })
  } catch (error: any) {
    console.error('Error deleting pending reschedule:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
