import { Router } from 'express'
import { query } from '../db.js'
import { n8nAuthMiddleware } from '../middleware/n8nAuth.js'

const router = Router()

/**
 * GET /api/n8n/clinics
 * Lista todas as clínicas com relatórios automáticos activos.
 * Usado pelo Loop do n8n para iterar pelas clínicas.
 */
router.get('/clinics', n8nAuthMiddleware, async (req, res) => {
  try {
    const result = await query(`
      SELECT
        id,
        name,
        owner_name,
        kommo_contact_id,
        kommo_subdomain,
        kommo_token,
        owner_whatsapp,
        n8n_report_time
      FROM clinics
      WHERE active = true
        AND n8n_reports_enabled = true
        AND kommo_contact_id IS NOT NULL
        AND kommo_subdomain  IS NOT NULL
        AND kommo_token      IS NOT NULL
      ORDER BY name
    `)

    const clinics = result.rows.map((c) => ({
      id: c.id,
      name: c.name,
      ownerName: c.owner_name,
      kommoContactId: c.kommo_contact_id,
      kommoSubdomain: c.kommo_subdomain,
      kommoToken: c.kommo_token,
      ownerWhatsapp: c.owner_whatsapp,
      reportTime: c.n8n_report_time,
    }))

    res.json(clinics)
  } catch (error) {
    console.error('Error fetching clinics for n8n:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/n8n/daily-report/:clinicId
 * Dados completos para o relatório diário de uma clínica.
 * Query param: ?date=YYYY-MM-DD (default: ontem)
 */
router.get('/daily-report/:clinicId', n8nAuthMiddleware, async (req, res) => {
  try {
    const { clinicId } = req.params
    const dateParam = req.query.date as string | undefined

    // Default: ontem
    const reportDate = dateParam || new Date(Date.now() - 86400000).toISOString().split('T')[0]

    // Extrair ano e mês da data do relatório
    const year = new Date(reportDate).getFullYear()
    const month = new Date(reportDate).getMonth() + 1

    // Executar todas as queries em paralelo
    const [
      clinicResult,
      financialResult,
      monthTargetResult,
      accountsPayableResult,
      monthlyDataResult,
      prospectingResult,
      consultationControlResult,
    ] = await Promise.all([
      // Clinic info
      query(
        'SELECT id, name, owner_name, kommo_contact_id FROM clinics WHERE id = $1',
        [clinicId]
      ),

      // Financial entries (daily totals by payment source)
      query(
        `SELECT
          ps.name as payment_source_name,
          SUM(dfe.value) as total
         FROM daily_financial_entries dfe
         LEFT JOIN clinic_payment_sources ps ON dfe.payment_source_id = ps.id
         WHERE dfe.clinic_id = $1 AND dfe.date = $2
         GROUP BY ps.name`,
        [clinicId, reportDate]
      ),

      // Month target (from monthly_targets table)
      query(
        `SELECT target_revenue
         FROM monthly_targets
         WHERE clinic_id = $1 AND year = $2 AND month = $3`,
        [clinicId, year, month]
      ).catch(() => ({ rows: [] })),

      // Accounts payable counts (overdue, today, week)
      query(
        `SELECT
          COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND paid = false) as overdue,
          COUNT(*) FILTER (WHERE due_date = CURRENT_DATE AND paid = false) as due_today,
          COUNT(*) FILTER (
            WHERE due_date > CURRENT_DATE
              AND due_date <= CURRENT_DATE + INTERVAL '7 days'
              AND paid = false
          ) as due_week
         FROM accounts_payable
         WHERE clinic_id = $1`,
        [clinicId]
      ),

      // Monthly revenue accumulated (SUM from daily_financial_entries)
      query(
        `SELECT COALESCE(SUM(value), 0) as accumulated
         FROM daily_financial_entries
         WHERE clinic_id = $1
           AND EXTRACT(YEAR FROM date::date) = $2
           AND EXTRACT(MONTH FROM date::date) = $3`,
        [clinicId, year, month]
      ).catch(() => ({ rows: [{ accumulated: 0 }] })),

      // Daily prospecting entries
      query(
        `SELECT scheduled, email, sms, whatsapp, instagram, phone, in_person
         FROM daily_prospecting_entries
         WHERE clinic_id = $1 AND date = $2`,
        [clinicId, reportDate]
      ).catch(() => ({ rows: [] })),

      // Daily consultation control entries
      query(
        `SELECT no_show, rescheduled, cancelled, old_patient_booking
         FROM daily_consultation_control_entries
         WHERE clinic_id = $1 AND date = $2`,
        [clinicId, reportDate]
      ).catch(() => ({ rows: [] })),
    ])

    if (clinicResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clinic not found' })
    }

    const clinic = clinicResult.rows[0]

    // Agrupar totais financeiros por tipo de pagamento
    const paymentTypes: any = {
      numerario: 0,
      multibanco: 0,
      cartao: 0,
      seguros: 0,
      outros: 0,
    }

    financialResult.rows.forEach((row) => {
      const name = (row.payment_source_name || '').toLowerCase()
      const value = parseFloat(row.total || '0')

      if (name.includes('numerário') || name.includes('dinheiro')) {
        paymentTypes.numerario += value
      } else if (name.includes('multibanco') || name.includes('transferência')) {
        paymentTypes.multibanco += value
      } else if (name.includes('cartão') || name.includes('card')) {
        paymentTypes.cartao += value
      } else if (name.includes('seguro') || name.includes('insurance')) {
        paymentTypes.seguros += value
      } else {
        paymentTypes.outros += value
      }
    })

    const grandTotal = Object.values(paymentTypes).reduce((sum: number, v: any) => sum + v, 0)

    // Month target and revenue
    const monthRevenue = parseFloat(monthlyDataResult.rows[0]?.accumulated || '0')
    const monthTarget = parseFloat(monthTargetResult.rows[0]?.target_revenue || '0')
    const progressPct = monthTarget > 0 ? Math.round((monthRevenue / monthTarget) * 100) : null

    // Prospecting data — garantir todos os campos sempre presentes
    const p = prospectingResult.rows[0] || {}
    const prospecting = {
      scheduled: parseInt(p.scheduled || 0),
      email: parseInt(p.email || 0),
      sms: parseInt(p.sms || 0),
      whatsapp: parseInt(p.whatsapp || 0),
      instagram: parseInt(p.instagram || 0),
      phone: parseInt(p.phone || 0),
      inPerson: parseInt(p.in_person || 0),
      total: [p.scheduled, p.email, p.sms, p.whatsapp, p.instagram, p.phone, p.in_person]
        .reduce((sum, v) => sum + parseInt(v || 0), 0)
    }

    // Consultation control — garantir todos os campos sempre presentes
    const cc = consultationControlResult.rows[0] || {}
    const consultationControl = {
      noShow: parseInt(cc.no_show || 0),
      rescheduled: parseInt(cc.rescheduled || 0),
      cancelled: parseInt(cc.cancelled || 0),
      oldPatientBooking: parseInt(cc.old_patient_booking || 0)
    }

    // Alerts — contas a pagar detalhadas
    const ap = accountsPayableResult.rows[0] || {}

    const response = {
      clinic: {
        name: clinic.name,
        ownerName: clinic.owner_name,
        kommoContactId: clinic.kommo_contact_id,
      },
      reportDate,
      financial: {
        byPaymentType: paymentTypes,
        grandTotal,
      },
      monthTotal: {
        accumulated: monthRevenue,
        target: monthTarget,
        progressPercent: progressPct,
        remaining: monthTarget > 0 ? Math.max(0, monthTarget - monthRevenue) : null
      },
      monthTarget: {
        target: monthTarget,
        progressPercent: progressPct,
      },
      prospecting,
      consultationControl,
      alerts: {
        overduePayables: parseInt(ap.overdue || 0),
        dueTodayPayables: parseInt(ap.due_today || 0),
        dueWeekPayables: parseInt(ap.due_week || 0),
        pendingOrders: 0,
        pendingTickets: 0,
      },
    }

    res.json(response)
  } catch (error) {
    console.error('Error generating daily report for n8n:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/n8n/weekly-report/:clinicId
 * Dados consolidados mensais/semanais (para relatórios semanais).
 * Retorna: monthly_data do mês corrente + dashboards consolidados.
 */
router.get('/weekly-report/:clinicId', n8nAuthMiddleware, async (req, res) => {
  try {
    const { clinicId } = req.params

    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth() + 1 // 1-indexed

    // Executar queries em paralelo
    const [
      clinicResult,
      monthlyDataResult,
      monthTargetResult,
      pendingTreatmentsResult,
      revenueForecastResult,
    ] = await Promise.all([
      // Clinic info
      query(
        'SELECT id, name, owner_name, kommo_contact_id FROM clinics WHERE id = $1',
        [clinicId]
      ),

      // Monthly data (mês corrente)
      query(
        `SELECT * FROM monthly_data WHERE clinic_id = $1 AND year = $2 AND month = $3`,
        [clinicId, year, month]
      ),

      // Month target
      query(
        'SELECT target_revenue FROM clinics WHERE id = $1',
        [clinicId]
      ),

      // Pending treatments dashboard
      query(
        `SELECT
          COUNT(DISTINCT patient_code) as patient_count,
          COUNT(*) as treatment_count,
          SUM(unit_value * pending_quantity) as total_pending_value
         FROM pending_treatment_patients ptp
         JOIN pending_treatments pt ON ptp.id = pt.patient_id
         WHERE ptp.clinic_id = $1`,
        [clinicId]
      ),

      // Revenue forecast dashboard
      query(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'A_RECEBER') as pending_count,
          SUM(value) FILTER (WHERE status = 'A_RECEBER') as pending_value,
          COUNT(*) FILTER (WHERE status = 'A_RECEBER' AND due_date <= CURRENT_DATE + INTERVAL '30 days') as next30_count,
          SUM(value) FILTER (WHERE status = 'A_RECEBER' AND due_date <= CURRENT_DATE + INTERVAL '30 days') as next30_value,
          COUNT(*) FILTER (WHERE status = 'ATRASADO') as overdue_count,
          SUM(value) FILTER (WHERE status = 'ATRASADO') as overdue_value
         FROM revenue_forecast_installments rfi
         JOIN revenue_forecast_plans rfp ON rfi.plan_id = rfp.id
         WHERE rfp.clinic_id = $1`,
        [clinicId]
      ),
    ])

    if (clinicResult.rows.length === 0) {
      return res.status(404).json({ error: 'Clinic not found' })
    }

    const clinic = clinicResult.rows[0]
    const monthlyData = monthlyDataResult.rows[0] || null
    const target = parseFloat(monthTargetResult.rows[0]?.target_revenue || '0')

    const pendingTreatments = pendingTreatmentsResult.rows[0] || {}
    const revenueForecast = revenueForecastResult.rows[0] || {}

    const response = {
      clinic: {
        name: clinic.name,
        ownerName: clinic.owner_name,
        kommoContactId: clinic.kommo_contact_id,
      },
      period: { year, month },
      monthlyData: monthlyData ? {
        revenueTotal: parseFloat(monthlyData.revenue_total || '0'),
        revenueAligners: parseFloat(monthlyData.revenue_aligners || '0'),
        plansPresented: (monthlyData.plans_presented_adults || 0) + (monthlyData.plans_presented_kids || 0),
        plansAccepted: monthlyData.plans_accepted || 0,
        alignersStarted: monthlyData.aligners_started || 0,
        leads: monthlyData.leads || 0,
        nps: monthlyData.nps || 0,
      } : null,
      monthTarget: {
        target,
        progressPercent: target > 0 && monthlyData
          ? Math.round((parseFloat(monthlyData.revenue_total || '0') / target) * 100)
          : 0,
      },
      pendingTreatments: {
        patientCount: parseInt(pendingTreatments.patient_count || '0'),
        treatmentCount: parseInt(pendingTreatments.treatment_count || '0'),
        totalValue: parseFloat(pendingTreatments.total_pending_value || '0'),
      },
      revenueForecast: {
        totalPending: {
          count: parseInt(revenueForecast.pending_count || '0'),
          value: parseFloat(revenueForecast.pending_value || '0'),
        },
        next30Days: {
          count: parseInt(revenueForecast.next30_count || '0'),
          value: parseFloat(revenueForecast.next30_value || '0'),
        },
        overdue: {
          count: parseInt(revenueForecast.overdue_count || '0'),
          value: parseFloat(revenueForecast.overdue_value || '0'),
        },
      },
    }

    res.json(response)
  } catch (error) {
    console.error('Error generating weekly report for n8n:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
