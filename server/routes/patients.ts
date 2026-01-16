import { Router } from 'express'
import { query, getClient } from '../db.js'
import { getUserPermissions } from '../middleware/permissions.js'

const router = Router()

/**
 * Helper function to check if user can edit patients
 * GESTOR_CLINICA and MENTOR always can, COLABORADOR needs canEditPatients permission
 */
async function canEditPatients(req: any, clinicId: string): Promise<boolean> {
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
    return permissions.canEditPatients === true
  }

  return false
}

// Get all patients for a clinic
router.get('/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { search } = req.query

    // Buscar pacientes da tabela patients
    let queryText = `
      SELECT id, code, name, email, phone, birth_date, notes, created_at
      FROM patients
      WHERE clinic_id = $1
    `
    const params: any[] = [clinicId]

    if (search && typeof search === 'string') {
      queryText += ` AND (LOWER(name) LIKE $2 OR code LIKE $2)`
      params.push(`%${search.toLowerCase()}%`)
    }

    queryText += ` ORDER BY name ASC`

    const patientsResult = await query(queryText, params)
    const patients = patientsResult.rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      email: row.email,
      phone: row.phone,
      birthDate: row.birth_date,
      notes: row.notes,
      createdAt: row.created_at,
    }))

    // Buscar pacientes que existem apenas em entradas diárias
    let dailyPatients: any[] = []
    try {
      // Get existing patient codes to exclude
      const existingCodes = patients.map(p => p.code)

      let dailyQuery = `
        SELECT DISTINCT code, patient_name as name
        FROM (
          SELECT code, patient_name FROM daily_consultation_entries WHERE clinic_id = $1 AND code IS NOT NULL AND patient_name IS NOT NULL
          UNION
          SELECT code, patient_name FROM daily_financial_entries WHERE clinic_id = $1 AND code IS NOT NULL AND patient_name IS NOT NULL
          UNION
          SELECT code, patient_name FROM daily_service_time_entries WHERE clinic_id = $1 AND code IS NOT NULL AND patient_name IS NOT NULL
          UNION
          SELECT code, patient_name FROM daily_source_entries WHERE clinic_id = $1 AND code IS NOT NULL AND patient_name IS NOT NULL
        ) daily_patients
      `
      const dailyParams: any[] = [clinicId]

      // Add search filter
      if (search && typeof search === 'string') {
        dailyQuery += ` WHERE (LOWER(patient_name) LIKE $2 OR code LIKE $2)`
        dailyParams.push(`%${search.toLowerCase()}%`)
      }

      dailyQuery += ` ORDER BY patient_name ASC`

      const dailyResult = await query(dailyQuery, dailyParams)

      // Filter out patients that already exist in the patients table
      dailyPatients = dailyResult.rows
        .filter((row) => !existingCodes.includes(row.code))
        .map((row) => ({
          id: `temp-${clinicId}-${row.code}`,
          code: row.code,
          name: row.name,
          email: null,
          phone: null,
          birthDate: null,
          notes: null,
          createdAt: null,
        }))
    } catch (dailyError: any) {
      console.error('Error fetching daily patients:', dailyError)
      console.error('Daily error details:', {
        message: dailyError.message,
        code: dailyError.code,
        detail: dailyError.detail
      })
      // Continue sem os pacientes diários se houver erro
    }

    // Combinar e ordenar
    const allPatients = [...patients, ...dailyPatients].sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    res.json(allPatients)
  } catch (error: any) {
    console.error('Get patients error:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    })
    res.status(500).json({
      error: 'Failed to fetch patients',
      details: error.message
    })
  }
})

