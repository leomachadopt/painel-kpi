import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// Get monthly data for a clinic
router.get('/:clinicId/:year/:month', async (req, res) => {
  try {
    const { clinicId, year, month } = req.params

    const result = await query(
      `SELECT * FROM monthly_data
       WHERE clinic_id = $1 AND year = $2 AND month = $3`,
      [clinicId, parseInt(year), parseInt(month)]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Monthly data not found' })
    }

    const data = result.rows[0]

    // Get cabinet data
    const cabinetResult = await query(
      `SELECT mcd.*, cc.name
       FROM monthly_cabinet_data mcd
       JOIN clinic_cabinets cc ON mcd.cabinet_id = cc.id
       WHERE mcd.monthly_data_id = $1`,
      [data.id]
    )

    res.json({
      id: data.id,
      clinicId: data.clinic_id,
      month: data.month,
      year: data.year,
      revenueTotal: parseFloat(data.revenue_total),
      revenueAligners: parseFloat(data.revenue_aligners),
      revenuePediatrics: parseFloat(data.revenue_pediatrics),
      revenueDentistry: parseFloat(data.revenue_dentistry),
      revenueOthers: parseFloat(data.revenue_others),
      revenueAcceptedPlans: parseFloat(data.revenue_accepted_plans),
      cabinets: cabinetResult.rows.map((c) => ({
        id: c.cabinet_id,
        name: c.name,
        revenue: parseFloat(c.revenue),
        hoursAvailable: c.hours_available,
        hoursOccupied: c.hours_occupied,
      })),
      plansPresentedAdults: data.plans_presented_adults,
      plansPresentedKids: data.plans_presented_kids,
      plansAccepted: data.plans_accepted,
      alignersStarted: data.aligners_started,
      appointmentsIntegrated: data.appointments_integrated,
      appointmentsTotal: data.appointments_total,
      leads: data.leads,
      firstConsultationsScheduled: data.first_consultations_scheduled,
      firstConsultationsAttended: data.first_consultations_attended,
      plansNotAccepted: data.plans_not_accepted,
      plansNotAcceptedFollowUp: data.plans_not_accepted_follow_up,
      avgWaitTime: data.avg_wait_time,
      agendaOwner: {
        operational: parseFloat(data.agenda_owner_operational),
        planning: parseFloat(data.agenda_owner_planning),
        sales: parseFloat(data.agenda_owner_sales),
        leadership: parseFloat(data.agenda_owner_leadership),
      },
      nps: data.nps,
      referralsSpontaneous: data.referrals_spontaneous,
      referralsBase2025: data.referrals_base_2025,
      complaints: data.complaints,
      expenses: parseFloat(data.expenses),
      marketingCost: parseFloat(data.marketing_cost),
      revenueByCategory: data.revenue_by_category,
      leadsByChannel: data.leads_by_channel,
      sourceDistribution: data.source_distribution,
      campaignDistribution: data.campaign_distribution,
      delayReasons: data.delay_reasons,
      entryCounts: data.entry_counts,
    })
  } catch (error) {
    console.error('Get monthly data error:', error)
    res.status(500).json({ error: 'Failed to fetch monthly data' })
  }
})

// Get all monthly data for a clinic and year
router.get('/:clinicId/:year', async (req, res) => {
  try {
    const { clinicId, year } = req.params

    const result = await query(
      `SELECT * FROM monthly_data
       WHERE clinic_id = $1 AND year = $2
       ORDER BY month`,
      [clinicId, parseInt(year)]
    )

    const monthlyData = await Promise.all(
      result.rows.map(async (data) => {
        const cabinetResult = await query(
          `SELECT mcd.*, cc.name
           FROM monthly_cabinet_data mcd
           JOIN clinic_cabinets cc ON mcd.cabinet_id = cc.id
           WHERE mcd.monthly_data_id = $1`,
          [data.id]
        )

        return {
          id: data.id,
          clinicId: data.clinic_id,
          month: data.month,
          year: data.year,
          revenueTotal: parseFloat(data.revenue_total),
          revenueAligners: parseFloat(data.revenue_aligners),
          revenuePediatrics: parseFloat(data.revenue_pediatrics),
          revenueDentistry: parseFloat(data.revenue_dentistry),
          revenueOthers: parseFloat(data.revenue_others),
          revenueAcceptedPlans: parseFloat(data.revenue_accepted_plans),
          cabinets: cabinetResult.rows.map((c) => ({
            id: c.cabinet_id,
            name: c.name,
            revenue: parseFloat(c.revenue),
            hoursAvailable: c.hours_available,
            hoursOccupied: c.hours_occupied,
          })),
          plansPresentedAdults: data.plans_presented_adults,
          plansPresentedKids: data.plans_presented_kids,
          plansAccepted: data.plans_accepted,
          alignersStarted: data.aligners_started,
          appointmentsIntegrated: data.appointments_integrated,
          appointmentsTotal: data.appointments_total,
          leads: data.leads,
          firstConsultationsScheduled: data.first_consultations_scheduled,
          firstConsultationsAttended: data.first_consultations_attended,
          plansNotAccepted: data.plans_not_accepted,
          plansNotAcceptedFollowUp: data.plans_not_accepted_follow_up,
          avgWaitTime: data.avg_wait_time,
          agendaOwner: {
            operational: parseFloat(data.agenda_owner_operational),
            planning: parseFloat(data.agenda_owner_planning),
            sales: parseFloat(data.agenda_owner_sales),
            leadership: parseFloat(data.agenda_owner_leadership),
          },
          nps: data.nps,
          referralsSpontaneous: data.referrals_spontaneous,
          referralsBase2025: data.referrals_base_2025,
          complaints: data.complaints,
          expenses: parseFloat(data.expenses),
          marketingCost: parseFloat(data.marketing_cost),
          revenueByCategory: data.revenue_by_category,
          leadsByChannel: data.leads_by_channel,
          sourceDistribution: data.source_distribution,
          campaignDistribution: data.campaign_distribution,
          delayReasons: data.delay_reasons,
          entryCounts: data.entry_counts,
        }
      })
    )

    res.json(monthlyData)
  } catch (error) {
    console.error('Get monthly data error:', error)
    res.status(500).json({ error: 'Failed to fetch monthly data' })
  }
})

export default router
