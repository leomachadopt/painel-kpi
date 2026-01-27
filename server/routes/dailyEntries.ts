import { Router } from 'express'
import { query } from '../db.js'
import { getUserPermissions, requirePermission } from '../middleware/permissions.js'

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

/**
 * Helper function to check if user can create/edit advance invoice entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditAdvanceInvoice permission
 */
async function canEditAdvanceInvoice(req: any, clinicId: string): Promise<boolean> {
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
    return permissions.canEditAdvanceInvoice === true
  }

  return false
}

/**
 * Helper function to check if user can create/edit billing entries (faturação)
 * GESTOR_CLINICA always can, COLABORADOR needs canEditBilling or canEditAdvances or canEditAdvanceInvoice permission
 */
async function canEditBilling(req: any, clinicId: string): Promise<boolean> {
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

  // COLABORADOR needs one of the billing-related permissions
  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditBilling === true ||
           permissions.canEditAdvances === true ||
           permissions.canEditAdvanceInvoice === true
  }

  return false
}

/**
 * Helper function to check if user can create/edit accounts payable entries
 * GESTOR_CLINICA always can, COLABORADOR needs canEditAccountsPayable permission
 */
async function canEditAccountsPayable(req: any, clinicId: string): Promise<boolean> {
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
    return permissions.canEditAccountsPayable === true
  }

  return false
}

/**
 * Helper function to check if user can view accounts payable entries
 * GESTOR_CLINICA always can, COLABORADOR needs canViewAccountsPayable permission
 */
async function canViewAccountsPayable(req: any, clinicId: string): Promise<boolean> {
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
    return permissions.canViewAccountsPayable === true
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
        isBillingEntry: row.is_billing_entry || false,
      }))
    )
  } catch (error) {
    console.error('Get financial entries error:', error)
    res.status(500).json({ error: 'Failed to fetch financial entries' })
  }
})

