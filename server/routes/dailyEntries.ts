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

/**
 * Helper function to check if user can create/edit aligner entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditAligners permission
 */
async function canEditAligners(req: any, clinicId: string): Promise<boolean> {
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
    return permissions.canEditAligners === true
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
      // Retorna 200 com null em vez de 404 para buscas opcionais (evita erro no console)
      return res.json(null)
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
      // Retorna 200 com null em vez de 404 para buscas opcionais (evita erro no console)
      return res.json(null)
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

// ================================
// ALIGNER ENTRIES
// ================================
router.get('/aligner/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const result = await query(
      `SELECT * FROM daily_aligner_entries WHERE clinic_id = $1 ORDER BY date DESC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        patientName: row.patient_name,
        code: row.code,
        alignerBrandId: row.aligner_brand_id,
        dataInsertionActive: row.data_insertion_active,
        dataInsertionActivatedAt: row.data_insertion_activated_at,
        hasScanner: row.has_scanner,
        scannerCollectionDate: row.scanner_collection_date,
        hasPhotos: row.has_photos,
        photosStatus: row.photos_status,
        hasOrtho: row.has_ortho,
        orthoStatus: row.ortho_status,
        hasTele: row.has_tele,
        teleStatus: row.tele_status,
        hasCbct: row.has_cbct,
        cbctStatus: row.cbct_status,
        registrationCreated: row.registration_created,
        registrationCreatedAt: row.registration_created_at,
        cckCreated: row.cck_created,
        cckCreatedAt: row.cck_created_at,
        awaitingPlan: row.awaiting_plan,
        awaitingPlanAt: row.awaiting_plan_at,
        awaitingApproval: row.awaiting_approval,
        awaitingApprovalAt: row.awaiting_approval_at,
        approved: row.approved,
        approvedAt: row.approved_at,
        expirationDate: row.expiration_date,
        observations: row.observations,
      }))
    )
  } catch (error) {
    console.error('Get aligner entries error:', error)
    res.status(500).json({ error: 'Failed to fetch aligner entries' })
  }
})

// Get aligner entry by patient code (1 registo por paciente)
router.get('/aligner/:clinicId/code/:code', async (req, res) => {
  try {
    const { clinicId, code } = req.params

    if (!/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 1-6 digits' })
    }

    const result = await query(
      `SELECT * FROM daily_aligner_entries WHERE clinic_id = $1 AND code = $2`,
      [clinicId, code]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Aligner entry not found' })
    }

    const row = result.rows[0]
    return res.json({
      id: row.id,
      date: row.date,
      patientName: row.patient_name,
      code: row.code,
      alignerBrandId: row.aligner_brand_id,
      dataInsertionActive: row.data_insertion_active,
      dataInsertionActivatedAt: row.data_insertion_activated_at,
      hasScanner: row.has_scanner,
      scannerCollectionDate: row.scanner_collection_date,
      hasPhotos: row.has_photos,
      photosStatus: row.photos_status,
      hasOrtho: row.has_ortho,
      orthoStatus: row.ortho_status,
      hasTele: row.has_tele,
      teleStatus: row.tele_status,
      hasCbct: row.has_cbct,
      cbctStatus: row.cbct_status,
      registrationCreated: row.registration_created,
      registrationCreatedAt: row.registration_created_at,
      cckCreated: row.cck_created,
      cckCreatedAt: row.cck_created_at,
      awaitingPlan: row.awaiting_plan,
      awaitingPlanAt: row.awaiting_plan_at,
      awaitingApproval: row.awaiting_approval,
      awaitingApprovalAt: row.awaiting_approval_at,
      approved: row.approved,
      approvedAt: row.approved_at,
      expirationDate: row.expiration_date,
      observations: row.observations,
    })
  } catch (error) {
    console.error('Get aligner by code error:', error)
    res.status(500).json({ error: 'Failed to fetch aligner entry' })
  }
})

router.post('/aligner/:clinicId', async (req, res) => {
  // Check if user can create aligner entries
  const { clinicId } = req.params
  const hasPermission = await canEditAligners(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { clinicId } = req.params
    const {
      date,
      patientName,
      code,
      alignerBrandId,
      dataInsertionActive,
      dataInsertionActivatedAt,
      hasScanner,
      scannerCollectionDate,
      hasPhotos,
      photosStatus,
      hasOrtho,
      orthoStatus,
      hasTele,
      teleStatus,
      hasCbct,
      cbctStatus,
      registrationCreated,
      registrationCreatedAt,
      cckCreated,
      cckCreatedAt,
      awaitingPlan,
      awaitingPlanAt,
      awaitingApproval,
      awaitingApprovalAt,
      approved,
      approvedAt,
      expirationDate,
      observations,
    } = req.body

    if (!code || !/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 1-6 digits' })
    }

    if (!alignerBrandId) {
      return res.status(400).json({ error: 'Aligner brand is required' })
    }

    const entryId = `aligner-${clinicId}-${code}`

    const result = await query(
      `INSERT INTO daily_aligner_entries
       (id, clinic_id, date, patient_name, code, aligner_brand_id,
        data_insertion_active, data_insertion_activated_at,
        has_scanner, scanner_collection_date,
        has_photos, photos_status,
        has_ortho, ortho_status,
        has_tele, tele_status,
        has_cbct, cbct_status,
        registration_created, registration_created_at,
        cck_created, cck_created_at,
        awaiting_plan, awaiting_plan_at,
        awaiting_approval, awaiting_approval_at,
        approved, approved_at,
        expiration_date,
        observations)
       VALUES ($1, $2, $3, $4, $5, $6,
        $7, $8,
        $9, $10,
        $11, $12,
        $13, $14,
        $15, $16,
        $17, $18,
        $19, $20,
        $21, $22,
        $23, $24,
        $25, $26,
        $27, $28,
        $29, $30)
       ON CONFLICT (clinic_id, code) DO UPDATE SET
        date = EXCLUDED.date,
        patient_name = EXCLUDED.patient_name,
        aligner_brand_id = EXCLUDED.aligner_brand_id,
        data_insertion_active = EXCLUDED.data_insertion_active,
        data_insertion_activated_at = EXCLUDED.data_insertion_activated_at,
        has_scanner = EXCLUDED.has_scanner,
        scanner_collection_date = EXCLUDED.scanner_collection_date,
        has_photos = EXCLUDED.has_photos,
        photos_status = EXCLUDED.photos_status,
        has_ortho = EXCLUDED.has_ortho,
        ortho_status = EXCLUDED.ortho_status,
        has_tele = EXCLUDED.has_tele,
        tele_status = EXCLUDED.tele_status,
        has_cbct = EXCLUDED.has_cbct,
        cbct_status = EXCLUDED.cbct_status,
        registration_created = EXCLUDED.registration_created,
        registration_created_at = EXCLUDED.registration_created_at,
        cck_created = EXCLUDED.cck_created,
        cck_created_at = EXCLUDED.cck_created_at,
        awaiting_plan = EXCLUDED.awaiting_plan,
        awaiting_plan_at = EXCLUDED.awaiting_plan_at,
        awaiting_approval = EXCLUDED.awaiting_approval,
        awaiting_approval_at = EXCLUDED.awaiting_approval_at,
        approved = EXCLUDED.approved,
        approved_at = EXCLUDED.approved_at,
        expiration_date = EXCLUDED.expiration_date,
        observations = EXCLUDED.observations
       RETURNING *`,
      [
        entryId,
        clinicId,
        date,
        patientName,
        code,
        alignerBrandId,
        dataInsertionActive || false,
        dataInsertionActivatedAt || null,
        hasScanner || false,
        scannerCollectionDate || null,
        hasPhotos || false,
        photosStatus || null,
        hasOrtho || false,
        orthoStatus || null,
        hasTele || false,
        teleStatus || null,
        hasCbct || false,
        cbctStatus || null,
        registrationCreated || false,
        registrationCreatedAt || null,
        cckCreated || false,
        cckCreatedAt || null,
        awaitingPlan || false,
        awaitingPlanAt || null,
        awaitingApproval || false,
        awaitingApprovalAt || null,
        approved || false,
        approvedAt || null,
        expirationDate || null,
        observations || null,
      ]
    )

    const row = result.rows[0]
    res.status(201).json({
      id: row.id,
      date: row.date,
      patientName: row.patient_name,
      code: row.code,
      alignerBrandId: row.aligner_brand_id,
      dataInsertionActive: row.data_insertion_active,
      dataInsertionActivatedAt: row.data_insertion_activated_at,
      hasScanner: row.has_scanner,
      scannerCollectionDate: row.scanner_collection_date,
      hasPhotos: row.has_photos,
      photosStatus: row.photos_status,
      hasOrtho: row.has_ortho,
      orthoStatus: row.ortho_status,
      hasTele: row.has_tele,
      teleStatus: row.tele_status,
      hasCbct: row.has_cbct,
      cbctStatus: row.cbct_status,
      registrationCreated: row.registration_created,
      registrationCreatedAt: row.registration_created_at,
      cckCreated: row.cck_created,
      cckCreatedAt: row.cck_created_at,
      awaitingPlan: row.awaiting_plan,
      awaitingPlanAt: row.awaiting_plan_at,
      awaitingApproval: row.awaiting_approval,
      awaitingApprovalAt: row.awaiting_approval_at,
      approved: row.approved,
      approvedAt: row.approved_at,
      expirationDate: row.expiration_date,
      observations: row.observations,
    })
  } catch (error: any) {
    console.error('Create aligner entry error:', error)
    res.status(500).json({
      error: 'Failed to create aligner entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.put('/aligner/:clinicId/:entryId', async (req, res) => {
  // Check if user can edit aligner entries
  const { clinicId } = req.params
  const hasPermission = await canEditAligners(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { clinicId, entryId } = req.params
    const {
      date,
      patientName,
      code,
      alignerBrandId,
      dataInsertionActive,
      dataInsertionActivatedAt,
      hasScanner,
      scannerCollectionDate,
      hasPhotos,
      photosStatus,
      hasOrtho,
      orthoStatus,
      hasTele,
      teleStatus,
      hasCbct,
      cbctStatus,
      registrationCreated,
      registrationCreatedAt,
      cckCreated,
      cckCreatedAt,
      awaitingPlan,
      awaitingPlanAt,
      awaitingApproval,
      awaitingApprovalAt,
      approved,
      approvedAt,
      expirationDate,
      observations,
    } = req.body

    // Validate required fields
    if (!date || !patientName || !code || !/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Missing or invalid required fields' })
    }

    if (!alignerBrandId) {
      return res.status(400).json({ error: 'Aligner brand is required' })
    }

    // Check if entry exists
    const checkResult = await query(
      `SELECT id FROM daily_aligner_entries WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    // Update entry
    const result = await query(
      `UPDATE daily_aligner_entries
       SET date = $1, patient_name = $2, code = $3, aligner_brand_id = $4,
           data_insertion_active = $5, data_insertion_activated_at = $6,
           has_scanner = $7, scanner_collection_date = $8,
           has_photos = $9, photos_status = $10,
           has_ortho = $11, ortho_status = $12,
           has_tele = $13, tele_status = $14,
           has_cbct = $15, cbct_status = $16,
           registration_created = $17, registration_created_at = $18,
           cck_created = $19, cck_created_at = $20,
           awaiting_plan = $21, awaiting_plan_at = $22,
           awaiting_approval = $23, awaiting_approval_at = $24,
           approved = $25, approved_at = $26,
           expiration_date = $27,
           observations = $28
       WHERE id = $29 AND clinic_id = $30
       RETURNING *`,
      [
        date,
        patientName,
        code,
        alignerBrandId,
        dataInsertionActive || false,
        dataInsertionActivatedAt || null,
        hasScanner || false,
        scannerCollectionDate || null,
        hasPhotos || false,
        photosStatus || null,
        hasOrtho || false,
        orthoStatus || null,
        hasTele || false,
        teleStatus || null,
        hasCbct || false,
        cbctStatus || null,
        registrationCreated || false,
        registrationCreatedAt || null,
        cckCreated || false,
        cckCreatedAt || null,
        awaitingPlan || false,
        awaitingPlanAt || null,
        awaitingApproval || false,
        awaitingApprovalAt || null,
        approved || false,
        approvedAt || null,
        expirationDate || null,
        observations || null,
        entryId,
        clinicId,
      ]
    )

    const row = result.rows[0]
    res.json({
      id: row.id,
      date: row.date,
      patientName: row.patient_name,
      code: row.code,
      alignerBrandId: row.aligner_brand_id,
      dataInsertionActive: row.data_insertion_active,
      dataInsertionActivatedAt: row.data_insertion_activated_at,
      hasScanner: row.has_scanner,
      scannerCollectionDate: row.scanner_collection_date,
      hasPhotos: row.has_photos,
      photosStatus: row.photos_status,
      hasOrtho: row.has_ortho,
      orthoStatus: row.ortho_status,
      hasTele: row.has_tele,
      teleStatus: row.tele_status,
      hasCbct: row.has_cbct,
      cbctStatus: row.cbct_status,
      registrationCreated: row.registration_created,
      registrationCreatedAt: row.registration_created_at,
      cckCreated: row.cck_created,
      cckCreatedAt: row.cck_created_at,
      awaitingPlan: row.awaiting_plan,
      awaitingPlanAt: row.awaiting_plan_at,
      awaitingApproval: row.awaiting_approval,
      awaitingApprovalAt: row.awaiting_approval_at,
      approved: row.approved,
      approvedAt: row.approved_at,
    })
  } catch (error: any) {
    console.error('Update aligner entry error:', error)
    res.status(500).json({
      error: 'Failed to update aligner entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.delete('/aligner/:clinicId/:entryId', async (req, res) => {
  // Check if user can delete aligner entries
  const { clinicId } = req.params
  const hasPermission = await canEditAligners(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { clinicId, entryId } = req.params
    const result = await query(
      `DELETE FROM daily_aligner_entries WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [entryId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Delete aligner entry error:', error)
    res.status(500).json({ error: 'Failed to delete aligner entry' })
  }
})

/**
 * Helper function to check if user can view orders/suppliers
 * GESTOR_CLINICA and MENTOR always can, COLABORADOR needs canViewOrders/canViewSuppliers or canEditOrders permission
 */
async function canViewOrders(req: any, clinicId: string): Promise<boolean> {
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

  // COLABORADOR needs permission (view or edit)
  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canViewOrders === true || permissions.canEditOrders === true
  }

  return false
}

async function canViewSuppliers(req: any, clinicId: string): Promise<boolean> {
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

  // COLABORADOR needs permission (view or edit)
  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canViewSuppliers === true || permissions.canEditOrders === true
  }

  return false
}

/**
 * Helper function to check if user can create/edit order entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditOrders permission
 */
async function canEditOrders(req: any, clinicId: string): Promise<boolean> {
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
    return permissions.canEditOrders === true
  }

  return false
}

// ================================
// SUPPLIERS
// ================================
router.get('/suppliers/:clinicId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canViewSuppliers(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { search } = req.query
    
    let queryStr = `SELECT * FROM suppliers WHERE clinic_id = $1`
    const params: any[] = [clinicId]
    
    if (search && typeof search === 'string' && search.trim()) {
      queryStr += ` AND (name ILIKE $2 OR nif ILIKE $2)`
      params.push(`%${search.trim()}%`)
    }
    
    queryStr += ` ORDER BY name ASC`
    
    const result = await query(queryStr, params)
    
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        clinicId: row.clinic_id,
        name: row.name,
        nif: row.nif || null,
        address: row.address || null,
        postalCode: row.postal_code || null,
        city: row.city || null,
        phone: row.phone || null,
        email: row.email || null,
        website: row.website || null,
        notes: row.notes || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    )
  } catch (error) {
    console.error('Get suppliers error:', error)
    res.status(500).json({ error: 'Failed to fetch suppliers' })
  }
})

router.get('/suppliers/:clinicId/:supplierId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canViewSuppliers(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { supplierId } = req.params
    const result = await query(
      `SELECT * FROM suppliers WHERE id = $1 AND clinic_id = $2`,
      [supplierId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      nif: row.nif || null,
      address: row.address || null,
      postalCode: row.postal_code || null,
      city: row.city || null,
      phone: row.phone || null,
      email: row.email || null,
      website: row.website || null,
      notes: row.notes || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error) {
    console.error('Get supplier error:', error)
    res.status(500).json({ error: 'Failed to fetch supplier' })
  }
})

router.post('/suppliers/:clinicId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { name, nif, address, postalCode, city, phone, email, website, notes } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    
    const supplierId = `supplier-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    
    const result = await query(
      `INSERT INTO suppliers
       (id, clinic_id, name, nif, address, postal_code, city, phone, email, website, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        supplierId,
        clinicId,
        name.trim(),
        nif?.trim() || null,
        address?.trim() || null,
        postalCode?.trim() || null,
        city?.trim() || null,
        phone?.trim() || null,
        email?.trim() || null,
        website?.trim() || null,
        notes?.trim() || null,
      ]
    )
    
    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      nif: row.nif || null,
      address: row.address || null,
      postalCode: row.postal_code || null,
      city: row.city || null,
      phone: row.phone || null,
      email: row.email || null,
      website: row.website || null,
      notes: row.notes || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Create supplier error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Supplier with this name already exists' })
    }
    res.status(500).json({ error: 'Failed to create supplier', message: error.message })
  }
})

router.put('/suppliers/:clinicId/:supplierId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { supplierId } = req.params
    const { name, nif, address, postalCode, city, phone, email, website, notes } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    
    const result = await query(
      `UPDATE suppliers
       SET name = $1, nif = $2, address = $3, postal_code = $4, city = $5, 
           phone = $6, email = $7, website = $8, notes = $9
       WHERE id = $10 AND clinic_id = $11
       RETURNING *`,
      [
        name.trim(),
        nif?.trim() || null,
        address?.trim() || null,
        postalCode?.trim() || null,
        city?.trim() || null,
        phone?.trim() || null,
        email?.trim() || null,
        website?.trim() || null,
        notes?.trim() || null,
        supplierId,
        clinicId,
      ]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    
    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      nif: row.nif || null,
      address: row.address || null,
      postalCode: row.postal_code || null,
      city: row.city || null,
      phone: row.phone || null,
      email: row.email || null,
      website: row.website || null,
      notes: row.notes || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Update supplier error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Supplier with this name already exists' })
    }
    res.status(500).json({ error: 'Failed to update supplier', message: error.message })
  }
})

router.delete('/suppliers/:clinicId/:supplierId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { supplierId } = req.params
    
    // Check if supplier has orders
    const ordersCheck = await query(
      `SELECT COUNT(*) as count FROM daily_order_entries WHERE supplier_id = $1`,
      [supplierId]
    )
    
    if (parseInt(ordersCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete supplier with existing orders',
        message: 'Please delete or reassign orders before deleting this supplier'
      })
    }
    
    const result = await query(
      `DELETE FROM suppliers WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [supplierId, clinicId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' })
    }
    
    res.json({ message: 'Supplier deleted successfully' })
  } catch (error) {
    console.error('Delete supplier error:', error)
    res.status(500).json({ error: 'Failed to delete supplier' })
  }
})

// ================================
// ORDERS
// ================================
router.get('/orders/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { startDate, endDate, supplierId } = req.query
    
    let queryStr = `
      SELECT o.*, s.name as supplier_name
      FROM daily_order_entries o
      JOIN suppliers s ON o.supplier_id = s.id
      WHERE o.clinic_id = $1
    `
    const params: any[] = [clinicId]
    let paramIndex = 2
    
    if (startDate) {
      queryStr += ` AND o.date >= $${paramIndex}`
      params.push(startDate)
      paramIndex++
    }
    
    if (endDate) {
      queryStr += ` AND o.date <= $${paramIndex}`
      params.push(endDate)
      paramIndex++
    }
    
    if (supplierId) {
      queryStr += ` AND o.supplier_id = $${paramIndex}`
      params.push(supplierId)
      paramIndex++
    }
    
    queryStr += ` ORDER BY o.date DESC, o.created_at DESC`
    
    const result = await query(queryStr, params)
    
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        clinicId: row.clinic_id,
        date: row.date,
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        orderNumber: row.order_number || null,
        requested: row.requested,
        requestedAt: row.requested_at || null,
        confirmed: row.confirmed,
        confirmedAt: row.confirmed_at || null,
        inProduction: row.in_production,
        inProductionAt: row.in_production_at || null,
        ready: row.ready,
        readyAt: row.ready_at || null,
        delivered: row.delivered,
        deliveredAt: row.delivered_at || null,
        cancelled: row.cancelled,
        cancelledAt: row.cancelled_at || null,
        observations: row.observations || null,
        total: row.total ? parseFloat(row.total) : 0,
        approved: row.approved || false,
        approvedAt: row.approved_at || null,
        approvedBy: row.approved_by || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    )
  } catch (error) {
    console.error('Get orders error:', error)
    res.status(500).json({ error: 'Failed to fetch orders' })
  }
})

router.get('/orders/:clinicId/:orderId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canViewOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { orderId } = req.params
    const result = await query(
      `SELECT o.*, s.name as supplier_name
       FROM daily_order_entries o
       JOIN suppliers s ON o.supplier_id = s.id
       WHERE o.id = $1 AND o.clinic_id = $2`,
      [orderId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }

    const row = result.rows[0]
    
    // Buscar itens do pedido
    const itemsResult = await query(
      `SELECT 
        oie.id,
        oie.order_id,
        oie.item_id,
        oie.quantity,
        oie.unit_price,
        oie.notes,
        oie.created_at,
        oi.name as item_name
       FROM order_item_entries oie
       JOIN order_items oi ON oie.item_id = oi.id
       WHERE oie.order_id = $1
       ORDER BY oie.created_at ASC`,
      [orderId]
    )
    
    const items = itemsResult.rows.map((itemRow) => ({
      id: itemRow.id,
      orderId: itemRow.order_id,
      itemId: itemRow.item_id,
      itemName: itemRow.item_name,
      quantity: parseFloat(itemRow.quantity),
      unitPrice: itemRow.unit_price ? parseFloat(itemRow.unit_price) : null,
      notes: itemRow.notes || null,
      createdAt: itemRow.created_at,
    }))
    
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      date: row.date,
      supplierId: row.supplier_id,
      supplierName: row.supplier_name,
      orderNumber: row.order_number || null,
      requested: row.requested,
      requestedAt: row.requested_at || null,
      confirmed: row.confirmed,
      confirmedAt: row.confirmed_at || null,
      inProduction: row.in_production,
      inProductionAt: row.in_production_at || null,
      ready: row.ready,
      readyAt: row.ready_at || null,
      delivered: row.delivered,
      deliveredAt: row.delivered_at || null,
      cancelled: row.cancelled,
      cancelledAt: row.cancelled_at || null,
      observations: row.observations || null,
      total: row.total ? parseFloat(row.total) : 0,
      items,
      approved: row.approved || false,
      approvedAt: row.approved_at || null,
      approvedBy: row.approved_by || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error) {
    console.error('Get order error:', error)
    res.status(500).json({ error: 'Failed to fetch order' })
  }
})

