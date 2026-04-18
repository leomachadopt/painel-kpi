import { Router } from 'express'
import { query } from '../db.js'
import { authRequired } from '../middleware/auth.js'
import { getUserPermissions } from '../middleware/permissions.js'

const router = Router()

// Apply authentication to all plan procedures routes
router.use(authRequired)

/**
 * Helper function to check if user can edit consultations
 */
async function canEditConsultations(req: any, clinicId: string): Promise<boolean> {
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

  if (role === 'COLABORADOR' || role === 'MEDICO') {
    const permissions = await getUserPermissions(userId, role, clinicId)
    return permissions.canEditConsultations === true
  }

  return false
}

/**
 * GET /api/plan-procedures/:clinicId/:entryId
 * Retorna todos os procedimentos do plano de tratamento com sumário
 */
router.get('/:clinicId/:entryId', async (req, res) => {
  try {
    const { clinicId, entryId } = req.params

    // Verifica permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Busca informações da consulta
    const entryResult = await query(
      `SELECT
        price_table_type,
        insurance_provider_id,
        plan_procedures_total,
        plan_procedures_completed,
        plan_total_value
       FROM daily_consultation_entries
       WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )

    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Consulta não encontrada' })
    }

    const entry = entryResult.rows[0]

    // Busca procedimentos
    const proceduresResult = await query(
      `SELECT
        pp.id,
        pp.procedure_code,
        pp.procedure_description,
        pp.tooth_region,
        pp.price_at_creation,
        pp.price_table_type,
        pp.completed,
        pp.completed_at,
        pp.completed_by_doctor_id,
        pp.appointment_id,
        pp.sort_order,
        pp.notes,
        pp.created_at,
        cd.name as completed_by_doctor_name
       FROM plan_procedures pp
       LEFT JOIN clinic_doctors cd ON pp.completed_by_doctor_id = cd.id
       WHERE pp.consultation_entry_id = $1
       ORDER BY pp.sort_order ASC, pp.created_at ASC`,
      [entryId]
    )

    const procedures = proceduresResult.rows.map(row => ({
      id: row.id,
      procedureCode: row.procedure_code,
      procedureDescription: row.procedure_description,
      toothRegion: row.tooth_region,
      priceAtCreation: parseFloat(row.price_at_creation),
      priceTableType: row.price_table_type,
      completed: row.completed,
      completedAt: row.completed_at,
      completedByDoctorId: row.completed_by_doctor_id,
      completedByDoctorName: row.completed_by_doctor_name,
      appointmentId: row.appointment_id,
      sortOrder: row.sort_order,
      notes: row.notes,
      createdAt: row.created_at
    }))

    // Calcula sumário
    const total = procedures.length
    const completed = procedures.filter(p => p.completed).length
    const remaining = total - completed
    const completedValue = procedures
      .filter(p => p.completed)
      .reduce((sum, p) => sum + p.priceAtCreation, 0)
    const totalValue = parseFloat(entry.plan_total_value)
    const remainingValue = totalValue - completedValue
    const completionPercent = total > 0 ? Math.round((completed / total) * 100) : 0

    res.json({
      priceTableType: entry.price_table_type,
      insuranceProviderId: entry.insurance_provider_id,
      procedures,
      summary: {
        total,
        completed,
        remaining,
        totalValue,
        completedValue,
        remainingValue,
        completionPercent
      }
    })
  } catch (error: any) {
    console.error('Error fetching plan procedures:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/plan-procedures/:clinicId/:entryId
 * Cria procedimentos do plano em batch
 */
router.post('/:clinicId/:entryId', async (req, res) => {
  try {
    const { clinicId, entryId } = req.params
    const { priceTableType, insuranceProviderId, procedures } = req.body

    // Verifica permissões
    const hasPermission = await canEditConsultations(req, clinicId)
    if (!hasPermission) {
      return res.status(403).json({ error: 'Sem permissão para editar consultas' })
    }

    // Valida input
    if (!priceTableType || !Array.isArray(procedures) || procedures.length === 0) {
      return res.status(400).json({ error: 'Dados inválidos' })
    }

    if (priceTableType === 'operadora' && !insuranceProviderId) {
      return res.status(400).json({ error: 'insurance_provider_id é obrigatório para tabela de operadora' })
    }

    // Verifica se consulta existe
    const entryCheck = await query(
      'SELECT id FROM daily_consultation_entries WHERE id = $1 AND clinic_id = $2',
      [entryId, clinicId]
    )

    if (entryCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Consulta não encontrada' })
    }

    // Deletar procedimentos antigos antes de criar novos (evita duplicatas de testes)
    await query(
      'DELETE FROM plan_procedures WHERE consultation_entry_id = $1 AND clinic_id = $2',
      [entryId, clinicId]
    )

    // Insere procedimentos
    const insertedProcedures = []
    let sortOrderCounter = 0
    let totalValue = 0

    for (let i = 0; i < procedures.length; i++) {
      const proc = procedures[i]
      const quantity = proc.quantity || 1

      // Cria uma linha para cada unidade do procedimento
      for (let q = 0; q < quantity; q++) {
        const procedureId = `plan-proc-${Date.now()}-${sortOrderCounter}-${q}`

        await query(
          `INSERT INTO plan_procedures (
            id, consultation_entry_id, clinic_id,
            procedure_base_id, insurance_provider_procedure_id,
            procedure_code, procedure_description,
            tooth_region, price_at_creation, price_table_type,
            sort_order, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            procedureId,
            entryId,
            clinicId,
            proc.procedureBaseId || null,
            proc.insuranceProviderProcedureId || null,
            proc.procedureCode,
            proc.procedureDescription,
            proc.toothRegion || null,
            proc.priceAtCreation,
            priceTableType,
            sortOrderCounter,
            proc.notes || null
          ]
        )

        insertedProcedures.push({ id: procedureId, ...proc })
        totalValue += parseFloat(proc.priceAtCreation) || 0
        sortOrderCounter++
      }
    }

    // Atualiza configuração do plano na consulta e marca como plano criado
    await query(
      `UPDATE daily_consultation_entries
       SET price_table_type = $1,
           insurance_provider_id = $2,
           plan_created = true,
           plan_created_at = COALESCE(plan_created_at, NOW()),
           plan_value = $4
       WHERE id = $3`,
      [priceTableType, insuranceProviderId || null, entryId, totalValue]
    )

    // Trigger vai atualizar as métricas automaticamente

    res.status(201).json({
      message: 'Procedimentos criados com sucesso',
      procedures: insertedProcedures
    })
  } catch (error: any) {
    console.error('Error creating plan procedures:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PATCH /api/plan-procedures/:clinicId/:entryId/:procedureId
 * Marca procedimento como realizado/não realizado
 */
router.patch('/:clinicId/:entryId/:procedureId', async (req, res) => {
  try {
    const { clinicId, entryId, procedureId } = req.params
    const { completed, doctorId, appointmentId, notes } = req.body

    // Verifica permissões
    const hasPermission = await canEditConsultations(req, clinicId)
    if (!hasPermission) {
      return res.status(403).json({ error: 'Sem permissão para editar consultas' })
    }

    // Verifica se procedimento existe e obtém estado atual
    const procCheck = await query(
      `SELECT id, completed, pending_treatment_id FROM plan_procedures
       WHERE id = $1 AND consultation_entry_id = $2 AND clinic_id = $3`,
      [procedureId, entryId, clinicId]
    )

    if (procCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Procedimento não encontrado' })
    }

    const currentProcedure = procCheck.rows[0]
    const wasCompleted = currentProcedure.completed
    const pendingTreatmentId = currentProcedure.pending_treatment_id

    // Atualiza procedimento
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (typeof completed === 'boolean') {
      updates.push(`completed = $${paramCount}`)
      values.push(completed)
      paramCount++

      updates.push(`completed_at = $${paramCount}`)
      values.push(completed ? new Date() : null)
      paramCount++
    }

    if (doctorId !== undefined) {
      updates.push(`completed_by_doctor_id = $${paramCount}`)
      values.push(doctorId || null)
      paramCount++
    }

    if (appointmentId !== undefined) {
      updates.push(`appointment_id = $${paramCount}`)
      values.push(appointmentId || null)
      paramCount++
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`)
      values.push(notes || null)
      paramCount++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhuma atualização fornecida' })
    }

    values.push(procedureId)

    await query(
      `UPDATE plan_procedures SET ${updates.join(', ')} WHERE id = $${paramCount}`,
      values
    )

    // Trigger vai atualizar métricas e transições automaticamente

    // SYNC: Update pending_treatment if linked and completion status changed
    if (pendingTreatmentId && typeof completed === 'boolean' && completed !== wasCompleted) {
      const treatmentResult = await query(
        `SELECT pending_quantity, total_quantity FROM pending_treatments WHERE id = $1`,
        [pendingTreatmentId]
      )

      if (treatmentResult.rows.length > 0) {
        const treatment = treatmentResult.rows[0]

        // Se está marcando como completo, decrementa pending_quantity
        // Se está desmarcando, incrementa pending_quantity
        const newPending = completed
          ? treatment.pending_quantity - 1
          : treatment.pending_quantity + 1

        const newStatus = newPending === 0
          ? 'CONCLUIDO'
          : (newPending < treatment.total_quantity ? 'PARCIAL' : 'PENDENTE')

        await query(
          `UPDATE pending_treatments
           SET pending_quantity = $1::integer,
               status = $2,
               pending_value = unit_value * $1::integer
           WHERE id = $3`,
          [newPending, newStatus, pendingTreatmentId]
        )

        console.log(`✅ Synced: Updated pending_treatment ${pendingTreatmentId} - pending: ${newPending}, status: ${newStatus}`)
      }
    }

    res.json({ message: 'Procedimento atualizado com sucesso' })
  } catch (error: any) {
    console.error('Error updating plan procedure:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/plan-procedures/:clinicId/:entryId/:procedureId
 * Remove procedimento do plano (só se não estiver concluído)
 */
router.delete('/:clinicId/:entryId/:procedureId', async (req, res) => {
  try {
    const { clinicId, entryId, procedureId } = req.params

    // Verifica permissões
    const hasPermission = await canEditConsultations(req, clinicId)
    if (!hasPermission) {
      return res.status(403).json({ error: 'Sem permissão para editar consultas' })
    }

    // Verifica se procedimento existe e não está completo
    const procCheck = await query(
      `SELECT completed FROM plan_procedures
       WHERE id = $1 AND consultation_entry_id = $2 AND clinic_id = $3`,
      [procedureId, entryId, clinicId]
    )

    if (procCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Procedimento não encontrado' })
    }

    if (procCheck.rows[0].completed) {
      return res.status(400).json({
        error: 'Não é possível remover procedimento já realizado'
      })
    }

    // Remove procedimento
    await query(
      'DELETE FROM plan_procedures WHERE id = $1',
      [procedureId]
    )

    // Trigger vai recalcular métricas automaticamente

    res.json({ message: 'Procedimento removido com sucesso' })
  } catch (error: any) {
    console.error('Error deleting plan procedure:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/plan-procedures/:clinicId/:entryId/add
 * Adiciona procedimentos extras ao plano existente (sem substituir)
 */
router.post('/:clinicId/:entryId/add', async (req, res) => {
  try {
    const { clinicId, entryId } = req.params
    const { procedures } = req.body

    // Verifica permissões
    const hasPermission = await canEditConsultations(req, clinicId)
    if (!hasPermission) {
      return res.status(403).json({ error: 'Sem permissão para editar consultas' })
    }

    // Valida input
    if (!Array.isArray(procedures) || procedures.length === 0) {
      return res.status(400).json({ error: 'Dados inválidos - procedures deve ser um array não vazio' })
    }

    // Busca informações da consulta para obter priceTableType e insuranceProviderId
    const entryResult = await query(
      `SELECT
        id,
        price_table_type,
        insurance_provider_id,
        plan_created,
        plan_total_value
       FROM daily_consultation_entries
       WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )

    if (entryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Consulta não encontrada' })
    }

    const entry = entryResult.rows[0]

    // Se o plano ainda não foi criado, marca como criado agora ao adicionar o primeiro procedimento
    if (!entry.plan_created) {
      await query(
        `UPDATE daily_consultation_entries
         SET plan_created = true,
             plan_created_at = NOW()
         WHERE id = $1`,
        [entryId]
      )
    }

    // Busca maior sort_order existente
    const sortOrderResult = await query(
      `SELECT COALESCE(MAX(sort_order), -1) as max_sort_order
       FROM plan_procedures
       WHERE consultation_entry_id = $1`,
      [entryId]
    )

    let sortOrderCounter = sortOrderResult.rows[0].max_sort_order + 1

    // Insere novos procedimentos
    const insertedProcedures = []
    let addedValue = 0

    for (let i = 0; i < procedures.length; i++) {
      const proc = procedures[i]
      const quantity = proc.quantity || 1

      // Valida campos obrigatórios
      if (!proc.procedureCode || !proc.procedureDescription || proc.priceAtCreation === undefined) {
        return res.status(400).json({
          error: `Procedimento ${i + 1}: campos obrigatórios ausentes (procedureCode, procedureDescription, priceAtCreation)`
        })
      }

      // Cria uma linha para cada unidade do procedimento
      for (let q = 0; q < quantity; q++) {
        const procedureId = `plan-proc-${Date.now()}-${sortOrderCounter}-${q}`

        await query(
          `INSERT INTO plan_procedures (
            id, consultation_entry_id, clinic_id,
            procedure_base_id, insurance_provider_procedure_id,
            procedure_code, procedure_description,
            tooth_region, price_at_creation, price_table_type,
            sort_order, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            procedureId,
            entryId,
            clinicId,
            proc.procedureBaseId || null,
            proc.insuranceProviderProcedureId || null,
            proc.procedureCode,
            proc.procedureDescription,
            proc.toothRegion || null,
            proc.priceAtCreation,
            entry.price_table_type,
            sortOrderCounter,
            proc.notes || null
          ]
        )

        insertedProcedures.push({
          id: procedureId,
          procedureCode: proc.procedureCode,
          procedureDescription: proc.procedureDescription,
          priceAtCreation: proc.priceAtCreation
        })
        addedValue += parseFloat(proc.priceAtCreation) || 0
        sortOrderCounter++
      }
    }

    // Atualiza valor total do plano
    const newTotalValue = parseFloat(entry.plan_total_value || 0) + addedValue
    await query(
      `UPDATE daily_consultation_entries
       SET plan_total_value = $1
       WHERE id = $2`,
      [newTotalValue, entryId]
    )

    // Trigger vai atualizar as métricas automaticamente

    res.status(201).json({
      message: `${insertedProcedures.length} procedimento(s) adicionado(s) com sucesso`,
      procedures: insertedProcedures,
      addedValue,
      newTotalValue
    })
  } catch (error: any) {
    console.error('Error adding extra procedures:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
