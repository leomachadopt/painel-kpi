import { Router } from 'express'
import { query } from '../db.js'
import { getUserPermissions } from '../middleware/permissions.js'

const router = Router()

/**
 * Helper function to check if user can edit advances
 */
async function canEditAdvances(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

  if (userClinicId !== clinicId) {
    return false
  }

  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    return true
  }

  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditAdvances === true
  }

  return false
}

/**
 * Helper function to check if user can bill advances
 */
async function canBillAdvances(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

  if (userClinicId !== clinicId) {
    return false
  }

  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    return true
  }

  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canBillAdvances === true
  }

  return false
}

/**
 * Helper function to check if user can manage insurance providers
 */
async function canManageInsuranceProviders(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

  if (userClinicId !== clinicId) {
    return false
  }

  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
    return true
  }

  if (role === 'COLABORADOR') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canManageInsuranceProviders === true
  }

  return false
}

// ================================
// INSURANCE PROVIDERS
// ================================

// List insurance providers
router.get('/insurance-providers/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params

    const result = await query(
      `SELECT id, clinic_id, name, code, contact_name, contact_email, contact_phone, notes, created_at, updated_at
       FROM insurance_providers
       WHERE clinic_id = $1
       ORDER BY name ASC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        clinicId: row.clinic_id,
        name: row.name,
        code: row.code,
        contactName: row.contact_name,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    )
  } catch (error) {
    console.error('Get insurance providers error:', error)
    res.status(500).json({ error: 'Failed to fetch insurance providers' })
  }
})

// Create insurance provider
router.post('/insurance-providers/:clinicId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canManageInsuranceProviders(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { name, code, contactName, contactEmail, contactPhone, notes } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const providerId = `insurance-provider-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const result = await query(
      `INSERT INTO insurance_providers (id, clinic_id, name, code, contact_name, contact_email, contact_phone, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        providerId,
        clinicId,
        name.trim(),
        code?.trim() || null,
        contactName?.trim() || null,
        contactEmail?.trim() || null,
        contactPhone?.trim() || null,
        notes?.trim() || null,
      ]
    )

    const row = result.rows[0]
    res.status(201).json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      code: row.code,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Create insurance provider error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Insurance provider with this name already exists' })
    }
    res.status(500).json({ error: 'Failed to create insurance provider' })
  }
})

// Update insurance provider
router.put('/insurance-providers/:clinicId/:providerId', async (req, res) => {
  const { clinicId, providerId } = req.params
  const hasPermission = await canManageInsuranceProviders(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { name, code, contactName, contactEmail, contactPhone, notes } = req.body

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const result = await query(
      `UPDATE insurance_providers
       SET name = $1, code = $2, contact_name = $3, contact_email = $4, contact_phone = $5, notes = $6
       WHERE id = $7 AND clinic_id = $8
       RETURNING *`,
      [
        name.trim(),
        code?.trim() || null,
        contactName?.trim() || null,
        contactEmail?.trim() || null,
        contactPhone?.trim() || null,
        notes?.trim() || null,
        providerId,
        clinicId,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance provider not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      code: row.code,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Update insurance provider error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Insurance provider with this name already exists' })
    }
    res.status(500).json({ error: 'Failed to update insurance provider' })
  }
})

// Delete insurance provider
router.delete('/insurance-providers/:clinicId/:providerId', async (req, res) => {
  const { clinicId, providerId } = req.params
  const hasPermission = await canManageInsuranceProviders(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const result = await query(
      `DELETE FROM insurance_providers WHERE id = $1 AND clinic_id = $2 RETURNING id`,
      [providerId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance provider not found' })
    }

    res.json({ message: 'Insurance provider deleted successfully' })
  } catch (error) {
    console.error('Delete insurance provider error:', error)
    res.status(500).json({ error: 'Failed to delete insurance provider' })
  }
})

// ================================
// ADVANCE CONTRACTS
// ================================

// List contracts (Banco de Adiantamentos)
router.get('/contracts/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params

    const result = await query(
      `SELECT * FROM v_advance_contracts_summary WHERE clinic_id = $1 ORDER BY patient_name ASC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        clinicId: row.clinic_id,
        patientId: row.patient_id,
        patientCode: row.patient_code,
        patientName: row.patient_name,
        insuranceProviderId: row.insurance_provider_id,
        insuranceProviderName: row.insurance_provider_name,
        contractNumber: row.contract_number,
        status: row.status,
        startDate: row.start_date,
        endDate: row.end_date,
        totalAdvanced: parseFloat(row.total_advanced || '0'),
        totalBilled: parseFloat(row.total_billed || '0'),
        balanceToBill: parseFloat(row.balance_to_bill || '0'),
      }))
    )
  } catch (error) {
    console.error('Get contracts error:', error)
    res.status(500).json({ error: 'Failed to fetch contracts' })
  }
})

