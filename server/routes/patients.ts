import { Router } from 'express'
import { query, getClient } from '../db.js'
import { getUserPermissions } from '../middleware/permissions.js'
import crypto from 'crypto'
import { uploadToCloudinary, deleteFromCloudinary, getCloudinarySignedUrl, downloadFromCloudinary } from '../utils/cloudinary.js'

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

  // MEDICO and COLABORADOR need permission
  if (role === 'COLABORADOR' || role === 'MEDICO') {
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
    const [financial, consultation, serviceTime, source, executedProcedures, proceduresByConsultation] = await Promise.all([
      query(
        `SELECT id, date, patient_name, code, category_id, value, cabinet_id, doctor_id, payment_source_id, created_at
         FROM daily_financial_entries
         WHERE clinic_id = $1 AND code = $2
         ORDER BY date DESC`,
        [clinicId, code]
      ),
      query(
        `SELECT id, date, patient_name, code, plan_created, plan_created_at, plan_presented,
                plan_presented_at, plan_accepted, plan_accepted_at, plan_value,
                plan_not_eligible, plan_not_eligible_at, plan_not_eligible_reason, created_at
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
      // Buscar procedimentos executados do plano de tratamento
      query(
        `SELECT
          pp.id,
          pp.procedure_code,
          pp.procedure_description,
          pp.price_at_creation,
          pp.completed_at,
          pp.notes,
          dce.date as consultation_date,
          dce.patient_name,
          dce.code
         FROM plan_procedures pp
         INNER JOIN daily_consultation_entries dce ON pp.consultation_entry_id = dce.id
         WHERE pp.clinic_id = $1
           AND dce.code = $2
           AND pp.completed = true
         ORDER BY pp.completed_at DESC`,
        [clinicId, code]
      ),
      // Buscar procedimentos agrupados por consulta (incluindo completed e não completed)
      query(
        `SELECT
          pp.id,
          pp.consultation_entry_id,
          pp.procedure_code,
          pp.procedure_description,
          pp.price_at_creation,
          pp.completed,
          pp.completed_at,
          pp.notes,
          pp.sort_order
         FROM plan_procedures pp
         INNER JOIN daily_consultation_entries dce ON pp.consultation_entry_id = dce.id
         WHERE pp.clinic_id = $1
           AND dce.code = $2
         ORDER BY pp.consultation_entry_id, pp.sort_order ASC`,
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
      consultation: consultation.rows.map(row => {
        // Buscar procedimentos desta consulta
        const procedures = proceduresByConsultation.rows
          .filter((proc: any) => proc.consultation_entry_id === row.id)
          .map((proc: any) => ({
            id: proc.id,
            procedureCode: proc.procedure_code,
            procedureDescription: proc.procedure_description,
            value: parseFloat(proc.price_at_creation),
            completed: proc.completed,
            completedAt: proc.completed_at,
            notes: proc.notes,
            sortOrder: proc.sort_order,
          }))

        return {
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
          procedures, // Lista de procedimentos desta consulta
        }
      }),
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
      // Adicionar procedimentos executados
      executedProcedures: executedProcedures.rows.map(row => ({
        id: row.id,
        procedureCode: row.procedure_code,
        procedureDescription: row.procedure_description,
        value: parseFloat(row.price_at_creation),
        completedAt: row.completed_at,
        notes: row.notes,
        consultationDate: row.consultation_date,
      })),
      // Criar fluxo de caixa unificado (cashflow)
      cashflow: [
        // Lançamentos financeiros como créditos (+)
        ...financial.rows.map(row => ({
          id: `fin-${row.id}`,
          date: row.date,
          type: 'credit',
          description: 'Pagamento recebido',
          amount: parseFloat(row.value),
          balance: 0, // será calculado no frontend
        })),
        // Procedimentos executados como débitos (-)
        ...executedProcedures.rows.map(row => ({
          id: `proc-${row.id}`,
          date: row.completed_at ? new Date(row.completed_at).toISOString().split('T')[0] : row.consultation_date,
          type: 'debit',
          description: `${row.procedure_code} - ${row.procedure_description}`,
          amount: parseFloat(row.price_at_creation),
          notes: row.notes,
          balance: 0, // será calculado no frontend
        })),
      ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
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
    const { code, name, email, phone, birthDate, notes } = req.body

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Get current patient code before updating
    const currentPatientResult = await query(
      'SELECT code FROM patients WHERE id = $1 AND clinic_id = $2',
      [patientId, clinicIdParam]
    )

    if (currentPatientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    const oldCode = currentPatientResult.rows[0].code

    // Validate code if provided
    if (code !== undefined) {
      if (!/^\d{1,6}$/.test(code)) {
        return res.status(400).json({ error: 'Code must be 1-6 digits' })
      }

      // Check if code is already in use by another patient
      const codeCheck = await query(
        'SELECT id FROM patients WHERE code = $1 AND clinic_id = $2 AND id != $3',
        [code, clinicIdParam, patientId]
      )

      if (codeCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Code already in use by another patient' })
      }
    }

    // Use transaction to ensure atomicity
    const client = await getClient()

    try {
      await client.query('BEGIN')

      // Update patient
      const result = await client.query(
        `UPDATE patients
         SET code = COALESCE($1, code), name = $2, email = $3, phone = $4, birth_date = $5, notes = $6
         WHERE id = $7 AND clinic_id = $8
         RETURNING id, code, name, email, phone, birth_date, notes, created_at`,
        [code || null, name.trim(), email || null, phone || null, birthDate || null, notes || null, patientId, clinicIdParam]
      )

      const row = result.rows[0]
      const newCode = row.code

      // If code changed, update all daily entries with the old code
      if (code && oldCode !== newCode) {
        console.log(`📝 Updating patient code from ${oldCode} to ${newCode} in all daily entries`)

        // Update daily_consultation_entries
        await client.query(
          'UPDATE daily_consultation_entries SET code = $1, patient_code = $1 WHERE clinic_id = $2 AND code = $3',
          [newCode, clinicIdParam, oldCode]
        )

        // Update daily_financial_entries
        await client.query(
          'UPDATE daily_financial_entries SET code = $1 WHERE clinic_id = $2 AND code = $3',
          [newCode, clinicIdParam, oldCode]
        )

        // Update daily_service_time_entries
        await client.query(
          'UPDATE daily_service_time_entries SET code = $1 WHERE clinic_id = $2 AND code = $3',
          [newCode, clinicIdParam, oldCode]
        )

        // Update daily_source_entries
        await client.query(
          'UPDATE daily_source_entries SET code = $1 WHERE clinic_id = $2 AND code = $3',
          [newCode, clinicIdParam, oldCode]
        )

        console.log(`✅ Successfully updated all daily entries from code ${oldCode} to ${newCode}`)
      }

      await client.query('COMMIT')
      client.release()

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
      try {
        await client.query('ROLLBACK')
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError)
      }
      client.release()
      throw error
    }
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

// ================================
// PATIENT DOCUMENTS ENDPOINTS
// ================================

// Upload documento para paciente
router.post('/:clinicId/:patientId/documents', async (req, res) => {
  const { clinicId, patientId } = req.params

  console.log('Upload document request:', { clinicId, patientId, user: req.user })

  const hasPermission = await canEditPatients(req, clinicId)

  if (!hasPermission) {
    console.log('Permission denied for user:', req.user)
    return res.status(403).json({ error: 'Permission denied' })
  }

  try {
    const { file, filename, mimeType, documentType, description } = req.body

    console.log('Upload data:', { filename, mimeType, documentType, fileSize: file?.length })

    if (!file || !filename) {
      console.log('Missing file or filename')
      return res.status(400).json({ error: 'File and filename are required' })
    }

    // Verificar se paciente existe
    console.log('Checking if patient exists...')
    const patientCheck = await query(
      'SELECT id FROM patients WHERE id = $1 AND clinic_id = $2',
      [patientId, clinicId]
    )

    if (patientCheck.rows.length === 0) {
      console.log('Patient not found')
      return res.status(404).json({ error: 'Patient not found' })
    }
    console.log('Patient found')

    // Gerar ID único para o documento
    const documentId = crypto.randomUUID()
    console.log('Generated document ID:', documentId)

    // Upload para Cloudinary
    console.log('Uploading to Cloudinary...')
    const cloudinaryFolder = `patient-documents/${clinicId}`

    let cloudinaryResult
    try {
      cloudinaryResult = await uploadToCloudinary(file, cloudinaryFolder, 'auto')
      console.log('Cloudinary upload successful:', cloudinaryResult.public_id)
    } catch (uploadError: any) {
      console.error('Cloudinary upload error:', uploadError)
      throw new Error(`Failed to upload to cloud storage: ${uploadError.message}`)
    }

    // Salvar no banco de dados
    console.log('Saving to database...')
    try {
      await query(
        `INSERT INTO patient_documents (
          id, patient_id, filename, original_filename, file_path, file_size,
          mime_type, document_type, description, uploaded_by, cloudinary_resource_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          documentId,
          patientId,
          cloudinaryResult.public_id, // Guardar public_id do Cloudinary como filename
          filename,
          cloudinaryResult.secure_url, // Guardar URL do Cloudinary como file_path
          cloudinaryResult.bytes,
          mimeType || null,
          documentType || null,
          description || null,
          req.user?.sub || null,
          cloudinaryResult.resource_type // Guardar tipo de recurso do Cloudinary
        ]
      )
      console.log('Database record created successfully')
    } catch (dbError: any) {
      console.error('Database error:', dbError)
      // Tentar deletar do Cloudinary se a inserção no banco falhar
      try {
        await deleteFromCloudinary(cloudinaryResult.public_id, cloudinaryResult.resource_type as any)
        console.log('Cleaned up Cloudinary file after database error')
      } catch (cleanupError) {
        console.error('Failed to cleanup Cloudinary file:', cleanupError)
      }
      throw new Error(`Database error: ${dbError.message}`)
    }

    res.json({
      message: 'Document uploaded successfully',
      documentId,
      filename: cloudinaryResult.public_id,
      originalFilename: filename,
      url: cloudinaryResult.secure_url
    })
  } catch (error: any) {
    console.error('Upload document error:', error)
    res.status(500).json({ error: 'Failed to upload document', message: error.message })
  }
})

