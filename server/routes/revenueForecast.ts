import { Router } from 'express'
import { query, getClient } from '../db.js'
import { getUserPermissions } from '../middleware/permissions.js'

const router = Router()

/**
 * Helper function to check if user can manage revenue forecast
 */
async function canManageRevenueForecast(req: any, clinicId: string): Promise<boolean> {
  if (!req.user || !req.user.sub) {
    return false
  }

  const { sub: userId, role, clinicId: userClinicId } = req.user

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

// ================================
// REVENUE PLANS & INSTALLMENTS
// ================================

/**
 * Get all revenue plans with installments for a clinic
 */
router.get('/:clinicId/plans', async (req, res) => {
  try {
    const { clinicId } = req.params

    if (!await canManageRevenueForecast(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    const plansResult = await query(
      `SELECT
        rp.id,
        rp.patient_code,
        rp.patient_name,
        rp.description,
        rp.total_value,
        rp.installment_value,
        rp.installment_count,
        rp.start_date,
        rp.payment_day,
        rp.category_id,
        rp.already_paid_amount,
        cc.name as category_name,
        rp.created_at
      FROM revenue_plans rp
      LEFT JOIN clinic_categories cc ON rp.category_id = cc.id
      WHERE rp.clinic_id = $1
      ORDER BY rp.created_at DESC`,
      [clinicId]
    )

    const plans = await Promise.all(
      plansResult.rows.map(async (plan) => {
        const installmentsResult = await query(
          `SELECT
            id,
            installment_number,
            due_date,
            value,
            status,
            received_date,
            is_historical
          FROM revenue_installments
          WHERE revenue_plan_id = $1
          ORDER BY installment_number ASC`,
          [plan.id]
        )

        return {
          id: plan.id,
          patientCode: plan.patient_code,
          patientName: plan.patient_name,
          description: plan.description,
          totalValue: parseFloat(plan.total_value),
          installmentValue: parseFloat(plan.installment_value),
          installmentCount: plan.installment_count,
          startDate: plan.start_date,
          paymentDay: plan.payment_day,
          categoryId: plan.category_id,
          categoryName: plan.category_name,
          alreadyPaidAmount: parseFloat(plan.already_paid_amount || '0'),
          createdAt: plan.created_at,
          installments: installmentsResult.rows.map((inst) => ({
            id: inst.id,
            installmentNumber: inst.installment_number,
            dueDate: inst.due_date,
            value: parseFloat(inst.value),
            status: inst.status,
            receivedDate: inst.received_date,
            isHistorical: inst.is_historical || false,
          })),
        }
      })
    )

    res.json(plans)
  } catch (error: any) {
    console.error('Get revenue plans error:', error)
    res.status(500).json({ error: 'Failed to fetch revenue plans' })
  }
})

/**
 * Create new revenue plan with installments
 */
router.post('/:clinicId/plans', async (req, res) => {
  const client = await getClient()

  try {
    const { clinicId } = req.params
    const {
      patientCode,
      patientName,
      description,
      totalValue,
      installmentValue,
      installmentCount,
      startDate,
      paymentDay,
      categoryId,
      alreadyPaidAmount,
    } = req.body

    if (!await canManageRevenueForecast(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Validation
    if (!patientCode || !patientName || !description || !installmentValue || !installmentCount || !startDate || !paymentDay) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    if (installmentCount <= 0 || paymentDay < 1 || paymentDay > 31) {
      return res.status(400).json({ error: 'Invalid values' })
    }

    const calculatedTotalValue = totalValue || installmentValue * installmentCount
    const paidAmount = parseFloat(alreadyPaidAmount || '0')

    await client.query('BEGIN')

    // Create revenue plan
    const planId = `rp-${Date.now()}-${Math.random().toString(36).substring(7)}`
    await client.query(
      `INSERT INTO revenue_plans (
        id, clinic_id, patient_code, patient_name, description, total_value,
        installment_value, installment_count, start_date, payment_day, category_id, already_paid_amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        planId,
        clinicId,
        patientCode,
        patientName,
        description,
        calculatedTotalValue,
        installmentValue,
        installmentCount,
        startDate,
        paymentDay,
        categoryId || null,
        paidAmount,
      ]
    )

    // Generate installments
    const startDateObj = new Date(startDate)
    const installments = []
    const today = new Date()

    for (let i = 0; i < installmentCount; i++) {
      const dueDate = new Date(startDateObj)
      dueDate.setMonth(dueDate.getMonth() + i)
      dueDate.setDate(paymentDay)

      const installmentId = `ri-${Date.now()}-${i}-${Math.random().toString(36).substring(7)}`

      // Determine status (no historical installments, alreadyPaidAmount is just informational)
      const status = dueDate < today ? 'ATRASADO' : 'A_RECEBER'

      await client.query(
        `INSERT INTO revenue_installments (
          id, revenue_plan_id, clinic_id, installment_number,
          due_date, value, status, is_historical, received_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [installmentId, planId, clinicId, i + 1, dueDate, installmentValue, status, false, null]
      )

      installments.push({
        id: installmentId,
        installmentNumber: i + 1,
        dueDate,
        value: installmentValue,
        status,
        isHistorical: false,
        receivedDate: null,
      })
    }

    await client.query('COMMIT')

    res.status(201).json({
      id: planId,
      description,
      totalValue: calculatedTotalValue,
      installmentValue,
      installmentCount,
      startDate,
      paymentDay,
      categoryId,
      installments,
    })
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Create revenue plan error:', error)
    res.status(500).json({ error: 'Failed to create revenue plan' })
  } finally {
    client.release()
  }
})

/**
 * Helper function to recalculate plan totals based on installments
 */
async function recalculatePlanTotals(planId: string) {
  // Get all installments for this plan
  const installmentsResult = await query(
    `SELECT value FROM revenue_installments WHERE revenue_plan_id = $1 ORDER BY installment_number ASC`,
    [planId]
  )

  if (installmentsResult.rows.length === 0) {
    return
  }

  const installments = installmentsResult.rows.map(row => parseFloat(row.value))
  const totalValue = installments.reduce((sum, val) => sum + val, 0)
  const avgInstallmentValue = totalValue / installments.length
  const installmentCount = installments.length

  // Update the plan
  await query(
    `UPDATE revenue_plans
     SET total_value = $1,
         installment_value = $2,
         installment_count = $3
     WHERE id = $4`,
    [totalValue, avgInstallmentValue, installmentCount, planId]
  )
}

/**
 * Update installment (value, date, or mark as received)
 */
router.patch('/:clinicId/installments/:installmentId', async (req, res) => {
  try {
    const { clinicId, installmentId } = req.params
    const { value, dueDate, status, receivedDate } = req.body

    if (!await canManageRevenueForecast(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (value !== undefined) {
      updates.push(`value = $${paramCount++}`)
      values.push(value)
    }

    if (dueDate !== undefined) {
      updates.push(`due_date = $${paramCount++}`)
      values.push(dueDate)
    }

    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`)
      values.push(status)

      if (status === 'RECEBIDO' && receivedDate) {
        updates.push(`received_date = $${paramCount++}`)
        values.push(receivedDate)
      } else if (status !== 'RECEBIDO') {
        updates.push(`received_date = NULL`)
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(installmentId, clinicId)

    const result = await query(
      `UPDATE revenue_installments
       SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND clinic_id = $${paramCount++}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Installment not found' })
    }

    const updated = result.rows[0]

    // Recalculate plan totals if value was changed
    if (value !== undefined) {
      await recalculatePlanTotals(updated.revenue_plan_id)
    }

    res.json({
      id: updated.id,
      installmentNumber: updated.installment_number,
      dueDate: updated.due_date,
      value: parseFloat(updated.value),
      status: updated.status,
      receivedDate: updated.received_date,
    })
  } catch (error: any) {
    console.error('Update installment error:', error)
    res.status(500).json({ error: 'Failed to update installment' })
  }
})

/**
 * Revert received installment back to A_RECEBER
 */
router.post('/:clinicId/installments/:installmentId/revert', async (req, res) => {
  try {
    const { clinicId, installmentId } = req.params

    if (!await canManageRevenueForecast(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Check if installment is RECEBIDO
    const checkResult = await query(
      `SELECT status, is_historical FROM revenue_installments
       WHERE id = $1 AND clinic_id = $2`,
      [installmentId, clinicId]
    )

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Installment not found' })
    }

    const installment = checkResult.rows[0]

    if (installment.status !== 'RECEBIDO') {
      return res.status(400).json({ error: 'Can only revert installments with status RECEBIDO' })
    }

    if (installment.is_historical) {
      return res.status(400).json({ error: 'Cannot revert historical installments' })
    }

    // Update status back to A_RECEBER
    const result = await query(
      `UPDATE revenue_installments
       SET status = 'A_RECEBER', received_date = NULL
       WHERE id = $1 AND clinic_id = $2
       RETURNING *`,
      [installmentId, clinicId]
    )

    const updated = result.rows[0]
    res.json({
      id: updated.id,
      installmentNumber: updated.installment_number,
      dueDate: updated.due_date,
      value: parseFloat(updated.value),
      status: updated.status,
      receivedDate: updated.received_date,
      isHistorical: updated.is_historical,
    })
  } catch (error: any) {
    console.error('Revert installment error:', error)
    res.status(500).json({ error: 'Failed to revert installment' })
  }
})

/**
 * Delete installment
 */
router.delete('/:clinicId/installments/:installmentId', async (req, res) => {
  try {
    const { clinicId, installmentId } = req.params

    if (!await canManageRevenueForecast(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    const result = await query(
      `DELETE FROM revenue_installments
       WHERE id = $1 AND clinic_id = $2
       RETURNING id, revenue_plan_id`,
      [installmentId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Installment not found' })
    }

    const deletedInstallment = result.rows[0]

    // Recalculate plan totals after deletion
    await recalculatePlanTotals(deletedInstallment.revenue_plan_id)

    res.json({ success: true })
  } catch (error: any) {
    console.error('Delete installment error:', error)
    res.status(500).json({ error: 'Failed to delete installment' })
  }
})

/**
 * Delete entire revenue plan (and all its installments)
 */
router.delete('/:clinicId/plans/:planId', async (req, res) => {
  try {
    const { clinicId, planId } = req.params

    if (!await canManageRevenueForecast(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    const result = await query(
      `DELETE FROM revenue_plans
       WHERE id = $1 AND clinic_id = $2
       RETURNING id`,
      [planId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Revenue plan not found' })
    }

    res.json({ success: true })
  } catch (error: any) {
    console.error('Delete revenue plan error:', error)
    res.status(500).json({ error: 'Failed to delete revenue plan' })
  }
})

/**
 * Get monthly cash flow summary
 */
router.get('/:clinicId/monthly-summary', async (req, res) => {
  try {
    const { clinicId } = req.params

    if (!await canManageRevenueForecast(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    const result = await query(
      `SELECT
        TO_CHAR(due_date, 'YYYY-MM') as month,
        COUNT(CASE WHEN status = 'A_RECEBER' THEN 1 END) as pending_count,
        COALESCE(SUM(CASE WHEN status = 'A_RECEBER' THEN value END), 0) as pending_value,
        COUNT(CASE WHEN status = 'RECEBIDO' THEN 1 END) as received_count,
        COALESCE(SUM(CASE WHEN status = 'RECEBIDO' THEN value END), 0) as received_value,
        COUNT(CASE WHEN status = 'ATRASADO' THEN 1 END) as overdue_count,
        COALESCE(SUM(CASE WHEN status = 'ATRASADO' THEN value END), 0) as overdue_value,
        COUNT(*) as total_count,
        COALESCE(SUM(value), 0) as total_value
      FROM revenue_installments
      WHERE clinic_id = $1
      GROUP BY TO_CHAR(due_date, 'YYYY-MM')
      ORDER BY month ASC`,
      [clinicId]
    )

    const summary = result.rows.map((row) => ({
      month: row.month,
      pending: {
        count: parseInt(row.pending_count),
        value: parseFloat(row.pending_value),
      },
      received: {
        count: parseInt(row.received_count),
        value: parseFloat(row.received_value),
      },
      overdue: {
        count: parseInt(row.overdue_count),
        value: parseFloat(row.overdue_value),
      },
      total: {
        count: parseInt(row.total_count),
        value: parseFloat(row.total_value),
      },
    }))

    res.json(summary)
  } catch (error: any) {
    console.error('Get monthly summary error:', error)
    res.status(500).json({ error: 'Failed to fetch monthly summary' })
  }
})

/**
 * Get installments for a specific month
 */
router.get('/:clinicId/month/:year/:month', async (req, res) => {
  try {
    const { clinicId, year, month } = req.params

    if (!await canManageRevenueForecast(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    const result = await query(
      `SELECT
        ri.id,
        ri.revenue_plan_id as plan_id,
        rp.description as plan_description,
        rp.patient_code,
        rp.patient_name,
        ri.installment_number,
        rp.installment_count as total_installments,
        ri.due_date,
        ri.value,
        ri.status,
        ri.received_date,
        cc.name as category_name
      FROM revenue_installments ri
      INNER JOIN revenue_plans rp ON ri.revenue_plan_id = rp.id
      LEFT JOIN clinic_categories cc ON rp.category_id = cc.id
      WHERE ri.clinic_id = $1
        AND EXTRACT(YEAR FROM ri.due_date) = $2
        AND EXTRACT(MONTH FROM ri.due_date) = $3
      ORDER BY ri.due_date ASC, ri.installment_number ASC`,
      [clinicId, parseInt(year), parseInt(month)]
    )

    const installments = result.rows.map((row) => ({
      id: row.id,
      planId: row.plan_id,
      planDescription: row.plan_description,
      patientCode: row.patient_code,
      patientName: row.patient_name,
      installmentNumber: row.installment_number,
      totalInstallments: row.total_installments,
      dueDate: row.due_date,
      value: parseFloat(row.value),
      status: row.status,
      receivedDate: row.received_date,
      categoryName: row.category_name,
    }))

    res.json(installments)
  } catch (error: any) {
    console.error('Get month installments error:', error)
    res.status(500).json({ error: 'Failed to fetch month installments' })
  }
})

/**
 * Get dashboard summary
 */
router.get('/:clinicId/dashboard', async (req, res) => {
  try {
    const { clinicId } = req.params

    if (!await canManageRevenueForecast(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    const result = await query(
      `SELECT
        COUNT(CASE WHEN status IN ('A_RECEBER', 'ATRASADO') THEN 1 END) as total_pending_count,
        COALESCE(SUM(CASE WHEN status IN ('A_RECEBER', 'ATRASADO') THEN value END), 0) as total_pending_value,

        COUNT(CASE WHEN status IN ('A_RECEBER', 'ATRASADO') AND due_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as next_30_days_count,
        COALESCE(SUM(CASE WHEN status IN ('A_RECEBER', 'ATRASADO') AND due_date <= CURRENT_DATE + INTERVAL '30 days' THEN value END), 0) as next_30_days_value,

        COUNT(CASE WHEN status = 'ATRASADO' THEN 1 END) as overdue_count,
        COALESCE(SUM(CASE WHEN status = 'ATRASADO' THEN value END), 0) as overdue_value
      FROM revenue_installments
      WHERE clinic_id = $1`,
      [clinicId]
    )

    const row = result.rows[0]

    res.json({
      totalPending: {
        count: parseInt(row.total_pending_count),
        value: parseFloat(row.total_pending_value),
      },
      next30Days: {
        count: parseInt(row.next_30_days_count),
        value: parseFloat(row.next_30_days_value),
      },
      overdue: {
        count: parseInt(row.overdue_count),
        value: parseFloat(row.overdue_value),
      },
    })
  } catch (error: any) {
    console.error('Get dashboard summary error:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard summary' })
  }
})

export default router