// Get contract details
router.get('/contracts/:clinicId/:contractId', async (req, res) => {
  try {
    const { clinicId, contractId } = req.params

    // Get contract
    const contractResult = await query(
      `SELECT ac.*, p.code as patient_code, p.name as patient_name, ip.name as insurance_provider_name
       FROM advance_contracts ac
       LEFT JOIN patients p ON ac.patient_id = p.id
       LEFT JOIN insurance_providers ip ON ac.insurance_provider_id = ip.id
       WHERE ac.id = $1 AND ac.clinic_id = $2`,
      [contractId, clinicId]
    )

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    const contract = contractResult.rows[0]

    // Get dependents
    const dependentsResult = await query(
      `SELECT * FROM contract_dependents WHERE contract_id = $1 ORDER BY created_at ASC`,
      [contractId]
    )

    // Get payments
    const paymentsResult = await query(
      `SELECT * FROM advance_payments WHERE contract_id = $1 ORDER BY payment_date DESC`,
      [contractId]
    )

    // Get batches
    const batchesResult = await query(
      `SELECT * FROM billing_batches WHERE contract_id = $1 ORDER BY created_at DESC`,
      [contractId]
    )

    // Calculate totals
    const totalAdvanced = paymentsResult.rows.reduce((sum, p) => sum + parseFloat(p.amount || '0'), 0)
    const totalBilled = batchesResult.rows
      .filter((b) => ['ISSUED', 'PAID', 'PARTIALLY_PAID'].includes(b.status))
      .reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0)

    res.json({
      id: contract.id,
      clinicId: contract.clinic_id,
      patientId: contract.patient_id,
      patientCode: contract.patient_code,
      patientName: contract.patient_name,
      insuranceProviderId: contract.insurance_provider_id,
      insuranceProviderName: contract.insurance_provider_name,
      contractNumber: contract.contract_number,
      startDate: contract.start_date,
      endDate: contract.end_date,
      status: contract.status,
      notes: contract.notes,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at,
      dependents: dependentsResult.rows.map((d) => ({
        id: d.id,
        contractId: d.contract_id,
        name: d.name,
        birthDate: d.birth_date,
        age: d.age,
        relationship: d.relationship,
        notes: d.notes,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      })),
      payments: paymentsResult.rows.map((p) => ({
        id: p.id,
        contractId: p.contract_id,
        paymentDate: p.payment_date,
        amount: parseFloat(p.amount || '0'),
        paymentMethod: p.payment_method,
        referenceNumber: p.reference_number,
        notes: p.notes,
        createdBy: p.created_by,
        createdAt: p.created_at,
      })),
      batches: batchesResult.rows.map((b) => ({
        id: b.id,
        contractId: b.contract_id,
        batchNumber: b.batch_number,
        targetAmount: parseFloat(b.target_amount || '0'),
        targetPericiableAmount: parseFloat(b.target_periciable_amount || '0'),
        totalAmount: parseFloat(b.total_amount || '0'),
        totalPericiableAmount: parseFloat(b.total_periciable_amount || '0'),
        status: b.status,
        issuedAt: b.issued_at,
        paidAt: b.paid_at,
        glosedAt: b.glosed_at,
        glosedAmount: parseFloat(b.glosed_amount || '0'),
        notes: b.notes,
        createdBy: b.created_by,
        createdAt: b.created_at,
        updatedAt: b.updated_at,
      })),
      totalAdvanced,
      totalBilled,
      balanceToBill: totalAdvanced - totalBilled,
    })
  } catch (error) {
    console.error('Get contract error:', error)
    res.status(500).json({ error: 'Failed to fetch contract' })
  }
})

