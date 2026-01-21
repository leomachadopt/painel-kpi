import { Router } from 'express'
import { query } from '../db.js'
import { requirePermission, getUserPermissions } from '../middleware/permissions.js'

const router = Router()

// Update clinic configuration (categories, cabinets, doctors, sources, campaigns, paymentSources, alignerBrands)
router.put('/:clinicId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { categories, cabinets, doctors, sources, campaigns, paymentSources, alignerBrands } = req.body

    console.log('🔧 Updating config for clinic:', clinicId)
    console.log('📦 Received data:', JSON.stringify({ categories, cabinets, doctors, sources, campaigns, paymentSources, alignerBrands }, null, 2))

    const client = await query('SELECT 1 FROM clinics WHERE id = $1', [clinicId])
    if (client.rows.length === 0) {
      return res.status(404).json({ error: 'Clinic not found' })
    }

    // Use DELETE + UPSERT strategy to ensure deleted items are removed
    // First delete items not in the new list, then insert/update the ones that are

    // Handle categories
    if (categories !== undefined) {
      console.log('📝 Updating categories:', categories.length)
      const categoryIds = categories.map((c: any) => c.id)
      // Delete categories not in the new list
      if (categoryIds.length > 0) {
        await query(
          `DELETE FROM clinic_categories WHERE clinic_id = $1 AND id NOT IN (${categoryIds.map((_, i) => `$${i + 2}`).join(', ')})`,
          [clinicId, ...categoryIds]
        )
      } else {
        // If empty array, delete all
        await query('DELETE FROM clinic_categories WHERE clinic_id = $1', [clinicId])
      }
      // Upsert categories
      for (const category of categories) {
        await query(
          `INSERT INTO clinic_categories (id, clinic_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [category.id, clinicId, category.name]
        )
      }
    }

    // Handle cabinets
    if (cabinets !== undefined) {
      console.log('📝 Updating cabinets:', cabinets.length)
      const cabinetIds = cabinets.map((c: any) => c.id)
      if (cabinetIds.length > 0) {
        await query(
          `DELETE FROM clinic_cabinets WHERE clinic_id = $1 AND id NOT IN (${cabinetIds.map((_, i) => `$${i + 2}`).join(', ')})`,
          [clinicId, ...cabinetIds]
        )
      } else {
        await query('DELETE FROM clinic_cabinets WHERE clinic_id = $1', [clinicId])
      }
      for (const cabinet of cabinets) {
        await query(
          `INSERT INTO clinic_cabinets (id, clinic_id, name, standard_hours)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             standard_hours = EXCLUDED.standard_hours`,
          [cabinet.id, clinicId, cabinet.name, cabinet.standardHours || 8]
        )
      }
    }

    // Handle doctors
    if (doctors !== undefined) {
      console.log('📝 Updating doctors:', doctors.length)
      const doctorIds = doctors.map((d: any) => d.id)
      if (doctorIds.length > 0) {
        await query(
          `DELETE FROM clinic_doctors WHERE clinic_id = $1 AND id NOT IN (${doctorIds.map((_, i) => `$${i + 2}`).join(', ')})`,
          [clinicId, ...doctorIds]
        )
      } else {
        await query('DELETE FROM clinic_doctors WHERE clinic_id = $1', [clinicId])
      }
      for (const doctor of doctors) {
        await query(
          `INSERT INTO clinic_doctors (id, clinic_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [doctor.id, clinicId, doctor.name]
        )
      }
    }

    // Handle sources
    if (sources !== undefined) {
      console.log('📝 Updating sources:', sources.length)

      // Validate that "Referência" source is always present
      const hasReferencia = sources.some((s: any) => s.name === 'Referência')
      if (!hasReferencia) {
        return res.status(400).json({
          error: 'A fonte "Referência" é obrigatória e não pode ser removida'
        })
      }

      const sourceIds = sources.map((s: any) => s.id)
      if (sourceIds.length > 0) {
        await query(
          `DELETE FROM clinic_sources WHERE clinic_id = $1 AND id NOT IN (${sourceIds.map((_, i) => `$${i + 2}`).join(', ')})`,
          [clinicId, ...sourceIds]
        )
      } else {
        await query('DELETE FROM clinic_sources WHERE clinic_id = $1', [clinicId])
      }
      for (const source of sources) {
        await query(
          `INSERT INTO clinic_sources (id, clinic_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [source.id, clinicId, source.name]
        )
      }
    }

    // Handle campaigns
    if (campaigns !== undefined) {
      console.log('📝 Updating campaigns:', campaigns.length)
      const campaignIds = campaigns.map((c: any) => c.id)
      if (campaignIds.length > 0) {
        await query(
          `DELETE FROM clinic_campaigns WHERE clinic_id = $1 AND id NOT IN (${campaignIds.map((_, i) => `$${i + 2}`).join(', ')})`,
          [clinicId, ...campaignIds]
        )
      } else {
        await query('DELETE FROM clinic_campaigns WHERE clinic_id = $1', [clinicId])
      }
      for (const campaign of campaigns) {
        await query(
          `INSERT INTO clinic_campaigns (id, clinic_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [campaign.id, clinicId, campaign.name]
        )
      }
    }

    // Handle payment sources
    if (paymentSources !== undefined) {
      console.log('📝 Updating payment sources:', paymentSources.length)
      try {
        // Verificar se a tabela existe antes de tentar inserir
        const tableCheck = await query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'clinic_payment_sources'
          )
        `)
        
        if (!tableCheck.rows[0]?.exists) {
          console.warn('⚠️  Tabela clinic_payment_sources não existe. Criando...')
          await query(`
            CREATE TABLE IF NOT EXISTS clinic_payment_sources (
              id VARCHAR(255) PRIMARY KEY,
              clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
              name VARCHAR(255) NOT NULL,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
          `)
          await query(`
            CREATE INDEX IF NOT EXISTS idx_clinic_payment_sources_clinic_id 
            ON clinic_payment_sources(clinic_id)
          `)
          console.log('✅ Tabela clinic_payment_sources criada com sucesso')
        }

        const paymentSourceIds = paymentSources.map((ps: any) => ps.id)
        // Delete payment sources not in the new list
        if (paymentSourceIds.length > 0) {
          await query(
            `DELETE FROM clinic_payment_sources WHERE clinic_id = $1 AND id NOT IN (${paymentSourceIds.map((_, i) => `$${i + 2}`).join(', ')})`,
            [clinicId, ...paymentSourceIds]
          )
        } else {
          // If empty array, delete all
          await query('DELETE FROM clinic_payment_sources WHERE clinic_id = $1', [clinicId])
        }
        // Upsert payment sources
        for (const paymentSource of paymentSources) {
          await query(
            `INSERT INTO clinic_payment_sources (id, clinic_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
            [paymentSource.id, clinicId, paymentSource.name]
          )
        }
      } catch (paymentError: any) {
        console.error('❌ Erro ao atualizar payment sources:', paymentError)
        console.warn('⚠️  Continuando sem atualizar payment sources')
      }
    }

    // Handle aligner brands
    if (alignerBrands !== undefined) {
      console.log('📝 Updating aligner brands:', alignerBrands.length)
      const alignerBrandIds = alignerBrands.map((ab: any) => ab.id)
      if (alignerBrandIds.length > 0) {
        await query(
          `DELETE FROM clinic_aligner_brands WHERE clinic_id = $1 AND id NOT IN (${alignerBrandIds.map((_, i) => `$${i + 2}`).join(', ')})`,
          [clinicId, ...alignerBrandIds]
        )
      } else {
        await query('DELETE FROM clinic_aligner_brands WHERE clinic_id = $1', [clinicId])
      }
      for (const alignerBrand of alignerBrands) {
        await query(
          `INSERT INTO clinic_aligner_brands (id, clinic_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [alignerBrand.id, clinicId, alignerBrand.name]
        )
      }
    }

    console.log('✅ Configuration updated successfully')
    res.json({ message: 'Configuration updated successfully' })
  } catch (error: any) {
    console.error('❌ Update config error:', error)
    console.error('Error details:', {
      message: error.message,
      detail: error.detail,
      stack: error.stack
    })
    res.status(500).json({
      error: 'Failed to update configuration',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// ========================
// First Consultation Types
// ========================

// Get all consultation types for a clinic
// Accessible by anyone who can edit consultations (GESTOR_CLINICA, MENTOR, or COLABORADOR with permission)
router.get('/:clinicId/consultation-types', async (req, res) => {
  try {
    const { clinicId } = req.params
    const userId = (req as any).user?.sub || (req as any).auth?.sub
    const userRole = (req as any).user?.role || (req as any).auth?.role
    const userClinicId = (req as any).user?.clinicId || (req as any).auth?.clinicId

    // Must belong to the clinic
    if (userClinicId !== clinicId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // GESTOR_CLINICA and MENTOR always can read
    let canRead = userRole === 'GESTOR_CLINICA' || userRole === 'MENTOR'

    // COLABORADOR needs canEditConsultations permission
    if (!canRead && userRole === 'COLABORADOR') {
      const permissions = await getUserPermissions(userId, userRole, clinicId)
      canRead = permissions.canEditConsultations === true
    }

    if (!canRead) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const result = await query(
      `SELECT * FROM first_consultation_types
       WHERE clinic_id = $1
       ORDER BY name ASC`,
      [clinicId]
    )

    res.json(result.rows.map(row => ({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      description: row.description,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })))
  } catch (error: any) {
    console.error('Get consultation types error:', error)
    res.status(500).json({ error: 'Failed to fetch consultation types' })
  }
})

// Create a new consultation type
router.post('/:clinicId/consultation-types', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId } = req.params
    const { name, description } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    const result = await query(
      `INSERT INTO first_consultation_types (clinic_id, name, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [clinicId, name, description || null]
    )

    const row = result.rows[0]
    res.status(201).json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      description: row.description,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Create consultation type error:', error)
    if (error.constraint === 'first_consultation_types_clinic_id_name_key') {
      return res.status(409).json({ error: 'Um tipo de consulta com este nome já existe' })
    }
    res.status(500).json({ error: 'Failed to create consultation type' })
  }
})

// Update a consultation type
router.put('/:clinicId/consultation-types/:typeId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, typeId } = req.params
    const { name, description, active } = req.body

    const result = await query(
      `UPDATE first_consultation_types
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           active = COALESCE($3, active)
       WHERE id = $4 AND clinic_id = $5
       RETURNING *`,
      [name, description, active, typeId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation type not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      name: row.name,
      description: row.description,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Update consultation type error:', error)
    if (error.constraint === 'first_consultation_types_clinic_id_name_key') {
      return res.status(409).json({ error: 'Um tipo de consulta com este nome já existe' })
    }
    res.status(500).json({ error: 'Failed to update consultation type' })
  }
})

// Delete a consultation type
router.delete('/:clinicId/consultation-types/:typeId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, typeId } = req.params

    const result = await query(
      `DELETE FROM first_consultation_types
       WHERE id = $1 AND clinic_id = $2
       RETURNING id`,
      [typeId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation type not found' })
    }

    res.json({ message: 'Consultation type deleted successfully' })
  } catch (error: any) {
    console.error('Delete consultation type error:', error)
    res.status(500).json({ error: 'Failed to delete consultation type' })
  }
})

// ========================
// Consultation Type Procedures
// ========================

// Get all procedures for a consultation type
// Accessible by anyone who can edit consultations
router.get('/:clinicId/consultation-types/:typeId/procedures', async (req, res) => {
  try {
    const { clinicId, typeId } = req.params
    const userId = (req as any).user?.sub || (req as any).auth?.sub
    const userRole = (req as any).user?.role || (req as any).auth?.role
    const userClinicId = (req as any).user?.clinicId || (req as any).auth?.clinicId

    // Must belong to the clinic
    if (userClinicId !== clinicId) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // GESTOR_CLINICA and MENTOR always can read
    let canRead = userRole === 'GESTOR_CLINICA' || userRole === 'MENTOR'

    // COLABORADOR needs canEditConsultations permission
    if (!canRead && userRole === 'COLABORADOR') {
      const permissions = await getUserPermissions(userId, userRole, clinicId)
      canRead = permissions.canEditConsultations === true
    }

    if (!canRead) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Verify that the consultation type belongs to this clinic
    const typeCheck = await query(
      `SELECT id FROM first_consultation_types WHERE id = $1 AND clinic_id = $2`,
      [typeId, clinicId]
    )

    if (typeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation type not found' })
    }

    const result = await query(
      `SELECT * FROM first_consultation_type_procedures
       WHERE consultation_type_id = $1
       ORDER BY display_order ASC, name ASC`,
      [typeId]
    )

    res.json(result.rows.map(row => ({
      id: row.id,
      consultationTypeId: row.consultation_type_id,
      name: row.name,
      description: row.description,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })))
  } catch (error: any) {
    console.error('Get procedures error:', error)
    res.status(500).json({ error: 'Failed to fetch procedures' })
  }
})

// Create a new procedure for a consultation type
router.post('/:clinicId/consultation-types/:typeId/procedures', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, typeId } = req.params
    const { name, description, displayOrder } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name is required' })
    }

    // Verify that the consultation type belongs to this clinic
    const typeCheck = await query(
      `SELECT id FROM first_consultation_types WHERE id = $1 AND clinic_id = $2`,
      [typeId, clinicId]
    )

    if (typeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation type not found' })
    }

    const result = await query(
      `INSERT INTO first_consultation_type_procedures (consultation_type_id, name, description, display_order)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [typeId, name, description || null, displayOrder || 0]
    )

    const row = result.rows[0]
    res.status(201).json({
      id: row.id,
      consultationTypeId: row.consultation_type_id,
      name: row.name,
      description: row.description,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Create procedure error:', error)
    res.status(500).json({ error: 'Failed to create procedure' })
  }
})

// Update a procedure
router.put('/:clinicId/consultation-types/:typeId/procedures/:procedureId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, typeId, procedureId } = req.params
    const { name, description, displayOrder } = req.body

    // Verify that the consultation type belongs to this clinic
    const typeCheck = await query(
      `SELECT id FROM first_consultation_types WHERE id = $1 AND clinic_id = $2`,
      [typeId, clinicId]
    )

    if (typeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation type not found' })
    }

    const result = await query(
      `UPDATE first_consultation_type_procedures
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           display_order = COALESCE($3, display_order)
       WHERE id = $4 AND consultation_type_id = $5
       RETURNING *`,
      [name, description, displayOrder, procedureId, typeId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Procedure not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      consultationTypeId: row.consultation_type_id,
      name: row.name,
      description: row.description,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error: any) {
    console.error('Update procedure error:', error)
    res.status(500).json({ error: 'Failed to update procedure' })
  }
})

// Delete a procedure
router.delete('/:clinicId/consultation-types/:typeId/procedures/:procedureId', requirePermission('canEditClinicConfig'), async (req, res) => {
  try {
    const { clinicId, typeId, procedureId } = req.params

    // Verify that the consultation type belongs to this clinic
    const typeCheck = await query(
      `SELECT id FROM first_consultation_types WHERE id = $1 AND clinic_id = $2`,
      [typeId, clinicId]
    )

    if (typeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Consultation type not found' })
    }

    const result = await query(
      `DELETE FROM first_consultation_type_procedures
       WHERE id = $1 AND consultation_type_id = $2
       RETURNING id`,
      [procedureId, typeId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Procedure not found' })
    }

    res.json({ message: 'Procedure deleted successfully' })
  } catch (error: any) {
    console.error('Delete procedure error:', error)
    res.status(500).json({ error: 'Failed to delete procedure' })
  }
})

export default router
