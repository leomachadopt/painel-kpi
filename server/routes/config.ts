import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// Update clinic configuration (categories, cabinets, doctors, sources, campaigns)
router.put('/:clinicId', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { categories, cabinets, doctors, sources, campaigns } = req.body

    console.log('🔧 Updating config for clinic:', clinicId)
    console.log('📦 Received data:', JSON.stringify({ categories, cabinets, doctors, sources, campaigns }, null, 2))

    const client = await query('SELECT 1 FROM clinics WHERE id = $1', [clinicId])
    if (client.rows.length === 0) {
      return res.status(404).json({ error: 'Clinic not found' })
    }

    // Use UPSERT strategy to avoid foreign key violations
    // This approach updates existing records and inserts new ones without deleting

    // Upsert categories
    if (categories && categories.length > 0) {
      console.log('📝 Upserting categories:', categories.length)
      for (const category of categories) {
        await query(
          `INSERT INTO clinic_categories (id, clinic_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [category.id, clinicId, category.name]
        )
      }
    }

    // Upsert cabinets
    if (cabinets && cabinets.length > 0) {
      console.log('📝 Upserting cabinets:', cabinets.length)
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

    // Upsert doctors
    if (doctors && doctors.length > 0) {
      console.log('📝 Upserting doctors:', doctors.length)
      for (const doctor of doctors) {
        await query(
          `INSERT INTO clinic_doctors (id, clinic_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [doctor.id, clinicId, doctor.name]
        )
      }
    }

    // Upsert sources
    if (sources && sources.length > 0) {
      console.log('📝 Upserting sources:', sources.length)

      // Validate that "Referência" source is always present (hard-coded protection)
      const hasReferencia = sources.some((s: any) => s.name === 'Referência')
      if (!hasReferencia) {
        return res.status(400).json({
          error: 'A fonte "Referência" é obrigatória e não pode ser removida'
        })
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

    // Upsert campaigns
    if (campaigns && campaigns.length > 0) {
      console.log('📝 Upserting campaigns:', campaigns.length)
      for (const campaign of campaigns) {
        await query(
          `INSERT INTO clinic_campaigns (id, clinic_id, name)
           VALUES ($1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
          [campaign.id, clinicId, campaign.name]
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

export default router