// Create contract
router.post('/contracts/:clinicId', async (req, res) => {
  const { clinicId } = req.params
  const hasPermission = await canEditAdvances(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { patientId, insuranceProviderId, contractNumber, startDate, endDate, status, notes, dependents } = req.body

    if (!patientId || !insuranceProviderId || !startDate) {
      return res.status(400).json({ error: 'Patient, insurance provider, and start date are required' })
    }

    const contractId = `contract-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    // Create contract
    const contractResult = await query(
      `INSERT INTO advance_contracts (id, clinic_id, patient_id, insurance_provider_id, contract_number, start_date, end_date, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        contractId,
        clinicId,
        patientId,
        insuranceProviderId,
        contractNumber?.trim() || null,
        startDate,
        endDate || null,
        status || 'ACTIVE',
        notes?.trim() || null,
      ]
    )

    // Create dependents if provided
    if (dependents && Array.isArray(dependents)) {
      for (const dep of dependents) {
        const dependentId = `dependent-${contractId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
        await query(
          `INSERT INTO contract_dependents (id, contract_id, name, birth_date, age, relationship, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            dependentId,
            contractId,
            dep.name,
            dep.birthDate || null,
            dep.age || null,
            dep.relationship || 'OUTRO',
            dep.notes || null,
          ]
        )
      }
    }

    const contract = contractResult.rows[0]
    res.status(201).json({
      id: contract.id,
      clinicId: contract.clinic_id,
      patientId: contract.patient_id,
      insuranceProviderId: contract.insurance_provider_id,
      contractNumber: contract.contract_number,
      startDate: contract.start_date,
      endDate: contract.end_date,
      status: contract.status,
      notes: contract.notes,
      createdAt: contract.created_at,
      updatedAt: contract.updated_at,
    })
  } catch (error: any) {
    console.error('Create contract error:', error)
    res.status(500).json({ error: 'Failed to create contract' })
  }
})

// Add payment to contract
router.post('/contracts/:clinicId/:contractId/payments', async (req, res) => {
  const { clinicId, contractId } = req.params
  const hasPermission = await canEditAdvances(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { paymentDate, amount, paymentMethod, referenceNumber, notes } = req.body

    if (!paymentDate || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Payment date and amount are required' })
    }

    // Verify contract exists
    const contractCheck = await query(
      `SELECT id FROM advance_contracts WHERE id = $1 AND clinic_id = $2`,
      [contractId, clinicId]
    )

    if (contractCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    const paymentId = `payment-${contractId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const userId = req.user?.sub || null

    const result = await query(
      `INSERT INTO advance_payments (id, contract_id, payment_date, amount, payment_method, reference_number, notes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        paymentId,
        contractId,
        paymentDate,
        amount,
        paymentMethod || null,
        referenceNumber || null,
        notes || null,
        userId,
      ]
    )

    const payment = result.rows[0]
    res.status(201).json({
      id: payment.id,
      contractId: payment.contract_id,
      paymentDate: payment.payment_date,
      amount: parseFloat(payment.amount || '0'),
      paymentMethod: payment.payment_method,
      referenceNumber: payment.reference_number,
      notes: payment.notes,
      createdBy: payment.created_by,
      createdAt: payment.created_at,
    })
  } catch (error) {
    console.error('Add payment error:', error)
    res.status(500).json({ error: 'Failed to add payment' })
  }
})

// ================================
// PROCEDURE BASE TABLE
// ================================

// List procedure base table
router.get('/procedures/base/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params

    const result = await query(
      `SELECT id, clinic_id, code, description, is_periciable, category, default_value, active, created_at, updated_at
       FROM procedure_base_table
       WHERE clinic_id = $1
       ORDER BY code ASC`,
      [clinicId]
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        clinicId: row.clinic_id,
        code: row.code,
        description: row.description,
        isPericiable: row.is_periciable,
        category: row.category,
        defaultValue: row.default_value ? parseFloat(row.default_value) : null,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    )
  } catch (error) {
    console.error('Get procedure base table error:', error)
    res.status(500).json({ error: 'Failed to fetch procedure base table' })
  }
})

