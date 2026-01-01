import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// Get all clinics
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        id, name, owner_name, logo_url, active, last_update,
        target_revenue, target_aligners_min, target_aligners_max,
        target_avg_ticket, target_acceptance_rate, target_occupancy_rate,
        target_nps, target_integration_rate, target_attendance_rate,
        target_follow_up_rate, target_wait_time, target_complaints,
        target_leads_min, target_leads_max, target_revenue_per_cabinet,
        target_plans_presented_adults, target_plans_presented_kids,
        target_agenda_operational, target_agenda_planning,
        target_agenda_sales, target_agenda_leadership
      FROM clinics
      WHERE active = true
      ORDER BY name
    `)

    const clinics = await Promise.all(
      result.rows.map(async (clinic) => {
        // Get configuration data
        const categories = await query(
          'SELECT id, name FROM clinic_categories WHERE clinic_id = $1',
          [clinic.id]
        )
        const cabinets = await query(
          'SELECT id, name, standard_hours FROM clinic_cabinets WHERE clinic_id = $1',
          [clinic.id]
        )
        const doctors = await query(
          'SELECT id, name FROM clinic_doctors WHERE clinic_id = $1',
          [clinic.id]
        )
        const sources = await query(
          'SELECT id, name FROM clinic_sources WHERE clinic_id = $1',
          [clinic.id]
        )
        const campaigns = await query(
          'SELECT id, name FROM clinic_campaigns WHERE clinic_id = $1',
          [clinic.id]
        )

        return {
          id: clinic.id,
          name: clinic.name,
          ownerName: clinic.owner_name,
          logoUrl: clinic.logo_url,
          active: clinic.active,
          lastUpdate: clinic.last_update,
          targetRevenue: parseFloat(clinic.target_revenue),
          targetAlignersRange: {
            min: clinic.target_aligners_min,
            max: clinic.target_aligners_max,
          },
          targetAvgTicket: parseFloat(clinic.target_avg_ticket),
          targetAcceptanceRate: parseFloat(clinic.target_acceptance_rate),
          targetOccupancyRate: parseFloat(clinic.target_occupancy_rate),
          targetNPS: clinic.target_nps,
          targetIntegrationRate: parseFloat(clinic.target_integration_rate),
          targetAttendanceRate: parseFloat(clinic.target_attendance_rate),
          targetFollowUpRate: parseFloat(clinic.target_follow_up_rate),
          targetWaitTime: clinic.target_wait_time,
          targetComplaints: clinic.target_complaints,
          targetLeadsRange: {
            min: clinic.target_leads_min,
            max: clinic.target_leads_max,
          },
          targetRevenuePerCabinet: parseFloat(clinic.target_revenue_per_cabinet),
          targetPlansPresented: {
            adults: clinic.target_plans_presented_adults,
            kids: clinic.target_plans_presented_kids,
          },
          targetAgendaDistribution: {
            operational: parseFloat(clinic.target_agenda_operational),
            planning: parseFloat(clinic.target_agenda_planning),
            sales: parseFloat(clinic.target_agenda_sales),
            leadership: parseFloat(clinic.target_agenda_leadership),
          },
          configuration: {
            categories: categories.rows.map((r) => ({ id: r.id, name: r.name })),
            cabinets: cabinets.rows.map((r) => ({
              id: r.id,
              name: r.name,
              standardHours: r.standard_hours,
            })),
            doctors: doctors.rows.map((r) => ({ id: r.id, name: r.name })),
            sources: sources.rows.map((r) => ({ id: r.id, name: r.name })),
            campaigns: campaigns.rows.map((r) => ({ id: r.id, name: r.name })),
          },
        }
      })
    )

    res.json(clinics)
  } catch (error) {
    console.error('Get clinics error:', error)
    res.status(500).json({ error: 'Failed to fetch clinics' })
  }
})

// Get single clinic
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await query(
      `SELECT * FROM clinics WHERE id = $1 AND active = true`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Clinic not found' })
    }

    // Build clinic object with configuration (same as above)
    const clinic = result.rows[0]
    const categories = await query(
      'SELECT id, name FROM clinic_categories WHERE clinic_id = $1',
      [clinic.id]
    )
    const cabinets = await query(
      'SELECT id, name, standard_hours FROM clinic_cabinets WHERE clinic_id = $1',
      [clinic.id]
    )
    const doctors = await query(
      'SELECT id, name FROM clinic_doctors WHERE clinic_id = $1',
      [clinic.id]
    )
    const sources = await query(
      'SELECT id, name FROM clinic_sources WHERE clinic_id = $1',
      [clinic.id]
    )
    const campaigns = await query(
      'SELECT id, name FROM clinic_campaigns WHERE clinic_id = $1',
      [clinic.id]
    )

    res.json({
      id: clinic.id,
      name: clinic.name,
      ownerName: clinic.owner_name,
      logoUrl: clinic.logo_url,
      active: clinic.active,
      lastUpdate: clinic.last_update,
      targetRevenue: parseFloat(clinic.target_revenue),
      targetAlignersRange: {
        min: clinic.target_aligners_min,
        max: clinic.target_aligners_max,
      },
      targetAvgTicket: parseFloat(clinic.target_avg_ticket),
      targetAcceptanceRate: parseFloat(clinic.target_acceptance_rate),
      targetOccupancyRate: parseFloat(clinic.target_occupancy_rate),
      targetNPS: clinic.target_nps,
      targetIntegrationRate: parseFloat(clinic.target_integration_rate),
      targetAttendanceRate: parseFloat(clinic.target_attendance_rate),
      targetFollowUpRate: parseFloat(clinic.target_follow_up_rate),
      targetWaitTime: clinic.target_wait_time,
      targetComplaints: clinic.target_complaints,
      targetLeadsRange: {
        min: clinic.target_leads_min,
        max: clinic.target_leads_max,
      },
      targetRevenuePerCabinet: parseFloat(clinic.target_revenue_per_cabinet),
      targetPlansPresented: {
        adults: clinic.target_plans_presented_adults,
        kids: clinic.target_plans_presented_kids,
      },
      targetAgendaDistribution: {
        operational: parseFloat(clinic.target_agenda_operational),
        planning: parseFloat(clinic.target_agenda_planning),
        sales: parseFloat(clinic.target_agenda_sales),
        leadership: parseFloat(clinic.target_agenda_leadership),
      },
      configuration: {
        categories: categories.rows.map((r) => ({ id: r.id, name: r.name })),
        cabinets: cabinets.rows.map((r) => ({
          id: r.id,
          name: r.name,
          standardHours: r.standard_hours,
        })),
        doctors: doctors.rows.map((r) => ({ id: r.id, name: r.name })),
        sources: sources.rows.map((r) => ({ id: r.id, name: r.name })),
        campaigns: campaigns.rows.map((r) => ({ id: r.id, name: r.name })),
      },
    })
  } catch (error) {
    console.error('Get clinic error:', error)
    res.status(500).json({ error: 'Failed to fetch clinic' })
  }
})

// Update clinic targets
router.put('/:id/targets', async (req, res) => {
  try {
    const { id } = req.params
    const {
      targetRevenue,
      targetAlignersRange,
      targetAvgTicket,
      targetAcceptanceRate,
      targetOccupancyRate,
      targetNPS,
      targetIntegrationRate,
      targetAttendanceRate,
      targetFollowUpRate,
      targetWaitTime,
      targetComplaints,
      targetLeadsRange,
      targetRevenuePerCabinet,
      targetPlansPresented,
      targetAgendaDistribution,
    } = req.body

    await query(
      `UPDATE clinics SET
        target_revenue = $1,
        target_aligners_min = $2,
        target_aligners_max = $3,
        target_avg_ticket = $4,
        target_acceptance_rate = $5,
        target_occupancy_rate = $6,
        target_nps = $7,
        target_integration_rate = $8,
        target_attendance_rate = $9,
        target_follow_up_rate = $10,
        target_wait_time = $11,
        target_complaints = $12,
        target_leads_min = $13,
        target_leads_max = $14,
        target_revenue_per_cabinet = $15,
        target_plans_presented_adults = $16,
        target_plans_presented_kids = $17,
        target_agenda_operational = $18,
        target_agenda_planning = $19,
        target_agenda_sales = $20,
        target_agenda_leadership = $21,
        last_update = NOW()
      WHERE id = $22`,
      [
        targetRevenue,
        targetAlignersRange.min,
        targetAlignersRange.max,
        targetAvgTicket,
        targetAcceptanceRate,
        targetOccupancyRate,
        targetNPS,
        targetIntegrationRate,
        targetAttendanceRate,
        targetFollowUpRate,
        targetWaitTime,
        targetComplaints,
        targetLeadsRange.min,
        targetLeadsRange.max,
        targetRevenuePerCabinet,
        targetPlansPresented.adults,
        targetPlansPresented.kids,
        targetAgendaDistribution.operational,
        targetAgendaDistribution.planning,
        targetAgendaDistribution.sales,
        targetAgendaDistribution.leadership,
        id,
      ]
    )

    res.json({ message: 'Targets updated successfully' })
  } catch (error) {
    console.error('Update targets error:', error)
    res.status(500).json({ error: 'Failed to update targets' })
  }
})

// Create new clinic
router.post('/', async (req, res) => {
  try {
    const {
      name,
      ownerName,
      email,
      password,
      targetRevenue = 100000,
      targetNPS = 80,
    } = req.body

    if (!name || !ownerName) {
      return res.status(400).json({ error: 'Name and owner name are required' })
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Check if email already exists
    const existingUser = await query('SELECT id FROM users WHERE email = $1', [email])
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already in use' })
    }

    // Generate clinic ID
    const clinicId = `clinic-${Date.now()}`

    await query(
      `INSERT INTO clinics (
        id, name, owner_name, active,
        target_revenue, target_aligners_min, target_aligners_max,
        target_avg_ticket, target_acceptance_rate, target_occupancy_rate,
        target_nps, target_integration_rate, target_attendance_rate,
        target_follow_up_rate, target_wait_time, target_complaints,
        target_leads_min, target_leads_max, target_revenue_per_cabinet,
        target_plans_presented_adults, target_plans_presented_kids,
        target_agenda_operational, target_agenda_planning,
        target_agenda_sales, target_agenda_leadership,
        created_at, last_update
      ) VALUES (
        $1, $2, $3, true,
        $4, 11, 15,
        1500, 0.70, 0.85,
        $5, 0.90, 0.95,
        0.80, 15, 5,
        50, 80, 50000,
        25, 15,
        0.40, 0.20, 0.30, 0.10,
        NOW(), NOW()
      )`,
      [clinicId, name, ownerName, targetRevenue, targetNPS]
    )

    // Insert default categories
    const defaultCategories = [
      'Alinhadores',
      'Odontopediatria',
      'Dentisteria',
      'Implantologia',
      'Outros'
    ]
    for (const cat of defaultCategories) {
      await query(
        'INSERT INTO clinic_categories (id, clinic_id, name) VALUES ($1, $2, $3)',
        [`${clinicId}-cat-${cat.toLowerCase()}`, clinicId, cat]
      )
    }

    // Insert default cabinets
    const defaultCabinets = [
      { name: 'Gabinete 1', hours: 8 },
      { name: 'Gabinete 2', hours: 8 }
    ]
    for (const cab of defaultCabinets) {
      await query(
        'INSERT INTO clinic_cabinets (id, clinic_id, name, standard_hours) VALUES ($1, $2, $3, $4)',
        [`${clinicId}-cab-${cab.name.replace(/\s/g, '-').toLowerCase()}`, clinicId, cab.name, cab.hours]
      )
    }

    // Insert default doctors
    const defaultDoctors = ['Dr. João Silva', 'Dra. Maria Santos']
    for (const doc of defaultDoctors) {
      await query(
        'INSERT INTO clinic_doctors (id, clinic_id, name) VALUES ($1, $2, $3)',
        [`${clinicId}-doc-${doc.replace(/\s/g, '-').toLowerCase()}`, clinicId, doc]
      )
    }

    // Insert default sources
    const defaultSources = ['Google', 'Facebook', 'Instagram', 'Referência', 'Website', 'Outro']
    for (const src of defaultSources) {
      await query(
        'INSERT INTO clinic_sources (id, clinic_id, name) VALUES ($1, $2, $3)',
        [`${clinicId}-src-${src.toLowerCase()}`, clinicId, src]
      )
    }

    // Insert default campaigns
    const defaultCampaigns = ['Alinhadores 2024', 'Branqueamento', 'Ortodontia']
    for (const camp of defaultCampaigns) {
      await query(
        'INSERT INTO clinic_campaigns (id, clinic_id, name) VALUES ($1, $2, $3)',
        [`${clinicId}-camp-${camp.replace(/\s/g, '-').toLowerCase()}`, clinicId, camp]
      )
    }

    // Create user for clinic manager
    const userId = `user-${clinicId}`
    await query(
      `INSERT INTO users (id, name, email, password_hash, role, clinic_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [userId, ownerName, email, password, 'GESTOR_CLINICA', clinicId]
    )

    res.json({
      id: clinicId,
      message: 'Clinic and user created successfully',
      credentials: {
        email,
        clinicId
      }
    })
  } catch (error) {
    console.error('Create clinic error:', error)
    res.status(500).json({ error: 'Failed to create clinic' })
  }
})

// Delete clinic
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Check if clinic exists
    const clinic = await query('SELECT id FROM clinics WHERE id = $1', [id])
    if (clinic.rows.length === 0) {
      return res.status(404).json({ error: 'Clinic not found' })
    }

    // Soft delete (set active = false)
    await query('UPDATE clinics SET active = false, last_update = NOW() WHERE id = $1', [id])

    res.json({ message: 'Clinic deleted successfully' })
  } catch (error) {
    console.error('Delete clinic error:', error)
    res.status(500).json({ error: 'Failed to delete clinic' })
  }
})

export default router
