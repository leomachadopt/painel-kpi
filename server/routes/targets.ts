// @ts-nocheck
import { Router } from 'express'
import { query } from '../db.js'
import { requirePermission } from '../middleware/permissions.js'

const router = Router()

// Get monthly targets for a clinic
router.get('/:clinicId/:year/:month', requirePermission('canViewTargets'), async (req, res) => {
  try {
    const { clinicId, year, month } = req.params

    console.log('🔍 GET targets request:', { clinicId, year, month })

    const result = await query(
      `SELECT * FROM monthly_targets WHERE clinic_id = $1 AND year = $2 AND month = $3`,
      [clinicId, parseInt(year), parseInt(month)]
    )

    console.log('📋 Query result:', { rowCount: result.rows.length, rows: result.rows })

    if (result.rows.length === 0) {
      console.log('❌ No targets found for:', { clinicId, year, month })
      return res.status(404).json({ error: 'Targets not found' })
    }

    const row = result.rows[0]

    // Cache: 1 hora (metas mensais mudam raramente)
    res.setHeader('Cache-Control', 'max-age=3600, s-maxage=3600, stale-while-revalidate=300')
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      month: row.month,
      year: row.year,
      targetRevenue: parseFloat(row.target_revenue),
      targetAlignersRange: {
        min: row.target_aligners_min,
        max: row.target_aligners_max
      },
      targetAvgTicket: parseFloat(row.target_avg_ticket),
      targetAcceptanceRate: parseFloat(row.target_acceptance_rate),
      targetOccupancyRate: parseFloat(row.target_occupancy_rate),
      targetNPS: row.target_nps,
      targetIntegrationRate: parseFloat(row.target_integration_rate),
      targetAgendaDistribution: {
        operational: parseFloat(row.target_agenda_operational),
        planning: parseFloat(row.target_agenda_planning),
        sales: parseFloat(row.target_agenda_sales),
        leadership: parseFloat(row.target_agenda_leadership)
      },
      targetAttendanceRate: parseFloat(row.target_attendance_rate),
      targetFollowUpRate: parseFloat(row.target_follow_up_rate),
      targetWaitTime: row.target_wait_time,
      targetComplaints: row.target_complaints,
      targetLeadsRange: {
        min: row.target_leads_min,
        max: row.target_leads_max
      },
      targetRevenuePerCabinet: parseFloat(row.target_revenue_per_cabinet),
      targetPlansPresented: {
        adults: row.target_plans_adults,
        kids: row.target_plans_kids
      }
    })
  } catch (error: any) {
    console.error('Get targets error:', error)
    res.status(500).json({
      error: 'Failed to fetch targets',
      message: error.message
    })
  }
})

// Get all targets for a clinic
router.get('/:clinicId', requirePermission('canViewTargets'), async (req, res) => {
  try {
    const { clinicId } = req.params

    const result = await query(
      `SELECT * FROM monthly_targets WHERE clinic_id = $1 ORDER BY year DESC, month DESC`,
      [clinicId]
    )

    const targets = result.rows.map(row => ({
      id: row.id,
      clinicId: row.clinic_id,
      month: row.month,
      year: row.year,
      targetRevenue: parseFloat(row.target_revenue),
      targetAlignersRange: {
        min: row.target_aligners_min,
        max: row.target_aligners_max
      },
      targetAvgTicket: parseFloat(row.target_avg_ticket),
      targetAcceptanceRate: parseFloat(row.target_acceptance_rate),
      targetOccupancyRate: parseFloat(row.target_occupancy_rate),
      targetNPS: row.target_nps,
      targetIntegrationRate: parseFloat(row.target_integration_rate),
      targetAgendaDistribution: {
        operational: parseFloat(row.target_agenda_operational),
        planning: parseFloat(row.target_agenda_planning),
        sales: parseFloat(row.target_agenda_sales),
        leadership: parseFloat(row.target_agenda_leadership)
      },
      targetAttendanceRate: parseFloat(row.target_attendance_rate),
      targetFollowUpRate: parseFloat(row.target_follow_up_rate),
      targetWaitTime: row.target_wait_time,
      targetComplaints: row.target_complaints,
      targetLeadsRange: {
        min: row.target_leads_min,
        max: row.target_leads_max
      },
      targetRevenuePerCabinet: parseFloat(row.target_revenue_per_cabinet),
      targetPlansPresented: {
        adults: row.target_plans_adults,
        kids: row.target_plans_kids
      }
    }))

    // Cache: 1 hora (lista de metas muda raramente)
    res.setHeader('Cache-Control', 'max-age=3600, s-maxage=3600, stale-while-revalidate=300')
    res.json(targets)
  } catch (error: any) {
    console.error('Get all targets error:', error)
    res.status(500).json({
      error: 'Failed to fetch targets',
      message: error.message
    })
  }
})