// Create procedure in base table
router.post('/procedures/base/:clinicId', async (req, res) => {
  const { clinicId } = req.params
  
  // Only MENTOR can manage base table
  if (req.user?.role !== 'MENTOR') {
    return res.status(403).json({ error: 'Forbidden - Only mentors can manage base table' })
  }

  try {
    const { code, description, isPericiable, category, defaultValue } = req.body

    if (!code || !description) {
      return res.status(400).json({ error: 'Code and description are required' })
    }

    const procedureId = `procedure-base-${clinicId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const result = await query(
      `INSERT INTO procedure_base_table (id, clinic_id, code, description, is_periciable, category, default_value)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        procedureId,
        clinicId,
        code.trim(),
        description.trim(),
        isPericiable || false,
        category?.trim() || null,
        defaultValue || null,
      ]
    )

    const row = result.rows[0]
    res.status(201).json({
      id: row.id,
      clinicId: row.clinic_id,
      code: row.code,
      description: row.description,
      isPericiable: row.is_periciable,
      category: row.category,
      defaultValue: row.default_value ? parseFloat(row.default_value) : null,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Create procedure base error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Procedure code already exists' })
    }
    res.status(500).json({ error: 'Failed to create procedure' })
  }
})

// Update procedure in base table
router.put('/procedures/base/:clinicId/:procedureId', async (req, res) => {
  const { clinicId, procedureId } = req.params
  
  // Only MENTOR can manage base table
  if (req.user?.role !== 'MENTOR') {
    return res.status(403).json({ error: 'Forbidden - Only mentors can manage base table' })
  }

  try {
    const { code, description, isPericiable, category, defaultValue, active } = req.body

    if (!code || !description) {
      return res.status(400).json({ error: 'Code and description are required' })
    }

    const result = await query(
      `UPDATE procedure_base_table
       SET code = $1, description = $2, is_periciable = $3, category = $4, default_value = $5, active = $6
       WHERE id = $7 AND clinic_id = $8
       RETURNING *`,
      [
        code.trim(),
        description.trim(),
        isPericiable || false,
        category?.trim() || null,
        defaultValue || null,
        active !== undefined ? active : true,
        procedureId,
        clinicId,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Procedure not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      code: row.code,
      description: row.description,
      isPericiable: row.is_periciable,
      category: row.category,
      defaultValue: row.default_value ? parseFloat(row.default_value) : null,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Update procedure base error:', error)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Procedure code already exists' })
    }
    res.status(500).json({ error: 'Failed to update procedure' })
  }
})

// Delete procedure from base table
router.delete('/procedures/base/:clinicId/:procedureId', async (req, res) => {
  const { clinicId, procedureId } = req.params
  
  // Only MENTOR can manage base table
  if (req.user?.role !== 'MENTOR') {
    return res.status(403).json({ error: 'Forbidden - Only mentors can manage base table' })
  }

  try {
    const result = await query(
      `DELETE FROM procedure_base_table WHERE id = $1 AND clinic_id = $2 RETURNING id`,
      [procedureId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Procedure not found' })
    }

    res.json({ message: 'Procedure deleted successfully' })
  } catch (error) {
    console.error('Delete procedure base error:', error)
    res.status(500).json({ error: 'Failed to delete procedure' })
  }
})

// ================================
// GLOBAL PROCEDURE BASE TABLE (Apenas MENTOR)
// ================================

// List global procedure base table
router.get('/procedures/base/global', async (req, res) => {
  // Only MENTOR can access global table
  if (req.user?.role !== 'MENTOR') {
    return res.status(403).json({ error: 'Forbidden - Only mentors can access global table' })
  }

  try {
    const result = await query(
      `SELECT id, clinic_id, code, description, is_periciable, adults_only, category, default_value, active, created_at, updated_at
       FROM procedure_base_table
       WHERE clinic_id IS NULL
       ORDER BY code ASC`
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        clinicId: row.clinic_id,
        code: row.code,
        description: row.description,
        isPericiable: row.is_periciable,
        adultsOnly: row.adults_only || false,
        category: row.category,
        defaultValue: row.default_value ? parseFloat(row.default_value) : null,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }))
    )
  } catch (error) {
    console.error('Get global procedure base table error:', error)
    res.status(500).json({ error: 'Failed to fetch global procedure base table' })
  }
})

