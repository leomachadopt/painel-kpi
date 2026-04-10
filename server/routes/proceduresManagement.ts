import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

/**
 * ========================================
 * GESTÃO DE PROCEDIMENTOS DE OPERADORAS
 * ========================================
 */

/**
 * GET /api/procedures-management/provider/:providerId
 * Lista todos os procedimentos de uma operadora com paginação e filtros
 */
router.get('/provider/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params
    const {
      clinicId,
      search,
      approved,
      limit = '50',
      offset = '0'
    } = req.query

    // Verificar permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (!clinicId) {
      return res.status(400).json({ error: 'clinicId é obrigatório' })
    }

    // Verificar se a operadora pertence à clínica
    const providerCheck = await query(
      `SELECT ip.id, ip.name, ip.clinic_id
       FROM insurance_providers ip
       WHERE ip.id = $1 AND ip.clinic_id = $2`,
      [providerId, clinicId]
    )

    if (providerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Operadora não encontrada' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Construir query com filtros
    const conditions: string[] = ['ipp.insurance_provider_id = $1']
    const params: any[] = [providerId]
    let paramIndex = 2

    if (search) {
      conditions.push(`(
        COALESCE(ipp.provider_code, pb.code) ILIKE $${paramIndex} OR
        COALESCE(ipp.provider_description, pb.description) ILIKE $${paramIndex}
      )`)
      params.push(`%${search}%`)
      paramIndex++
    }

    if (approved !== undefined && approved !== '') {
      conditions.push(`ipp.active = $${paramIndex}`)
      params.push(approved === 'true')
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Buscar total de registros
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM insurance_provider_procedures ipp
       LEFT JOIN procedure_base_table pb ON ipp.procedure_base_id = pb.id
       ${whereClause}`,
      params
    )

    const total = parseInt(countResult.rows[0].total, 10)

    // Buscar procedimentos com paginação
    params.push(parseInt(limit as string, 10))
    params.push(parseInt(offset as string, 10))

    const result = await query(
      `SELECT
        ipp.id,
        ipp.insurance_provider_id,
        ipp.procedure_base_id,
        ipp.provider_code,
        ipp.provider_description,
        ipp.is_periciable,
        ipp.coverage_percentage,
        ipp.max_value,
        ipp.requires_authorization,
        ipp.notes,
        ipp.active,
        ipp.created_at,
        ipp.updated_at,
        pb.code as base_code,
        pb.description as base_description,
        pb.default_value as base_default_value
       FROM insurance_provider_procedures ipp
       LEFT JOIN procedure_base_table pb ON ipp.procedure_base_id = pb.id
       ${whereClause}
       ORDER BY ipp.provider_code, ipp.id
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    const procedures = result.rows.map(row => ({
      id: row.id,
      insuranceProviderId: row.insurance_provider_id,
      procedureBaseId: row.procedure_base_id,
      providerCode: row.provider_code,
      providerDescription: row.provider_description,
      isPericiable: row.is_periciable,
      coveragePercentage: parseFloat(row.coverage_percentage || 0),
      maxValue: row.max_value ? parseFloat(row.max_value) : null,
      requiresAuthorization: row.requires_authorization,
      notes: row.notes,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Dados da tabela base (se vinculado)
      baseCode: row.base_code,
      baseDescription: row.base_description,
      baseDefaultValue: row.base_default_value ? parseFloat(row.base_default_value) : null
    }))

    res.json({
      procedures,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        hasMore: parseInt(offset as string, 10) + procedures.length < total
      }
    })
  } catch (error: any) {
    console.error('Error fetching provider procedures:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/procedures-management/provider/:providerId
 * Criar novo procedimento manualmente para uma operadora
 */
router.post('/provider/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params
    const {
      clinicId,
      procedureBaseId,
      providerCode,
      providerDescription,
      isPericiable,
      coveragePercentage,
      maxValue,
      requiresAuthorization,
      notes,
      active
    } = req.body

    // Verificar permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Validar campos obrigatórios
    if (!providerCode) {
      return res.status(400).json({ error: 'Código do procedimento é obrigatório' })
    }

    // Verificar se a operadora pertence à clínica
    const providerCheck = await query(
      'SELECT id FROM insurance_providers WHERE id = $1 AND clinic_id = $2',
      [providerId, clinicId]
    )

    if (providerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Operadora não encontrada' })
    }

    // Verificar se já existe procedimento com o mesmo código
    const existingCheck = await query(
      'SELECT id FROM insurance_provider_procedures WHERE insurance_provider_id = $1 AND provider_code = $2',
      [providerId, providerCode]
    )

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe um procedimento com este código para esta operadora' })
    }

    // Criar procedimento
    const procedureId = `ipp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const result = await query(
      `INSERT INTO insurance_provider_procedures (
        id, insurance_provider_id, procedure_base_id,
        provider_code, provider_description, is_periciable,
        coverage_percentage, max_value, requires_authorization,
        notes, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        procedureId,
        providerId,
        procedureBaseId || null,
        providerCode,
        providerDescription || null,
        isPericiable || false,
        coveragePercentage || 100,
        maxValue || null,
        requiresAuthorization || false,
        notes || null,
        active !== false
      ]
    )

    res.status(201).json({
      message: 'Procedimento criado com sucesso',
      procedure: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error creating provider procedure:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/procedures-management/provider/:providerId/procedure/:procedureId
 * Editar procedimento existente de uma operadora
 */
router.put('/provider/:providerId/procedure/:procedureId', async (req, res) => {
  try {
    const { providerId, procedureId } = req.params
    const {
      clinicId,
      procedureBaseId,
      providerCode,
      providerDescription,
      isPericiable,
      coveragePercentage,
      maxValue,
      requiresAuthorization,
      notes,
      active
    } = req.body

    // Verificar permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Verificar se o procedimento existe e pertence à operadora correta
    const procedureCheck = await query(
      `SELECT ipp.id
       FROM insurance_provider_procedures ipp
       JOIN insurance_providers ip ON ipp.insurance_provider_id = ip.id
       WHERE ipp.id = $1 AND ipp.insurance_provider_id = $2 AND ip.clinic_id = $3`,
      [procedureId, providerId, clinicId]
    )

    if (procedureCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Procedimento não encontrado' })
    }

    // Se está alterando o código, verificar se não existe outro com o mesmo código
    if (providerCode) {
      const duplicateCheck = await query(
        `SELECT id FROM insurance_provider_procedures
         WHERE insurance_provider_id = $1 AND provider_code = $2 AND id != $3`,
        [providerId, providerCode, procedureId]
      )

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe outro procedimento com este código para esta operadora' })
      }
    }

    // Construir query de atualização dinamicamente
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (procedureBaseId !== undefined) {
      updates.push(`procedure_base_id = $${paramIndex}`)
      params.push(procedureBaseId)
      paramIndex++
    }

    if (providerCode !== undefined) {
      updates.push(`provider_code = $${paramIndex}`)
      params.push(providerCode)
      paramIndex++
    }

    if (providerDescription !== undefined) {
      updates.push(`provider_description = $${paramIndex}`)
      params.push(providerDescription)
      paramIndex++
    }

    if (isPericiable !== undefined) {
      updates.push(`is_periciable = $${paramIndex}`)
      params.push(isPericiable)
      paramIndex++
    }

    if (coveragePercentage !== undefined) {
      updates.push(`coverage_percentage = $${paramIndex}`)
      params.push(coveragePercentage)
      paramIndex++
    }

    if (maxValue !== undefined) {
      updates.push(`max_value = $${paramIndex}`)
      params.push(maxValue)
      paramIndex++
    }

    if (requiresAuthorization !== undefined) {
      updates.push(`requires_authorization = $${paramIndex}`)
      params.push(requiresAuthorization)
      paramIndex++
    }

    if (notes !== undefined) {
      updates.push(`notes = $${paramIndex}`)
      params.push(notes)
      paramIndex++
    }

    if (active !== undefined) {
      updates.push(`active = $${paramIndex}`)
      params.push(active)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(procedureId)

    const result = await query(
      `UPDATE insurance_provider_procedures
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    )

    res.json({
      message: 'Procedimento atualizado com sucesso',
      procedure: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error updating provider procedure:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/procedures-management/provider/:providerId/procedure/:procedureId
 * Remover procedimento de uma operadora
 */
router.delete('/provider/:providerId/procedure/:procedureId', async (req, res) => {
  try {
    const { providerId, procedureId } = req.params
    const { clinicId } = req.query

    // Verificar permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Verificar se o procedimento existe e pertence à operadora correta
    const procedureCheck = await query(
      `SELECT ipp.id
       FROM insurance_provider_procedures ipp
       JOIN insurance_providers ip ON ipp.insurance_provider_id = ip.id
       WHERE ipp.id = $1 AND ipp.insurance_provider_id = $2 AND ip.clinic_id = $3`,
      [procedureId, providerId, clinicId]
    )

    if (procedureCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Procedimento não encontrado' })
    }

    // Verificar se o procedimento está sendo usado em planos ou lotes de fatura
    const usageCheck = await query(
      `SELECT
        (SELECT COUNT(*) FROM plan_procedures WHERE insurance_provider_procedure_id = $1) as plan_count,
        (SELECT COUNT(*) FROM billing_items WHERE procedure_id = $1 AND procedure_type = 'PROVIDER') as billing_count`,
      [procedureId]
    )

    const planCount = parseInt(usageCheck.rows[0].plan_count, 10)
    const billingCount = parseInt(usageCheck.rows[0].billing_count, 10)

    if (planCount > 0 || billingCount > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir este procedimento pois está sendo utilizado em planos de tratamento ou lotes de fatura',
        usage: {
          planCount,
          billingCount
        }
      })
    }

    // Excluir procedimento
    await query(
      'DELETE FROM insurance_provider_procedures WHERE id = $1',
      [procedureId]
    )

    res.json({ message: 'Procedimento excluído com sucesso' })
  } catch (error: any) {
    console.error('Error deleting provider procedure:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PATCH /api/procedures-management/provider/:providerId/procedure/:procedureId/toggle-approval
 * Alternar aprovação de um procedimento (ativar/desativar)
 */
router.patch('/provider/:providerId/procedure/:procedureId/toggle-approval', async (req, res) => {
  try {
    const { providerId, procedureId } = req.params
    const { clinicId } = req.body

    // Verificar permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Verificar se o procedimento existe
    const procedureCheck = await query(
      `SELECT ipp.id, ipp.active
       FROM insurance_provider_procedures ipp
       JOIN insurance_providers ip ON ipp.insurance_provider_id = ip.id
       WHERE ipp.id = $1 AND ipp.insurance_provider_id = $2 AND ip.clinic_id = $3`,
      [procedureId, providerId, clinicId]
    )

    if (procedureCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Procedimento não encontrado' })
    }

    const currentStatus = procedureCheck.rows[0].active
    const newStatus = !currentStatus

    // Atualizar status
    const result = await query(
      `UPDATE insurance_provider_procedures
       SET active = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [newStatus, procedureId]
    )

    res.json({
      message: `Procedimento ${newStatus ? 'aprovado' : 'desaprovado'} com sucesso`,
      procedure: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error toggling procedure approval:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * Background job para copiar procedimentos
 */
async function copyProceduresToBaseBackground(
  providerId: string,
  clinicId: string,
  userId: string
) {
  try {
    console.log(`🔄 [Background] Iniciando cópia de procedimentos: provider=${providerId}, clinic=${clinicId}`)

    const providerResult = await query(
      'SELECT id, name FROM insurance_providers WHERE id = $1 AND clinic_id = $2',
      [providerId, clinicId]
    )

    if (providerResult.rows.length === 0) {
      console.error(`❌ [Background] Operadora não encontrada: ${providerId}`)
      return
    }

    const provider = providerResult.rows[0]

    // Buscar procedimentos de três fontes possíveis (em ordem de prioridade):
    // 1. insurance_provider_procedures (procedimentos já salvos)
    // 2. procedure_mappings (procedimentos de upload já mapeados)
    // 3. insurance_provider_documents.extracted_data (procedimentos do upload JSON/PDF original)

    let procedures: any[] = []

    // Fonte 1: Procedimentos já salvos
    const savedProceduresResult = await query(
      `SELECT
        ipp.provider_code as code,
        ipp.provider_description as description,
        ipp.is_periciable
       FROM insurance_provider_procedures ipp
       WHERE ipp.insurance_provider_id = $1`,
      [providerId]
    )

    if (savedProceduresResult.rows.length > 0) {
      procedures = savedProceduresResult.rows
    } else {
      // Fonte 2: Procedimentos em mapeamentos
      const mappingsResult = await query(
        `SELECT DISTINCT ON (pm.extracted_procedure_code)
          pm.extracted_procedure_code as code,
          pm.extracted_description as description,
          pm.extracted_is_periciable as is_periciable
         FROM procedure_mappings pm
         JOIN insurance_provider_documents ipd ON pm.document_id = ipd.id
         WHERE ipd.insurance_provider_id = $1
         ORDER BY pm.extracted_procedure_code, pm.created_at DESC`,
        [providerId]
      )

      if (mappingsResult.rows.length > 0) {
        procedures = mappingsResult.rows
      } else {
        // Fonte 3: Dados extraídos do upload original (JSON/PDF)
        const documentsResult = await query(
          `SELECT extracted_data
           FROM insurance_provider_documents
           WHERE insurance_provider_id = $1
             AND extracted_data IS NOT NULL
             AND jsonb_array_length(extracted_data->'procedures') > 0
           ORDER BY created_at DESC
           LIMIT 1`,
          [providerId]
        )

        if (documentsResult.rows.length > 0) {
          const extractedData = documentsResult.rows[0].extracted_data
          const extractedProcedures = extractedData.procedures || []

          // Converter formato do extracted_data para formato padronizado
          procedures = extractedProcedures.map((proc: any) => ({
            code: proc.code,
            description: proc.description || '',
            is_periciable: proc.isPericiable || false
          }))
        }
      }
    }

    if (procedures.length === 0) {
      console.error(`❌ [Background] Nenhum procedimento encontrado: provider=${providerId}`)
      return
    }

    console.log(`📊 [Background] Encontrados ${procedures.length} procedimentos para copiar`)

    let created = 0
    let updated = 0
    let skipped = 0

    // Processar cada procedimento
    for (const proc of procedures) {
      const code = proc.code
      const description = proc.description || ''
      const isPericiable = proc.is_periciable || false
      const category = null

      // Verificar se já existe na tabela base
      const existingCheck = await query(
        'SELECT id, is_custom FROM procedure_base_table WHERE clinic_id = $1 AND code = $2',
        [clinicId, code]
      )

      if (existingCheck.rows.length > 0) {
        const existing = existingCheck.rows[0]

        if (existing.is_custom) {
          await query(
            `UPDATE procedure_base_table
             SET description = $1,
                 is_periciable = $2,
                 category = $3,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [description, isPericiable, category, existing.id]
          )
          updated++
        } else {
          skipped++
        }
      } else {
        const newId = `pb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        await query(
          `INSERT INTO procedure_base_table (
            id, clinic_id, code, description, is_periciable,
            category, default_value, active, is_custom, created_by_user_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            newId,
            clinicId,
            code,
            description,
            isPericiable,
            category,
            null, // Valor sempre NULL - não copiar preços
            true,
            false,
            userId
          ]
        )
        created++
      }
    }

    console.log(`✅ [Background] Cópia concluída: ${created} criados, ${updated} atualizados, ${skipped} pulados`)
  } catch (error: any) {
    console.error(`❌ [Background] Erro ao copiar procedimentos:`, error)
  }
}

/**
 * POST /api/procedures-management/provider/:providerId/copy-to-base
 * Copiar procedimentos de uma operadora para a tabela base da clínica
 * (sem copiar valores de preço - apenas estrutura)
 */
router.post('/provider/:providerId/copy-to-base', async (req, res) => {
  try {
    const { providerId } = req.params
    const { clinicId, cleanFirst = false } = req.body

    // Verificar permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Verificar se a operadora pertence à clínica
    const providerCheck = await query(
      'SELECT id, name FROM insurance_providers WHERE id = $1 AND clinic_id = $2',
      [providerId, clinicId]
    )

    if (providerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Operadora não encontrada' })
    }

    const provider = providerCheck.rows[0]

    // Desmarcar qualquer outra operadora como padrão desta clínica
    await query(
      'UPDATE insurance_providers SET is_default_for_clinic = false WHERE clinic_id = $1',
      [clinicId]
    )

    // Marcar esta operadora como padrão
    await query(
      'UPDATE insurance_providers SET is_default_for_clinic = true WHERE id = $1',
      [providerId]
    )

    console.log(`✅ "${provider.name}" definida como tabela padrão da clínica ${clinicId}`)

    res.json({
      message: `"${provider.name}" definida como tabela padrão da clínica!`,
      providerName: provider.name,
      status: 'completed'
    })
  } catch (error: any) {
    console.error('Error initiating copy to base:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * ========================================
 * GESTÃO DA TABELA BASE DA CLÍNICA
 * ========================================
 */

/**
 * GET /api/procedures-management/clinic/:clinicId/base
 * Lista todos os procedimentos da tabela base da clínica
 */
router.get('/clinic/:clinicId/base', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { search, limit = '50', offset = '0' } = req.query

    // Verificar permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Construir query com filtros
    const conditions: string[] = ['(pb.clinic_id = $1 OR pb.clinic_id IS NULL)', 'pb.active = true']
    const params: any[] = [clinicId]
    let paramIndex = 2

    if (search) {
      conditions.push(`(pb.code ILIKE $${paramIndex} OR pb.description ILIKE $${paramIndex})`)
      params.push(`%${search}%`)
      paramIndex++
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    // Buscar total de registros
    const countResult = await query(
      `SELECT COUNT(*) as total FROM procedure_base_table pb ${whereClause}`,
      params
    )

    const total = parseInt(countResult.rows[0].total, 10)

    // Buscar procedimentos
    params.push(parseInt(limit as string, 10))
    params.push(parseInt(offset as string, 10))

    const result = await query(
      `SELECT
        pb.id,
        pb.clinic_id,
        pb.code,
        pb.description,
        pb.is_periciable,
        pb.category,
        pb.default_value,
        pb.active,
        pb.is_custom,
        pb.created_by_user_id,
        pb.created_at,
        pb.updated_at
       FROM procedure_base_table pb
       ${whereClause}
       ORDER BY pb.code
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    )

    const procedures = result.rows.map(row => ({
      id: row.id,
      clinicId: row.clinic_id,
      code: row.code,
      description: row.description,
      isPericiable: row.is_periciable,
      category: row.category,
      defaultValue: row.default_value ? parseFloat(row.default_value) : null,
      active: row.active,
      isCustom: row.is_custom || false,
      createdByUserId: row.created_by_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))

    res.json({
      procedures,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
        hasMore: parseInt(offset as string, 10) + procedures.length < total
      }
    })
  } catch (error: any) {
    console.error('Error fetching clinic base procedures:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/procedures-management/clinic/:clinicId/base
 * Criar novo procedimento na tabela base da clínica
 */
router.post('/clinic/:clinicId/base', async (req, res) => {
  try {
    const { clinicId } = req.params
    const {
      code,
      description,
      isPericiable,
      category,
      defaultValue
    } = req.body

    // Verificar permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Validar campos obrigatórios
    if (!code || !description) {
      return res.status(400).json({ error: 'Código e descrição são obrigatórios' })
    }

    // Verificar se já existe procedimento com o mesmo código
    const existingCheck = await query(
      'SELECT id FROM procedure_base_table WHERE clinic_id = $1 AND code = $2',
      [clinicId, code]
    )

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe um procedimento com este código na tabela base' })
    }

    // Criar procedimento
    const procedureId = `pb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const result = await query(
      `INSERT INTO procedure_base_table (
        id, clinic_id, code, description, is_periciable,
        category, default_value, active, is_custom, created_by_user_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        procedureId,
        clinicId,
        code,
        description,
        isPericiable || false,
        category || null,
        defaultValue || null,
        true,
        true, // Procedimentos criados manualmente são customizados
        req.user.sub
      ]
    )

    res.status(201).json({
      message: 'Procedimento criado com sucesso',
      procedure: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error creating clinic base procedure:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * PUT /api/procedures-management/clinic/:clinicId/base/:procedureId
 * Editar procedimento da tabela base da clínica
 */
router.put('/clinic/:clinicId/base/:procedureId', async (req, res) => {
  try {
    const { clinicId, procedureId } = req.params
    const {
      code,
      description,
      isPericiable,
      category,
      defaultValue
    } = req.body

    // Verificar permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Verificar se o procedimento existe e pertence à clínica
    const procedureCheck = await query(
      'SELECT id, is_custom FROM procedure_base_table WHERE id = $1 AND clinic_id = $2',
      [procedureId, clinicId]
    )

    if (procedureCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Procedimento não encontrado' })
    }

    // Apenas procedimentos customizados podem ser editados
    if (!procedureCheck.rows[0].is_custom) {
      return res.status(400).json({ error: 'Apenas procedimentos customizados podem ser editados' })
    }

    // Se está alterando o código, verificar duplicatas
    if (code) {
      const duplicateCheck = await query(
        'SELECT id FROM procedure_base_table WHERE clinic_id = $1 AND code = $2 AND id != $3',
        [clinicId, code, procedureId]
      )

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ error: 'Já existe outro procedimento com este código' })
      }
    }

    // Construir query de atualização
    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (code !== undefined) {
      updates.push(`code = $${paramIndex}`)
      params.push(code)
      paramIndex++
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`)
      params.push(description)
      paramIndex++
    }

    if (isPericiable !== undefined) {
      updates.push(`is_periciable = $${paramIndex}`)
      params.push(isPericiable)
      paramIndex++
    }

    if (category !== undefined) {
      updates.push(`category = $${paramIndex}`)
      params.push(category)
      paramIndex++
    }

    if (defaultValue !== undefined) {
      updates.push(`default_value = $${paramIndex}`)
      params.push(defaultValue)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`)
    params.push(procedureId)

    const result = await query(
      `UPDATE procedure_base_table
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      params
    )

    res.json({
      message: 'Procedimento atualizado com sucesso',
      procedure: result.rows[0]
    })
  } catch (error: any) {
    console.error('Error updating clinic base procedure:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * DELETE /api/procedures-management/clinic/:clinicId/base/:procedureId
 * Remover procedimento da tabela base da clínica
 */
router.delete('/clinic/:clinicId/base/:procedureId', async (req, res) => {
  try {
    const { clinicId, procedureId } = req.params

    // Verificar permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Verificar se o procedimento existe
    const procedureCheck = await query(
      'SELECT id, is_custom FROM procedure_base_table WHERE id = $1 AND clinic_id = $2',
      [procedureId, clinicId]
    )

    if (procedureCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Procedimento não encontrado' })
    }

    // Apenas procedimentos customizados podem ser excluídos
    if (!procedureCheck.rows[0].is_custom) {
      return res.status(400).json({ error: 'Apenas procedimentos customizados podem ser excluídos' })
    }

    // Verificar se o procedimento está sendo usado
    const usageCheck = await query(
      `SELECT
        (SELECT COUNT(*) FROM plan_procedures WHERE procedure_base_id = $1) as plan_count,
        (SELECT COUNT(*) FROM insurance_provider_procedures WHERE procedure_base_id = $1) as provider_count`,
      [procedureId]
    )

    const planCount = parseInt(usageCheck.rows[0].plan_count, 10)
    const providerCount = parseInt(usageCheck.rows[0].provider_count, 10)

    if (planCount > 0 || providerCount > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir este procedimento pois está sendo utilizado',
        usage: {
          planCount,
          providerCount
        }
      })
    }

    // Excluir procedimento
    await query(
      'DELETE FROM procedure_base_table WHERE id = $1',
      [procedureId]
    )

    res.json({ message: 'Procedimento excluído com sucesso' })
  } catch (error: any) {
    console.error('Error deleting clinic base procedure:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