router.post('/financial/:clinicId', async (req, res) => {
  // Check if user can create financial entries
  // GESTOR_CLINICA always can, COLABORADOR needs canEditFinancial or canEditBilling (depending on isBillingEntry)
  const { clinicId } = req.params
  const { isBillingEntry } = req.body

  // Use different permission check depending on entry type
  const hasPermission = isBillingEntry
    ? await canEditBilling(req, clinicId)
    : await canEditFinancial(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { id, date, patientName, code, categoryId, value, cabinetId, doctorId, paymentSourceId } = req.body
    const entryId =
      id || `financial-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const result = await query(
      `INSERT INTO daily_financial_entries
       (id, clinic_id, date, patient_name, code, category_id, value, cabinet_id, doctor_id, payment_source_id, is_billing_entry)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [entryId, clinicId, date, patientName, code, categoryId, value, cabinetId, doctorId || null, paymentSourceId || null, isBillingEntry || false]
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
      isBillingEntry: result.rows[0].is_billing_entry || false,
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
  try {
    const { clinicId, entryId } = req.params
    const { date, patientName, code, categoryId, value, cabinetId, doctorId, paymentSourceId } = req.body

    // Validate required fields
    if (!date || !patientName || !code || !categoryId || !value || !cabinetId) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Check if entry exists and get its type
    const checkResult = await query(
      `SELECT id, is_billing_entry FROM daily_financial_entries WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    const isBillingEntry = checkResult.rows[0].is_billing_entry || false

    // Check if user can edit this type of entry
    // GESTOR_CLINICA always can, COLABORADOR needs appropriate permission
    const hasPermission = isBillingEntry
      ? await canEditBilling(req, clinicId)
      : await canEditFinancial(req, clinicId)

    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Update entry (keep is_billing_entry as is, don't change it)
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
      isBillingEntry: result.rows[0].is_billing_entry || false,
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
  try {
    const { clinicId, entryId } = req.params

    // Check if entry exists and get its type
    const checkResult = await query(
      `SELECT id, is_billing_entry FROM daily_financial_entries WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    const isBillingEntry = checkResult.rows[0].is_billing_entry || false

    // Check if user can delete this type of entry
    // GESTOR_CLINICA always can, COLABORADOR needs appropriate permission
    const hasPermission = isBillingEntry
      ? await canEditBilling(req, clinicId)
      : await canEditFinancial(req, clinicId)

    if (!hasPermission) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Delete the entry
    await query(
      `DELETE FROM daily_financial_entries WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )

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
    const userId = (req as any).auth?.sub || (req as any).user?.sub
    const userRole = (req as any).auth?.role || (req as any).user?.role

    console.log('🔍 GET /consultation/:clinicId - User Info:', {
      userId,
      userRole,
      clinicId,
      authPresent: !!(req as any).auth,
      userPresent: !!(req as any).user
    })

    let sqlQuery = `SELECT * FROM daily_consultation_entries WHERE clinic_id = $1`
    let params: any[] = [clinicId]

    // If user is COLABORADOR, filter by their doctor_id
    if (userRole === 'COLABORADOR' && userId) {
      // Get user email to find their doctor_id
      const userResult = await query(`SELECT email FROM users WHERE id = $1`, [userId])
      console.log('📧 User email lookup:', userResult.rows[0])

      if (userResult.rows.length > 0) {
        const userEmail = userResult.rows[0].email

        // Find doctor_id by email
        const doctorResult = await query(
          `SELECT id FROM clinic_doctors WHERE clinic_id = $1 AND email = $2`,
          [clinicId, userEmail]
        )
        console.log('👨‍⚕️ Doctor lookup:', doctorResult.rows[0])

        if (doctorResult.rows.length > 0) {
          const doctorId = doctorResult.rows[0].id
          sqlQuery += ` AND doctor_id = $2`
          params.push(doctorId)
          console.log('✅ Applying doctor filter:', doctorId)
        } else {
          // Doctor not found, return empty array
          console.log('⚠️ Doctor not found for email:', userEmail)
          return res.json([])
        }
      } else {
        console.log('⚠️ User not found:', userId)
        return res.json([])
      }
    } else {
      console.log('ℹ️ No COLABORADOR filter - showing all consultations')
    }

    sqlQuery += ` ORDER BY date DESC`

    const result = await query(sqlQuery, params)
    console.log(`📊 Returning ${result.rows.length} consultation entries`)

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        date: row.date,
        patientName: row.patient_name,
        code: row.code,
        consultationTypeId: row.consultation_type_id || null,
        consultationCompleted: row.consultation_completed || false,
        consultationCompletedAt: row.consultation_completed_at || null,
        completedProcedures: row.completed_procedures || null,
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
        planNotEligible: row.plan_not_eligible || false,
        planNotEligibleAt: row.plan_not_eligible_at || null,
        planNotEligibleReason: row.plan_not_eligible_reason || null,
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
    const userId = (req as any).auth?.sub || (req as any).user?.sub
    const userRole = (req as any).auth?.role || (req as any).user?.role

    if (!/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 1-6 digits' })
    }

    let sqlQuery = `SELECT * FROM daily_consultation_entries WHERE clinic_id = $1 AND code = $2`
    let params: any[] = [clinicId, code]

    // If user is COLABORADOR, filter by their doctor_id
    if (userRole === 'COLABORADOR' && userId) {
      const userResult = await query(`SELECT email FROM users WHERE id = $1`, [userId])

      if (userResult.rows.length > 0) {
        const userEmail = userResult.rows[0].email
        const doctorResult = await query(
          `SELECT id FROM clinic_doctors WHERE clinic_id = $1 AND email = $2`,
          [clinicId, userEmail]
        )

        if (doctorResult.rows.length > 0) {
          const doctorId = doctorResult.rows[0].id
          sqlQuery += ` AND doctor_id = $3`
          params.push(doctorId)
        } else {
          return res.status(404).json({ error: 'Consultation entry not found' })
        }
      } else {
        return res.status(404).json({ error: 'Consultation entry not found' })
      }
    }

    const result = await query(sqlQuery, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation entry not found' })
    }

    const row = result.rows[0]
    return res.json({
      id: row.id,
      date: row.date,
      patientName: row.patient_name,
      code: row.code,
      consultationTypeId: row.consultation_type_id || null,
      consultationCompleted: row.consultation_completed || false,
      consultationCompletedAt: row.consultation_completed_at || null,
      completedProcedures: row.completed_procedures || null,
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
      planNotEligible: row.plan_not_eligible || false,
      planNotEligibleAt: row.plan_not_eligible_at || null,
      planNotEligibleReason: row.plan_not_eligible_reason || null,
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
      consultationTypeId,
      consultationCompleted,
      consultationCompletedAt,
      completedProcedures,
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
      planNotEligible,
      planNotEligibleAt,
      planNotEligibleReason,
    } = req.body

    if (!code || !/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 1-6 digits' })
    }

    const entryId = `consultation-${clinicId}-${code}`

    const result = await query(
      `INSERT INTO daily_consultation_entries
       (id, clinic_id, date, patient_name, code,
        consultation_type_id, consultation_completed, consultation_completed_at, completed_procedures,
        plan_created, plan_created_at,
        plan_presented, plan_presented_at, plan_presented_value,
        plan_accepted, plan_accepted_at,
        plan_value,
        source_id, is_referral, referral_name, referral_code, campaign_id, doctor_id,
        plan_not_eligible, plan_not_eligible_at, plan_not_eligible_reason)
       VALUES ($1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11,
        $12, $13, $14,
        $15, $16,
        $17,
        $18, $19, $20, $21, $22, $23,
        $24, $25, $26)
       ON CONFLICT (clinic_id, code) DO UPDATE SET
        date = EXCLUDED.date,
        patient_name = EXCLUDED.patient_name,
        consultation_type_id = EXCLUDED.consultation_type_id,
        consultation_completed = EXCLUDED.consultation_completed,
        consultation_completed_at = EXCLUDED.consultation_completed_at,
        completed_procedures = EXCLUDED.completed_procedures,
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
        doctor_id = EXCLUDED.doctor_id,
        plan_not_eligible = EXCLUDED.plan_not_eligible,
        plan_not_eligible_at = EXCLUDED.plan_not_eligible_at,
        plan_not_eligible_reason = EXCLUDED.plan_not_eligible_reason
       RETURNING *`,
      [
        entryId,
        clinicId,
        date,
        patientName,
        code,
        consultationTypeId || null,
        consultationCompleted || false,
        consultationCompletedAt || null,
        completedProcedures ? JSON.stringify(completedProcedures) : null,
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
        planNotEligible || false,
        planNotEligibleAt || null,
        planNotEligibleReason || null,
      ]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      consultationTypeId: result.rows[0].consultation_type_id || null,
      consultationCompleted: result.rows[0].consultation_completed || false,
      consultationCompletedAt: result.rows[0].consultation_completed_at || null,
      completedProcedures: result.rows[0].completed_procedures || null,
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
      planNotEligible: result.rows[0].plan_not_eligible || false,
      planNotEligibleAt: result.rows[0].plan_not_eligible_at || null,
      planNotEligibleReason: result.rows[0].plan_not_eligible_reason || null,
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
      planNotEligible,
      planNotEligibleAt,
      planNotEligibleReason,
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
           doctor_id = $17,
           plan_not_eligible = $18, plan_not_eligible_at = $19, plan_not_eligible_reason = $20
       WHERE id = $21 AND clinic_id = $22
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
        planNotEligible || false,
        planNotEligibleAt || null,
        planNotEligibleReason || null,
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
      planNotEligible: result.rows[0].plan_not_eligible || false,
      planNotEligibleAt: result.rows[0].plan_not_eligible_at || null,
      planNotEligibleReason: result.rows[0].plan_not_eligible_reason || null,
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
        awaitingApproval: !!row.awaiting_approval,
        awaitingApprovalAt: row.awaiting_approval_at,
        approved: !!row.approved,
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
      awaitingApproval: !!row.awaiting_approval,
      awaitingApprovalAt: row.awaiting_approval_at,
      approved: !!row.approved,
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
      queryStr += ` AND (name ILIKE $2 OR nif ILIKE $2 OR cpf ILIKE $2 OR cnpj ILIKE $2)`
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
        cpf: row.cpf || null,
        cnpj: row.cnpj || null,
        address: row.address || null,
        postalCode: row.postal_code || null,
        city: row.city || null,
        phone: row.phone || null,
        email: row.email || null,
        website: row.website || null,
        notes: row.notes || null,
        bankName: row.bank_name || null,
        iban: row.iban || null,
        nib: row.nib || null,
        swiftBic: row.swift_bic || null,
        bankAgency: row.bank_agency || null,
        bankAccount: row.bank_account || null,
        bankAccountType: row.bank_account_type || null,
        bankCode: row.bank_code || null,
        pixKey: row.pix_key || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    )
  } catch (error: any) {
    console.error('Get suppliers error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Failed to fetch suppliers',
      message: error.message,
      detail: error.detail || error.toString()
    })
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
      cpf: row.cpf || null,
      cnpj: row.cnpj || null,
      address: row.address || null,
      postalCode: row.postal_code || null,
      city: row.city || null,
      phone: row.phone || null,
      email: row.email || null,
      website: row.website || null,
      notes: row.notes || null,
      bankName: row.bank_name || null,
      iban: row.iban || null,
      nib: row.nib || null,
      swiftBic: row.swift_bic || null,
      bankAgency: row.bank_agency || null,
      bankAccount: row.bank_account || null,
      bankAccountType: row.bank_account_type || null,
      bankCode: row.bank_code || null,
      pixKey: row.pix_key || null,
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
    const { name, nif, cpf, cnpj, address, postalCode, city, phone, email, website, notes, bankName, iban, nib, swiftBic, bankAgency, bankAccount, bankAccountType, bankCode, pixKey } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    
    const supplierId = `supplier-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    
    const result = await query(
      `INSERT INTO suppliers
       (id, clinic_id, name, nif, cpf, cnpj, address, postal_code, city, phone, email, website, notes, bank_name, iban, nib, swift_bic, bank_agency, bank_account, bank_account_type, bank_code, pix_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
       RETURNING *`,
      [
        supplierId,
        clinicId,
        name.trim(),
        nif?.trim() || null,
        cpf?.trim() || null,
        cnpj?.trim() || null,
        address?.trim() || null,
        postalCode?.trim() || null,
        city?.trim() || null,
        phone?.trim() || null,
        email?.trim() || null,
        website?.trim() || null,
        notes?.trim() || null,
        bankName?.trim() || null,
        iban?.trim() || null,
        nib?.trim() || null,
        swiftBic?.trim() || null,
        bankAgency?.trim() || null,
        bankAccount?.trim() || null,
        bankAccountType?.trim() || null,
        bankCode?.trim() || null,
        pixKey?.trim() || null,
      ]
    )
    
    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      nif: row.nif || null,
      cpf: row.cpf || null,
      cnpj: row.cnpj || null,
      address: row.address || null,
      postalCode: row.postal_code || null,
      city: row.city || null,
      phone: row.phone || null,
      email: row.email || null,
      website: row.website || null,
      notes: row.notes || null,
      bankName: row.bank_name || null,
      iban: row.iban || null,
      nib: row.nib || null,
      swiftBic: row.swift_bic || null,
      bankAgency: row.bank_agency || null,
      bankAccount: row.bank_account || null,
      bankAccountType: row.bank_account_type || null,
      bankCode: row.bank_code || null,
      pixKey: row.pix_key || null,
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
    const { name, nif, cpf, cnpj, address, postalCode, city, phone, email, website, notes, bankName, iban, nib, swiftBic, bankAgency, bankAccount, bankAccountType, bankCode, pixKey } = req.body
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    
    const result = await query(
      `UPDATE suppliers
       SET name = $1, nif = $2, cpf = $3, cnpj = $4, address = $5, postal_code = $6, city = $7, 
           phone = $8, email = $9, website = $10, notes = $11,
           bank_name = $12, iban = $13, nib = $14, swift_bic = $15,
           bank_agency = $16, bank_account = $17, bank_account_type = $18, bank_code = $19, pix_key = $20
       WHERE id = $21 AND clinic_id = $22
       RETURNING *`,
      [
        name.trim(),
        nif?.trim() || null,
        cpf?.trim() || null,
        cnpj?.trim() || null,
        address?.trim() || null,
        postalCode?.trim() || null,
        city?.trim() || null,
        phone?.trim() || null,
        email?.trim() || null,
        website?.trim() || null,
        notes?.trim() || null,
        bankName?.trim() || null,
        iban?.trim() || null,
        nib?.trim() || null,
        swiftBic?.trim() || null,
        bankAgency?.trim() || null,
        bankAccount?.trim() || null,
        bankAccountType?.trim() || null,
        bankCode?.trim() || null,
        pixKey?.trim() || null,
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
      cpf: row.cpf || null,
      cnpj: row.cnpj || null,
      address: row.address || null,
      postalCode: row.postal_code || null,
      city: row.city || null,
      phone: row.phone || null,
      email: row.email || null,
      website: row.website || null,
      notes: row.notes || null,
      bankName: row.bank_name || null,
      iban: row.iban || null,
      nib: row.nib || null,
      swiftBic: row.swift_bic || null,
      bankAgency: row.bank_agency || null,
      bankAccount: row.bank_account || null,
      bankAccountType: row.bank_account_type || null,
      bankCode: row.bank_code || null,
      pixKey: row.pix_key || null,
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
      rejected: row.rejected || false,
      rejectedAt: row.rejected_at || null,
      rejectedBy: row.rejected_by || null,
      rejectionReason: row.rejection_reason || null,
      requiresPrepayment: row.requires_prepayment || false,
      paymentConfirmed: row.payment_confirmed || false,
      paymentConfirmedAt: row.payment_confirmed_at || null,
      paymentConfirmedBy: row.payment_confirmed_by || null,
      checked: row.checked || false,
      checkedAt: row.checked_at || null,
      conform: row.conform !== null ? row.conform : null,
      nonConformReason: row.non_conform_reason || null,
      checkedBy: row.checked_by || null,
      checkedByPasswordVerified: row.checked_by_password_verified || false,
      invoicePending: row.invoice_pending || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      }))
    )
  } catch (error: any) {
    console.error('Get orders error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Failed to fetch orders',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// Rota para contar pedidos pendentes de aprovação (apenas gestoras)
// IMPORTANTE: Esta rota deve vir ANTES de /orders/:clinicId/:orderId para evitar conflito
router.get('/orders/:clinicId/pending-count', async (req, res) => {
  try {
    const { clinicId } = req.params
    
    if (!clinicId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }
    
    // Verificar se é gestora (usar req.user ou req.auth, dependendo do que estiver disponível)
    const auth = req.auth || req.user
    if (!auth) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }
    
    if (auth.role !== 'GESTOR_CLINICA' && auth.role !== 'MENTOR') {
      return res.status(403).json({ error: 'Forbidden', message: 'Apenas gestoras podem ver pedidos pendentes' })
    }
    
    // Verificar se a clínica corresponde
    if (auth.clinicId && auth.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Clínica não corresponde' })
    }
    
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM daily_order_entries 
       WHERE clinic_id = $1 AND approved = false AND rejected = false`,
      [clinicId]
    )
    
    res.json({ count: parseInt(result.rows[0]?.count || '0', 10) })
  } catch (error: any) {
    console.error('Get pending orders count error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Failed to get pending orders count', 
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// Rota para contar pedidos aguardando pagamento (apenas gestoras)
// IMPORTANTE: Esta rota deve vir ANTES de /orders/:clinicId/:orderId para evitar conflito
router.get('/orders/:clinicId/payment-pending-count', async (req, res) => {
  try {
    const { clinicId } = req.params
    
    if (!clinicId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }
    
    // Verificar se é gestora
    const auth = req.auth || req.user
    if (!auth) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }
    
    if (auth.role !== 'GESTOR_CLINICA' && auth.role !== 'MENTOR') {
      return res.status(403).json({ error: 'Forbidden', message: 'Apenas gestoras podem ver pedidos aguardando pagamento' })
    }
    
    // Verificar se a clínica corresponde
    if (auth.clinicId && auth.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Clínica não corresponde' })
    }
    
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM daily_order_entries 
       WHERE clinic_id = $1 
         AND requires_prepayment = true 
         AND payment_confirmed = false 
         AND approved = true
         AND rejected = false`,
      [clinicId]
    )
    
    res.json({ count: parseInt(result.rows[0]?.count || '0', 10) })
  } catch (error: any) {
    console.error('Get payment pending orders count error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Failed to get payment pending orders count', 
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// Rota para contar pedidos com fatura pendente (apenas gestoras)
// IMPORTANTE: Esta rota deve vir ANTES de /orders/:clinicId/:orderId para evitar conflito
router.get('/orders/:clinicId/invoice-pending-count', async (req, res) => {
  try {
    const { clinicId } = req.params
    
    if (!clinicId) {
      return res.status(400).json({ error: 'Clinic ID is required' })
    }
    
    // Verificar se é gestora
    const auth = req.auth || req.user
    if (!auth) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' })
    }
    
    if (auth.role !== 'GESTOR_CLINICA' && auth.role !== 'MENTOR') {
      return res.status(403).json({ error: 'Forbidden', message: 'Apenas gestoras podem ver pedidos com fatura pendente' })
    }
    
    // Verificar se a clínica corresponde
    if (auth.clinicId && auth.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Forbidden', message: 'Clínica não corresponde' })
    }
    
    const result = await query(
      `SELECT COUNT(*) as count 
       FROM daily_order_entries 
       WHERE clinic_id = $1 
         AND invoice_pending = true
         AND rejected = false`,
      [clinicId]
    )
    
    res.json({ count: parseInt(result.rows[0]?.count || '0', 10) })
  } catch (error: any) {
    console.error('Get invoice pending orders count error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Failed to get invoice pending orders count', 
      message: error.message,
      detail: error.detail || error.toString()
    })
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
    
    // Buscar documentos do pedido
    const docsResult = await query(
      `SELECT id, order_id, filename, original_filename, file_path, file_size, mime_type, uploaded_by, uploaded_at
       FROM order_documents
       WHERE order_id = $1
       ORDER BY uploaded_at DESC`,
      [orderId]
    )
    
    const documents = docsResult.rows.map((docRow) => ({
      id: docRow.id,
      orderId: docRow.order_id,
      filename: docRow.filename,
      originalFilename: docRow.original_filename,
      filePath: docRow.file_path,
      fileSize: docRow.file_size,
      mimeType: docRow.mime_type,
      uploadedBy: docRow.uploaded_by,
      uploadedAt: docRow.uploaded_at,
    }))
    
    // Adicionar documentos à resposta
    const response = {
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
      rejected: row.rejected || false,
      rejectedAt: row.rejected_at || null,
      rejectedBy: row.rejected_by || null,
      rejectionReason: row.rejection_reason || null,
      requiresPrepayment: row.requires_prepayment || false,
      paymentConfirmed: row.payment_confirmed || false,
      paymentConfirmedAt: row.payment_confirmed_at || null,
      paymentConfirmedBy: row.payment_confirmed_by || null,
      checked: row.checked || false,
      checkedAt: row.checked_at || null,
      conform: row.conform !== null ? row.conform : null,
      nonConformReason: row.non_conform_reason || null,
      checkedBy: row.checked_by || null,
      checkedByPasswordVerified: row.checked_by_password_verified || false,
      invoicePending: row.invoice_pending || false,
      documents,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
    
    res.json(response)
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
      requiresPrepayment, // Novo campo
      invoicePending, // Novo campo
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
        delivered, delivered_at, cancelled, cancelled_at, observations, approved, requires_prepayment, invoice_pending)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
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
        requiresPrepayment || false, // requires_prepayment
        invoicePending || false, // invoice_pending - usar valor do body
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
      rejected: row.rejected || false,
      rejectedAt: row.rejected_at || null,
      rejectedBy: row.rejected_by || null,
      rejectionReason: row.rejection_reason || null,
      requiresPrepayment: row.requires_prepayment || false,
      paymentConfirmed: row.payment_confirmed || false,
      paymentConfirmedAt: row.payment_confirmed_at || null,
      paymentConfirmedBy: row.payment_confirmed_by || null,
      checked: row.checked || false,
      checkedAt: row.checked_at || null,
      conform: row.conform !== null ? row.conform : null,
      nonConformReason: row.non_conform_reason || null,
      checkedBy: row.checked_by || null,
      checkedByPasswordVerified: row.checked_by_password_verified || false,
      invoicePending: row.invoice_pending || false,
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
      invoicePending, // Novo campo
    } = req.body
    
    if (!date || !supplierId) {
      return res.status(400).json({ error: 'Date and supplier are required' })
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' })
    }
    
    // Verificar se o pedido existe e obter informações de aprovação e pagamento
    const existingOrder = await query(
      `SELECT approved, requires_prepayment, payment_confirmed FROM daily_order_entries WHERE id = $1 AND clinic_id = $2`,
      [orderId, clinicId]
    )
    
    if (existingOrder.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    const isApproved = existingOrder.rows[0].approved
    const requiresPrepayment = existingOrder.rows[0].requires_prepayment
    const paymentConfirmed = existingOrder.rows[0].payment_confirmed
    
    // Se não está aprovado, não permite editar as fases (mas permite editar outros campos)
    if (!isApproved && (requested || confirmed || inProduction || ready || delivered || cancelled)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Pedido precisa ser aprovado pela gestora antes de editar as fases' 
      })
    }
    
    // Se requer pagamento prévio e não foi confirmado, não permite ativar fases
    if (requiresPrepayment && !paymentConfirmed && (requested || confirmed || inProduction || ready || delivered)) {
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Pagamento precisa ser confirmado pelo gestor antes de ativar as fases do pedido' 
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
           cancelled = $15, cancelled_at = $16, observations = $17, invoice_pending = $18
       WHERE id = $19 AND clinic_id = $20
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
        invoicePending !== undefined ? invoicePending : false,
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
      rejected: row.rejected || false,
      rejectedAt: row.rejected_at || null,
      rejectedBy: row.rejected_by || null,
      rejectionReason: row.rejection_reason || null,
      requiresPrepayment: row.requires_prepayment || false,
      paymentConfirmed: row.payment_confirmed || false,
      paymentConfirmedAt: row.payment_confirmed_at || null,
      paymentConfirmedBy: row.payment_confirmed_by || null,
      checked: row.checked || false,
      checkedAt: row.checked_at || null,
      conform: row.conform !== null ? row.conform : null,
      nonConformReason: row.non_conform_reason || null,
      checkedBy: row.checked_by || null,
      checkedByPasswordVerified: row.checked_by_password_verified || false,
      invoicePending: row.invoice_pending || false,
      documents: [],
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
  
  // Verificar se é gestora (usar req.user ou req.auth, dependendo do que estiver disponível)
  const auth = req.auth || req.user
  if (!auth || auth.role !== 'GESTOR_CLINICA') {
    return res.status(403).json({ error: 'Forbidden', message: 'Apenas gestoras podem aprovar pedidos' })
  }
  
  // Verificar se a clínica corresponde
  if (auth.clinicId !== clinicId) {
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
    const auth = req.auth || req.user
    const result = await query(
      `UPDATE daily_order_entries
       SET approved = true, approved_at = CURRENT_TIMESTAMP, approved_by = $1
       WHERE id = $2 AND clinic_id = $3
       RETURNING *`,
      [auth.sub, orderId, clinicId]
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
      rejected: row.rejected || false,
      rejectedAt: row.rejected_at || null,
      rejectedBy: row.rejected_by || null,
      rejectionReason: row.rejection_reason || null,
      requiresPrepayment: row.requires_prepayment || false,
      paymentConfirmed: row.payment_confirmed || false,
      paymentConfirmedAt: row.payment_confirmed_at || null,
      paymentConfirmedBy: row.payment_confirmed_by || null,
      checked: row.checked || false,
      checkedAt: row.checked_at || null,
      conform: row.conform !== null ? row.conform : null,
      nonConformReason: row.non_conform_reason || null,
      checkedBy: row.checked_by || null,
      checkedByPasswordVerified: row.checked_by_password_verified || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Approve order error:', error)
    res.status(500).json({ error: 'Failed to approve order', message: error.message })
  }
})

// Rota para recusar pedido (apenas gestoras)
router.post('/orders/:clinicId/:orderId/reject', async (req, res) => {
  const { clinicId, orderId } = req.params
  const { rejectionReason } = req.body
  
  // Verificar se é gestora (usar req.user ou req.auth, dependendo do que estiver disponível)
  const auth = req.auth || req.user
  if (!auth || auth.role !== 'GESTOR_CLINICA') {
    return res.status(403).json({ error: 'Forbidden', message: 'Apenas gestoras podem recusar pedidos' })
  }
  
  // Verificar se a clínica corresponde
  if (auth.clinicId !== clinicId) {
    return res.status(403).json({ error: 'Forbidden', message: 'Clínica não corresponde' })
  }
  
  try {
    // Verificar se o pedido existe e não está aprovado/recusado
    const orderResult = await query(
      `SELECT id, approved, rejected FROM daily_order_entries WHERE id = $1 AND clinic_id = $2`,
      [orderId, clinicId]
    )
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    if (orderResult.rows[0].approved) {
      return res.status(400).json({ error: 'Cannot reject an approved order' })
    }
    
    if (orderResult.rows[0].rejected) {
      return res.status(400).json({ error: 'Order already rejected' })
    }
    
    // Recusar pedido
    const result = await query(
      `UPDATE daily_order_entries
       SET rejected = true, rejected_at = CURRENT_TIMESTAMP, rejected_by = $1, rejection_reason = $2
       WHERE id = $3 AND clinic_id = $4
       RETURNING *`,
      [auth.sub, rejectionReason?.trim() || null, orderId, clinicId]
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
      approved: row.approved || false,
      approvedAt: row.approved_at || null,
      approvedBy: row.approved_by || null,
      rejected: row.rejected || false,
      rejectedAt: row.rejected_at || null,
      rejectedBy: row.rejected_by || null,
      rejectionReason: row.rejection_reason || null,
      requiresPrepayment: row.requires_prepayment || false,
      paymentConfirmed: row.payment_confirmed || false,
      paymentConfirmedAt: row.payment_confirmed_at || null,
      paymentConfirmedBy: row.payment_confirmed_by || null,
      checked: row.checked || false,
      checkedAt: row.checked_at || null,
      conform: row.conform !== null ? row.conform : null,
      nonConformReason: row.non_conform_reason || null,
      checkedBy: row.checked_by || null,
      checkedByPasswordVerified: row.checked_by_password_verified || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Reject order error:', error)
    res.status(500).json({ error: 'Failed to reject order', message: error.message })
  }
})

// Rota para confirmar pagamento (apenas gestoras)
router.post('/orders/:clinicId/:orderId/confirm-payment', async (req, res) => {
  const { clinicId, orderId } = req.params
  
  // Verificar se é gestora
  const auth = req.auth || req.user
  if (!auth || auth.role !== 'GESTOR_CLINICA') {
    return res.status(403).json({ error: 'Forbidden', message: 'Apenas gestoras podem confirmar pagamento' })
  }
  
  // Verificar se a clínica corresponde
  if (auth.clinicId !== clinicId) {
    return res.status(403).json({ error: 'Forbidden', message: 'Clínica não corresponde' })
  }
  
  try {
    // Verificar se o pedido existe
    const orderResult = await query(
      `SELECT id, requires_prepayment, payment_confirmed FROM daily_order_entries WHERE id = $1 AND clinic_id = $2`,
      [orderId, clinicId]
    )
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    const order = orderResult.rows[0]
    
    if (!order.requires_prepayment) {
      return res.status(400).json({ error: 'Order does not require prepayment' })
    }
    
    if (order.payment_confirmed) {
      return res.status(400).json({ error: 'Payment already confirmed' })
    }
    
    // Confirmar pagamento
    const result = await query(
      `UPDATE daily_order_entries
       SET payment_confirmed = true, payment_confirmed_at = CURRENT_TIMESTAMP, payment_confirmed_by = $1
       WHERE id = $2 AND clinic_id = $3
       RETURNING *`,
      [auth.sub, orderId, clinicId]
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
      approved: row.approved || false,
      approvedAt: row.approved_at || null,
      approvedBy: row.approved_by || null,
      rejected: row.rejected || false,
      rejectedAt: row.rejected_at || null,
      rejectedBy: row.rejected_by || null,
      rejectionReason: row.rejection_reason || null,
      requiresPrepayment: row.requires_prepayment || false,
      paymentConfirmed: row.payment_confirmed || false,
      paymentConfirmedAt: row.payment_confirmed_at || null,
      paymentConfirmedBy: row.payment_confirmed_by || null,
      checked: row.checked || false,
      checkedAt: row.checked_at || null,
      conform: row.conform !== null ? row.conform : null,
      nonConformReason: row.non_conform_reason || null,
      checkedBy: row.checked_by || null,
      checkedByPasswordVerified: row.checked_by_password_verified || false,
      invoicePending: row.invoice_pending || false,
      documents: [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Confirm payment error:', error)
    res.status(500).json({ error: 'Failed to confirm payment', message: error.message })
  }
})

// Rota para conferir pedido (com validação de senha)
router.post('/orders/:clinicId/:orderId/check', async (req, res) => {
  const { clinicId, orderId } = req.params
  const { password, conform, nonConformReason } = req.body
  
  // Verificar autenticação
  const auth = req.auth || req.user
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  // Verificar se a clínica corresponde
  if (auth.clinicId !== clinicId) {
    return res.status(403).json({ error: 'Forbidden', message: 'Clínica não corresponde' })
  }
  
  try {
    // Verificar senha do usuário
    const userResult = await query(
      `SELECT id, password_hash FROM users WHERE id = $1`,
      [auth.sub]
    )
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }
    
    // Validar senha (em produção, usar bcrypt.compare)
    // Por enquanto, comparando diretamente (NÃO SEGURO - deve ser ajustado)
    if (userResult.rows[0].password_hash !== password) {
      return res.status(401).json({ error: 'Invalid password' })
    }
    
    // Verificar se o pedido existe e está entregue
    const orderResult = await query(
      `SELECT id, delivered FROM daily_order_entries WHERE id = $1 AND clinic_id = $2`,
      [orderId, clinicId]
    )
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    if (!orderResult.rows[0].delivered) {
      return res.status(400).json({ error: 'Order must be delivered before checking' })
    }
    
    // Validar conformidade
    if (conform === null || conform === undefined) {
      return res.status(400).json({ error: 'Conform status is required' })
    }
    
    // Se não conforme, motivo é obrigatório
    if (conform === false && (!nonConformReason || !nonConformReason.trim())) {
      return res.status(400).json({ error: 'Non-conform reason is required when order is not conform' })
    }
    
    // Conferir pedido
    const result = await query(
      `UPDATE daily_order_entries
       SET checked = true, 
           checked_at = CURRENT_TIMESTAMP, 
           checked_by = $1,
           checked_by_password_verified = true,
           conform = $2,
           non_conform_reason = $3
       WHERE id = $4 AND clinic_id = $5
       RETURNING *`,
      [auth.sub, conform, conform === false ? (nonConformReason?.trim() || null) : null, orderId, clinicId]
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
      approved: row.approved || false,
      approvedAt: row.approved_at || null,
      approvedBy: row.approved_by || null,
      rejected: row.rejected || false,
      rejectedAt: row.rejected_at || null,
      rejectedBy: row.rejected_by || null,
      rejectionReason: row.rejection_reason || null,
      requiresPrepayment: row.requires_prepayment || false,
      paymentConfirmed: row.payment_confirmed || false,
      paymentConfirmedAt: row.payment_confirmed_at || null,
      paymentConfirmedBy: row.payment_confirmed_by || null,
      checked: row.checked || false,
      checkedAt: row.checked_at || null,
      conform: row.conform !== null ? row.conform : null,
      nonConformReason: row.non_conform_reason || null,
      checkedBy: row.checked_by || null,
      checkedByPasswordVerified: row.checked_by_password_verified || false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Check order error:', error)
    res.status(500).json({ error: 'Failed to check order', message: error.message })
  }
})

// ================================
// ORDER DOCUMENTS (PROTECTED)
// ================================

// Upload documento para pedido
router.post('/orders/:clinicId/:orderId/documents', async (req, res) => {
  const { clinicId, orderId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const auth = req.auth || req.user
    if (!auth || !auth.sub) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    // Verificar se o pedido existe e pertence à clínica
    const orderResult = await query(
      `SELECT id FROM daily_order_entries WHERE id = $1 AND clinic_id = $2`,
      [orderId, clinicId]
    )
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    const { file, filename, mimeType } = req.body
    
    if (!file || !filename) {
      return res.status(400).json({ error: 'File and filename are required' })
    }
    
    // Validar formato base64
    if (!file.startsWith('data:')) {
      return res.status(400).json({ error: 'Invalid file format' })
    }
    
    // Extrair dados base64
    const matches = file.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid file format' })
    }
    
    const [, detectedMimeType, base64Data] = matches
    const buffer = Buffer.from(base64Data, 'base64')
    
    // Validar tamanho (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'File must be less than 10MB' })
    }
    
    // Gerar nome único do arquivo
    const documentId = `doc-${orderId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const fileExtension = filename.split('.').pop() || 'bin'
    const storedFilename = `${documentId}.${fileExtension}`
    
    const fs = await import('fs/promises')
    const path = await import('path')
    
    // Criar diretório se não existir
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'orders')
    await fs.mkdir(uploadsDir, { recursive: true })
    
    // Salvar arquivo
    const filePath = path.join(uploadsDir, storedFilename)
    await fs.writeFile(filePath, buffer)
    
    // Salvar metadados no banco
    const result = await query(
      `INSERT INTO order_documents 
       (id, order_id, filename, original_filename, file_path, file_size, mime_type, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        documentId,
        orderId,
        storedFilename,
        filename,
        filePath,
        buffer.length,
        mimeType || detectedMimeType || 'application/octet-stream',
        auth.sub,
      ]
    )
    
    const doc = result.rows[0]
    
    res.json({
      id: doc.id,
      orderId: doc.order_id,
      filename: doc.filename,
      originalFilename: doc.original_filename,
      filePath: doc.file_path,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      uploadedBy: doc.uploaded_by,
      uploadedAt: doc.uploaded_at,
    })
  } catch (error: any) {
    console.error('Upload document error:', error)
    res.status(500).json({ error: 'Failed to upload document', message: error.message })
  }
})

// Listar documentos de um pedido
router.get('/orders/:clinicId/:orderId/documents', async (req, res) => {
  const { clinicId, orderId } = req.params
  const hasPermission = await canViewOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    // Verificar se o pedido existe e pertence à clínica
    const orderResult = await query(
      `SELECT id FROM daily_order_entries WHERE id = $1 AND clinic_id = $2`,
      [orderId, clinicId]
    )
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    const result = await query(
      `SELECT id, order_id, filename, original_filename, file_path, file_size, mime_type, uploaded_by, uploaded_at
       FROM order_documents
       WHERE order_id = $1
       ORDER BY uploaded_at DESC`,
      [orderId]
    )
    
    res.json(result.rows.map((row) => ({
      id: row.id,
      orderId: row.order_id,
      filename: row.filename,
      originalFilename: row.original_filename,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
    })))
  } catch (error: any) {
    console.error('Get documents error:', error)
    res.status(500).json({ error: 'Failed to get documents', message: error.message })
  }
})

// Download/Visualizar documento (PROTEGIDO)
router.get('/orders/:clinicId/:orderId/documents/:documentId/download', async (req, res) => {
  const { clinicId, orderId, documentId } = req.params
  const hasPermission = await canViewOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    // Verificar se o pedido existe e pertence à clínica
    const orderResult = await query(
      `SELECT id FROM daily_order_entries WHERE id = $1 AND clinic_id = $2`,
      [orderId, clinicId]
    )
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    // Buscar documento
    const docResult = await query(
      `SELECT id, order_id, filename, original_filename, file_path, mime_type
       FROM order_documents
       WHERE id = $1 AND order_id = $2`,
      [documentId, orderId]
    )
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }
    
    const doc = docResult.rows[0]
    const fs = await import('fs/promises')
    const path = await import('path')
    
    // Verificar se arquivo existe
    try {
      await fs.access(doc.file_path)
    } catch {
      return res.status(404).json({ error: 'File not found on server' })
    }
    
    // Ler arquivo
    const fileBuffer = await fs.readFile(doc.file_path)
    
    // Determinar Content-Type
    const contentType = doc.mime_type || 'application/octet-stream'
    
    // Headers para download ou visualização
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_filename)}"`)
    res.setHeader('Content-Length', fileBuffer.length)
    
    // Enviar arquivo
    res.send(fileBuffer)
  } catch (error: any) {
    console.error('Download document error:', error)
    res.status(500).json({ error: 'Failed to download document', message: error.message })
  }
})

// Deletar documento
router.delete('/orders/:clinicId/:orderId/documents/:documentId', async (req, res) => {
  const { clinicId, orderId } = req.params
  const hasPermission = await canEditOrders(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    // Verificar se o pedido existe e pertence à clínica
    const orderResult = await query(
      `SELECT id FROM daily_order_entries WHERE id = $1 AND clinic_id = $2`,
      [orderId, clinicId]
    )
    
    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    
    // Buscar documento
    const docResult = await query(
      `SELECT id, file_path FROM order_documents WHERE id = $1 AND order_id = $2`,
      [req.params.documentId, orderId]
    )
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }
    
    const doc = docResult.rows[0]
    const fs = await import('fs/promises')
    
    // Deletar arquivo do sistema de arquivos
    try {
      await fs.unlink(doc.file_path)
    } catch (error: any) {
      console.warn('Failed to delete file from filesystem:', error.message)
      // Continuar mesmo se o arquivo não existir
    }
    
    // Deletar registro do banco
    await query(
      `DELETE FROM order_documents WHERE id = $1`,
      [req.params.documentId]
    )
    
    res.json({ message: 'Document deleted successfully' })
  } catch (error: any) {
    console.error('Delete document error:', error)
    res.status(500).json({ error: 'Failed to delete document', message: error.message })
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

// ================================
// ADVANCE INVOICE ENTRIES
// ================================
router.get('/advance-invoice/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    
    // Get manual entries
    const manualEntriesResult = await query(
      `SELECT * FROM daily_advance_invoice_entries WHERE clinic_id = $1 ORDER BY date DESC`,
      [clinicId]
    )

    const manualEntries = manualEntriesResult.rows.map((row) => ({
      id: row.id,
      date: row.date,
      patientName: row.patient_name,
      code: row.code,
      doctorId: row.doctor_id || null,
      billedToThirdParty: row.billed_to_third_party || false,
      thirdPartyCode: row.third_party_code || null,
      thirdPartyName: row.third_party_name || null,
      value: parseFloat(row.value),
    }))

    // Get billing batches (lotes) issued/paid for this clinic
    // Group items by person (dependent_id) within each batch
    // IMPORTANT: Uses LEFT JOIN on billing_items to include empty batches (batches with no items)
    // Check if third party columns exist (for backward compatibility)
    let batchesResult
    try {
      batchesResult = await query(
        `WITH batch_items_grouped AS (
          SELECT
            bi.batch_id,
            bi.dependent_id,
            cd.name as dependent_name,
            cd.relationship as dependent_relationship,
            SUM(bi.total_value) as total_value
          FROM billing_items bi
          LEFT JOIN contract_dependents cd ON bi.dependent_id = cd.id
          WHERE bi.status != 'REMOVED'
          GROUP BY bi.batch_id, bi.dependent_id, cd.name, cd.relationship
        )
        SELECT
          bb.id as batch_id,
          bb.batch_number,
          bb.doctor_id,
          bb.issued_at,
          bb.contract_id,
          bb.total_amount,
          ac.patient_id,
          COALESCE(ac.billed_to_third_party, false) as contract_billed_to_third_party,
          ac.third_party_code as contract_third_party_code,
          ac.third_party_name as contract_third_party_name,
          p.code as patient_code,
          p.name as patient_name,
          -- Se o lote tem dependent_id próprio (lote vazio), usa ele; senão usa dos itens
          COALESCE(bb.dependent_id, big.dependent_id, NULL) as dependent_id,
          COALESCE(bb.dependent_name, big.dependent_name, NULL) as dependent_name,
          big.dependent_relationship,
          COALESCE(big.total_value, bb.total_amount) as total_value
         FROM billing_batches bb
         INNER JOIN advance_contracts ac ON bb.contract_id = ac.id
         INNER JOIN patients p ON ac.patient_id = p.id
         LEFT JOIN batch_items_grouped big ON bb.id = big.batch_id
         WHERE ac.clinic_id = $1
           AND bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
         ORDER BY bb.issued_at DESC, big.dependent_id NULLS FIRST`,
        [clinicId]
      )
    } catch (thirdPartyError) {
      // If the query fails (likely because third party columns don't exist yet), try without them
      console.log('[Advance Invoice Report] Third party columns not found, using fallback query')
      batchesResult = await query(
        `WITH batch_items_grouped AS (
          SELECT
            bi.batch_id,
            bi.dependent_id,
            cd.name as dependent_name,
            cd.relationship as dependent_relationship,
            SUM(bi.total_value) as total_value
          FROM billing_items bi
          LEFT JOIN contract_dependents cd ON bi.dependent_id = cd.id
          WHERE bi.status != 'REMOVED'
          GROUP BY bi.batch_id, bi.dependent_id, cd.name, cd.relationship
        )
        SELECT
          bb.id as batch_id,
          bb.batch_number,
          bb.doctor_id,
          bb.issued_at,
          bb.contract_id,
          bb.total_amount,
          ac.patient_id,
          false as contract_billed_to_third_party,
          NULL as contract_third_party_code,
          NULL as contract_third_party_name,
          p.code as patient_code,
          p.name as patient_name,
          -- Se o lote tem dependent_id próprio (lote vazio), usa ele; senão usa dos itens
          COALESCE(bb.dependent_id, big.dependent_id, NULL) as dependent_id,
          COALESCE(bb.dependent_name, big.dependent_name, NULL) as dependent_name,
          big.dependent_relationship,
          COALESCE(big.total_value, bb.total_amount) as total_value
         FROM billing_batches bb
         INNER JOIN advance_contracts ac ON bb.contract_id = ac.id
         INNER JOIN patients p ON ac.patient_id = p.id
         LEFT JOIN batch_items_grouped big ON bb.id = big.batch_id
         WHERE ac.clinic_id = $1
           AND bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
         ORDER BY bb.issued_at DESC, big.dependent_id NULLS FIRST`,
        [clinicId]
      )
    }
    
    console.log(`[Advance Invoice Report] Found ${batchesResult.rows.length} batch groups for clinic ${clinicId}`)

    // Debug: Log all rows to see what's being returned
    console.log('[Advance Invoice Report] Sample rows:', JSON.stringify(batchesResult.rows.slice(0, 3), null, 2))

    // Convert batches to DailyAdvanceInvoiceEntry format
    const batchEntries = batchesResult.rows.map((row) => {
      const isDependent = row.dependent_id !== null
      const contractBilledToThirdParty = row.contract_billed_to_third_party || false

      // Debug log - sempre logar para ver o que está vindo
      console.log(`[Advance Invoice] Processing row:`, {
        batch_id: row.batch_id,
        dependent_id: row.dependent_id,
        dependent_name: row.dependent_name,
        patient_name: row.patient_name,
        isDependent,
      })

      // Convert issued_at timestamp to date string
      let dateStr = new Date().toISOString().split('T')[0]
      if (row.issued_at) {
        const issuedDate = new Date(row.issued_at)
        dateStr = issuedDate.toISOString().split('T')[0]
      }

      // Determine if this entry should be marked as billed to third party
      // It's a third party if:
      // 1. The contract itself is billed to a third party (e.g., employer), OR
      // 2. It's a dependent (family member of the titular)
      const billedToThirdParty = contractBilledToThirdParty || isDependent

      // Determine the third party code and name
      let thirdPartyCode = null
      let thirdPartyName = null

      if (contractBilledToThirdParty) {
        // If contract is billed to third party, use contract's third party info
        thirdPartyCode = row.contract_third_party_code || 'TER'
        thirdPartyName = row.contract_third_party_name || null
      } else if (isDependent) {
        // If it's a dependent, show dependent name in third party name
        // (so it appears in the "Nome" column, not as patient name)
        thirdPartyCode = 'TER'
        thirdPartyName = row.dependent_name || 'Dependente (nome não especificado)'
      }

      return {
        id: `batch-${row.batch_id}-${row.dependent_id || 'titular'}`,
        date: dateStr,
        patientName: row.patient_name, // Always use titular's name as patient name
        code: row.patient_code, // Always use patient code (titular's code)
        doctorId: row.doctor_id || null,
        billedToThirdParty,
        thirdPartyCode,
        thirdPartyName,
        value: parseFloat(row.total_value || '0'),
        batchNumber: row.batch_number || null, // Número do lote
        batchId: row.batch_id || null, // ID do lote
      }
    })

    // Combine manual entries and batch entries
    const allEntries = [...manualEntries, ...batchEntries]

    res.json(allEntries)
  } catch (error) {
    console.error('Get advance invoice entries error:', error)
    res.status(500).json({ error: 'Failed to fetch advance invoice entries' })
  }
})

router.post('/advance-invoice/:clinicId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditAdvanceInvoice(req, clinicId)
  
  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { id, date, patientName, code, doctorId, billedToThirdParty, thirdPartyCode, thirdPartyName, value } = req.body
    
    // Validate required fields
    if (!date || !patientName || !code || value === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    // Validate: if billedToThirdParty is true, thirdPartyName is required
    if (billedToThirdParty && !thirdPartyName) {
      return res.status(400).json({ error: 'Nome do terceiro é obrigatório quando faturado para terceiros' })
    }
    
    const entryId =
      id || `advance-invoice-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    // Se for faturado para terceiros e não tiver código, usar 'TER'
    const finalThirdPartyCode = billedToThirdParty ? (thirdPartyCode || 'TER') : null

    const result = await query(
      `INSERT INTO daily_advance_invoice_entries
       (id, clinic_id, date, patient_name, code, doctor_id, billed_to_third_party, third_party_code, third_party_name, value)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        entryId,
        clinicId,
        date,
        patientName,
        code,
        doctorId || null,
        billedToThirdParty || false,
        finalThirdPartyCode,
        thirdPartyName || null,
        value,
      ]
    )

    res.status(201).json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      doctorId: result.rows[0].doctor_id || null,
      billedToThirdParty: result.rows[0].billed_to_third_party || false,
      thirdPartyCode: result.rows[0].third_party_code || null,
      thirdPartyName: result.rows[0].third_party_name || null,
      value: parseFloat(result.rows[0].value),
    })
  } catch (error: any) {
    console.error('Create advance invoice entry error:', error)
    res.status(500).json({
      error: 'Failed to create advance invoice entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.put('/advance-invoice/:clinicId/:entryId', async (req, res) => {
  const { clinicId, entryId } = req.params

  // IMPORTANT: Reject attempts to edit batch-generated entries
  if (entryId.startsWith('batch-')) {
    return res.status(400).json({
      error: 'Não é possível editar faturas geradas por lotes. Acesse o módulo de Adiantamentos para gerenciar lotes.'
    })
  }

  const hasPermission = await canEditAdvanceInvoice(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { date, patientName, code, doctorId, billedToThirdParty, thirdPartyCode, thirdPartyName, value } = req.body

    // Validate required fields
    if (!date || !patientName || !code || value === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    // Validate: if billedToThirdParty is true, thirdPartyName is required
    if (billedToThirdParty && !thirdPartyName) {
      return res.status(400).json({ error: 'Nome do terceiro é obrigatório quando faturado para terceiros' })
    }

    // Check if entry exists
    const checkResult = await query(
      `SELECT id FROM daily_advance_invoice_entries WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    // Se for faturado para terceiros e não tiver código, usar 'TER'
    const finalThirdPartyCode = billedToThirdParty ? (thirdPartyCode || 'TER') : null

    // Update entry
    const result = await query(
      `UPDATE daily_advance_invoice_entries
       SET date = $1, patient_name = $2, code = $3, doctor_id = $4,
           billed_to_third_party = $5, third_party_code = $6, third_party_name = $7, value = $8
       WHERE id = $9 AND clinic_id = $10
       RETURNING *`,
      [
        date,
        patientName,
        code,
        doctorId || null,
        billedToThirdParty || false,
        finalThirdPartyCode,
        thirdPartyName || null,
        value,
        entryId,
        clinicId,
      ]
    )

    res.json({
      id: result.rows[0].id,
      date: result.rows[0].date,
      patientName: result.rows[0].patient_name,
      code: result.rows[0].code,
      doctorId: result.rows[0].doctor_id || null,
      billedToThirdParty: result.rows[0].billed_to_third_party || false,
      thirdPartyCode: result.rows[0].third_party_code || null,
      thirdPartyName: result.rows[0].third_party_name || null,
      value: parseFloat(result.rows[0].value),
    })
  } catch (error: any) {
    console.error('Update advance invoice entry error:', error)
    res.status(500).json({
      error: 'Failed to update advance invoice entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.delete('/advance-invoice/:clinicId/:entryId', async (req, res) => {
  const { clinicId, entryId } = req.params

  // IMPORTANT: Reject attempts to delete batch-generated entries
  if (entryId.startsWith('batch-')) {
    return res.status(400).json({
      error: 'Não é possível excluir faturas geradas por lotes. Acesse o módulo de Adiantamentos para gerenciar lotes.'
    })
  }

  const hasPermission = await canEditAdvanceInvoice(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const result = await query(
      `DELETE FROM daily_advance_invoice_entries WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [entryId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Delete advance invoice entry error:', error)
    res.status(500).json({ error: 'Failed to delete advance invoice entry' })
  }
})

// ================================
// ACCOUNTS PAYABLE ENTRIES
// ================================
router.get('/accounts-payable/:clinicId', requirePermission('canViewAccountsPayable'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const userId = (req as any).auth?.sub || (req as any).user?.sub
    const role = (req as any).auth?.role || (req as any).user?.role

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    // Verificar se usuário tem acesso à clínica
    if (role === 'COLABORADOR') {
      const userClinic = await query(
        'SELECT clinic_id FROM users WHERE id = $1',
        [userId]
      )
      if (userClinic.rows[0]?.clinic_id !== clinicId) {
        return res.status(403).json({ error: 'Acesso negado' })
      }
    }

    const result = await query(
      `SELECT
        ap.*,
        s.name as supplier_name,
        s.iban as supplier_iban,
        s.nib as supplier_nib,
        s.bank_name as supplier_bank_name,
        s.bank_account as supplier_bank_account,
        s.bank_agency as supplier_bank_agency,
        s.bank_code as supplier_bank_code,
        s.pix_key as supplier_pix_key
      FROM accounts_payable ap
      LEFT JOIN suppliers s ON ap.supplier_id = s.id
      WHERE ap.clinic_id = $1
      ORDER BY ap.due_date ASC, ap.created_at DESC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        clinicId: row.clinic_id,
        description: row.description,
        supplierId: row.supplier_id || null,
        supplierName: row.supplier_name || null,
        supplierIban: row.supplier_iban || null,
        supplierNib: row.supplier_nib || null,
        supplierBankName: row.supplier_bank_name || null,
        supplierBankAccount: row.supplier_bank_account || null,
        supplierBankAgency: row.supplier_bank_agency || null,
        supplierBankCode: row.supplier_bank_code || null,
        supplierPixKey: row.supplier_pix_key || null,
        amount: parseFloat(row.amount),
        dueDate: row.due_date,
        paid: row.paid || false,
        paidDate: row.paid_date || null,
        category: row.category || null,
        notes: row.notes || null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    )
  } catch (error) {
    console.error('Get accounts payable entries error:', error)
    res.status(500).json({ error: 'Failed to fetch accounts payable entries' })
  }
})

router.get('/accounts-payable/:clinicId/counts', requirePermission('canViewAccountsPayable'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const userId = (req as any).auth?.sub || (req as any).user?.sub
    const role = (req as any).auth?.role || (req as any).user?.role

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    // Verificar se usuário tem acesso à clínica
    if (role === 'COLABORADOR') {
      const userClinic = await query(
        'SELECT clinic_id FROM users WHERE id = $1',
        [userId]
      )
      if (userClinic.rows[0]?.clinic_id !== clinicId) {
        return res.status(403).json({ error: 'Acesso negado' })
      }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]
    
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const nextWeekStr = nextWeek.toISOString().split('T')[0]

    // Contas vencidas (antes de hoje)
    const overdueResult = await query(
      `SELECT COUNT(*) as count 
       FROM accounts_payable 
       WHERE clinic_id = $1 AND paid = false AND due_date < $2`,
      [clinicId, todayStr]
    )

    // Contas com vencimento hoje
    const todayResult = await query(
      `SELECT COUNT(*) as count 
       FROM accounts_payable 
       WHERE clinic_id = $1 AND paid = false AND due_date = $2`,
      [clinicId, todayStr]
    )

    // Contas com vencimento na próxima semana (excluindo hoje)
    const weekResult = await query(
      `SELECT COUNT(*) as count 
       FROM accounts_payable 
       WHERE clinic_id = $1 AND paid = false AND due_date > $2 AND due_date <= $3`,
      [clinicId, todayStr, nextWeekStr]
    )

    res.json({
      overdue: parseInt(overdueResult.rows[0].count) || 0,
      today: parseInt(todayResult.rows[0].count) || 0,
      week: parseInt(weekResult.rows[0].count) || 0,
    })
  } catch (error) {
    console.error('Get accounts payable counts error:', error)
    res.status(500).json({ error: 'Failed to fetch accounts payable counts' })
  }
})

router.get('/accounts-payable/:clinicId/categories', requirePermission('canViewAccountsPayable'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const userId = (req as any).auth?.sub || (req as any).user?.sub
    const role = (req as any).auth?.role || (req as any).user?.role
    const { search } = req.query

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    // Verificar se usuário tem acesso à clínica
    if (role === 'COLABORADOR') {
      const userClinic = await query(
        'SELECT clinic_id FROM users WHERE id = $1',
        [userId]
      )
      if (userClinic.rows[0]?.clinic_id !== clinicId) {
        return res.status(403).json({ error: 'Acesso negado' })
      }
    }

    // Buscar categorias únicas (não nulas e não vazias)
    let queryStr = `
      SELECT DISTINCT category 
      FROM accounts_payable 
      WHERE clinic_id = $1 AND category IS NOT NULL AND category != ''
    `
    const params: any[] = [clinicId]

    // Se houver busca, filtrar por categoria
    if (search && typeof search === 'string' && search.trim()) {
      queryStr += ` AND LOWER(category) LIKE LOWER($2)`
      params.push(`%${search.trim()}%`)
    }

    queryStr += ` ORDER BY category ASC`

    const result = await query(queryStr, params)

    const categories = result.rows.map((row) => row.category).filter(Boolean)

    res.json(categories)
  } catch (error) {
    console.error('Get accounts payable categories error:', error)
    res.status(500).json({ error: 'Failed to fetch accounts payable categories' })
  }
})

router.post('/accounts-payable/:clinicId', requirePermission('canEditAccountsPayable'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { id, description, supplierId, amount, dueDate, category, notes } = req.body
    
    // Validate required fields
    if (!description || !amount || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields: description, amount, dueDate' })
    }
    
    const entryId = id || `accounts-payable-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    
    await query(
      `INSERT INTO accounts_payable 
       (id, clinic_id, description, supplier_id, amount, due_date, category, notes, paid, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        entryId,
        clinicId,
        description,
        supplierId || null,
        amount,
        dueDate,
        category || null,
        notes || null,
      ]
    )

    res.json({
      id: entryId,
      clinicId,
      description,
      supplierId: supplierId || null,
      amount: parseFloat(amount),
      dueDate,
      paid: false,
      category: category || null,
      notes: notes || null,
    })
  } catch (error: any) {
    console.error('Create accounts payable entry error:', error)
    res.status(500).json({
      error: 'Failed to create accounts payable entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.put('/accounts-payable/:clinicId/:entryId', requirePermission('canEditAccountsPayable'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { entryId } = req.params
    const { description, supplierId, amount, dueDate, paid, paidDate, category, notes } = req.body
    
    // Validate required fields
    if (!description || !amount || !dueDate) {
      return res.status(400).json({ error: 'Missing required fields: description, amount, dueDate' })
    }
    
    // Check if entry exists
    const checkResult = await query(
      `SELECT id FROM accounts_payable WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }
    
    await query(
      `UPDATE accounts_payable
       SET description = $1,
           supplier_id = $2,
           amount = $3,
           due_date = $4,
           paid = $5,
           paid_date = $6,
           category = $7,
           notes = $8,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $9 AND clinic_id = $10`,
      [
        description,
        supplierId || null,
        amount,
        dueDate,
        paid || false,
        paidDate || null,
        category || null,
        notes || null,
        entryId,
        clinicId,
      ]
    )

    res.json({
      id: entryId,
      clinicId,
      description,
      supplierId: supplierId || null,
      amount: parseFloat(amount),
      dueDate,
      paid: paid || false,
      paidDate: paidDate || null,
      category: category || null,
      notes: notes || null,
    })
  } catch (error: any) {
    console.error('Update accounts payable entry error:', error)
    res.status(500).json({
      error: 'Failed to update accounts payable entry',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

router.delete('/accounts-payable/:clinicId/:entryId', requirePermission('canEditAccountsPayable'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { entryId } = req.params
    const result = await query(
      `DELETE FROM accounts_payable WHERE id = $1 AND clinic_id = $2 RETURNING *`,
      [entryId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }

    res.json({ message: 'Entry deleted successfully' })
  } catch (error) {
    console.error('Delete accounts payable entry error:', error)
    res.status(500).json({ error: 'Failed to delete accounts payable entry' })
  }
})

// ================================
// ACCOUNTS PAYABLE DOCUMENTS
// ================================

// Upload documento para conta a pagar
router.post('/accounts-payable/:clinicId/:entryId/documents', requirePermission('canEditAccountsPayable'), async (req, res) => {
  try {
    // Decodificar os parâmetros da URL para lidar com caracteres especiais
    const clinicId = decodeURIComponent(req.params.clinicId)
    const entryId = decodeURIComponent(req.params.entryId)
    const { file, filename, mimeType } = req.body
    
    if (!file || !filename) {
      return res.status(400).json({ error: 'File and filename are required' })
    }
    
    // Validar formato base64
    if (!file.startsWith('data:')) {
      return res.status(400).json({ error: 'Invalid file format' })
    }

    // Extrair dados base64
    const matches = file.match(/^data:([^;]+);base64,(.+)$/)
    if (!matches) {
      return res.status(400).json({ error: 'Invalid file format' })
    }

    const [, detectedMimeType, base64Data] = matches

    // Validar que é PDF
    if (detectedMimeType !== 'application/pdf' && mimeType !== 'application/pdf') {
      return res.status(400).json({ error: 'Apenas arquivos PDF são permitidos' })
    }

    // Validar tamanho do base64 (Vercel tem limite de ~4.5MB no body da requisição)
    // Base64 aumenta o tamanho em ~33%, então um arquivo de 3MB vira ~4MB em base64
    const base64SizeInMB = (base64Data.length / 1024 / 1024)
    if (base64SizeInMB > 3.5) {
      return res.status(413).json({
        error: 'Arquivo muito grande',
        message: 'O arquivo deve ter no máximo 3MB devido a limitações da plataforma de hospedagem'
      })
    }

    const buffer = Buffer.from(base64Data, 'base64')

    // Validar tamanho do arquivo decodificado (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({
        error: 'Arquivo muito grande',
        message: 'O arquivo deve ter no máximo 10MB'
      })
    }
    
    // Verificar se a conta existe
    const entryResult = await query(
      `SELECT id FROM accounts_payable WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )
    
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Accounts payable entry not found' })
    }
    
    // Gerar nome único do arquivo
    const documentId = `doc-${entryId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const fileExtension = 'pdf'
    const storedFilename = `${documentId}.${fileExtension}`
    
    // Salvar metadados e arquivo diretamente no banco de dados
    const auth = req.auth || req.user
    const result = await query(
      `INSERT INTO accounts_payable_documents 
       (id, accounts_payable_id, filename, original_filename, file_path, file_size, mime_type, uploaded_by, file_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, accounts_payable_id, filename, original_filename, file_size, mime_type, uploaded_by, uploaded_at`,
      [
        documentId,
        entryId,
        storedFilename,
        filename,
        null, // file_path agora é opcional (mantido para compatibilidade)
        buffer.length,
        mimeType || detectedMimeType || 'application/pdf',
        auth?.sub || auth?.id || null,
        buffer, // Armazenar o arquivo diretamente no banco como BYTEA
      ]
    )
    
    const doc = result.rows[0]
    
    res.json({
      id: doc.id,
      accountsPayableId: doc.accounts_payable_id,
      filename: doc.filename,
      originalFilename: doc.original_filename,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
      uploadedBy: doc.uploaded_by,
      uploadedAt: doc.uploaded_at,
    })
  } catch (error: any) {
    console.error('Upload document error:', error)
    res.status(500).json({ error: 'Failed to upload document', message: error.message })
  }
})

// Listar documentos de uma conta a pagar
router.get('/accounts-payable/:clinicId/:entryId/documents', requirePermission('canViewAccountsPayable'), async (req, res) => {
  try {
    // Decodificar os parâmetros da URL para lidar com caracteres especiais
    const clinicId = decodeURIComponent(req.params.clinicId)
    const entryId = decodeURIComponent(req.params.entryId)
    
    // Verificar se a conta existe e pertence à clínica
    const entryResult = await query(
      `SELECT id FROM accounts_payable WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )
    
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Accounts payable entry not found' })
    }
    
    const result = await query(
      `SELECT id, accounts_payable_id, filename, original_filename, file_path, 
              file_size, mime_type, uploaded_by, uploaded_at
       FROM accounts_payable_documents
       WHERE accounts_payable_id = $1
       ORDER BY uploaded_at DESC`,
      [entryId]
    )
    
    res.json(result.rows.map(row => ({
      id: row.id,
      accountsPayableId: row.accounts_payable_id,
      filename: row.filename,
      originalFilename: row.original_filename,
      filePath: row.file_path,
      fileSize: row.file_size,
      mimeType: row.mime_type,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
    })))
  } catch (error: any) {
    console.error('Get documents error:', error)
    res.status(500).json({ error: 'Failed to get documents', message: error.message })
  }
})

// Download documento
router.get('/accounts-payable/:clinicId/:entryId/documents/:documentId/download', requirePermission('canViewAccountsPayable'), async (req, res) => {
  try {
    // Decodificar os parâmetros da URL para lidar com caracteres especiais
    const clinicId = decodeURIComponent(req.params.clinicId)
    const entryId = decodeURIComponent(req.params.entryId)
    const documentId = decodeURIComponent(req.params.documentId)
    
    console.log('Download document request:', { clinicId, entryId, documentId })
    
    // Verificar se a conta existe e pertence à clínica
    const entryResult = await query(
      `SELECT id FROM accounts_payable WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )
    
    if (entryResult.rows.length === 0) {
      console.error('Accounts payable entry not found:', { entryId, clinicId })
      return res.status(404).json({ error: 'Accounts payable entry not found' })
    }
    
    // Buscar documento (incluindo file_data)
    const docResult = await query(
      `SELECT id, file_data, original_filename, mime_type, file_size FROM accounts_payable_documents 
       WHERE id = $1 AND accounts_payable_id = $2`,
      [documentId, entryId]
    )
    
    if (docResult.rows.length === 0) {
      console.error('Document not found in database:', { documentId, entryId })
      return res.status(404).json({ error: 'Document not found', documentId, entryId })
    }
    
    const doc = docResult.rows[0]
    
    // Verificar se o arquivo está armazenado no banco
    if (!doc.file_data) {
      console.error('File data not found in database for document:', documentId)
      return res.status(404).json({ 
        error: 'File data not found. Document may need to be re-uploaded.',
        documentId 
      })
    }
    
    // Converter o buffer do PostgreSQL (BYTEA) para Buffer do Node.js
    const fileBuffer = Buffer.from(doc.file_data)
    console.log('File read from database successfully, size:', fileBuffer.length)
    
    res.setHeader('Content-Type', doc.mime_type || 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_filename)}"`)
    res.setHeader('Content-Length', fileBuffer.length)
    res.send(fileBuffer)
  } catch (error: any) {
    console.error('Download document error:', {
      error: error.message,
      stack: error.stack,
      params: req.params
    })
    res.status(500).json({ error: 'Failed to download document', message: error.message })
  }
})

// Deletar documento
router.delete('/accounts-payable/:clinicId/:entryId/documents/:documentId', requirePermission('canEditAccountsPayable'), async (req, res) => {
  try {
    // Decodificar os parâmetros da URL para lidar com caracteres especiais
    const clinicId = decodeURIComponent(req.params.clinicId)
    const entryId = decodeURIComponent(req.params.entryId)
    const documentId = decodeURIComponent(req.params.documentId)
    
    // Verificar se a conta existe e pertence à clínica
    const entryResult = await query(
      `SELECT id FROM accounts_payable WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )
    
    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Accounts payable entry not found' })
    }
    
    // Verificar se o documento existe
    const docResult = await query(
      `SELECT id FROM accounts_payable_documents 
       WHERE id = $1 AND accounts_payable_id = $2`,
      [documentId, entryId]
    )
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }
    
    // Deletar registro do banco (o arquivo será deletado automaticamente junto com o registro)
    await query(
      `DELETE FROM accounts_payable_documents WHERE id = $1`,
      [documentId]
    )
    
    res.json({ message: 'Document deleted successfully' })
  } catch (error: any) {
    console.error('Delete document error:', error)
    res.status(500).json({ error: 'Failed to delete document', message: error.message })
  }
})

export default router