// Create procedure in global base table
router.post('/procedures/base/global', async (req, res) => {
  // Only MENTOR can manage global table
  if (req.user?.role !== 'MENTOR') {
    return res.status(403).json({ error: 'Forbidden - Only mentors can manage global table' })
  }

  try {
    const { code, description, isPericiable, adultsOnly, category, defaultValue } = req.body

    if (!code || !description) {
      return res.status(400).json({ error: 'Code and description are required' })
    }

    // Validar e converter defaultValue
    let validatedDefaultValue = null
    if (defaultValue !== null && defaultValue !== undefined && defaultValue !== '') {
      const numValue = typeof defaultValue === 'string' 
        ? parseFloat(defaultValue.replace(',', '.')) 
        : parseFloat(defaultValue)
      if (!isNaN(numValue) && isFinite(numValue)) {
        validatedDefaultValue = numValue
      }
    }

    const procedureId = `procedure-base-global-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    const result = await query(
      `INSERT INTO procedure_base_table (id, clinic_id, code, description, is_periciable, adults_only, category, default_value)
       VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        procedureId,
        code.trim(),
        description.trim(),
        isPericiable || false,
        adultsOnly || false,
        category?.trim() || null,
        validatedDefaultValue,
      ]
    )

    const row = result.rows[0]
    res.status(201).json({
      id: row.id,
      clinicId: row.clinic_id,
      code: row.code,
      description: row.description,
      isPericiable: row.is_periciable,
      adultsOnly: row.adults_only || false,
      category: row.category,
      defaultValue: row.default_value ? parseFloat(row.default_value) : null,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Create global procedure base error:', error)
    console.error('Error details:', error.message, error.detail, error.code)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Procedure code already exists in global table' })
    }
    res.status(500).json({ error: 'Failed to create procedure', details: error.message })
  }
})

// Update procedure in global base table
router.put('/procedures/base/global/:procedureId', async (req, res) => {
  const { procedureId } = req.params
  
  // Only MENTOR can manage global table
  if (req.user?.role !== 'MENTOR') {
    return res.status(403).json({ error: 'Forbidden - Only mentors can manage global table' })
  }

  try {
    const { code, description, isPericiable, adultsOnly, category, defaultValue, active } = req.body

    if (!code || !description) {
      return res.status(400).json({ error: 'Code and description are required' })
    }

    // Validar e converter defaultValue
    let validatedDefaultValue = null
    if (defaultValue !== null && defaultValue !== undefined && defaultValue !== '') {
      const numValue = typeof defaultValue === 'string' 
        ? parseFloat(defaultValue.replace(',', '.')) 
        : parseFloat(defaultValue)
      if (!isNaN(numValue) && isFinite(numValue)) {
        validatedDefaultValue = numValue
      }
    }

    const result = await query(
      `UPDATE procedure_base_table
       SET code = $1, description = $2, is_periciable = $3, adults_only = $4, category = $5, default_value = $6, active = $7
       WHERE id = $8 AND clinic_id IS NULL
       RETURNING *`,
      [
        code.trim(),
        description.trim(),
        isPericiable || false,
        adultsOnly || false,
        category?.trim() || null,
        validatedDefaultValue,
        active !== undefined ? active : true,
        procedureId,
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Procedure not found in global table' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      code: row.code,
      description: row.description,
      isPericiable: row.is_periciable,
      adultsOnly: row.adults_only || false,
      category: row.category,
      defaultValue: row.default_value ? parseFloat(row.default_value) : null,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Update global procedure base error:', error)
    console.error('Error details:', error.message, error.detail, error.code)
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Procedure code already exists in global table' })
    }
    res.status(500).json({ error: 'Failed to update procedure', details: error.message })
  }
})

// Delete procedure from global base table
router.delete('/procedures/base/global/:procedureId', async (req, res) => {
  const { procedureId } = req.params
  
  // Only MENTOR can manage global table
  if (req.user?.role !== 'MENTOR') {
    return res.status(403).json({ error: 'Forbidden - Only mentors can manage global table' })
  }

  try {
    const result = await query(
      `DELETE FROM procedure_base_table WHERE id = $1 AND clinic_id IS NULL RETURNING id`,
      [procedureId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Procedure not found in global table' })
    }

    res.json({ message: 'Procedure deleted successfully' })
  } catch (error) {
    console.error('Delete global procedure base error:', error)
    res.status(500).json({ error: 'Failed to delete procedure' })
  }
})

export default router

