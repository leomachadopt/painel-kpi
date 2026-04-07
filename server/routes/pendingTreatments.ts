import { Router } from 'express'
import { query, getClient } from '../db.js'
import { getUserPermissions } from '../middleware/permissions.js'

const router = Router()

/**
 * Helper function to check if user can manage pending treatments
 */
async function canManagePendingTreatments(req: any, clinicId: string): Promise<boolean> {
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

  // MEDICO and COLABORADOR need permission
  if (role === 'COLABORADOR' || role === 'MEDICO') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditFinancial === true
  }

  return false
}

// ================================
// PENDING TREATMENT PATIENTS & TREATMENTS
// ================================

/**
 * Get all patients with their pending treatments
 */
router.get('/:clinicId/patients', async (req, res) => {
  try {
    const { clinicId } = req.params

    if (!await canManagePendingTreatments(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Get all patients with treatments (including completed for historical view)
    const patientsResult = await query(
      `SELECT DISTINCT
        ptp.id,
        ptp.patient_code,
        ptp.patient_name,
        ptp.created_at
      FROM pending_treatment_patients ptp
      INNER JOIN pending_treatments pt ON pt.pending_treatment_patient_id = ptp.id
      WHERE ptp.clinic_id = $1
      ORDER BY ptp.patient_name ASC`,
      [clinicId]
    )

    // Get treatments for each patient
    const patients = await Promise.all(
      patientsResult.rows.map(async (patient) => {
        const treatmentsResult = await query(
          `SELECT
            pt.id,
            pt.description,
            pt.unit_value,
            pt.total_quantity,
            pt.pending_quantity,
            pt.pending_value,
            pt.category_id,
            cc.name as category_name,
            pt.status,
            pt.created_at
          FROM pending_treatments pt
          LEFT JOIN clinic_categories cc ON pt.category_id = cc.id
          WHERE pt.pending_treatment_patient_id = $1
          ORDER BY
            CASE
              WHEN pt.status = 'PENDENTE' THEN 1
              WHEN pt.status = 'PARCIAL' THEN 2
              WHEN pt.status = 'CONCLUIDO' THEN 3
            END,
            pt.created_at ASC`,
          [patient.id]
        )

        const treatments = treatmentsResult.rows.map((t) => ({
          id: t.id,
          description: t.description,
          unitValue: parseFloat(t.unit_value),
          totalQuantity: t.total_quantity,
          pendingQuantity: t.pending_quantity,
          pendingValue: parseFloat(t.pending_value),
          categoryId: t.category_id,
          categoryName: t.category_name,
          status: t.status,
          createdAt: t.created_at,
        }))

        const totalPendingValue = treatments.reduce((sum, t) => sum + t.pendingValue, 0)

        return {
          id: patient.id,
          patientCode: patient.patient_code,
          patientName: patient.patient_name,
          createdAt: patient.created_at,
          treatments,
          totalPendingValue,
        }
      })
    )

    res.json(patients)
  } catch (error: any) {
    console.error('Get pending treatment patients error:', error)
    res.status(500).json({ error: 'Failed to fetch pending treatment patients' })
  }
})

/**
 * Create new patient with treatments
 */
router.post('/:clinicId/patients', async (req, res) => {
  const client = await getClient()

  try {
    const { clinicId } = req.params
    const { patientCode, patientName, treatments } = req.body

    if (!await canManagePendingTreatments(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Validation
    if (!patientCode || !patientName || !treatments || treatments.length === 0) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    await client.query('BEGIN')

    // Create or get patient
    const patientId = `ptp-${Date.now()}-${Math.random().toString(36).substring(7)}`

    const existingPatient = await client.query(
      `SELECT id FROM pending_treatment_patients
       WHERE clinic_id = $1 AND patient_code = $2`,
      [clinicId, patientCode]
    )

    let finalPatientId: string

    if (existingPatient.rows.length > 0) {
      finalPatientId = existingPatient.rows[0].id
    } else {
      await client.query(
        `INSERT INTO pending_treatment_patients (id, clinic_id, patient_code, patient_name)
         VALUES ($1, $2, $3, $4)`,
        [patientId, clinicId, patientCode, patientName]
      )
      finalPatientId = patientId
    }

    // Create treatments
    const createdTreatments = []

    for (const treatment of treatments) {
      const { description, unitValue, totalQuantity, categoryId } = treatment

      if (!description || !unitValue || !totalQuantity) {
        throw new Error('Invalid treatment data')
      }

      const treatmentId = `pt-${Date.now()}-${Math.random().toString(36).substring(7)}`
      const status = 'PENDENTE'

      await client.query(
        `INSERT INTO pending_treatments (
          id, pending_treatment_patient_id, clinic_id, description,
          unit_value, total_quantity, pending_quantity, category_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          treatmentId,
          finalPatientId,
          clinicId,
          description,
          unitValue,
          totalQuantity,
          totalQuantity, // initially all pending
          categoryId || null,
          status,
        ]
      )

      createdTreatments.push({
        id: treatmentId,
        description,
        unitValue,
        totalQuantity,
        pendingQuantity: totalQuantity,
        pendingValue: unitValue * totalQuantity,
        categoryId,
        status,
      })
    }

    await client.query('COMMIT')

    res.status(201).json({
      id: finalPatientId,
      patientCode,
      patientName,
      treatments: createdTreatments,
      totalPendingValue: createdTreatments.reduce((sum, t) => sum + t.pendingValue, 0),
    })
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('Create pending treatment patient error:', error)
    res.status(500).json({ error: 'Failed to create pending treatment patient' })
  } finally {
    client.release()
  }
})

/**
 * Add treatment to existing patient
 */
router.post('/:clinicId/patients/:patientId/treatments', async (req, res) => {
  try {
    const { clinicId, patientId } = req.params
    const { description, unitValue, totalQuantity, categoryId } = req.body

    if (!await canManagePendingTreatments(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Validation
    if (!description || !unitValue || !totalQuantity) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const treatmentId = `pt-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const status = 'PENDENTE'

    await query(
      `INSERT INTO pending_treatments (
        id, pending_treatment_patient_id, clinic_id, description,
        unit_value, total_quantity, pending_quantity, category_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        treatmentId,
        patientId,
        clinicId,
        description,
        unitValue,
        totalQuantity,
        totalQuantity,
        categoryId || null,
        status,
      ]
    )

    res.status(201).json({
      id: treatmentId,
      description,
      unitValue,
      totalQuantity,
      pendingQuantity: totalQuantity,
      pendingValue: unitValue * totalQuantity,
      categoryId,
      status,
    })
  } catch (error: any) {
    console.error('Add treatment error:', error)
    res.status(500).json({ error: 'Failed to add treatment' })
  }
})

/**
 * Update treatment
 */
router.patch('/:clinicId/treatments/:treatmentId', async (req, res) => {
  try {
    const { clinicId, treatmentId } = req.params
    const { description, unitValue, totalQuantity, pendingQuantity, categoryId } = req.body

    if (!await canManagePendingTreatments(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    // Build update query
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`)
      values.push(description)
    }

    if (unitValue !== undefined) {
      updates.push(`unit_value = $${paramCount++}`)
      values.push(unitValue)
    }

    if (totalQuantity !== undefined) {
      updates.push(`total_quantity = $${paramCount++}`)
      values.push(totalQuantity)
    }

    if (pendingQuantity !== undefined) {
      updates.push(`pending_quantity = $${paramCount++}`)
      values.push(pendingQuantity)

      // Update status based on pending quantity
      if (pendingQuantity === 0) {
        updates.push(`status = 'CONCLUIDO'`)
      } else {
        // Get total quantity to determine if partial
        const currentResult = await query(
          'SELECT total_quantity FROM pending_treatments WHERE id = $1',
          [treatmentId]
        )
        if (currentResult.rows.length > 0) {
          const total = currentResult.rows[0].total_quantity
          updates.push(pendingQuantity < total ? `status = 'PARCIAL'` : `status = 'PENDENTE'`)
        }
      }
    }

    if (categoryId !== undefined) {
      updates.push(`category_id = $${paramCount++}`)
      values.push(categoryId || null)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    values.push(treatmentId, clinicId)

    const result = await query(
      `UPDATE pending_treatments
       SET ${updates.join(', ')}
       WHERE id = $${paramCount++} AND clinic_id = $${paramCount++}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Treatment not found' })
    }

    const updated = result.rows[0]
    res.json({
      id: updated.id,
      description: updated.description,
      unitValue: parseFloat(updated.unit_value),
      totalQuantity: updated.total_quantity,
      pendingQuantity: updated.pending_quantity,
      pendingValue: parseFloat(updated.pending_value),
      categoryId: updated.category_id,
      status: updated.status,
    })
  } catch (error: any) {
    console.error('Update treatment error:', error)
    res.status(500).json({ error: 'Failed to update treatment' })
  }
})

/**
 * Mark treatment as completed (partially or fully)
 */
router.post('/:clinicId/treatments/:treatmentId/complete', async (req, res) => {
  try {
    const { clinicId, treatmentId } = req.params
    const { completedQuantity, executedAt, notes } = req.body

    if (!await canManagePendingTreatments(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    if (!completedQuantity || completedQuantity <= 0) {
      return res.status(400).json({ error: 'Invalid completed quantity' })
    }

    // Get current treatment with link to plan_procedure
    const currentResult = await query(
      `SELECT pending_quantity, total_quantity, plan_procedure_id
       FROM pending_treatments
       WHERE id = $1 AND clinic_id = $2`,
      [treatmentId, clinicId]
    )

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Treatment not found' })
    }

    const current = currentResult.rows[0]
    const newPendingQuantity = Math.max(0, current.pending_quantity - completedQuantity)
    const newStatus =
      newPendingQuantity === 0
        ? 'CONCLUIDO'
        : newPendingQuantity < current.total_quantity
        ? 'PARCIAL'
        : 'PENDENTE'

    const result = await query(
      `UPDATE pending_treatments
       SET pending_quantity = $1, status = $2
       WHERE id = $3 AND clinic_id = $4
       RETURNING *`,
      [newPendingQuantity, newStatus, treatmentId, clinicId]
    )

    // SINCRONIZAÇÃO: Se completou o tratamento e existe link com plan_procedure, marcar como completado
    if (newStatus === 'CONCLUIDO' && current.plan_procedure_id) {
      const completedAtValue = executedAt || new Date().toISOString()

      await query(
        `UPDATE plan_procedures
         SET completed = true,
             completed_at = $1,
             notes = $2
         WHERE id = $3`,
        [completedAtValue, notes || null, current.plan_procedure_id]
      )
      console.log(`✅ Synced: Marked plan_procedure ${current.plan_procedure_id} as completed with date ${completedAtValue}`)

      // Atualizar contadores na consulta
      const entryResult = await query(
        `SELECT consultation_entry_id FROM plan_procedures WHERE id = $1`,
        [current.plan_procedure_id]
      )

      if (entryResult.rows.length > 0) {
        const consultationEntryId = entryResult.rows[0].consultation_entry_id

        // Recalcular estatísticas
        const statsResult = await query(
          `SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE completed = true) as completed
           FROM plan_procedures
           WHERE consultation_entry_id = $1`,
          [consultationEntryId]
        )

        const stats = statsResult.rows[0]
        const completedCount = parseInt(stats.completed)
        const totalCount = parseInt(stats.total)
        const allCompleted = completedCount === totalCount

        // Atualizar flags da consulta
        if (completedCount === 1 && !allCompleted) {
          // Primeira execução → Em Execução
          await query(
            `UPDATE daily_consultation_entries
             SET in_execution = true,
                 in_execution_at = NOW(),
                 waiting_start = false,
                 plan_procedures_completed = $1,
                 plan_procedures_total = $2
             WHERE id = $3`,
            [completedCount, totalCount, consultationEntryId]
          )
          console.log(`✅ Moved to "Em Execução": ${consultationEntryId}`)
        } else if (allCompleted) {
          // Todos completos → Finalizado
          await query(
            `UPDATE daily_consultation_entries
             SET plan_finished = true,
                 plan_finished_at = NOW(),
                 in_execution = false,
                 waiting_start = false,
                 plan_procedures_completed = $1,
                 plan_procedures_total = $2
             WHERE id = $3`,
            [completedCount, totalCount, consultationEntryId]
          )
          console.log(`✅ Moved to "Finalizado": ${consultationEntryId}`)
        } else {
          // Atualizar apenas contadores
          await query(
            `UPDATE daily_consultation_entries
             SET plan_procedures_completed = $1,
                 plan_procedures_total = $2
             WHERE id = $3`,
            [completedCount, totalCount, consultationEntryId]
          )
        }
      }
    }

    const updated = result.rows[0]
    res.json({
      id: updated.id,
      description: updated.description,
      unitValue: parseFloat(updated.unit_value),
      totalQuantity: updated.total_quantity,
      pendingQuantity: updated.pending_quantity,
      pendingValue: parseFloat(updated.pending_value),
      categoryId: updated.category_id,
      status: updated.status,
    })
  } catch (error: any) {
    console.error('Complete treatment error:', error)
    res.status(500).json({ error: 'Failed to complete treatment' })
  }
})

/**
 * Delete treatment
 */
router.delete('/:clinicId/treatments/:treatmentId', async (req, res) => {
  try {
    const { clinicId, treatmentId } = req.params

    if (!await canManagePendingTreatments(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    const result = await query(
      `DELETE FROM pending_treatments
       WHERE id = $1 AND clinic_id = $2
       RETURNING pending_treatment_patient_id`,
      [treatmentId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Treatment not found' })
    }

    // Check if patient has any remaining pending treatments
    const patientId = result.rows[0].pending_treatment_patient_id
    const remainingResult = await query(
      `SELECT COUNT(*) as count
       FROM pending_treatments
       WHERE pending_treatment_patient_id = $1 AND status IN ('PENDENTE', 'PARCIAL')`,
      [patientId]
    )

    const hasRemaining = parseInt(remainingResult.rows[0].count) > 0

    res.json({ success: true, patientHasRemainingTreatments: hasRemaining })
  } catch (error: any) {
    console.error('Delete treatment error:', error)
    res.status(500).json({ error: 'Failed to delete treatment' })
  }
})

/**
 * Get dashboard summary for pending treatments
 */
router.get('/:clinicId/dashboard', async (req, res) => {
  try {
    const { clinicId } = req.params

    if (!await canManagePendingTreatments(req, clinicId)) {
      return res.status(403).json({ error: 'Permission denied' })
    }

    const result = await query(
      `SELECT
        COUNT(DISTINCT ptp.id) as patient_count,
        COUNT(pt.id) as treatment_count,
        COALESCE(SUM(pt.pending_value), 0) as total_pending_value
      FROM pending_treatment_patients ptp
      INNER JOIN pending_treatments pt ON pt.pending_treatment_patient_id = ptp.id
      WHERE ptp.clinic_id = $1
        AND pt.status IN ('PENDENTE', 'PARCIAL')`,
      [clinicId]
    )

    const row = result.rows[0]

    res.json({
      patientCount: parseInt(row.patient_count),
      treatmentCount: parseInt(row.treatment_count),
      totalPendingValue: parseFloat(row.total_pending_value),
    })
  } catch (error: any) {
    console.error('Get pending treatments dashboard error:', error)
    res.status(500).json({ error: 'Failed to fetch dashboard summary' })
  }
})

export default router