router.post('/orders/:clinicId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const {
      id,
      date,
      supplierId,
      orderNumber,
      requested,
      requestedAt,
      confirmed,
      confirmedAt,
      inProduction,
      inProductionAt,
      ready,
      readyAt,
      delivered,
      deliveredAt,
      cancelled,
      cancelledAt,
      observations,
      items, // Array de itens do pedido
    } = req.body
    
    if (!date || !supplierId) {
      return res.status(400).json({ error: 'Date and supplier are required' })
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' })
    }
    
    const orderId = id || `order-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    
    // Calcular total do pedido
    const total = items.reduce((sum: number, item: any) => {
      const quantity = item.quantity || 0
      const unitPrice = item.unitPrice || 0
      return sum + (quantity * unitPrice)
    }, 0)
    
    // Inserir pedido (sempre começa como não aprovado)
    const result = await query(
      `INSERT INTO daily_order_entries
       (id, clinic_id, date, supplier_id, order_number, total, requested, requested_at,
        confirmed, confirmed_at, in_production, in_production_at, ready, ready_at,
        delivered, delivered_at, cancelled, cancelled_at, observations, approved)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
       RETURNING *`,
      [
        orderId,
        clinicId,
        date,
        supplierId,
        orderNumber?.trim() || null,
        total,
        requested || false,
        requested && requestedAt ? requestedAt : null,
        confirmed || false,
        confirmed && confirmedAt ? confirmedAt : null,
        inProduction || false,
        inProduction && inProductionAt ? inProductionAt : null,
        ready || false,
        ready && readyAt ? readyAt : null,
        delivered || false,
        delivered && deliveredAt ? deliveredAt : null,
        cancelled || false,
        cancelled && cancelledAt ? cancelledAt : null,
        observations?.trim() || null,
        false, // approved sempre começa como false
      ]
    )
    
    const row = result.rows[0]
    
    // Inserir itens do pedido
    const insertedItems = []
    for (const item of items) {
      if (!item.itemId || !item.quantity) {
        continue // Pular itens inválidos
      }
      
      const itemEntryId = `order-item-${orderId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      
      await query(
        `INSERT INTO order_item_entries
         (id, order_id, item_id, quantity, unit_price, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          itemEntryId,
          orderId,
          item.itemId,
          item.quantity,
          item.unitPrice || null,
          item.notes?.trim() || null,
        ]
      )
      
      // Buscar nome do item
      const itemResult = await query(`SELECT name FROM order_items WHERE id = $1`, [item.itemId])
      const itemName = itemResult.rows[0]?.name || ''
      
      insertedItems.push({
        id: itemEntryId,
        orderId,
        itemId: item.itemId,
        itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice || null,
        notes: item.notes || null,
      })
    }
    
    const supplierResult = await query(`SELECT name FROM suppliers WHERE id = $1`, [supplierId])
    const supplierName = supplierResult.rows[0]?.name || ''
    
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      date: row.date,
      supplierId: row.supplier_id,
      supplierName,
      orderNumber: row.order_number || null,
      requested: row.requested,
      requestedAt: row.requested_at || null,
      confirmed: row.confirmed,
      confirmedAt: row.confirmed_at || null,
      inProduction: row.in_production,
      inProductionAt: row.in_production_at || null,
      ready: row.ready,
      readyAt: row.ready_at || null,
      delivered: row.delivered,
      deliveredAt: row.delivered_at || null,
      cancelled: row.cancelled,
      cancelledAt: row.cancelled_at || null,
      observations: row.observations || null,
      total: row.total ? parseFloat(row.total) : 0,
      items: insertedItems,
      approved: row.approved || false,
      approvedAt: row.approved_at || null,
      approvedBy: row.approved_by || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Create order error:', error)
    res.status(500).json({ error: 'Failed to create order', message: error.message })
  }
})

router.put('/orders/:clinicId/:orderId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { orderId } = req.params
    const {
      date,
      supplierId,
      orderNumber,
      requested,
      requestedAt,
      confirmed,
      confirmedAt,
      inProduction,
      inProductionAt,
      ready,
      readyAt,
      delivered,
      deliveredAt,
      cancelled,
      cancelledAt,
      observations,
      items, // Array de itens do pedido
    } = req.body
    
    if (!date || !supplierId) {
      return res.status(400).json({ error: 'Date and supplier are required' })
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' })
    }
    
    // Verificar se o pedido existe e se está aprovado antes de permitir edição de fases
    const existingOrder = await query(
      `SELECT approved FROM daily_order_entries WHERE id = $1 AND clinic_id = $2`,
      [orderId, clinicId]
    )
    
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    const isApproved = existingOrder.rows[0].approved
    
    // Se não está aprovado, não permite editar as fases (mas permite editar outros campos)
    if (!isApproved && (requested || confirmed || inProduction || ready || delivered || cancelled)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Pedido precisa ser aprovado pela gestora antes de editar as fases' 
      })
    }
    
    // Calcular total do pedido
    const total = items.reduce((sum: number, item: any) => {
      const quantity = item.quantity || 0
      const unitPrice = item.unitPrice || 0
      return sum + (quantity * unitPrice)
    }, 0)
    
    const result = await query(
      `UPDATE daily_order_entries
       SET date = $1, supplier_id = $2, order_number = $3, total = $4, requested = $5, requested_at = $6,
           confirmed = $7, confirmed_at = $8, in_production = $9, in_production_at = $10,
           ready = $11, ready_at = $12, delivered = $13, delivered_at = $14,
           cancelled = $15, cancelled_at = $16, observations = $17
       WHERE id = $18 AND clinic_id = $19
       RETURNING *`,
      [
        date,
        supplierId,
        orderNumber?.trim() || null,
        total,
        requested || false,
        requested && requestedAt ? requestedAt : null,
        confirmed || false,
        confirmed && confirmedAt ? confirmedAt : null,
        inProduction || false,
        inProduction && inProductionAt ? inProductionAt : null,
        ready || false,
        ready && readyAt ? readyAt : null,
        delivered || false,
        delivered && deliveredAt ? deliveredAt : null,
        cancelled || false,
        cancelled && cancelledAt ? cancelledAt : null,
        observations?.trim() || null,
        orderId,
        clinicId,
      ]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    // Deletar itens antigos e inserir novos
    await query(`DELETE FROM order_item_entries WHERE order_id = $1`, [orderId])
    
    const insertedItems = []
    for (const item of items) {
      if (!item.itemId || !item.quantity) {
        continue // Pular itens inválidos
      }
      
      const itemEntryId = `order-item-${orderId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      
      await query(
        `INSERT INTO order_item_entries
         (id, order_id, item_id, quantity, unit_price, notes)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          itemEntryId,
          orderId,
          item.itemId,
          item.quantity,
          item.unitPrice || null,
          item.notes?.trim() || null,
        ]
      )
      
      // Buscar nome do item
      const itemResult = await query(`SELECT name FROM order_items WHERE id = $1`, [item.itemId])
      const itemName = itemResult.rows[0]?.name || ''
      
      insertedItems.push({
        id: itemEntryId,
        orderId,
        itemId: item.itemId,
        itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice || null,
        notes: item.notes || null,
      })
    }
    
    const row = result.rows[0]
    const supplierResult = await query(`SELECT name FROM suppliers WHERE id = $1`, [supplierId])
    const supplierName = supplierResult.rows[0]?.name || ''
    
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      date: row.date,
      supplierId: row.supplier_id,
      supplierName,
      orderNumber: row.order_number || null,
      requested: row.requested,
      requestedAt: row.requested_at || null,
      confirmed: row.confirmed,
      confirmedAt: row.confirmed_at || null,
      inProduction: row.in_production,
      inProductionAt: row.in_production_at || null,
      ready: row.ready,
      readyAt: row.ready_at || null,
      delivered: row.delivered,
      deliveredAt: row.delivered_at || null,
      cancelled: row.cancelled,
      cancelledAt: row.cancelled_at || null,
      observations: row.observations || null,
      total: row.total ? parseFloat(row.total) : 0,
      items: insertedItems,
      approved: row.approved || false,
      approvedAt: row.approved_at || null,
      approvedBy: row.approved_by || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Update order error:', error)
    res.status(500).json({ error: 'Failed to update order', message: error.message })
  }
})

// Rota para aprovar pedido (apenas gestoras)
router.post('/orders/:clinicId/:orderId/approve', async (req, res) => {
  const { clinicId, orderId } = req.params
  
  // Verificar se é gestora
  if (!req.auth || req.auth.role !== 'GESTOR_CLINICA') {
    return res.status(403).json({ error: 'Forbidden', message: 'Apenas gestoras podem aprovar pedidos' })
  }
  
  // Verificar se a clínica corresponde
  if (req.auth.clinicId !== clinicId) {
    return res.status(403).json({ error: 'Forbidden', message: 'Clínica não corresponde' })
  }
  
  try {
    // Verificar se o pedido existe e não está aprovado
    const orderResult = await query(
      `SELECT id, approved FROM daily_order_entries WHERE id = $1 AND clinic_id = $2`,
      [orderId, clinicId]
    )
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    if (orderResult.rows[0].approved) {
      return res.status(400).json({ error: 'Order already approved' })
    }
    
    // Aprovar pedido
    const result = await query(
      `UPDATE daily_order_entries
       SET approved = true, approved_at = CURRENT_TIMESTAMP, approved_by = $1
       WHERE id = $2 AND clinic_id = $3
       RETURNING *`,
      [req.auth.userId, orderId, clinicId]
    )
    
    const row = result.rows[0]
    const supplierResult = await query(`SELECT name FROM suppliers WHERE id = $1`, [row.supplier_id])
    const supplierName = supplierResult.rows[0]?.name || ''
    
    // Buscar itens do pedido
    const itemsResult = await query(
      `SELECT 
        oie.id,
        oie.order_id,
        oie.item_id,
        oie.quantity,
        oie.unit_price,
        oie.notes,
        oie.created_at,
        oi.name as item_name
       FROM order_item_entries oie
       JOIN order_items oi ON oie.item_id = oi.id
       WHERE oie.order_id = $1
       ORDER BY oie.created_at ASC`,
      [orderId]
    )
    
    const items = itemsResult.rows.map((itemRow) => ({
      id: itemRow.id,
      orderId: itemRow.order_id,
      itemId: itemRow.item_id,
      itemName: itemRow.item_name,
      quantity: parseFloat(itemRow.quantity),
      unitPrice: itemRow.unit_price ? parseFloat(itemRow.unit_price) : null,
      notes: itemRow.notes || null,
      createdAt: itemRow.created_at,
    }))
    
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      date: row.date,
      supplierId: row.supplier_id,
      supplierName,
      orderNumber: row.order_number || null,
      requested: row.requested,
      requestedAt: row.requested_at || null,
      confirmed: row.confirmed,
      confirmedAt: row.confirmed_at || null,
      inProduction: row.in_production,
      inProductionAt: row.in_production_at || null,
      ready: row.ready,
      readyAt: row.ready_at || null,
      delivered: row.delivered,
      deliveredAt: row.delivered_at || null,
      cancelled: row.cancelled,
      cancelledAt: row.cancelled_at || null,
      observations: row.observations || null,
      total: row.total ? parseFloat(row.total) : 0,
      items,
      approved: row.approved,
      approvedAt: row.approved_at,
      approvedBy: row.approved_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Approve order error:', error)
    res.status(500).json({ error: 'Failed to approve order', message: error.message })
  }
})

// Rota para contar pedidos pendentes de aprovação (apenas gestoras)
router.get('/orders/:clinicId/pending-count', async (req, res) => {
  const { clinicId } = req.params
  
  // Verificar se é gestora
  if (!req.auth || req.auth.role !== 'GESTOR_CLINICA') {
    return res.status(403).json({ error: 'Forbidden', message: 'Apenas gestoras podem ver pedidos pendentes' })
  }
  
  // Verificar se a clínica corresponde
  if (req.auth.clinicId !== clinicId) {
    return res.status(403).json({ error: 'Forbidden', message: 'Clínica não corresponde' })
  }
  
  try {
    const result = await query(
      `SELECT COUNT(*) as count FROM daily_order_entries WHERE clinic_id = $1 AND approved = false`,
      [clinicId]
    )
    
    res.json({ count: parseInt(result.rows[0].count, 10) })
  } catch (error: any) {
    console.error('Get pending orders count error:', error)
    res.status(500).json({ error: 'Failed to get pending orders count', message: error.message })
  }
})

router.delete('/orders/:clinicId/:orderId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { orderId } = req.params
    const result = await query(
      `DELETE FROM daily_order_entries WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [orderId, clinicId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    res.json({ message: 'Order deleted successfully' })
  } catch (error) {
    console.error('Delete order error:', error)
    res.status(500).json({ error: 'Failed to delete order' })
  }
})

// ================================
// ORDER ITEMS
// ================================
router.get('/order-items/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { search } = req.query
    
    let queryStr = `SELECT * FROM order_items WHERE clinic_id = $1`
    const params: any[] = [clinicId]
    
    if (search && typeof search === 'string' && search.trim()) {
      queryStr += ` AND (name ILIKE $2 OR description ILIKE $2)`
      params.push(`%${search.trim()}%`)
    }
    
    queryStr += ` ORDER BY name ASC`
    
    const result = await query(queryStr, params)
    
    res.json(
      result.rows.map((row) => ({
        id: row.id,
        clinicId: row.clinic_id,
        name: row.name,
        description: row.description || null,
        unit: row.unit || 'unidade',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    )
  } catch (error) {
    console.error('Get order items error:', error)
    res.status(500).json({ error: 'Failed to fetch order items' })
  }
})

router.get('/order-items/:clinicId/:itemId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canViewOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { itemId } = req.params
    const result = await query(
      `SELECT * FROM order_items WHERE id = $1 AND clinic_id = $2`,
      [itemId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order item not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      description: row.description || null,
      unit: row.unit || 'unidade',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error) {
    console.error('Get order item error:', error)
    res.status(500).json({ error: 'Failed to fetch order item' })
  }
})

router.post('/order-items/:clinicId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { name, description, unit } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    
    const itemId = `item-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    
    const result = await query(
      `INSERT INTO order_items
       (id, clinic_id, name, description, unit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        itemId,
        clinicId,
        name.trim(),
        description?.trim() || null,
        unit?.trim() || 'unidade',
      ]
    )
    
    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      description: row.description || null,
      unit: row.unit || 'unidade',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Create order item error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Item with this name already exists' })
    }
    res.status(500).json({ error: 'Failed to create order item', message: error.message })
  }
})

