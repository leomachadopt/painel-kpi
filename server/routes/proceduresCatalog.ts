import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

/**
 * GET /api/procedures-catalog/:clinicId
 * Retorna catálogo de procedimentos disponíveis para adicionar ao plano
 * Query params:
 *   - type: 'clinica' ou 'operadora'
 *   - providerId: obrigatório se type = 'operadora'
 *   - search: texto para filtrar por código ou descrição
 *   - limit: número máximo de resultados (padrão: 50)
 *   - requireApproved: 'true' para filtrar apenas procedimentos aprovados (padrão: false)
 *                      Usado APENAS para lançamento automático de lotes de fatura
 */
router.get('/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { type, providerId, search, limit = '50', requireApproved = 'false' } = req.query

    // Verifica permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Valida type
    if (!type || (type !== 'clinica' && type !== 'operadora')) {
      return res.status(400).json({ error: 'Parâmetro "type" deve ser "clinica" ou "operadora"' })
    }

    if (type === 'operadora' && !providerId) {
      return res.status(400).json({ error: 'Parâmetro "providerId" é obrigatório para type=operadora' })
    }

    let procedures = []

    if (type === 'clinica') {
      // Busca da tabela base da clínica
      const searchCondition = search
        ? `AND (pb.code ILIKE $3 OR pb.description ILIKE $3)`
        : ''

      const params = [clinicId, parseInt(limit as string, 10)]
      if (search) {
        params.push(`%${search}%`)
      }

      const result = await query(
        `SELECT
          pb.id,
          pb.code,
          pb.description,
          pb.default_value as value,
          pb.is_custom
         FROM procedure_base_table pb
         WHERE (pb.clinic_id = $1 OR pb.clinic_id IS NULL)
           AND pb.active = true
           ${searchCondition}
         ORDER BY pb.code
         LIMIT $2`,
        params
      )

      procedures = result.rows.map(row => ({
        id: row.id,
        code: row.code,
        description: row.description,
        value: parseFloat(row.value || 0),
        type: 'clinica',
        procedureBaseId: row.id,
        insuranceProviderProcedureId: null,
        isCustom: row.is_custom || false
      }))
    } else {
      // Busca da tabela de operadora
      const searchCondition = search
        ? `AND (COALESCE(ipp.provider_code, pb.code) ILIKE $4 OR COALESCE(ipp.provider_description, pb.description) ILIKE $4)`
        : ''

      // Filtro de aprovação: apenas para lançamento automático de lotes de fatura
      const approvalCondition = requireApproved === 'true'
        ? `AND ipp.active = true`
        : ''

      const params = [providerId, clinicId, parseInt(limit as string, 10)]
      if (search) {
        params.push(`%${search}%`)
      }

      const result = await query(
        `SELECT
          ipp.id as insurance_provider_procedure_id,
          pb.id as procedure_base_id,
          COALESCE(ipp.provider_code, pb.code) as code,
          COALESCE(ipp.provider_description, pb.description) as description,
          ipp.max_value as value,
          ipp.active
         FROM insurance_provider_procedures ipp
         JOIN procedure_base_table pb ON ipp.procedure_base_id = pb.id
         JOIN insurance_providers ip ON ipp.insurance_provider_id = ip.id
         WHERE ipp.insurance_provider_id = $1
           AND ip.clinic_id = $2
           ${approvalCondition}
           ${searchCondition}
         ORDER BY code
         LIMIT $3`,
        params
      )

      procedures = result.rows.map(row => ({
        id: row.insurance_provider_procedure_id,
        code: row.code,
        description: row.description,
        value: parseFloat(row.value || 0),
        type: 'operadora',
        procedureBaseId: row.procedure_base_id,
        insuranceProviderProcedureId: row.insurance_provider_procedure_id,
        active: row.active // Indica se procedimento foi aprovado
      }))
    }

    res.json({
      type,
      providerId: providerId || null,
      total: procedures.length,
      procedures
    })
  } catch (error: any) {
    console.error('Error fetching procedures catalog:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * GET /api/procedures-catalog/:clinicId/providers
 * Lista operadoras disponíveis para a clínica
 */
router.get('/:clinicId/providers', async (req, res) => {
  try {
    const { clinicId } = req.params

    // Verifica permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    const result = await query(
      `SELECT
        ip.id,
        ip.name,
        COUNT(DISTINCT ipp.id) as procedures_count
       FROM insurance_providers ip
       LEFT JOIN insurance_provider_procedures ipp ON ip.id = ipp.insurance_provider_id AND ipp.active = true
       WHERE ip.clinic_id = $1
       GROUP BY ip.id, ip.name
       ORDER BY ip.name`,
      [clinicId]
    )

    const providers = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      proceduresCount: parseInt(row.procedures_count, 10)
    }))

    res.json({ providers })
  } catch (error: any) {
    console.error('Error fetching insurance providers:', error)
    res.status(500).json({ error: error.message })
  }
})

/**
 * POST /api/procedures-catalog/:clinicId/custom
 * Cria um procedimento customizado para a clínica
 */
router.post('/:clinicId/custom', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { code, description, defaultValue } = req.body

    // Verifica permissões
    if (!req.user || !req.user.sub) {
      return res.status(401).json({ error: 'Não autenticado' })
    }

    if (req.user.clinicId !== clinicId) {
      return res.status(403).json({ error: 'Sem permissão para acessar esta clínica' })
    }

    // Valida input
    if (!code || !description || defaultValue === undefined) {
      return res.status(400).json({
        error: 'Campos obrigatórios: code, description, defaultValue'
      })
    }

    // Verifica se já existe um procedimento com o mesmo código
    const existingCheck = await query(
      `SELECT id FROM procedure_base_table
       WHERE clinic_id = $1 AND code = $2`,
      [clinicId, code]
    )

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Já existe um procedimento com este código na clínica'
      })
    }

    // Cria procedimento customizado
    const procedureId = `custom-proc-${Date.now()}`

    await query(
      `INSERT INTO procedure_base_table (
        id, clinic_id, code, description, default_value,
        is_custom, created_by_user_id, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        procedureId,
        clinicId,
        code,
        description,
        defaultValue,
        true,
        req.user.sub,
        true
      ]
    )

    res.status(201).json({
      message: 'Procedimento customizado criado com sucesso',
      procedure: {
        id: procedureId,
        code,
        description,
        value: parseFloat(defaultValue),
        type: 'clinica',
        procedureBaseId: procedureId,
        insuranceProviderProcedureId: null,
        isCustom: true
      }
    })
  } catch (error: any) {
    console.error('Error creating custom procedure:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
