import { Router } from 'express'
import { query, getClient } from '../db.js'

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
  try {
    const { clinicId } = req.params
    const { date, patientName, code, categoryId, value, cabinetId } = req.body

    const result = await query(
      `INSERT INTO daily_financial_entries
       (clinic_id, date, patient_name, code, category_id, value, cabinet_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [clinicId, date, patientName, code, categoryId, value, cabinetId]
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
        planPresented: row.plan_presented,
        planAccepted: row.plan_accepted,
        planValue: parseFloat(row.plan_value),
      }))
    )
  } catch (error) {
    console.error('Get consultation entries error:', error)
    res.status(500).json({ error: 'Failed to fetch consultation entries' })
  }
})

router.post('/consultation/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { date, patientName, code, planCreated, planPresented, planAccepted, planValue } =
      req.body

    const result = await query(
      `INSERT INTO daily_consultation_entries
       (clinic_id, date, patient_name, code, plan_created, plan_presented, plan_accepted, plan_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [clinicId, date, patientName, code, planCreated, planPresented, planAccepted, planValue]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      planCreated: result.rows[0].plan_created,
      planPresented: result.rows[0].plan_presented,
      planAccepted: result.rows[0].plan_accepted,
      planValue: parseFloat(result.rows[0].plan_value),
    })
  } catch (error) {
    console.error('Create consultation entry error:', error)
    res.status(500).json({ error: 'Failed to create consultation entry' })
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
    const { date, scheduled, email, sms, whatsapp, instagram } = req.body

    const result = await query(
      `INSERT INTO daily_prospecting_entries
       (clinic_id, date, scheduled, email, sms, whatsapp, instagram)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (clinic_id, date) DO UPDATE SET
         scheduled = EXCLUDED.scheduled,
         email = EXCLUDED.email,
         sms = EXCLUDED.sms,
         whatsapp = EXCLUDED.whatsapp,
         instagram = EXCLUDED.instagram
       RETURNING *`,
      [clinicId, date, scheduled, email, sms, whatsapp, instagram]
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
    const { date, cabinetId, hoursAvailable, hoursUsed } = req.body

    const result = await query(
      `INSERT INTO daily_cabinet_usage_entries
       (clinic_id, date, cabinet_id, hours_available, hours_used)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [clinicId, date, cabinetId, hoursAvailable, hoursUsed]
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
    const { date, patientName, code, doctorId, scheduledTime, actualStartTime, delayReason } =
      req.body

    const result = await query(
      `INSERT INTO daily_service_time_entries
       (clinic_id, date, patient_name, code, doctor_id, scheduled_time, actual_start_time, delay_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [clinicId, date, patientName, code, doctorId, scheduledTime, actualStartTime, delayReason]
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
    const { date, patientName, code, isReferral, sourceId, referralName, referralCode, campaignId } =
      req.body

    const result = await query(
      `INSERT INTO daily_source_entries
       (clinic_id, date, patient_name, code, is_referral, source_id, referral_name, referral_code, campaign_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [clinicId, date, patientName, code, isReferral, sourceId, referralName, referralCode, campaignId]
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
