import { Router } from 'express'
import { query } from '../db.js'
import { getUserPermissions } from '../middleware/permissions.js'

const router = Router()

/**
 * Helper function to check if user can create/edit financial entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditFinancial permission
 */
async function canEditFinancial(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

  // Must belong to the clinic
  if (userClinicId !== clinicId) {
    return false
  }

  // GESTOR_CLINICA and MENTOR always can
  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    return true
  }

  // COLABORADOR needs permission
  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditFinancial === true
  }

  return false
}

/**
 * Helper function to check if user can create/edit consultation entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditConsultations permission
 */
async function canEditConsultations(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

  // Must belong to the clinic
  if (userClinicId !== clinicId) {
    return false
  }

  // GESTOR_CLINICA and MENTOR always can
  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    return true
  }

  // COLABORADOR needs permission
  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditConsultations === true
  }

  return false
}

/**
 * Helper function to check if user can create/edit prospecting entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditProspecting permission
 */
async function canEditProspecting(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

  // Must belong to the clinic
  if (userClinicId !== clinicId) {
    return false
  }

  // GESTOR_CLINICA and MENTOR always can
  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    return true
  }

  // COLABORADOR needs permission
  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditProspecting === true
  }

  return false
}

/**
 * Helper function to check if user can create/edit cabinet entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditCabinets permission
 */
async function canEditCabinets(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

  // Must belong to the clinic
  if (userClinicId !== clinicId) {
    return false
  }

  // GESTOR_CLINICA and MENTOR always can
  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    return true
  }

  // COLABORADOR needs permission
  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditCabinets === true
  }

  return false
}

/**
 * Helper function to check if user can create/edit service time entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditServiceTime permission
 */
async function canEditServiceTime(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

  // Must belong to the clinic
  if (userClinicId !== clinicId) {
    return false
  }

  // GESTOR_CLINICA and MENTOR always can
  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    return true
  }

  // COLABORADOR needs permission
  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditServiceTime === true
  }

  return false
}

/**
 * Helper function to check if user can create/edit source entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditSources permission
 */
async function canEditSources(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

  // Must belong to the clinic
  if (userClinicId !== clinicId) {
    return false
  }

  // GESTOR_CLINICA and MENTOR always can
  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    return true
  }

  // COLABORADOR needs permission
  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditSources === true
  }

  return false
}

/**
 * Helper function to check if user can create/edit consultation control entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditConsultationControl permission
 */
async function canEditConsultationControl(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

  // Must belong to the clinic
  if (userClinicId !== clinicId) {
    return false
  }

  // GESTOR_CLINICA and MENTOR always can
  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    return true
  }

  // COLABORADOR needs permission
  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditConsultationControl === true
  }

  return false
}

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
        doctorId: row.doctor_id || null,
        paymentSourceId: row.payment_source_id || null,
      }))
    )
  } catch (error) {
    console.error('Get financial entries error:', error)
    res.status(500).json({ error: 'Failed to fetch financial entries' })
  }
})

