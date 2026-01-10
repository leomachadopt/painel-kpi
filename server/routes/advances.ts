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
// Apply fix for v_advance_contracts_summary view (idempotent - runs once on module load)
const applyViewFix = async () => {
  try {
    // Drop the view first to ensure clean recreation
    await query(`DROP VIEW IF EXISTS v_advance_contracts_summary CASCADE`)
    
    // Create the corrected view
    await query(`
      CREATE VIEW v_advance_contracts_summary AS
      SELECT 
        ac.id,
        ac.clinic_id,
        ac.patient_id,
        p.code AS patient_code,
        p.name AS patient_name,
        ac.insurance_provider_id,
        ip.name AS insurance_provider_name,
        ac.contract_number,
        ac.status,
        ac.start_date,
        ac.end_date,
        -- Valor total adiantado (using subquery to avoid cartesian product)
        COALESCE((
          SELECT SUM(amount::numeric) 
          FROM advance_payments 
          WHERE contract_id = ac.id
        ), 0)::numeric AS total_advanced,
        -- Valor já faturado (lotes emitidos ou pagos) - using subquery to avoid cartesian product
        COALESCE((
          SELECT SUM(total_amount::numeric) 
          FROM billing_batches 
          WHERE contract_id = ac.id 
            AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
        ), 0)::numeric AS total_billed,
        -- Saldo a faturar
        COALESCE((
          SELECT SUM(amount::numeric) 
          FROM advance_payments 
          WHERE contract_id = ac.id
        ), 0)::numeric - COALESCE((
          SELECT SUM(total_amount::numeric) 
          FROM billing_batches 
          WHERE contract_id = ac.id 
            AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
        ), 0)::numeric AS balance_to_bill
      FROM advance_contracts ac
      LEFT JOIN patients p ON ac.patient_id = p.id
      LEFT JOIN insurance_providers ip ON ac.insurance_provider_id = ip.id;
    `)
    console.log('✅ View v_advance_contracts_summary fixed and recreated')
  } catch (error) {
    console.error('⚠️ Error applying view fix:', error)
    // Try to recreate without dropping first (in case it doesn't exist)
    try {
      await query(`
        CREATE OR REPLACE VIEW v_advance_contracts_summary AS
        SELECT 
          ac.id,
          ac.clinic_id,
          ac.patient_id,
          p.code AS patient_code,
          p.name AS patient_name,
          ac.insurance_provider_id,
          ip.name AS insurance_provider_name,
          ac.contract_number,
          ac.status,
          ac.start_date,
          ac.end_date,
          COALESCE((
            SELECT SUM(amount::numeric) 
            FROM advance_payments 
            WHERE contract_id = ac.id
          ), 0)::numeric AS total_advanced,
          COALESCE((
            SELECT SUM(total_amount::numeric) 
            FROM billing_batches 
            WHERE contract_id = ac.id 
              AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
          ), 0)::numeric AS total_billed,
          COALESCE((
            SELECT SUM(amount::numeric) 
            FROM advance_payments 
            WHERE contract_id = ac.id
          ), 0)::numeric - COALESCE((
            SELECT SUM(total_amount::numeric) 
            FROM billing_batches 
            WHERE contract_id = ac.id 
              AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
          ), 0)::numeric AS balance_to_bill
        FROM advance_contracts ac
        LEFT JOIN patients p ON ac.patient_id = p.id
        LEFT JOIN insurance_providers ip ON ac.insurance_provider_id = ip.id;
      `)
      console.log('✅ View v_advance_contracts_summary recreated using CREATE OR REPLACE')
    } catch (retryError) {
      console.error('❌ Failed to recreate view even with CREATE OR REPLACE:', retryError)
    }
  }
}

// Apply fix on module load (idempotent)
applyViewFix()

// Debug endpoint to check batches and view
router.get('/contracts/:clinicId/debug/:contractId', async (req, res) => {
  try {
    const { clinicId, contractId } = req.params

    // Get all batches for this contract
    const batchesResult = await query(
      `SELECT id, batch_number, total_amount, status, created_at 
       FROM billing_batches 
       WHERE contract_id = $1 
       ORDER BY created_at DESC`,
      [contractId]
    )

    // Get total from view
    const viewResult = await query(
      `SELECT total_billed, total_advanced, balance_to_bill 
       FROM v_advance_contracts_summary 
       WHERE id = $1`,
      [contractId]
    )

    // Calculate manually
    const manualTotal = batchesResult.rows
      .filter((b) => ['ISSUED', 'PAID', 'PARTIALLY_PAID'].includes(b.status))
      .reduce((sum, b) => sum + parseFloat(b.total_amount || '0'), 0)

    res.json({
      batches: batchesResult.rows,
      viewTotal: viewResult.rows[0]?.total_billed || 0,
      manualTotal,
      match: parseFloat(viewResult.rows[0]?.total_billed || '0') === manualTotal,
    })
  } catch (error: any) {
    console.error('Debug error:', error)
    res.status(500).json({ error: 'Failed to debug', details: error.message })
  }
})

router.get('/contracts/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params

    // Get contracts with basic info
    const contractsResult = await query(
      `SELECT 
        ac.id,
        ac.clinic_id,
        ac.patient_id,
        p.code AS patient_code,
        p.name AS patient_name,
        ac.insurance_provider_id,
        ip.name AS insurance_provider_name,
        ac.contract_number,
        ac.status,
        ac.start_date,
        ac.end_date
       FROM advance_contracts ac
       LEFT JOIN patients p ON ac.patient_id = p.id
       LEFT JOIN insurance_providers ip ON ac.insurance_provider_id = ip.id
       WHERE ac.clinic_id = $1
       ORDER BY p.name ASC`,
      [clinicId]
    )

    // Calculate totals manually for each contract to avoid view issues
    const contractsWithTotals = await Promise.all(
      contractsResult.rows.map(async (row) => {
        // Get total advanced
        const paymentsResult = await query(
          `SELECT SUM(amount::numeric) as total
           FROM advance_payments 
           WHERE contract_id = $1`,
          [row.id]
        )
        const totalAdvanced = parseFloat(paymentsResult.rows[0]?.total || '0')

        // Get total billed (manually calculated to avoid duplication)
        const batchesResult = await query(
          `SELECT SUM(total_amount::numeric) as total
           FROM billing_batches 
           WHERE contract_id = $1 
             AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')`,
          [row.id]
        )
        const totalBilled = parseFloat(batchesResult.rows[0]?.total || '0')

        return {
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
          totalAdvanced,
          totalBilled,
          balanceToBill: totalAdvanced - totalBilled,
        }
      })
    )

    res.json(contractsWithTotals)
  } catch (error) {
    console.error('Get contracts error:', error)
    res.status(500).json({ error: 'Failed to fetch contracts' })
  }
})