router.put('/order-items/:clinicId/:itemId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { itemId } = req.params
    const { name, description, unit } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    
    const result = await query(
      `UPDATE order_items
       SET name = $1, description = $2, unit = $3
       WHERE id = $4 AND clinic_id = $5
       RETURNING *`,
      [
        name.trim(),
        description?.trim() || null,
        unit?.trim() || 'unidade',
        itemId,
        clinicId,
      ]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order item not found' })
    }
    
    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      description: row.description || null,
      unit: row.unit || 'unidade',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Update order item error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Item with this name already exists' })
    }
    res.status(500).json({ error: 'Failed to update order item', message: error.message })
  }
})

router.delete('/order-items/:clinicId/:itemId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { itemId } = req.params
    
    // Check if item has entries
    const entriesCheck = await query(
      `SELECT COUNT(*) as count FROM order_item_entries WHERE item_id = $1`,
      [itemId]
    )
    
    if (parseInt(entriesCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete item with existing order entries',
        message: 'Please delete or reassign order entries before deleting this item'
      })
    }
    
    const result = await query(
      `DELETE FROM order_items WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [itemId, clinicId]
    )
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order item not found' })
    }
    
    res.json({ message: 'Order item deleted successfully' })
  } catch (error) {
    console.error('Delete order item error:', error)
    res.status(500).json({ error: 'Failed to delete order item' })
  }
})

export default router