router.post('/financial/:clinicId', async (req, res) => {
  // Check if user can create financial entries
  // GESTOR_CLINICA always can, COLABORADOR needs canEditFinancial permission
  const { clinicId } = req.params
  const hasPermission = await canEditFinancial(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { id, date, patientName, code, categoryId, value, cabinetId, doctorId, paymentSourceId } = req.body
    const entryId =
      id || `financial-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const result = await query(
      `INSERT INTO daily_financial_entries
       (id, clinic_id, date, patient_name, code, category_id, value, cabinet_id, doctor_id, payment_source_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [entryId, clinicId, date, patientName, code, categoryId, value, cabinetId, doctorId || null, paymentSourceId || null]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      categoryId: result.rows[0].category_id,
      value: parseFloat(result.rows[0].value),
      cabinetId: result.rows[0].cabinet_id,
      doctorId: result.rows[0].doctor_id || null,
      paymentSourceId: result.rows[0].payment_source_id || null,
    })
  } catch (error: any) {
    console.error('Create financial entry error:', error)
    res.status(500).json({
      error: 'Failed to create financial entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.put('/financial/:clinicId/:entryId', async (req, res) => {
  // Check if user can edit financial entries
  // GESTOR_CLINICA always can, COLABORADOR needs canEditFinancial permission
  const { clinicId } = req.params
  const hasPermission = await canEditFinancial(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { clinicId, entryId } = req.params
    const { date, patientName, code, categoryId, value, cabinetId, doctorId, paymentSourceId } = req.body

    // Validate required fields
    if (!date || !patientName || !code || !categoryId || !value || !cabinetId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if entry exists
    const checkResult = await query(
      `SELECT id FROM daily_financial_entries WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    // Update entry
    const result = await query(
      `UPDATE daily_financial_entries
       SET date = $1, patient_name = $2, code = $3, category_id = $4, value = $5, 
           cabinet_id = $6, doctor_id = $7, payment_source_id = $8
       WHERE id = $9 AND clinic_id = $10
       RETURNING *`,
      [date, patientName, code, categoryId, value, cabinetId, doctorId || null, paymentSourceId || null, entryId, clinicId]
    )

    res.json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      categoryId: result.rows[0].category_id,
      value: parseFloat(result.rows[0].value),
      cabinetId: result.rows[0].cabinet_id,
      doctorId: result.rows[0].doctor_id || null,
      paymentSourceId: result.rows[0].payment_source_id || null,
    })
  } catch (error: any) {
    console.error('Update financial entry error:', error)
    res.status(500).json({
      error: 'Failed to update financial entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.delete('/financial/:clinicId/:entryId', async (req, res) => {
  // Check if user can delete financial entries
  // GESTOR_CLINICA always can, COLABORADOR needs canEditFinancial permission
  const { clinicId } = req.params
  const hasPermission = await canEditFinancial(req, clinicId)
  
  if (!hasPermission) {
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
        planPresentedValue: row.plan_presented_value ? parseFloat(row.plan_presented_value) : 0,
        planAccepted: row.plan_accepted,
        planAcceptedAt: row.plan_accepted_at,
        planValue: row.plan_value ? parseFloat(row.plan_value) : 0,
        sourceId: row.source_id || null,
        isReferral: row.is_referral || false,
        referralName: row.referral_name || null,
        referralCode: row.referral_code || null,
        campaignId: row.campaign_id || null,
        doctorId: row.doctor_id || null,
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
      planPresentedValue: row.plan_presented_value ? parseFloat(row.plan_presented_value) : 0,
      planAccepted: row.plan_accepted,
      planAcceptedAt: row.plan_accepted_at,
      planValue: row.plan_value ? parseFloat(row.plan_value) : 0,
      sourceId: row.source_id || null,
      isReferral: row.is_referral || false,
      referralName: row.referral_name || null,
      referralCode: row.referral_code || null,
      campaignId: row.campaign_id || null,
      doctorId: row.doctor_id || null,
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
      planPresentedValue,
      planAccepted,
      planAcceptedAt,
      planValue,
      sourceId,
      isReferral,
      referralName,
      referralCode,
      campaignId,
      doctorId,
    } = req.body

    if (!code || !/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 1-6 digits' })
    }

    const entryId = `consultation-${clinicId}-${code}`

    const result = await query(
      `INSERT INTO daily_consultation_entries
       (id, clinic_id, date, patient_name, code,
        plan_created, plan_created_at,
        plan_presented, plan_presented_at, plan_presented_value,
        plan_accepted, plan_accepted_at,
        plan_value,
        source_id, is_referral, referral_name, referral_code, campaign_id, doctor_id)
       VALUES ($1, $2, $3, $4, $5,
        $6, $7,
        $8, $9, $10,
        $11, $12,
        $13,
        $14, $15, $16, $17, $18, $19)
       ON CONFLICT (clinic_id, code) DO UPDATE SET
        date = EXCLUDED.date,
        patient_name = EXCLUDED.patient_name,
        plan_created = EXCLUDED.plan_created,
        plan_created_at = EXCLUDED.plan_created_at,
        plan_presented = EXCLUDED.plan_presented,
        plan_presented_at = EXCLUDED.plan_presented_at,
        plan_presented_value = EXCLUDED.plan_presented_value,
        plan_accepted = EXCLUDED.plan_accepted,
        plan_accepted_at = EXCLUDED.plan_accepted_at,
        plan_value = EXCLUDED.plan_value,
        source_id = EXCLUDED.source_id,
        is_referral = EXCLUDED.is_referral,
        referral_name = EXCLUDED.referral_name,
        referral_code = EXCLUDED.referral_code,
        campaign_id = EXCLUDED.campaign_id,
        doctor_id = EXCLUDED.doctor_id
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
        planPresentedValue || 0,
        planAccepted,
        planAcceptedAt || null,
        planValue || 0,
        sourceId || null,
        isReferral || false,
        referralName || null,
        referralCode || null,
        campaignId || null,
        doctorId || null,
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
      planPresentedValue: result.rows[0].plan_presented_value ? parseFloat(result.rows[0].plan_presented_value) : 0,
      planAccepted: result.rows[0].plan_accepted,
      planAcceptedAt: result.rows[0].plan_accepted_at,
      planValue: result.rows[0].plan_value ? parseFloat(result.rows[0].plan_value) : 0,
      sourceId: result.rows[0].source_id || null,
      isReferral: result.rows[0].is_referral || false,
      referralName: result.rows[0].referral_name || null,
      referralCode: result.rows[0].referral_code || null,
      campaignId: result.rows[0].campaign_id || null,
      doctorId: result.rows[0].doctor_id || null,
    })
  } catch (error: any) {
    console.error('Create consultation entry error:', error)
    res.status(500).json({
      error: 'Failed to create consultation entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.put('/consultation/:clinicId/:entryId', async (req, res) => {
  // Check if user can edit consultation entries
  const { clinicId } = req.params
  const hasPermission = await canEditConsultations(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { clinicId, entryId } = req.params
    const {
      date,
      patientName,
      code,
      planCreated,
      planCreatedAt,
      planPresented,
      planPresentedAt,
      planPresentedValue,
      planAccepted,
      planAcceptedAt,
      planValue,
      sourceId,
      isReferral,
      referralName,
      referralCode,
      campaignId,
      doctorId,
    } = req.body

    // Validate required fields
    if (!date || !patientName || !code || !/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Missing or invalid required fields' })
    }

    // Check if entry exists
    const checkResult = await query(
      `SELECT id FROM daily_consultation_entries WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    // Update entry
    const result = await query(
      `UPDATE daily_consultation_entries
       SET date = $1, patient_name = $2, code = $3,
           plan_created = $4, plan_created_at = $5,
           plan_presented = $6, plan_presented_at = $7, plan_presented_value = $8,
           plan_accepted = $9, plan_accepted_at = $10,
           plan_value = $11,
           source_id = $12, is_referral = $13, referral_name = $14, referral_code = $15, campaign_id = $16,
           doctor_id = $17
       WHERE id = $18 AND clinic_id = $19
       RETURNING *`,
      [
        date,
        patientName,
        code,
        planCreated || false,
        planCreatedAt || null,
        planPresented || false,
        planPresentedAt || null,
        planPresentedValue || 0,
        planAccepted || false,
        planAcceptedAt || null,
        planValue || 0,
        sourceId || null,
        isReferral || false,
        referralName || null,
        referralCode || null,
        campaignId || null,
        doctorId || null,
        entryId,
        clinicId,
      ]
    )

    res.json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      planCreated: result.rows[0].plan_created,
      planCreatedAt: result.rows[0].plan_created_at,
      planPresented: result.rows[0].plan_presented,
      planPresentedAt: result.rows[0].plan_presented_at,
      planPresentedValue: result.rows[0].plan_presented_value ? parseFloat(result.rows[0].plan_presented_value) : 0,
      planAccepted: result.rows[0].plan_accepted,
      planAcceptedAt: result.rows[0].plan_accepted_at,
      planValue: result.rows[0].plan_value ? parseFloat(result.rows[0].plan_value) : 0,
      sourceId: result.rows[0].source_id || null,
      isReferral: result.rows[0].is_referral || false,
      referralName: result.rows[0].referral_name || null,
      referralCode: result.rows[0].referral_code || null,
      campaignId: result.rows[0].campaign_id || null,
      doctorId: result.rows[0].doctor_id || null,
    })
  } catch (error: any) {
    console.error('Update consultation entry error:', error)
    res.status(500).json({
      error: 'Failed to update consultation entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.delete('/consultation/:clinicId/:entryId', async (req, res) => {
  // Check if user can delete consultation entries
  const { clinicId } = req.params
  const hasPermission = await canEditConsultations(req, clinicId)
  
  if (!hasPermission) {
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
// Get all prospecting entries for a clinic
router.get('/prospecting/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const result = await query(
      `SELECT * FROM daily_prospecting_entries WHERE clinic_id = $1 ORDER BY date DESC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        scheduled: row.scheduled,
        email: row.email,
        sms: row.sms,
        whatsapp: row.whatsapp,
        instagram: row.instagram,
        phone: row.phone || 0,
      }))
    )
  } catch (error) {
    console.error('Get prospecting entries error:', error)
    res.status(500).json({ error: 'Failed to fetch prospecting entries' })
  }
})

// Get single prospecting entry by date
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
      phone: row.phone || 0,
    })
  } catch (error) {
    console.error('Get prospecting entry error:', error)
    res.status(500).json({ error: 'Failed to fetch prospecting entry' })
  }
})