// Listar documentos de um paciente
router.get('/:clinicId/:patientId/documents', async (req, res) => {
  const { clinicId, patientId } = req.params

  try {
    // Qualquer usuário autenticado da clínica pode visualizar documentos
    if (!req.user || req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Verificar se paciente existe
    const patientCheck = await query(
      'SELECT id FROM patients WHERE id = $1 AND clinic_id = $2',
      [patientId, clinicId]
    )

    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' })
    }

    const result = await query(
      `SELECT
        id, patient_id, filename, original_filename, file_path, file_size,
        mime_type, document_type, description, uploaded_by, uploaded_at, cloudinary_resource_type
      FROM patient_documents
      WHERE patient_id = $1
      ORDER BY uploaded_at DESC`,
      [patientId]
    )

    res.json(
      result.rows.map(row => ({
        id: row.id,
        patientId: row.patient_id,
        filename: row.filename,
        originalFilename: row.original_filename,
        filePath: row.file_path,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        documentType: row.document_type,
        description: row.description,
        uploadedBy: row.uploaded_by,
        uploadedAt: row.uploaded_at,
        cloudinaryResourceType: row.cloudinary_resource_type
      }))
    )
  } catch (error: any) {
    console.error('Get documents error:', error)
    res.status(500).json({ error: 'Failed to get documents' })
  }
})

