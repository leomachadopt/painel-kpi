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

    // Delete existing configurations
    console.log('🗑️  Deleting existing configurations...')
    await query('DELETE FROM clinic_categories WHERE clinic_id = $1', [clinicId])
    await query('DELETE FROM clinic_cabinets WHERE clinic_id = $1', [clinicId])
    await query('DELETE FROM clinic_doctors WHERE clinic_id = $1', [clinicId])
    await query('DELETE FROM clinic_sources WHERE clinic_id = $1', [clinicId])
    await query('DELETE FROM clinic_campaigns WHERE clinic_id = $1', [clinicId])

    // Insert new categories
    if (categories && categories.length > 0) {
      console.log('📝 Inserting categories:', categories.length)
      for (const category of categories) {
        await query(
          'INSERT INTO clinic_categories (id, clinic_id, name) VALUES ($1, $2, $3)',
          [category.id, clinicId, category.name]
        )
      }
    }

    // Insert new cabinets
    if (cabinets && cabinets.length > 0) {
      console.log('📝 Inserting cabinets:', cabinets.length)
      for (const cabinet of cabinets) {
        await query(
          'INSERT INTO clinic_cabinets (id, clinic_id, name, standard_hours) VALUES ($1, $2, $3, $4)',
          [cabinet.id, clinicId, cabinet.name, cabinet.standardHours || 8]
        )
      }
    }

    // Insert new doctors
    if (doctors && doctors.length > 0) {
      console.log('📝 Inserting doctors:', doctors.length)
      for (const doctor of doctors) {
        await query(
          'INSERT INTO clinic_doctors (id, clinic_id, name) VALUES ($1, $2, $3)',
          [doctor.id, clinicId, doctor.name]
        )
      }
    }

    // Insert new sources
    if (sources && sources.length > 0) {
      console.log('📝 Inserting sources:', sources.length)
      for (const source of sources) {
        await query(
          'INSERT INTO clinic_sources (id, clinic_id, name) VALUES ($1, $2, $3)',
          [source.id, clinicId, source.name]
        )
      }
    }

    // Insert new campaigns
    if (campaigns && campaigns.length > 0) {
      console.log('📝 Inserting campaigns:', campaigns.length)
      for (const campaign of campaigns) {
        await query(
          'INSERT INTO clinic_campaigns (id, clinic_id, name) VALUES ($1, $2, $3)',
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