router.post('/prospecting/:clinicId', async (req, res) => {
  // Check if user can create prospecting entries
  const { clinicId } = req.params
  const hasPermission = await canEditProspecting(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { id, date, scheduled, email, sms, whatsapp, instagram, phone } = req.body
    const entryId = id || `prospecting-${clinicId}-${date}`

    const result = await query(
      `INSERT INTO daily_prospecting_entries
       (id, clinic_id, date, scheduled, email, sms, whatsapp, instagram, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (clinic_id, date) DO UPDATE SET
         scheduled = EXCLUDED.scheduled,
         email = EXCLUDED.email,
         sms = EXCLUDED.sms,
         whatsapp = EXCLUDED.whatsapp,
         instagram = EXCLUDED.instagram,
         phone = EXCLUDED.phone
       RETURNING *`,
      [entryId, clinicId, date, scheduled, email, sms, whatsapp, instagram, phone || 0]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      scheduled: result.rows[0].scheduled,
      email: result.rows[0].email,
      sms: result.rows[0].sms,
      whatsapp: result.rows[0].whatsapp,
      instagram: result.rows[0].instagram,
      phone: result.rows[0].phone,
    })
  } catch (error: any) {
    console.error('Create prospecting entry error:', error)
    res.status(500).json({
      error: 'Failed to create prospecting entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.delete('/prospecting/:clinicId/:entryId', async (req, res) => {
  // Only GESTOR can delete entries
  if (req.user?.role !== 'GESTOR_CLINICA' || req.user?.clinicId !== req.params.clinicId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { clinicId, entryId } = req.params
    const result = await query(
      `DELETE FROM daily_prospecting_entries WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [entryId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Delete prospecting entry error:', error)
    res.status(500).json({ error: 'Failed to delete prospecting entry' })
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
  // Check if user can create cabinet entries
  const { clinicId } = req.params
  const hasPermission = await canEditCabinets(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
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
  } catch (error: any) {
    console.error('Create cabinet entry error:', error)
    res.status(500).json({
      error: 'Failed to create cabinet entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.delete('/cabinet/:clinicId/:entryId', async (req, res) => {
  // Only GESTOR can delete entries
  if (req.user?.role !== 'GESTOR_CLINICA' || req.user?.clinicId !== req.params.clinicId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { clinicId, entryId } = req.params
    const result = await query(
      `DELETE FROM daily_cabinet_usage_entries WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [entryId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Delete cabinet entry error:', error)
    res.status(500).json({ error: 'Failed to delete cabinet entry' })
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
  // Check if user can create service time entries
  const { clinicId } = req.params
  const hasPermission = await canEditServiceTime(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
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
  } catch (error: any) {
    console.error('Create service time entry error:', error)
    res.status(500).json({
      error: 'Failed to create service time entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.delete('/service-time/:clinicId/:entryId', async (req, res) => {
  // Only GESTOR can delete entries
  if (req.user?.role !== 'GESTOR_CLINICA' || req.user?.clinicId !== req.params.clinicId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { clinicId, entryId } = req.params
    const result = await query(
      `DELETE FROM daily_service_time_entries WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [entryId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Delete service time entry error:', error)
    res.status(500).json({ error: 'Failed to delete service time entry' })
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
  // Check if user can create source entries
  const { clinicId } = req.params
  const hasPermission = await canEditSources(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
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
  } catch (error: any) {
    console.error('Create source entry error:', error)
    res.status(500).json({
      error: 'Failed to create source entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.delete('/source/:clinicId/:entryId', async (req, res) => {
  // Only GESTOR can delete entries
  if (req.user?.role !== 'GESTOR_CLINICA' || req.user?.clinicId !== req.params.clinicId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { clinicId, entryId } = req.params
    const result = await query(
      `DELETE FROM daily_source_entries WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [entryId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Delete source entry error:', error)
    res.status(500).json({ error: 'Failed to delete source entry' })
  }
})

// ================================
// CONSULTATION CONTROL ENTRIES
// ================================
router.get('/consultation-control/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const result = await query(
      `SELECT * FROM daily_consultation_control_entries WHERE clinic_id = $1 ORDER BY date DESC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        noShow: row.no_show,
        rescheduled: row.rescheduled,
        cancelled: row.cancelled,
        oldPatientBooking: row.old_patient_booking,
      }))
    )
  } catch (error) {
    console.error('Get consultation control entries error:', error)
    res.status(500).json({ error: 'Failed to fetch consultation control entries' })
  }
})

// Get single consultation control entry by date
router.get('/consultation-control/:clinicId/:date', async (req, res) => {
  try {
    const { clinicId, date } = req.params
    const result = await query(
      `SELECT * FROM daily_consultation_control_entries WHERE clinic_id = $1 AND date = $2`,
      [clinicId, date]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation control entry not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      date: row.date,
      noShow: row.no_show,
      rescheduled: row.rescheduled,
      cancelled: row.cancelled,
      oldPatientBooking: row.old_patient_booking,
    })
  } catch (error) {
    console.error('Get consultation control entry error:', error)
    res.status(500).json({ error: 'Failed to fetch consultation control entry' })
  }
})

router.post('/consultation-control/:clinicId', async (req, res) => {
  // Check if user can create consultation control entries
  const { clinicId } = req.params
  const hasPermission = await canEditConsultationControl(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { id, date, noShow, rescheduled, cancelled, oldPatientBooking } = req.body
    const entryId = id || `consultation-control-${clinicId}-${date}`

    const result = await query(
      `INSERT INTO daily_consultation_control_entries
       (id, clinic_id, date, no_show, rescheduled, cancelled, old_patient_booking)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (clinic_id, date) DO UPDATE SET
         no_show = EXCLUDED.no_show,
         rescheduled = EXCLUDED.rescheduled,
         cancelled = EXCLUDED.cancelled,
         old_patient_booking = EXCLUDED.old_patient_booking
       RETURNING *`,
      [entryId, clinicId, date, noShow || 0, rescheduled || 0, cancelled || 0, oldPatientBooking || 0]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      noShow: result.rows[0].no_show,
      rescheduled: result.rows[0].rescheduled,
      cancelled: result.rows[0].cancelled,
      oldPatientBooking: result.rows[0].old_patient_booking,
    })
  } catch (error: any) {
    console.error('Create consultation control entry error:', error)
    res.status(500).json({
      error: 'Failed to create consultation control entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.delete('/consultation-control/:clinicId/:entryId', async (req, res) => {
  // Only GESTOR can delete entries
  if (req.user?.role !== 'GESTOR_CLINICA' || req.user?.clinicId !== req.params.clinicId) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { clinicId, entryId } = req.params
    const result = await query(
      `DELETE FROM daily_consultation_control_entries WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [entryId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Delete consultation control entry error:', error)
    res.status(500).json({ error: 'Failed to delete consultation control entry' })
  }
})

export default router