// Download/Visualizar documento (PROTEGIDO)
// Backend faz proxy REAL do Cloudinary (funciona com arquivos públicos ou privados)
router.get('/:clinicId/:patientId/documents/:documentId/download', async (req, res) => {
  const { clinicId, patientId, documentId } = req.params

  try {
    // Verificar permissão
    if (!req.user || req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Buscar documento no banco
    const result = await query(
      `SELECT pd.*, p.clinic_id
      FROM patient_documents pd
      JOIN patients p ON pd.patient_id = p.id
      WHERE pd.id = $1 AND pd.patient_id = $2 AND p.clinic_id = $3`,
      [documentId, patientId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }

    const document = result.rows[0]

    console.log('Proxying file from Cloudinary:', document.filename)

    // Baixar arquivo do Cloudinary - passa a secure_url (file_path) como método primário
    const resourceType = document.cloudinary_resource_type || 'raw'
    const fileBuffer = await downloadFromCloudinary(
      document.filename,
      resourceType as 'image' | 'raw' | 'video',
      document.file_path // secure_url salva no banco
    )

    // Definir headers apropriados
    const contentType = document.mime_type || 'application/octet-stream'

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `inline; filename="${document.original_filename}"`)
    res.setHeader('Content-Length', fileBuffer.length.toString())
    res.setHeader('Cache-Control', 'public, max-age=31536000') // Cache por 1 ano

    // Enviar arquivo para o cliente
    res.send(fileBuffer)
  } catch (error: any) {
    console.error('Download document error:', error)
    res.status(500).json({ error: 'Failed to download document' })
  }
})

// Deletar documento
router.delete('/:clinicId/:patientId/documents/:documentId', async (req, res) => {
  const { clinicId, patientId, documentId } = req.params
  const hasPermission = await canEditPatients(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Permission denied' })
  }

  try {
    // Buscar documento
    const result = await query(
      `SELECT pd.*, p.clinic_id
      FROM patient_documents pd
      JOIN patients p ON pd.patient_id = p.id
      WHERE pd.id = $1 AND pd.patient_id = $2 AND p.clinic_id = $3`,
      [documentId, patientId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' })
    }

    const document = result.rows[0]

    // Deletar do Cloudinary
    // O filename contém o public_id do Cloudinary
    try {
      const resourceType = document.cloudinary_resource_type || 'raw'
      await deleteFromCloudinary(document.filename, resourceType as any)
      console.log('Deleted from Cloudinary:', document.filename)
    } catch (cloudinaryError: any) {
      console.error('Error deleting from Cloudinary:', cloudinaryError)
      // Continuar mesmo se falhar - o arquivo pode já ter sido deletado
    }

    // Deletar do banco
    await query('DELETE FROM patient_documents WHERE id = $1', [documentId])

    res.json({ message: 'Document deleted successfully' })
  } catch (error: any) {
    console.error('Delete document error:', error)
    res.status(500).json({ error: 'Failed to delete document' })
  }
})

export default router
