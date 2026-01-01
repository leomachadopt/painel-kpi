import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// ================================
// FINANCIAL ENTRIES
// ================================
router.get('/financial/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const result = await query(
      `SELECT * FROM daily_financial_entries WHERE clinic_id = $1 ORDER BY date DESC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        patientName: row.patient_name,
        code: row.code,
        categoryId: row.category_id,
        value: parseFloat(row.value),
        cabinetId: row.cabinet_id,
      }))
    )
  } catch (error) {
    console.error('Get financial entries error:', error)
    res.status(500).json({ error: 'Failed to fetch financial entries' })
  }
})

router.post('/financial/:clinicId', async (req, res) => {
  // Only GESTOR can create entries
  if (req.user?.role !== 'GESTOR_CLINICA' || req.user?.clinicId !== req.params.clinicId) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { clinicId } = req.params
    const { id, date, patientName, code, categoryId, value, cabinetId } = req.body
    const entryId =
      id || `financial-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const result = await query(
      `INSERT INTO daily_financial_entries
       (id, clinic_id, date, patient_name, code, category_id, value, cabinet_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [entryId, clinicId, date, patientName, code, categoryId, value, cabinetId]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      categoryId: result.rows[0].category_id,
      value: parseFloat(result.rows[0].value),
      cabinetId: result.rows[0].cabinet_id,
    })
  } catch (error) {
    console.error('Create financial entry error:', error)
    res.status(500).json({ error: 'Failed to create financial entry' })
  }
})

router.delete('/financial/:clinicId/:entryId', async (req, res) => {
  // Only GESTOR can delete entries
  if (req.user?.role !== 'GESTOR_CLINICA' || req.user?.clinicId !== req.params.clinicId) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { clinicId, entryId } = req.params
    const result = await query(
      `DELETE FROM daily_financial_entries WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [entryId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Delete financial entry error:', error)
    res.status(500).json({ error: 'Failed to delete financial entry' })
  }
})