// Get patient by code
router.get('/:clinicId/code/:code', async (req, res) => {
  try {
    const { clinicId, code } = req.params

    if (!/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 1-6 digits' })
    }

    // Primeiro, buscar na tabela patients
    const result = await query(
      `SELECT id, code, name, email, phone, birth_date, notes, created_at
       FROM patients
       WHERE clinic_id = $1 AND code = $2`,
      [clinicId, code]
    )

    if (result.rows.length > 0) {
      const row = result.rows[0]
      return res.json({
        id: row.id,
        code: row.code,
        name: row.name,
        email: row.email,
        phone: row.phone,
        birthDate: row.birth_date,
        notes: row.notes,
        createdAt: row.created_at,
      })
    }

    // Se não encontrou em patients, buscar em daily_consultation_entries
    const consultationResult = await query(
      `SELECT DISTINCT code, patient_name as name
       FROM daily_consultation_entries
       WHERE clinic_id = $1 AND code = $2
       LIMIT 1`,
      [clinicId, code]
    )

    if (consultationResult.rows.length > 0) {
      const row = consultationResult.rows[0]
      // Retornar um paciente "virtual" baseado na entrada de consulta
      return res.json({
        id: `temp-${clinicId}-${code}`,
        code: row.code,
        name: row.name,
        email: null,
        phone: null,
        birthDate: null,
        notes: null,
        createdAt: null,
      })
    }

    // Se não encontrou em consultation, buscar em daily_financial_entries
    const financialResult = await query(
      `SELECT DISTINCT code, patient_name as name
       FROM daily_financial_entries
       WHERE clinic_id = $1 AND code = $2
       LIMIT 1`,
      [clinicId, code]
    )

    if (financialResult.rows.length > 0) {
      const row = financialResult.rows[0]
      return res.json({
        id: `temp-${clinicId}-${code}`,
        code: row.code,
        name: row.name,
        email: null,
        phone: null,
        birthDate: null,
        notes: null,
        createdAt: null,
      })
    }

    // Se não encontrou em nenhuma tabela, retornar 404
    return res.status(404).json({ error: 'Patient not found' })
  } catch (error) {
    console.error('Get patient by code error:', error)
    res.status(500).json({ error: 'Failed to fetch patient' })
  }
})

// Create patient
router.post('/:clinicId', async (req, res) => {
  // Removida a restrição de GESTOR_CLINICA - agora todos os usuários autenticados podem criar pacientes
  // Verificar apenas se o usuário pertence à clínica (se autenticado)
  if (req.user && req.user.clinicId !== req.params.clinicId) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { clinicId } = req.params
    const { code, name, email, phone, birthDate, notes } = req.body

    // Validate code
    if (!code || !/^\d{1,6}$/.test(code)) {
      return res.status(400).json({ error: 'Code must be 1-6 digits' })
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Check if code already exists
    const existing = await query(
      'SELECT id FROM patients WHERE clinic_id = $1 AND code = $2',
      [clinicId, code]
    )

    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Patient code already exists' })
    }

    // Generate a unique ID
    const patientId = `patient-${clinicId}-${code}`

    const result = await query(
      `INSERT INTO patients (id, clinic_id, code, name, email, phone, birth_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, code, name, email, phone, birth_date, notes, created_at`,
      [patientId, clinicId, code, name.trim(), email || null, phone || null, birthDate || null, notes || null]
    )

    const row = result.rows[0]
    res.status(201).json({
      id: row.id,
      code: row.code,
      name: row.name,
      email: row.email,
      phone: row.phone,
      birthDate: row.birth_date,
      notes: row.notes,
      createdAt: row.created_at,
    })
  } catch (error) {
    console.error('Create patient error:', error)
    res.status(500).json({ error: 'Failed to create patient' })
  }
})

// Get patient history (all records by code)
router.get('/:clinicId/:patientId/history', async (req, res) => {
  try {
    const { clinicId, patientId } = req.params

    // Get patient code first
    const patientResult = await query(
      'SELECT code FROM patients WHERE id = $1 AND clinic_id = $2',
      [patientId, clinicId]
    )

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    const code = patientResult.rows[0].code

    // Fetch all records for this patient code
    const [financial, consultation, serviceTime, source] = await Promise.all([
      query(
        `SELECT id, date, patient_name, code, category_id, value, cabinet_id, doctor_id, payment_source_id, created_at
         FROM daily_financial_entries
         WHERE clinic_id = $1 AND code = $2
         ORDER BY date DESC`,
        [clinicId, code]
      ),
      query(
        `SELECT id, date, patient_name, code, plan_created, plan_created_at, plan_presented, 
                plan_presented_at, plan_accepted, plan_accepted_at, plan_value, created_at
         FROM daily_consultation_entries
         WHERE clinic_id = $1 AND code = $2
         ORDER BY date DESC`,
        [clinicId, code]
      ),
      query(
        `SELECT id, date, patient_name, code, doctor_id, scheduled_time, actual_start_time, delay_reason, created_at
         FROM daily_service_time_entries
         WHERE clinic_id = $1 AND code = $2
         ORDER BY date DESC`,
        [clinicId, code]
      ),
      query(
        `SELECT id, date, patient_name, code, is_referral, source_id, referral_name, referral_code, campaign_id, created_at
         FROM daily_source_entries
         WHERE clinic_id = $1 AND code = $2
         ORDER BY date DESC`,
        [clinicId, code]
      ),
    ])

    res.json({
      financial: financial.rows.map(row => ({
        id: row.id,
        date: row.date,
        patientName: row.patient_name,
        code: row.code,
        categoryId: row.category_id,
        value: parseFloat(row.value),
        cabinetId: row.cabinet_id,
        doctorId: row.doctor_id,
        paymentSourceId: row.payment_source_id,
        createdAt: row.created_at,
      })),
      consultation: consultation.rows.map(row => ({
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
        planValue: row.plan_value ? parseFloat(row.plan_value) : 0,
        createdAt: row.created_at,
      })),
      serviceTime: serviceTime.rows.map(row => ({
        id: row.id,
        date: row.date,
        patientName: row.patient_name,
        code: row.code,
        doctorId: row.doctor_id,
        scheduledTime: row.scheduled_time,
        actualStartTime: row.actual_start_time,
        delayReason: row.delay_reason,
        createdAt: row.created_at,
      })),
      source: source.rows.map(row => ({
        id: row.id,
        date: row.date,
        patientName: row.patient_name,
        code: row.code,
        isReferral: row.is_referral,
        sourceId: row.source_id,
        referralName: row.referral_name,
        referralCode: row.referral_code,
        campaignId: row.campaign_id,
        createdAt: row.created_at,
      })),
    })
  } catch (error) {
    console.error('Get patient history error:', error)
    res.status(500).json({ error: 'Failed to fetch patient history' })
  }
})

