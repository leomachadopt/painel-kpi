import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// Update clinic configuration (categories, cabinets, doctors, sources, campaigns, paymentSources)
router.put('/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { categories, cabinets, doctors, sources, campaigns, paymentSources } = req.body

    console.log('🔧 Updating config for clinic:', clinicId)
    console.log('📦 Received data:', JSON.stringify({ categories, cabinets, doctors, sources, campaigns, paymentSources }, null, 2))

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

export default router