// ================================
// CONSULTATION ENTRIES
// ================================
router.get('/consultation/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const result = await query(
      `SELECT * FROM daily_consultation_entries WHERE clinic_id = $1 ORDER BY date DESC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        patientName: row.patient_name,
        code: row.code,
        planCreated: row.plan_created,
        planCreatedAt: row.plan_created_at,
        planPresented: row.plan_presented,
        planPresentedAt: row.plan_presented_at,
        planAccepted: row.plan_accepted,
        planAcceptedAt: row.plan_accepted_at,
        planValue: parseFloat(row.plan_value),
      }))
    )
  } catch (error) {
    console.error('Get consultation entries error:', error)
    res.status(500).json({ error: 'Failed to fetch consultation entries' })
  }
})

// Get consultation entry by patient code (1 registo por paciente)
router.get('/consultation/:clinicId/code/:code', async (req, res) => {
  try {
    const { clinicId, code } = req.params

    if (!/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 1-6 digits' })
    }

    const result = await query(
      `SELECT * FROM daily_consultation_entries WHERE clinic_id = $1 AND code = $2`,
      [clinicId, code]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation entry not found' })
    }

    const row = result.rows[0]
    return res.json({
      id: row.id,
      date: row.date,
      patientName: row.patient_name,
      code: row.code,
      planCreated: row.plan_created,
      planCreatedAt: row.plan_created_at,
      planPresented: row.plan_presented,
      planPresentedAt: row.plan_presented_at,
      planAccepted: row.plan_accepted,
      planAcceptedAt: row.plan_accepted_at,
      planValue: parseFloat(row.plan_value),
    })
  } catch (error) {
    console.error('Get consultation by code error:', error)
    res.status(500).json({ error: 'Failed to fetch consultation entry' })
  }
})

router.post('/consultation/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const {
      date,
      patientName,
      code,
      planCreated,
      planCreatedAt,
      planPresented,
      planPresentedAt,
      planAccepted,
      planAcceptedAt,
      planValue,
    } = req.body

    if (!code || !/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 1-6 digits' })
    }

    const entryId = `consultation-${clinicId}-${code}`

    const result = await query(
      `INSERT INTO daily_consultation_entries
       (id, clinic_id, date, patient_name, code,
        plan_created, plan_created_at,
        plan_presented, plan_presented_at,
        plan_accepted, plan_accepted_at,
        plan_value)
       VALUES ($1, $2, $3, $4, $5,
        $6, $7,
        $8, $9,
        $10, $11,
        $12)
       ON CONFLICT (clinic_id, code) DO UPDATE SET
        date = EXCLUDED.date,
        patient_name = EXCLUDED.patient_name,
        plan_created = EXCLUDED.plan_created,
        plan_created_at = EXCLUDED.plan_created_at,
        plan_presented = EXCLUDED.plan_presented,
        plan_presented_at = EXCLUDED.plan_presented_at,
        plan_accepted = EXCLUDED.plan_accepted,
        plan_accepted_at = EXCLUDED.plan_accepted_at,
        plan_value = EXCLUDED.plan_value
       RETURNING *`,
      [
        entryId,
        clinicId,
        date,
        patientName,
        code,
        planCreated,
        planCreatedAt || null,
        planPresented,
        planPresentedAt || null,
        planAccepted,
        planAcceptedAt || null,
        planValue,
      ]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      planCreated: result.rows[0].plan_created,
      planCreatedAt: result.rows[0].plan_created_at,
      planPresented: result.rows[0].plan_presented,
      planPresentedAt: result.rows[0].plan_presented_at,
      planAccepted: result.rows[0].plan_accepted,
      planAcceptedAt: result.rows[0].plan_accepted_at,
      planValue: parseFloat(result.rows[0].plan_value),
    })
  } catch (error) {
    console.error('Create consultation entry error:', error)
    res.status(500).json({ error: 'Failed to create consultation entry' })
  }
})

router.delete('/consultation/:clinicId/:entryId', async (req, res) => {
  // Only GESTOR can delete entries
  if (req.user?.role !== 'GESTOR_CLINICA' || req.user?.clinicId !== req.params.clinicId) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { clinicId, entryId } = req.params
    const result = await query(
      `DELETE FROM daily_consultation_entries WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [entryId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Delete consultation entry error:', error)
    res.status(500).json({ error: 'Failed to delete consultation entry' })
  }
})

// ================================
// PROSPECTING ENTRIES
// ================================
router.get('/prospecting/:clinicId/:date', async (req, res) => {
  try {
    const { clinicId, date } = req.params
    const result = await query(
      `SELECT * FROM daily_prospecting_entries WHERE clinic_id = $1 AND date = $2`,
      [clinicId, date]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prospecting entry not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      date: row.date,
      scheduled: row.scheduled,
      email: row.email,
      sms: row.sms,
      whatsapp: row.whatsapp,
      instagram: row.instagram,
    })
  } catch (error) {
    console.error('Get prospecting entry error:', error)
    res.status(500).json({ error: 'Failed to fetch prospecting entry' })
  }
})

router.post('/prospecting/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { id, date, scheduled, email, sms, whatsapp, instagram } = req.body
    const entryId = id || `prospecting-${clinicId}-${date}`

    const result = await query(
      `INSERT INTO daily_prospecting_entries
       (id, clinic_id, date, scheduled, email, sms, whatsapp, instagram)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (clinic_id, date) DO UPDATE SET
         scheduled = EXCLUDED.scheduled,
         email = EXCLUDED.email,
         sms = EXCLUDED.sms,
         whatsapp = EXCLUDED.whatsapp,
         instagram = EXCLUDED.instagram
       RETURNING *`,
      [entryId, clinicId, date, scheduled, email, sms, whatsapp, instagram]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      scheduled: result.rows[0].scheduled,
      email: result.rows[0].email,
      sms: result.rows[0].sms,
      whatsapp: result.rows[0].whatsapp,
      instagram: result.rows[0].instagram,
    })
  } catch (error) {
    console.error('Create prospecting entry error:', error)
    res.status(500).json({ error: 'Failed to create prospecting entry' })
  }
})

