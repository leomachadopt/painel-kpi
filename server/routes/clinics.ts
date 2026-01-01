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

export default router