// Update patient
router.put('/:clinicId/:patientId', async (req, res) => {
  // Check if user can edit patients
  const { clinicId } = req.params
  if (!(await canEditPatients(req, clinicId))) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { clinicId: clinicIdParam, patientId } = req.params
    const { name, email, phone, birthDate, notes } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const result = await query(
      `UPDATE patients
       SET name = $1, email = $2, phone = $3, birth_date = $4, notes = $5
       WHERE id = $6 AND clinic_id = $7
       RETURNING id, code, name, email, phone, birth_date, notes, created_at`,
      [name.trim(), email || null, phone || null, birthDate || null, notes || null, patientId, clinicIdParam]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      code: row.code,
      name: row.name,
      email: row.email,
      phone: row.phone,
      birthDate: row.birth_date,
      notes: row.notes,
      createdAt: row.created_at,
    })
  } catch (error) {
    console.error('Update patient error:', error)
    res.status(500).json({ error: 'Failed to update patient' })
  }
})

// Delete patient
router.delete('/:clinicId/:patientId', async (req, res) => {
  // Only GESTOR can delete patients
  if (req.user?.role !== 'GESTOR_CLINICA' || req.user?.clinicId !== req.params.clinicId) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  
  try {
    const { clinicId, patientId } = req.params

    // First, get the patient code before deleting
    const patientResult = await query(
      'SELECT code FROM patients WHERE id = $1 AND clinic_id = $2',
      [patientId, clinicId]
    )

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    const patientCode = patientResult.rows[0].code

    // Use a transaction to ensure atomicity
    const client = await getClient()

    try {
      await client.query('BEGIN')

      // Delete NPS surveys related to this patient
      await client.query(
        'DELETE FROM nps_surveys WHERE patient_id = $1',
        [patientId]
      )

      // Delete daily financial entries
      await client.query(
        'DELETE FROM daily_financial_entries WHERE clinic_id = $1 AND code = $2',
        [clinicId, patientCode]
      )

      // Delete daily consultation entries
      await client.query(
        'DELETE FROM daily_consultation_entries WHERE clinic_id = $1 AND code = $2',
        [clinicId, patientCode]
      )

      // Delete daily service time entries
      await client.query(
        'DELETE FROM daily_service_time_entries WHERE clinic_id = $1 AND code = $2',
        [clinicId, patientCode]
      )

      // Delete daily source entries (where code matches)
      await client.query(
        'DELETE FROM daily_source_entries WHERE clinic_id = $1 AND code = $2',
        [clinicId, patientCode]
      )

      // Finally, delete the patient
      await client.query(
        'DELETE FROM patients WHERE id = $1 AND clinic_id = $2',
        [patientId, clinicId]
      )

      await client.query('COMMIT')
      client.release()

      res.json({ message: 'Patient and all related records deleted successfully' })
    } catch (error) {
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError)
      }
      client.release()
      throw error
    }
  } catch (error) {
    console.error('Delete patient error:', error)
    res.status(500).json({ error: 'Failed to delete patient' })
  }
})

export default router