// ================================
// CABINET USAGE ENTRIES
// ================================
router.get('/cabinet/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const result = await query(
      `SELECT * FROM daily_cabinet_usage_entries WHERE clinic_id = $1 ORDER BY date DESC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        cabinetId: row.cabinet_id,
        hoursAvailable: row.hours_available,
        hoursUsed: row.hours_used,
      }))
    )
  } catch (error) {
    console.error('Get cabinet entries error:', error)
    res.status(500).json({ error: 'Failed to fetch cabinet entries' })
  }
})

router.post('/cabinet/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { id, date, cabinetId, hoursAvailable, hoursUsed } = req.body
    const entryId =
      id || `cabinet-${clinicId}-${date}-${cabinetId}-${Math.random().toString(36).slice(2, 10)}`

    const result = await query(
      `INSERT INTO daily_cabinet_usage_entries
       (id, clinic_id, date, cabinet_id, hours_available, hours_used)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [entryId, clinicId, date, cabinetId, hoursAvailable, hoursUsed]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      cabinetId: result.rows[0].cabinet_id,
      hoursAvailable: result.rows[0].hours_available,
      hoursUsed: result.rows[0].hours_used,
    })
  } catch (error) {
    console.error('Create cabinet entry error:', error)
    res.status(500).json({ error: 'Failed to create cabinet entry' })
  }
})

// ================================
// SERVICE TIME ENTRIES
// ================================
router.get('/service-time/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const result = await query(
      `SELECT * FROM daily_service_time_entries WHERE clinic_id = $1 ORDER BY date DESC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        patientName: row.patient_name,
        code: row.code,
        doctorId: row.doctor_id,
        scheduledTime: row.scheduled_time,
        actualStartTime: row.actual_start_time,
        delayReason: row.delay_reason,
      }))
    )
  } catch (error) {
    console.error('Get service time entries error:', error)
    res.status(500).json({ error: 'Failed to fetch service time entries' })
  }
})

router.post('/service-time/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { id, date, patientName, code, doctorId, scheduledTime, actualStartTime, delayReason } =
      req.body
    const entryId =
      id || `service-time-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const result = await query(
      `INSERT INTO daily_service_time_entries
       (id, clinic_id, date, patient_name, code, doctor_id, scheduled_time, actual_start_time, delay_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [entryId, clinicId, date, patientName, code, doctorId, scheduledTime, actualStartTime, delayReason]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      doctorId: result.rows[0].doctor_id,
      scheduledTime: result.rows[0].scheduled_time,
      actualStartTime: result.rows[0].actual_start_time,
      delayReason: result.rows[0].delay_reason,
    })
  } catch (error) {
    console.error('Create service time entry error:', error)
    res.status(500).json({ error: 'Failed to create service time entry' })
  }
})

// ================================
// SOURCE ENTRIES
// ================================
router.get('/source/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const result = await query(
      `SELECT * FROM daily_source_entries WHERE clinic_id = $1 ORDER BY date DESC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        patientName: row.patient_name,
        code: row.code,
        isReferral: row.is_referral,
        sourceId: row.source_id,
        referralName: row.referral_name,
        referralCode: row.referral_code,
        campaignId: row.campaign_id,
      }))
    )
  } catch (error) {
    console.error('Get source entries error:', error)
    res.status(500).json({ error: 'Failed to fetch source entries' })
  }
})

router.post('/source/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { id, date, patientName, code, isReferral, sourceId, referralName, referralCode, campaignId } =
      req.body
    const entryId =
      id || `source-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const result = await query(
      `INSERT INTO daily_source_entries
       (id, clinic_id, date, patient_name, code, is_referral, source_id, referral_name, referral_code, campaign_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [entryId, clinicId, date, patientName, code, isReferral, sourceId, referralName, referralCode, campaignId]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      isReferral: result.rows[0].is_referral,
      sourceId: result.rows[0].source_id,
      referralName: result.rows[0].referral_name,
      referralCode: result.rows[0].referral_code,
      campaignId: result.rows[0].campaign_id,
    })
  } catch (error) {
    console.error('Create source entry error:', error)
    res.status(500).json({ error: 'Failed to create source entry' })
  }
})

export default router