// Force refresh of the view (for debugging/admin purposes)
router.post('/contracts/:clinicId/refresh-view', async (req, res) => {
  try {
    await applyViewFix()
    res.json({ message: 'View refreshed successfully' })
  } catch (error: any) {
    console.error('Error refreshing view:', error)
    res.status(500).json({ error: 'Failed to refresh view' })
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
      dependents: dependentsResult.rows.map((d) => {
        // Format birth_date to YYYY-MM-DD for frontend input
        let formattedBirthDate = null
        if (d.birth_date) {
          const date = new Date(d.birth_date)
          if (!isNaN(date.getTime())) {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            formattedBirthDate = `${year}-${month}-${day}`
          }
        }
        
        return {
          id: d.id,
          contractId: d.contract_id,
          name: d.name,
          birthDate: formattedBirthDate,
          age: d.age,
          relationship: d.relationship,
          notes: d.notes,
          createdAt: d.created_at,
          updatedAt: d.updated_at,
        }
      }),
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

    if (!patientId || !insuranceProviderId) {
      return res.status(400).json({ error: 'Patient and insurance provider are required' })
    }

    // Usar data atual se startDate não for fornecido
    const finalStartDate = startDate || new Date().toISOString().split('T')[0]

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
        finalStartDate,
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

// Update contract
router.put('/contracts/:clinicId/:contractId', async (req, res) => {
  const { clinicId, contractId } = req.params
  const hasPermission = await canEditAdvances(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { patientId, insuranceProviderId, contractNumber, startDate, endDate, status, notes, dependents } = req.body

    if (!patientId || !insuranceProviderId) {
      return res.status(400).json({ error: 'Patient and insurance provider are required' })
    }

    // Verify contract exists
    const contractCheck = await query(
      `SELECT id FROM advance_contracts WHERE id = $1 AND clinic_id = $2`,
      [contractId, clinicId]
    )

    if (contractCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Se startDate não for fornecido, manter o valor existente
    const finalStartDate = startDate || contractCheck.rows[0].start_date || new Date().toISOString().split('T')[0]

    // Update contract
    const contractResult = await query(
      `UPDATE advance_contracts
       SET patient_id = $1, insurance_provider_id = $2, contract_number = $3, start_date = $4, end_date = $5, status = $6, notes = $7
       WHERE id = $8 AND clinic_id = $9
       RETURNING *`,
      [
        patientId,
        insuranceProviderId,
        contractNumber?.trim() || null,
        finalStartDate,
        endDate || null,
        status || 'ACTIVE',
        notes?.trim() || null,
        contractId,
        clinicId,
      ]
    )

    // Update dependents if provided
    if (dependents && Array.isArray(dependents)) {
      // Delete existing dependents
      await query(
        `DELETE FROM contract_dependents WHERE contract_id = $1`,
        [contractId]
      )

      // Create new dependents
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
    res.json({
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
    console.error('Update contract error:', error)
    res.status(500).json({ error: 'Failed to update contract' })
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

// Delete contract
router.delete('/contracts/:clinicId/:contractId', async (req, res) => {
  const { clinicId, contractId } = req.params
  const hasPermission = await canEditAdvances(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    // Verify contract exists
    const contractCheck = await query(
      `SELECT id FROM advance_contracts WHERE id = $1 AND clinic_id = $2`,
      [contractId, clinicId]
    )

    if (contractCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Delete contract (cascade will handle dependents, payments, batches, etc.)
    const result = await query(
      `DELETE FROM advance_contracts WHERE id = $1 AND clinic_id = $2 RETURNING id`,
      [contractId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    res.json({ message: 'Contract deleted successfully' })
  } catch (error) {
    console.error('Delete contract error:', error)
    res.status(500).json({ error: 'Failed to delete contract' })
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

// ================================
// BILLING - ELIGIBLE PROCEDURES
// ================================

// Get eligible procedures for a contract
router.get('/contracts/:clinicId/:contractId/eligible-procedures', async (req, res) => {
  try {
    const { clinicId, contractId } = req.params

    // Get contract with insurance provider
    const contractResult = await query(
      `SELECT ac.insurance_provider_id, ac.patient_id, p.birth_date as patient_birth_date
       FROM advance_contracts ac
       LEFT JOIN patients p ON ac.patient_id = p.id
       WHERE ac.id = $1 AND ac.clinic_id = $2`,
      [contractId, clinicId]
    )

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    const contract = contractResult.rows[0]
    const insuranceProviderId = contract.insurance_provider_id

    // Get contract dependents with ages
    const dependentsResult = await query(
      `SELECT id, name, birth_date, age, relationship
       FROM contract_dependents
       WHERE contract_id = $1`,
      [contractId]
    )

    // Calculate ages
    const calculateAge = (birthDate: string | null, age: number | null) => {
      if (age !== null) return age
      if (!birthDate) return null
      const today = new Date()
      const birth = new Date(birthDate)
      return today.getFullYear() - birth.getFullYear() - 
        (today.getMonth() < birth.getMonth() || 
         (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate()) ? 1 : 0)
    }

    const patientAge = calculateAge(contract.patient_birth_date, null)
    const dependents = dependentsResult.rows.map(dep => ({
      ...dep,
      age: calculateAge(dep.birth_date, dep.age),
    }))

    // Get already billed procedure codes (from issued/paid batches)
    const billedProceduresResult = await query(
      `SELECT DISTINCT bi.procedure_code
       FROM billing_items bi
       INNER JOIN billing_batches bb ON bi.batch_id = bb.id
       WHERE bb.contract_id = $1
         AND bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')`,
      [contractId]
    )

    const billedProcedureCodes = new Set(
      billedProceduresResult.rows.map(row => row.procedure_code)
    )

    // Get all eligible procedures from insurance provider
    const proceduresResult = await query(
      `SELECT 
        ipp.id,
        ipp.provider_code,
        ipp.provider_description,
        ipp.is_periciable,
        ipp.max_value,
        pbt.id as base_id,
        pbt.code as base_code,
        pbt.description as base_description,
        pbt.adults_only,
        pbt.default_value
       FROM insurance_provider_procedures ipp
       LEFT JOIN procedure_base_table pbt ON ipp.procedure_base_id = pbt.id
       WHERE ipp.insurance_provider_id = $1
         AND ipp.active = true
       ORDER BY ipp.provider_code`,
      [insuranceProviderId]
    )

    // Filter and format eligible procedures
    const eligibleProcedures = proceduresResult.rows
      .filter(proc => {
        // Exclude already billed procedures
        if (billedProcedureCodes.has(proc.provider_code)) {
          return false
        }

        // Check adults_only restriction
        if (proc.adults_only) {
          // Check if patient is adult (18+)
          if (patientAge === null || patientAge < 18) {
            return false
          }
        }

        return true
      })
      .map(proc => {
        const procedureValue = proc.max_value || proc.default_value || 0
        const eligibleFor: Array<{ id: string | null; name: string; type: string }> = []

        // Check eligibility for patient (titular)
        if (!proc.adults_only || (patientAge !== null && patientAge >= 18)) {
          eligibleFor.push({
            id: null,
            name: 'Titular',
            type: 'TITULAR',
          })
        }

        // Check eligibility for each dependent
        dependents.forEach(dep => {
          if (!proc.adults_only || (dep.age !== null && dep.age >= 18)) {
            eligibleFor.push({
              id: dep.id,
              name: dep.name,
              type: dep.relationship,
            })
          }
        })

        return {
          id: proc.id,
          procedureCode: proc.provider_code,
          procedureDescription: proc.provider_description || proc.base_description || '',
          isPericiable: proc.is_periciable || false,
          adultsOnly: proc.adults_only || false,
          unitValue: parseFloat(procedureValue.toString()),
          eligibleFor,
        }
      })
      .filter(proc => proc.eligibleFor.length > 0) // Only include if eligible for at least one person

    res.json({
      procedures: eligibleProcedures,
      dependents: dependents.map(dep => ({
        id: dep.id,
        name: dep.name,
        age: dep.age,
        relationship: dep.relationship,
      })),
      patientAge,
    })
  } catch (error) {
    console.error('Get eligible procedures error:', error)
    res.status(500).json({ error: 'Failed to fetch eligible procedures' })
  }
})

// Get already billed procedures for a contract
router.get('/contracts/:clinicId/:contractId/billed-procedures', async (req, res) => {
  try {
    const { clinicId, contractId } = req.params

    // Verify contract exists
    const contractCheck = await query(
      `SELECT id FROM advance_contracts WHERE id = $1 AND clinic_id = $2`,
      [contractId, clinicId]
    )

    if (contractCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Get billed items from issued/paid batches
    const billedItemsResult = await query(
      `SELECT 
        bi.id,
        bi.procedure_code,
        bi.procedure_description,
        bi.is_periciable,
        bi.unit_value,
        bi.quantity,
        bi.total_value,
        bi.service_date,
        bi.dependent_id,
        cd.name as dependent_name,
        bb.batch_number,
        bb.status as batch_status,
        bb.issued_at
       FROM billing_items bi
       INNER JOIN billing_batches bb ON bi.batch_id = bb.id
       LEFT JOIN contract_dependents cd ON bi.dependent_id = cd.id
       WHERE bb.contract_id = $1
         AND bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
         AND bi.status != 'REMOVED'
       ORDER BY bb.issued_at DESC, bi.service_date DESC`,
      [contractId]
    )

    res.json(
      billedItemsResult.rows.map(item => ({
        id: item.id,
        procedureCode: item.procedure_code,
        procedureDescription: item.procedure_description,
        isPericiable: item.is_periciable,
        unitValue: parseFloat(item.unit_value || '0'),
        quantity: item.quantity,
        totalValue: parseFloat(item.total_value || '0'),
        serviceDate: item.service_date,
        dependentId: item.dependent_id,
        dependentName: item.dependent_name,
        batchNumber: item.batch_number,
        batchStatus: item.batch_status,
        issuedAt: item.issued_at,
      }))
    )
  } catch (error) {
    console.error('Get billed procedures error:', error)
    res.status(500).json({ error: 'Failed to fetch billed procedures' })
  }
})

// Get all batches for a contract
router.get('/contracts/:clinicId/:contractId/batches', async (req, res) => {
  try {
    const { clinicId, contractId } = req.params

    // Verify contract exists
    const contractCheck = await query(
      `SELECT id FROM advance_contracts WHERE id = $1 AND clinic_id = $2`,
      [contractId, clinicId]
    )

    if (contractCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Get all batches for this contract
    const batchesResult = await query(
      `SELECT
        bb.id,
        bb.batch_number,
        bb.status,
        bb.total_amount,
        bb.issued_at,
        bb.created_at,
        COUNT(bi.id) as items_count
       FROM billing_batches bb
       LEFT JOIN billing_items bi ON bb.id = bi.batch_id
       WHERE bb.contract_id = $1
       GROUP BY bb.id, bb.batch_number, bb.status, bb.total_amount, bb.issued_at, bb.created_at
       ORDER BY bb.created_at DESC`,
      [contractId]
    )

    res.json(
      batchesResult.rows.map(batch => ({
        id: batch.id,
        batchNumber: batch.batch_number,
        status: batch.status,
        totalAmount: parseFloat(batch.total_amount || '0'),
        itemsCount: parseInt(batch.items_count || '0'),
        issuedAt: batch.issued_at,
        createdAt: batch.created_at,
      }))
    )
  } catch (error) {
    console.error('Get batches error:', error)
    res.status(500).json({ error: 'Failed to fetch batches' })
  }
})

// Get batch details with items
router.get('/batches/:clinicId/:batchId', async (req, res) => {
  try {
    const { clinicId, batchId } = req.params

    // Get batch details
    const batchResult = await query(
      `SELECT
        bb.id,
        bb.batch_number,
        bb.status,
        bb.total_amount,
        bb.target_amount,
        bb.issued_at,
        bb.created_at,
        bb.contract_id,
        ac.contract_number,
        p.name as patient_name,
        ip.name as insurance_provider_name
       FROM billing_batches bb
       INNER JOIN advance_contracts ac ON bb.contract_id = ac.id
       INNER JOIN patients p ON ac.patient_id = p.id
       INNER JOIN insurance_providers ip ON ac.insurance_provider_id = ip.id
       WHERE bb.id = $1 AND ac.clinic_id = $2`,
      [batchId, clinicId]
    )

    if (batchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' })
    }

    const batch = batchResult.rows[0]

    // Get batch items
    const itemsResult = await query(
      `SELECT
        bi.id,
        bi.procedure_code,
        bi.procedure_description,
        bi.is_periciable,
        bi.unit_value,
        bi.quantity,
        bi.total_value,
        bi.service_date,
        bi.dependent_id,
        cd.name as dependent_name,
        bi.status
       FROM billing_items bi
       LEFT JOIN contract_dependents cd ON bi.dependent_id = cd.id
       WHERE bi.batch_id = $1
       ORDER BY bi.service_date DESC, bi.procedure_code`,
      [batchId]
    )

    res.json({
      id: batch.id,
      batchNumber: batch.batch_number,
      status: batch.status,
      totalAmount: parseFloat(batch.total_amount || '0'),
      targetAmount: parseFloat(batch.target_amount || '0'),
      issuedAt: batch.issued_at,
      createdAt: batch.created_at,
      contractId: batch.contract_id,
      contractNumber: batch.contract_number,
      patientName: batch.patient_name,
      insuranceProviderName: batch.insurance_provider_name,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        procedureCode: item.procedure_code,
        procedureDescription: item.procedure_description,
        isPericiable: item.is_periciable,
        unitValue: parseFloat(item.unit_value || '0'),
        quantity: item.quantity,
        totalValue: parseFloat(item.total_value || '0'),
        serviceDate: item.service_date,
        dependentId: item.dependent_id,
        dependentName: item.dependent_name || 'Titular',
        status: item.status,
      })),
    })
  } catch (error) {
    console.error('Get batch details error:', error)
    res.status(500).json({ error: 'Failed to fetch batch details' })
  }
})

// Delete batch
router.delete('/batches/:clinicId/:batchId', async (req, res) => {
  const { clinicId, batchId } = req.params
  const hasPermission = await canBillAdvances(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    // Verify batch exists and get contract info
    const batchCheck = await query(
      `SELECT bb.id, bb.batch_number, ac.clinic_id
       FROM billing_batches bb
       INNER JOIN advance_contracts ac ON bb.contract_id = ac.id
       WHERE bb.id = $1 AND ac.clinic_id = $2`,
      [batchId, clinicId]
    )

    if (batchCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Batch not found' })
    }

    console.log(`[Delete Batch] Deleting batch ${batchCheck.rows[0].batch_number}`)

    // Delete batch items first (cascade should handle this, but being explicit)
    await query('DELETE FROM billing_items WHERE batch_id = $1', [batchId])

    // Delete batch
    await query('DELETE FROM billing_batches WHERE id = $1', [batchId])

    console.log(`[Delete Batch] Batch ${batchCheck.rows[0].batch_number} deleted successfully`)

    res.status(200).json({ message: 'Batch deleted successfully' })
  } catch (error) {
    console.error('Delete batch error:', error)
    res.status(500).json({ error: 'Failed to delete batch' })
  }
})

// Calculate billing items without creating batch (for preview/auto-selection)
router.post('/contracts/:clinicId/:contractId/billing-items/calculate', async (req, res) => {
  const { clinicId, contractId } = req.params
  const hasPermission = await canBillAdvances(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { targetAmount, serviceDate } = req.body

    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      return res.status(400).json({ error: 'Target amount is required and must be greater than 0' })
    }

    const finalTargetAmount = parseFloat(targetAmount)
    const finalServiceDate = serviceDate || new Date().toISOString().split('T')[0]

    console.log(`[Calculate Items] Calculating items for contract ${contractId}, target: €${finalTargetAmount}`)

    // Verify contract exists and get insurance provider
    const contractResult = await query(
      `SELECT ac.insurance_provider_id, ac.patient_id
       FROM advance_contracts ac
       WHERE ac.id = $1 AND ac.clinic_id = $2`,
      [contractId, clinicId]
    )

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    const contract = contractResult.rows[0]

    // Get eligible procedures (only non-periciable)
    const eligibleResult = await query(
      `SELECT
        ipp.id,
        ipp.provider_code,
        ipp.provider_description,
        ipp.is_periciable,
        ipp.max_value,
        pbt.id as base_id,
        pbt.adults_only,
        pbt.default_value
       FROM insurance_provider_procedures ipp
       LEFT JOIN procedure_base_table pbt ON ipp.procedure_base_id = pbt.id
       WHERE ipp.insurance_provider_id = $1
         AND ipp.active = true
         AND ipp.is_periciable = false
       ORDER BY RANDOM()`,
      [contract.insurance_provider_id]
    )

    // Get already billed procedure codes
    const billedResult = await query(
      `SELECT DISTINCT bi.procedure_code
       FROM billing_items bi
       INNER JOIN billing_batches bb ON bi.batch_id = bb.id
       WHERE bb.contract_id = $1
         AND bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')`,
      [contractId]
    )

    const billedCodes = new Set(billedResult.rows.map(r => r.procedure_code))

    // Get dependents
    const dependentsResult = await query(
      `SELECT id, name, birth_date, age, relationship
       FROM contract_dependents
       WHERE contract_id = $1`,
      [contractId]
    )

    // Filter eligible procedures
    const eligibleProcedures = eligibleResult.rows
      .filter(proc => {
        if (billedCodes.has(proc.provider_code)) return false
        const value = parseFloat((proc.max_value || proc.default_value || 0).toString())
        return value > 0
      })
      .map(proc => ({
        id: proc.id,
        code: proc.provider_code,
        description: proc.provider_description || '',
        value: parseFloat((proc.max_value || proc.default_value || 0).toString()),
        adultsOnly: proc.adults_only || false,
      }))

    if (eligibleProcedures.length === 0) {
      return res.status(400).json({ error: 'Não há procedimentos disponíveis para este contrato.' })
    }

    // Get patient age
    const patientResult = await query(
      `SELECT birth_date FROM patients WHERE id = $1`,
      [contract.patient_id]
    )
    const patientBirthDate = patientResult.rows[0]?.birth_date
    const patientAge = patientBirthDate
      ? new Date().getFullYear() - new Date(patientBirthDate).getFullYear()
      : null

    const dependents = dependentsResult.rows.map(dep => ({
      ...dep,
      age: dep.age || (dep.birth_date
        ? new Date().getFullYear() - new Date(dep.birth_date).getFullYear()
        : null),
    }))

    // Filter by eligibility (adults_only)
    const trulyEligibleProcedures = eligibleProcedures.filter(proc => {
      if (!proc.adultsOnly || (patientAge !== null && patientAge >= 18)) {
        return true
      }
      return dependents.some(dep => !proc.adultsOnly || (dep.age !== null && dep.age >= 18))
    })

    if (trulyEligibleProcedures.length === 0) {
      return res.status(400).json({
        error: 'Não há procedimentos elegíveis considerando as restrições de idade.'
      })
    }

    // Select procedures randomly until reaching target
    const selectedItems: Array<{
      procedureId: string
      procedureCode: string
      procedureDescription: string
      isPericiable: boolean
      unitValue: number
      quantity: number
      totalValue: number
      dependentId: string | null
      dependentName: string
    }> = []

    let currentTotal = 0
    const availableProcedures = [...trulyEligibleProcedures]
    let attempts = 0
    const maxAttempts = 1000

    // Shuffle
    for (let i = 0; i < 3; i++) {
      availableProcedures.sort(() => Math.random() - 0.5)
    }

    while (currentTotal < finalTargetAmount && attempts < maxAttempts) {
      attempts++

      for (const proc of availableProcedures) {
        if (currentTotal >= finalTargetAmount) break

        const eligiblePeople: Array<{ id: string | null; name: string }> = []

        if (!proc.adultsOnly || (patientAge !== null && patientAge >= 18)) {
          eligiblePeople.push({ id: null, name: 'Titular' })
        }

        dependents.forEach(dep => {
          if (!proc.adultsOnly || (dep.age !== null && dep.age >= 18)) {
            eligiblePeople.push({ id: dep.id, name: dep.name })
          }
        })

        if (eligiblePeople.length === 0) continue

        const selectedPerson = eligiblePeople[Math.floor(Math.random() * eligiblePeople.length)]
        const itemValue = proc.value

        if (currentTotal + itemValue <= finalTargetAmount * 1.05) {
          const alreadySelected = selectedItems.some(
            item => item.procedureId === proc.id && item.dependentId === selectedPerson.id
          )

          if (!alreadySelected) {
            selectedItems.push({
              procedureId: proc.id,
              procedureCode: proc.code,
              procedureDescription: proc.description,
              isPericiable: false,
              unitValue: proc.value,
              quantity: 1,
              totalValue: itemValue,
              dependentId: selectedPerson.id,
              dependentName: selectedPerson.name,
            })

            currentTotal += itemValue
          }
        }
      }

      if (attempts >= maxAttempts || (selectedItems.length > 0 && currentTotal >= finalTargetAmount * 0.95)) {
        break
      }
    }

    if (selectedItems.length === 0) {
      return res.status(400).json({
        error: 'Não foi possível selecionar procedimentos suficientes.'
      })
    }

    const totalAmount = selectedItems.reduce((sum, item) => sum + item.totalValue, 0)

    console.log(`[Calculate Items] Calculated ${selectedItems.length} items, total: €${totalAmount.toFixed(2)}`)

    // Return items WITHOUT creating the batch
    res.status(200).json({
      items: selectedItems.map(item => ({
        procedureId: item.procedureId,
        procedureCode: item.procedureCode,
        procedureDescription: item.procedureDescription,
        isPericiable: item.isPericiable,
        unitValue: item.unitValue,
        quantity: item.quantity,
        totalValue: item.totalValue,
        serviceDate: finalServiceDate,
        dependentId: item.dependentId,
        dependentName: item.dependentName,
      })),
      totalAmount,
      targetAmount: finalTargetAmount,
    })
  } catch (error) {
    console.error('[Calculate Items] Error:', error)
    res.status(500).json({ error: 'Failed to calculate billing items' })
  }
})

// Create billing batch with automatic procedure selection
router.post('/contracts/:clinicId/:contractId/billing-batch/auto', async (req, res) => {
  const { clinicId, contractId } = req.params
  const hasPermission = await canBillAdvances(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { targetAmount, serviceDate } = req.body

    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      return res.status(400).json({ error: 'Target amount is required and must be greater than 0' })
    }

    const finalTargetAmount = parseFloat(targetAmount)
    const finalServiceDate = serviceDate || new Date().toISOString().split('T')[0]

    // Verify contract exists and get insurance provider
    const contractResult = await query(
      `SELECT ac.insurance_provider_id, ac.patient_id
       FROM advance_contracts ac
       WHERE ac.id = $1 AND ac.clinic_id = $2`,
      [contractId, clinicId]
    )

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    const contract = contractResult.rows[0]

    // Get eligible procedures (only non-periciable)
    const eligibleResult = await query(
      `SELECT 
        ipp.id,
        ipp.provider_code,
        ipp.provider_description,
        ipp.is_periciable,
        ipp.max_value,
        pbt.id as base_id,
        pbt.adults_only,
        pbt.default_value
       FROM insurance_provider_procedures ipp
       LEFT JOIN procedure_base_table pbt ON ipp.procedure_base_id = pbt.id
       WHERE ipp.insurance_provider_id = $1
         AND ipp.active = true
         AND ipp.is_periciable = false
       ORDER BY RANDOM()`,
      [contract.insurance_provider_id]
    )

    console.log(`[Billing Auto] Found ${eligibleResult.rows.length} non-periciable procedures for provider ${contract.insurance_provider_id}`)

    // Get already billed procedure codes
    const billedResult = await query(
      `SELECT DISTINCT bi.procedure_code
       FROM billing_items bi
       INNER JOIN billing_batches bb ON bi.batch_id = bb.id
       WHERE bb.contract_id = $1
         AND bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')`,
      [contractId]
    )

    const billedCodes = new Set(billedResult.rows.map(r => r.procedure_code))
    console.log(`[Billing Auto] Found ${billedCodes.size} already billed procedure codes`)

    // Get dependents
    const dependentsResult = await query(
      `SELECT id, name, birth_date, age, relationship
       FROM contract_dependents
       WHERE contract_id = $1`,
      [contractId]
    )

    // Filter eligible procedures and check if any are available
    let filteredByBilled = 0
    let filteredByValue = 0
    
    const eligibleProcedures = eligibleResult.rows
      .filter(proc => {
        // Exclude already billed
        if (billedCodes.has(proc.provider_code)) {
          filteredByBilled++
          return false
        }
        
        // Check if procedure has valid value
        const value = parseFloat((proc.max_value || proc.default_value || 0).toString())
        if (value <= 0) {
          filteredByValue++
          return false
        }
        
        return true
      })
      .map(proc => ({
        id: proc.id,
        code: proc.provider_code,
        description: proc.provider_description || '',
        value: parseFloat((proc.max_value || proc.default_value || 0).toString()),
        adultsOnly: proc.adults_only || false,
      }))

    console.log(`[Billing Auto] After filtering: ${eligibleProcedures.length} eligible procedures (${filteredByBilled} already billed, ${filteredByValue} invalid value)`)

    // Check if there are any eligible procedures
    if (eligibleResult.rows.length === 0) {
      // Check if there are any procedures at all for this provider
      const totalProceduresResult = await query(
        `SELECT COUNT(*) as total FROM insurance_provider_procedures WHERE insurance_provider_id = $1`,
        [contract.insurance_provider_id]
      )
      const totalProcedures = parseInt(totalProceduresResult.rows[0]?.total || '0')
      
      if (totalProcedures === 0) {
        return res.status(400).json({ 
          error: 'Não há procedimentos cadastrados para esta operadora. Aprove os procedimentos extraídos do PDF na tela de revisão de mapeamentos.' 
        })
      } else {
        return res.status(400).json({ 
          error: `Não há procedimentos não periciáveis disponíveis. Existem ${totalProcedures} procedimentos cadastrados, mas todos são periciáveis. A seleção automática funciona apenas com procedimentos não periciáveis.` 
        })
      }
    }

    if (eligibleProcedures.length === 0) {
      let errorMsg = 'Não há procedimentos disponíveis para este contrato.'
      
      if (filteredByBilled > 0) {
        errorMsg += ` ${filteredByBilled} procedimento(s) já foram faturados.`
      }
      if (filteredByValue > 0) {
        errorMsg += ` ${filteredByValue} procedimento(s) não têm valor válido.`
      }
      errorMsg += ' Verifique se há procedimentos aprovados na tabela da operadora com valores definidos.'
      
      return res.status(400).json({ error: errorMsg })
    }

    // Get patient age
    const patientResult = await query(
      `SELECT birth_date FROM patients WHERE id = $1`,
      [contract.patient_id]
    )
    const patientBirthDate = patientResult.rows[0]?.birth_date
    const patientAge = patientBirthDate
      ? new Date().getFullYear() - new Date(patientBirthDate).getFullYear()
      : null

    // Calculate dependents ages
    const dependents = dependentsResult.rows.map(dep => ({
      ...dep,
      age: dep.age || (dep.birth_date
        ? new Date().getFullYear() - new Date(dep.birth_date).getFullYear()
        : null),
    }))

    // Filter procedures by eligibility (adults_only)
    const trulyEligibleProcedures = eligibleProcedures.filter(proc => {
      // Check if patient can use it
      if (!proc.adultsOnly || (patientAge !== null && patientAge >= 18)) {
        return true
      }
      
      // Check if any dependent can use it
      return dependents.some(dep => !proc.adultsOnly || (dep.age !== null && dep.age >= 18))
    })

    if (trulyEligibleProcedures.length === 0) {
      return res.status(400).json({ 
        error: 'Não há procedimentos elegíveis considerando as restrições de idade (adults_only).' 
      })
    }

    // Calculate maximum possible value (only unit procedures, quantity = 1)
    const maxPossibleValue = trulyEligibleProcedures.reduce((sum, proc) => {
      return sum + proc.value // Only 1 unit per procedure
    }, 0)

    if (maxPossibleValue < finalTargetAmount) {
      return res.status(400).json({ 
        error: `Valor alvo (${finalTargetAmount.toFixed(2)}€) excede o máximo possível (${maxPossibleValue.toFixed(2)}€) com os procedimentos disponíveis.` 
      })
    }

    // Select procedures randomly until reaching target amount
    const selectedItems: Array<{
      procedureId: string
      procedureCode: string
      procedureDescription: string
      isPericiable: boolean
      unitValue: number
      quantity: number
      totalValue: number
      dependentId: string | null
      dependentName: string
    }> = []

    let currentTotal = 0
    const availableProcedures = [...trulyEligibleProcedures]
    let attempts = 0
    const maxAttempts = 1000 // Prevent infinite loop

    // Shuffle multiple times for better randomness
    for (let i = 0; i < 3; i++) {
      availableProcedures.sort(() => Math.random() - 0.5)
    }

    while (currentTotal < finalTargetAmount && attempts < maxAttempts) {
      attempts++
      
      // Try each procedure
      for (const proc of availableProcedures) {
        if (currentTotal >= finalTargetAmount) break

        // Determine who can use this procedure
        const eligiblePeople: Array<{ id: string | null; name: string }> = []

        if (!proc.adultsOnly || (patientAge !== null && patientAge >= 18)) {
          eligiblePeople.push({ id: null, name: 'Titular' })
        }

        dependents.forEach(dep => {
          if (!proc.adultsOnly || (dep.age !== null && dep.age >= 18)) {
            eligiblePeople.push({ id: dep.id, name: dep.name })
          }
        })

        if (eligiblePeople.length === 0) continue

        // Randomly select a person
        const selectedPerson = eligiblePeople[Math.floor(Math.random() * eligiblePeople.length)]

        // Always use quantity = 1 (unit procedures only)
        const itemValue = proc.value

        // Allow up to 5% over target to complete selection
        if (currentTotal + itemValue <= finalTargetAmount * 1.05) {
          // Check if this procedure is already selected for this person
          const alreadySelected = selectedItems.some(
            item => item.procedureId === proc.id && item.dependentId === selectedPerson.id
          )
          
          if (!alreadySelected) {
            selectedItems.push({
              procedureId: proc.id,
              procedureCode: proc.code,
              procedureDescription: proc.description,
              isPericiable: false,
              unitValue: proc.value,
              quantity: 1, // Always 1 unit
              totalValue: itemValue,
              dependentId: selectedPerson.id,
              dependentName: selectedPerson.name,
            })

            currentTotal += itemValue
          }
        }
      }

      // If we've tried all procedures and still haven't reached target, break
      if (attempts >= maxAttempts || (selectedItems.length > 0 && currentTotal >= finalTargetAmount * 0.95)) {
        break
      }
    }

    if (selectedItems.length === 0) {
      return res.status(400).json({
        error: 'Não foi possível selecionar procedimentos suficientes para atingir o valor alvo. Tente um valor menor ou verifique se há procedimentos disponíveis.'
      })
    }

    // Calculate totals
    const totalAmount = selectedItems.reduce((sum, item) => sum + item.totalValue, 0)
    const totalPericiable = selectedItems
      .filter(item => item.isPericiable)
      .reduce((sum, item) => sum + item.totalValue, 0)

    // Idempotency check: prevent duplicate batches with same amount within 5 seconds
    const recentDuplicateCheck = await query(
      `SELECT id, batch_number
       FROM billing_batches
       WHERE contract_id = $1
         AND total_amount = $2
         AND created_at > NOW() - INTERVAL '5 seconds'
       ORDER BY created_at DESC
       LIMIT 1`,
      [contractId, totalAmount]
    )

    if (recentDuplicateCheck.rows.length > 0) {
      const existingBatch = recentDuplicateCheck.rows[0]
      console.log(`[Billing Auto] Duplicate prevented - returning existing batch ${existingBatch.batch_number}`)

      // Return the existing batch instead of creating a duplicate
      const batchResult = await query(
        `SELECT * FROM billing_batches WHERE id = $1`,
        [existingBatch.id]
      )

      const itemsResult = await query(
        `SELECT bi.*, cd.name as dependent_name
         FROM billing_items bi
         LEFT JOIN contract_dependents cd ON bi.dependent_id = cd.id
         WHERE bi.batch_id = $1`,
        [existingBatch.id]
      )

      return res.status(201).json({
        id: batchResult.rows[0].id,
        contractId: batchResult.rows[0].contract_id,
        batchNumber: batchResult.rows[0].batch_number,
        targetAmount: parseFloat(batchResult.rows[0].target_amount || '0'),
        targetPericiableAmount: parseFloat(batchResult.rows[0].target_periciable_amount || '0'),
        totalAmount: parseFloat(batchResult.rows[0].total_amount || '0'),
        totalPericiableAmount: parseFloat(batchResult.rows[0].total_periciable_amount || '0'),
        status: batchResult.rows[0].status,
        items: itemsResult.rows.map(item => ({
          id: item.id,
          procedureCode: item.procedure_code,
          procedureDescription: item.procedure_description,
          isPericiable: item.is_periciable,
          unitValue: parseFloat(item.unit_value || '0'),
          quantity: item.quantity,
          totalValue: parseFloat(item.total_value || '0'),
          serviceDate: item.service_date,
          dependentId: item.dependent_id,
          dependentName: item.dependent_name,
        })),
      })
    }

    // Create billing batch
    const batchId = `batch-${contractId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const batchNumber = `LOTE-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
    const userId = req.user?.sub || null

    console.log(`[Billing Auto] Creating new batch ${batchNumber} for contract ${contractId} with total €${totalAmount.toFixed(2)}`)

    // Create billing batch as ISSUED since this is the "Emitir Lote" flow
    await query(
      `INSERT INTO billing_batches (
        id, contract_id, batch_number, target_amount, target_periciable_amount,
        total_amount, total_periciable_amount, status, issued_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ISSUED', CURRENT_TIMESTAMP, $8)`,
      [
        batchId,
        contractId,
        batchNumber,
        finalTargetAmount,
        0, // target_periciable_amount (only non-periciable in auto selection)
        totalAmount,
        totalPericiable,
        userId,
      ]
    )

    // Create billing items
    for (const item of selectedItems) {
      const itemId = `item-${batchId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      await query(
        `INSERT INTO billing_items (
          id, batch_id, dependent_id, procedure_id, procedure_type,
          procedure_code, procedure_description, is_periciable,
          unit_value, quantity, total_value, service_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'INCLUDED')`,
        [
          itemId,
          batchId,
          item.dependentId,
          item.procedureId,
          'PROVIDER',
          item.procedureCode,
          item.procedureDescription,
          item.isPericiable,
          item.unitValue,
          item.quantity,
          item.totalValue,
          finalServiceDate,
        ]
      )
    }

    // Get created batch with items
    const batchResult = await query(
      `SELECT * FROM billing_batches WHERE id = $1`,
      [batchId]
    )

    const itemsResult = await query(
      `SELECT bi.*, cd.name as dependent_name
       FROM billing_items bi
       LEFT JOIN contract_dependents cd ON bi.dependent_id = cd.id
       WHERE bi.batch_id = $1`,
      [batchId]
    )

    res.status(201).json({
      id: batchResult.rows[0].id,
      contractId: batchResult.rows[0].contract_id,
      batchNumber: batchResult.rows[0].batch_number,
      targetAmount: parseFloat(batchResult.rows[0].target_amount || '0'),
      targetPericiableAmount: parseFloat(batchResult.rows[0].target_periciable_amount || '0'),
      totalAmount: parseFloat(batchResult.rows[0].total_amount || '0'),
      totalPericiableAmount: parseFloat(batchResult.rows[0].total_periciable_amount || '0'),
      status: batchResult.rows[0].status,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        procedureCode: item.procedure_code,
        procedureDescription: item.procedure_description,
        isPericiable: item.is_periciable,
        unitValue: parseFloat(item.unit_value || '0'),
        quantity: item.quantity,
        totalValue: parseFloat(item.total_value || '0'),
        serviceDate: item.service_date,
        dependentId: item.dependent_id,
        dependentName: item.dependent_name,
      })),
    })
  } catch (error) {
    console.error('Create billing batch auto error:', error)
    res.status(500).json({ error: 'Failed to create billing batch' })
  }
})

// Create billing batch with manually selected items
router.post('/contracts/:clinicId/:contractId/billing-batch/manual', async (req, res) => {
  const { clinicId, contractId } = req.params
  const hasPermission = await canBillAdvances(req, clinicId)

  if (!hasPermission) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const { items, serviceDate } = req.body

    console.log(`[Billing Manual] Received request for contract ${contractId} with ${items?.length || 0} items`)

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' })
    }

    const finalServiceDate = serviceDate || new Date().toISOString().split('T')[0]

    // Verify contract exists
    const contractResult = await query(
      `SELECT ac.insurance_provider_id, ac.patient_id
       FROM advance_contracts ac
       WHERE ac.id = $1 AND ac.clinic_id = $2`,
      [contractId, clinicId]
    )

    if (contractResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contract not found' })
    }

    // Calculate totals - ensure we use the same calculation logic as when inserting items
    const totalAmount = items.reduce((sum: number, item: any) => {
      // Use totalValue if provided, otherwise calculate from unitValue * quantity
      const itemTotal = item.totalValue !== undefined && item.totalValue !== null
        ? item.totalValue
        : (item.unitValue || 0) * (item.quantity || 1)
      return sum + itemTotal
    }, 0)
    const totalPericiable = items
      .filter((item: any) => item.isPericiable)
      .reduce((sum: number, item: any) => {
        const itemTotal = item.totalValue !== undefined && item.totalValue !== null
          ? item.totalValue
          : (item.unitValue || 0) * (item.quantity || 1)
        return sum + itemTotal
      }, 0)

    // Idempotency check: prevent duplicate batches with same amount within 5 seconds
    const recentDuplicateCheck = await query(
      `SELECT id, batch_number
       FROM billing_batches
       WHERE contract_id = $1
         AND total_amount = $2
         AND created_at > NOW() - INTERVAL '5 seconds'
       ORDER BY created_at DESC
       LIMIT 1`,
      [contractId, totalAmount]
    )

    if (recentDuplicateCheck.rows.length > 0) {
      const existingBatch = recentDuplicateCheck.rows[0]
      console.log(`[Billing Manual] Duplicate prevented - returning existing batch ${existingBatch.batch_number}`)

      // Return the existing batch instead of creating a duplicate
      const batchResult = await query(
        `SELECT * FROM billing_batches WHERE id = $1`,
        [existingBatch.id]
      )

      const itemsResult = await query(
        `SELECT bi.*, cd.name as dependent_name
         FROM billing_items bi
         LEFT JOIN contract_dependents cd ON bi.dependent_id = cd.id
         WHERE bi.batch_id = $1`,
        [existingBatch.id]
      )

      return res.status(201).json({
        id: batchResult.rows[0].id,
        contractId: batchResult.rows[0].contract_id,
        batchNumber: batchResult.rows[0].batch_number,
        targetAmount: parseFloat(batchResult.rows[0].target_amount || '0'),
        targetPericiableAmount: parseFloat(batchResult.rows[0].target_periciable_amount || '0'),
        totalAmount: parseFloat(batchResult.rows[0].total_amount || '0'),
        totalPericiableAmount: parseFloat(batchResult.rows[0].total_periciable_amount || '0'),
        status: batchResult.rows[0].status,
        items: itemsResult.rows.map(item => ({
          id: item.id,
          procedureCode: item.procedure_code,
          procedureDescription: item.procedure_description,
          isPericiable: item.is_periciable,
          unitValue: parseFloat(item.unit_value || '0'),
          quantity: item.quantity,
          totalValue: parseFloat(item.total_value || '0'),
          serviceDate: item.service_date,
          dependentId: item.dependent_id,
          dependentName: item.dependent_name,
        })),
      })
    }

    // Create billing batch
    const batchId = `batch-${contractId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const batchNumber = `LOTE-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`
    const userId = req.user?.sub || null

    console.log(`[Billing Manual] Creating new batch ${batchNumber} for contract ${contractId} with total €${totalAmount.toFixed(2)}`)

    await query(
      `INSERT INTO billing_batches (
        id, contract_id, batch_number, target_amount, target_periciable_amount,
        total_amount, total_periciable_amount, status, issued_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'ISSUED', CURRENT_TIMESTAMP, $8)`,
      [
        batchId,
        contractId,
        batchNumber,
        totalAmount,
        totalPericiable,
        totalAmount,
        totalPericiable,
        userId,
      ]
    )

    // Create billing items
    for (const item of items) {
      const itemId = `item-${batchId}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      
      // Get procedure details
      const procResult = await query(
        `SELECT provider_code, provider_description, is_periciable, max_value
         FROM insurance_provider_procedures
         WHERE id = $1`,
        [item.procedureId]
      )

      if (procResult.rows.length === 0) {
        console.warn(`Procedure ${item.procedureId} not found, skipping`)
        continue
      }

      const proc = procResult.rows[0]

      // Calculate total value - use provided totalValue if available, otherwise calculate
      // Ensure we use the same unitValue and quantity that we're saving
      const unitValue = item.unitValue || proc.max_value || 0
      const quantity = item.quantity || 1
      const totalValue = item.totalValue !== undefined && item.totalValue !== null 
        ? item.totalValue 
        : unitValue * quantity

      await query(
        `INSERT INTO billing_items (
          id, batch_id, dependent_id, procedure_id, procedure_type,
          procedure_code, procedure_description, is_periciable,
          unit_value, quantity, total_value, service_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'INCLUDED')`,
        [
          itemId,
          batchId,
          item.dependentId || null,
          item.procedureId,
          'PROVIDER',
          item.procedureCode || proc.provider_code,
          item.procedureDescription || proc.provider_description,
          item.isPericiable !== undefined ? item.isPericiable : proc.is_periciable,
          unitValue,
          quantity,
          totalValue,
          finalServiceDate,
        ]
      )
    }

    // Get created batch with items
    const batchResult = await query(
      `SELECT * FROM billing_batches WHERE id = $1`,
      [batchId]
    )

    const itemsResult = await query(
      `SELECT bi.*, cd.name as dependent_name
       FROM billing_items bi
       LEFT JOIN contract_dependents cd ON bi.dependent_id = cd.id
       WHERE bi.batch_id = $1`,
      [batchId]
    )

    res.status(201).json({
      id: batchResult.rows[0].id,
      contractId: batchResult.rows[0].contract_id,
      batchNumber: batchResult.rows[0].batch_number,
      targetAmount: parseFloat(batchResult.rows[0].target_amount || '0'),
      targetPericiableAmount: parseFloat(batchResult.rows[0].target_periciable_amount || '0'),
      totalAmount: parseFloat(batchResult.rows[0].total_amount || '0'),
      totalPericiableAmount: parseFloat(batchResult.rows[0].total_periciable_amount || '0'),
      status: batchResult.rows[0].status,
      items: itemsResult.rows.map(item => ({
        id: item.id,
        procedureCode: item.procedure_code,
        procedureDescription: item.procedure_description,
        isPericiable: item.is_periciable,
        unitValue: parseFloat(item.unit_value || '0'),
        quantity: item.quantity,
        totalValue: parseFloat(item.total_value || '0'),
        serviceDate: item.service_date,
        dependentId: item.dependent_id,
        dependentName: item.dependent_name,
      })),
    })
  } catch (error) {
    console.error('Create billing batch manual error:', error)
    res.status(500).json({ error: 'Failed to create billing batch' })
  }
})

export default router