// Update or create monthly targets
router.put('/:clinicId/:year/:month', requirePermission('canEditTargets'), async (req, res) => {
  try {
    const { clinicId, year, month } = req.params
    const targets = req.body

    console.log('📊 Saving targets:', { clinicId, year, month, targets })

    const id = `${clinicId}-${year}-${month}`

    await query(
      `INSERT INTO monthly_targets (
        id, clinic_id, month, year,
        target_revenue, target_aligners_min, target_aligners_max,
        target_avg_ticket, target_acceptance_rate, target_occupancy_rate,
        target_nps, target_integration_rate,
        target_agenda_operational, target_agenda_planning, target_agenda_sales, target_agenda_leadership,
        target_attendance_rate, target_follow_up_rate, target_wait_time, target_complaints,
        target_leads_min, target_leads_max, target_revenue_per_cabinet,
        target_plans_adults, target_plans_kids,
        updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12,
        $13, $14, $15, $16,
        $17, $18, $19, $20,
        $21, $22, $23,
        $24, $25,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (clinic_id, month, year) DO UPDATE SET
        target_revenue = EXCLUDED.target_revenue,
        target_aligners_min = EXCLUDED.target_aligners_min,
        target_aligners_max = EXCLUDED.target_aligners_max,
        target_avg_ticket = EXCLUDED.target_avg_ticket,
        target_acceptance_rate = EXCLUDED.target_acceptance_rate,
        target_occupancy_rate = EXCLUDED.target_occupancy_rate,
        target_nps = EXCLUDED.target_nps,
        target_integration_rate = EXCLUDED.target_integration_rate,
        target_agenda_operational = EXCLUDED.target_agenda_operational,
        target_agenda_planning = EXCLUDED.target_agenda_planning,
        target_agenda_sales = EXCLUDED.target_agenda_sales,
        target_agenda_leadership = EXCLUDED.target_agenda_leadership,
        target_attendance_rate = EXCLUDED.target_attendance_rate,
        target_follow_up_rate = EXCLUDED.target_follow_up_rate,
        target_wait_time = EXCLUDED.target_wait_time,
        target_complaints = EXCLUDED.target_complaints,
        target_leads_min = EXCLUDED.target_leads_min,
        target_leads_max = EXCLUDED.target_leads_max,
        target_revenue_per_cabinet = EXCLUDED.target_revenue_per_cabinet,
        target_plans_adults = EXCLUDED.target_plans_adults,
        target_plans_kids = EXCLUDED.target_plans_kids,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        id, clinicId, parseInt(month), parseInt(year),
        targets.targetRevenue || 0,
        targets.targetAlignersRange?.min || 0,
        targets.targetAlignersRange?.max || 0,
        targets.targetAvgTicket || 0,
        targets.targetAcceptanceRate || 0,
        targets.targetOccupancyRate || 0,
        targets.targetNPS || 0,
        targets.targetIntegrationRate || 0,
        targets.targetAgendaDistribution?.operational || 0,
        targets.targetAgendaDistribution?.planning || 0,
        targets.targetAgendaDistribution?.sales || 0,
        targets.targetAgendaDistribution?.leadership || 0,
        targets.targetAttendanceRate || 0,
        targets.targetFollowUpRate || 0,
        targets.targetWaitTime || 0,
        targets.targetComplaints || 0,
        targets.targetLeadsRange?.min || 0,
        targets.targetLeadsRange?.max || 0,
        targets.targetRevenuePerCabinet || 0,
        targets.targetPlansPresented?.adults || 0,
        targets.targetPlansPresented?.kids || 0
      ]
    )

    console.log('✅ Targets saved successfully')
    res.json({ message: 'Targets saved successfully' })
  } catch (error: any) {
    console.error('❌ Save targets error:', error)
    res.status(500).json({
      error: 'Failed to save targets',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

export default router
