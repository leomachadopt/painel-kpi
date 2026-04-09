import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';

const router = Router();

// ============================================================
// ENDPOINT 1: Guaranteed Revenue (Receita Garantida)
// GET /api/clinics/:clinicId/metrics/guaranteed-revenue
// ============================================================
router.get('/:clinicId/metrics/guaranteed-revenue', async (req, res) => {
  try {
    const { clinicId } = req.params;

    // Get summary from view
    const summaryResult = await query(`
      SELECT * FROM v_guaranteed_revenue
      WHERE clinic_id = $1
    `, [clinicId]);
    const summary = summaryResult.rows[0];

    // If no data exists for this clinic, return empty/zero values
    if (!summary) {
      return res.json({
        next30Days: { total: 0 },
        next60Days: { total: 0 },
        next90Days: { total: 0 },
        overdue: { amount: 0, count: 0 },
        receivable: { amount: 0, count: 0 },
        receivedMonth: { amount: 0, count: 0 },
        installments: [],
      });
    }

    // Get detailed installments breakdown
    const installmentsResult = await query(`
      SELECT
        id,
        revenue_plan_id,
        installment_number,
        due_date,
        value,
        status,
        received_date,
        CURRENT_DATE - due_date::date as days_overdue
      FROM revenue_installments
      WHERE clinic_id = $1
        AND status IN ('A_RECEBER', 'ATRASADO')
      ORDER BY due_date ASC
      LIMIT 50
    `, [clinicId]);
    const installments = installmentsResult.rows;

    res.json({
      next30Days: {
        total: parseFloat(summary.next_30_days) || 0,
      },
      next60Days: {
        total: parseFloat(summary.next_60_days) || 0,
      },
      next90Days: {
        total: parseFloat(summary.next_90_days) || 0,
      },
      overdue: {
        amount: parseFloat(summary.overdue_amount) || 0,
        count: parseInt(summary.overdue_count) || 0,
      },
      receivable: {
        amount: parseFloat(summary.receivable_amount) || 0,
        count: parseInt(summary.receivable_count) || 0,
      },
      receivedMonth: {
        amount: parseFloat(summary.received_month_amount) || 0,
        count: parseInt(summary.received_month_count) || 0,
      },
      installments: installments.map(i => ({
        id: i.id,
        revenuePlanId: i.revenue_plan_id,
        installmentNumber: i.installment_number,
        dueDate: i.due_date,
        value: parseFloat(i.value),
        status: i.status,
        receivedDate: i.received_date,
        daysOverdue: i.days_overdue || 0,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching guaranteed revenue:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 2: Pending Treatments Summary (Tratamentos Pendentes)
// GET /api/clinics/:clinicId/metrics/pending-treatments
// ============================================================
router.get('/:clinicId/metrics/pending-treatments', async (req, res) => {
  try {
    const { clinicId } = req.params;

    // Get summary from view
    const summaryResult = await query(`
      SELECT * FROM v_pending_treatments_summary
      WHERE clinic_id = $1
    `, [clinicId]);
    const summary = summaryResult.rows[0];

    if (!summary) {
      return res.json({
        totalValue: 0,
        numPatients: 0,
        numTreatments: 0,
        pending: { value: 0, count: 0 },
        partial: { value: 0, count: 0 },
        topPatients: [],
      });
    }

    // Get top patients with pending treatments
    const topPatientsResult = await query(`
      SELECT
        ptp.id,
        ptp.patient_code,
        ptp.patient_name,
        SUM(pt.pending_value) as total_pending_value,
        COUNT(pt.id) as num_treatments
      FROM pending_treatment_patients ptp
      INNER JOIN pending_treatments pt ON pt.pending_treatment_patient_id = ptp.id
      WHERE ptp.clinic_id = $1
        AND pt.status IN ('PENDENTE', 'PARCIAL')
      GROUP BY ptp.id, ptp.patient_code, ptp.patient_name
      ORDER BY total_pending_value DESC
      LIMIT 10
    `, [clinicId]);
    const topPatients = topPatientsResult.rows;

    res.json({
      totalValue: parseFloat(summary.total_pending_value) || 0,
      numPatients: parseInt(summary.num_patients) || 0,
      numTreatments: parseInt(summary.num_treatments) || 0,
      pending: {
        value: parseFloat(summary.pending_value) || 0,
        count: parseInt(summary.pending_count) || 0,
      },
      partial: {
        value: parseFloat(summary.partial_value) || 0,
        count: parseInt(summary.partial_count) || 0,
      },
      topPatients: topPatients.map(p => ({
        id: p.id,
        patientCode: p.patient_code,
        patientName: p.patient_name,
        totalPendingValue: parseFloat(p.total_pending_value),
        numTreatments: parseInt(p.num_treatments),
      })),
    });
  } catch (error: any) {
    console.error('Error fetching pending treatments:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 3: Plan Conversion Rate
// GET /api/clinics/:clinicId/metrics/plan-conversion-rate
// ============================================================
router.get('/:clinicId/metrics/plan-conversion-rate', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_plan_conversion_rate
      WHERE clinic_id = $1
    `, [clinicId]);
    const data = result.rows[0];

    if (!data) {
      return res.json({
        conversionRate: 0,
        change: 0,
        trend: 'up',
        thisMonth: { presented: 0, inExecution: 0, completed: 0 },
        previousMonth: { presented: 0, inExecution: 0, conversionRate: 0 },
        currentStatus: { waiting: 0, executing: 0 },
      });
    }

    // Calculate previous month conversion rate
    const prevMonthConversionRate = data.plans_presented_prev_month > 0
      ? (data.plans_in_execution_prev_month * 100.0) / data.plans_presented_prev_month
      : 0;

    const currentMonthRate = parseFloat(data.conversion_rate_month) || 0;
    const change = currentMonthRate - prevMonthConversionRate;

    res.json({
      conversionRate: currentMonthRate,
      change: change,
      trend: change >= 0 ? 'up' : 'down',
      thisMonth: {
        presented: parseInt(data.plans_presented_month) || 0,
        inExecution: parseInt(data.plans_in_execution_month) || 0,
        completed: parseInt(data.plans_completed_month) || 0,
      },
      previousMonth: {
        presented: parseInt(data.plans_presented_prev_month) || 0,
        inExecution: parseInt(data.plans_in_execution_prev_month) || 0,
        conversionRate: prevMonthConversionRate,
      },
      currentStatus: {
        waiting: parseInt(data.plans_waiting) || 0,
        executing: parseInt(data.plans_executing) || 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching plan conversion rate:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 4: Plans At Risk
// GET /api/clinics/:clinicId/metrics/plans-at-risk
// ============================================================
router.get('/:clinicId/metrics/plans-at-risk', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_plans_at_risk
      WHERE clinic_id = $1
      ORDER BY days_since_last_activity DESC, pending_value DESC
    `, [clinicId]);
    const plans = result.rows;

    // Group by risk type
    const byRiskType = {
      waiting_too_long: 0,
      stagnated: 0,
      low_progress: 0,
      unknown: 0,
    };

    plans.forEach(p => {
      if (p.risk_type in byRiskType) {
        byRiskType[p.risk_type as keyof typeof byRiskType]++;
      }
    });

    // Get suggested actions
    const getSuggestedAction = (riskType: string, daysSinceLastActivity: number) => {
      switch (riskType) {
        case 'waiting_too_long':
          return daysSinceLastActivity > 14
            ? 'Ligar urgentemente para agendar primeira sessão'
            : 'Entrar em contato para agendar primeira sessão';
        case 'stagnated':
          return 'Verificar satisfação do paciente e reagendar próxima sessão';
        case 'low_progress':
          return 'Revisar plano de tratamento e motivar continuidade';
        default:
          return 'Verificar status do plano';
      }
    };

    res.json({
      totalAtRisk: plans.length,
      byRiskType,
      plans: plans.map(p => ({
        id: p.id,
        patientName: p.patient_name,
        patientCode: p.patient_code,
        pendingValue: parseFloat(p.pending_value) || 0,
        planProceduresTotal: parseInt(p.plan_procedures_total) || 0,
        planProceduresCompleted: parseInt(p.plan_procedures_completed) || 0,
        completionRate: parseFloat(p.completion_rate) || 0,
        riskType: p.risk_type,
        daysSinceLastActivity: p.days_since_last_activity || 0,
        suggestedAction: getSuggestedAction(p.risk_type, p.days_since_last_activity),
        timestamps: {
          planCreated: p.plan_created_at,
          planPresented: p.plan_presented_at,
          waitingStart: p.waiting_start_at,
          inExecution: p.in_execution_at,
        },
      })),
    });
  } catch (error: any) {
    console.error('Error fetching plans at risk:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PHASE 2: AGENDA EFFICIENCY METRICS
// ============================================================

// ============================================================
// ENDPOINT 5: Schedule Occupancy (Taxa de Ocupação)
// GET /api/clinics/:clinicId/metrics/schedule-occupancy
// ============================================================
router.get('/:clinicId/metrics/schedule-occupancy', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_schedule_occupancy
      WHERE clinic_id = $1
    `, [clinicId]);
    const summary = result.rows[0];

    if (!summary) {
      return res.json({
        currentMonth: { hoursUsed: 0, hoursScheduled: 0, occupancyRate: 0 },
        currentWeek: { hoursUsed: 0, hoursScheduled: 0, occupancyRate: 0 },
        today: { hoursUsed: 0, hoursScheduled: 0, occupancyRate: 0 },
      });
    }

    const calcRate = (used: number, scheduled: number) =>
      scheduled > 0 ? (used / scheduled) * 100 : 0;

    res.json({
      currentMonth: {
        hoursUsed: parseFloat(summary.current_month_hours_used) || 0,
        hoursScheduled: parseFloat(summary.current_month_hours_scheduled) || 0,
        occupancyRate: calcRate(
          parseFloat(summary.current_month_hours_used) || 0,
          parseFloat(summary.current_month_hours_scheduled) || 0
        ),
      },
      currentWeek: {
        hoursUsed: parseFloat(summary.current_week_hours_used) || 0,
        hoursScheduled: parseFloat(summary.current_week_hours_scheduled) || 0,
        occupancyRate: calcRate(
          parseFloat(summary.current_week_hours_used) || 0,
          parseFloat(summary.current_week_hours_scheduled) || 0
        ),
      },
      today: {
        hoursUsed: parseFloat(summary.today_hours_used) || 0,
        hoursScheduled: parseFloat(summary.today_hours_scheduled) || 0,
        occupancyRate: calcRate(
          parseFloat(summary.today_hours_used) || 0,
          parseFloat(summary.today_hours_scheduled) || 0
        ),
      },
    });
  } catch (error: any) {
    console.error('Error fetching schedule occupancy:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 6: Wait Times (Tempo de Espera)
// GET /api/clinics/:clinicId/metrics/wait-times
// ============================================================
router.get('/:clinicId/metrics/wait-times', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_wait_times
      WHERE clinic_id = $1
    `, [clinicId]);
    const data = result.rows[0];

    if (!data) {
      return res.json({
        avgWaitMinutesMonth: 0,
        avgWaitMinutesWeek: 0,
        dataCount: 0,
      });
    }

    res.json({
      avgWaitMinutesMonth: parseFloat(data.avg_wait_minutes_month) || 0,
      avgWaitMinutesWeek: parseFloat(data.avg_wait_minutes_week) || 0,
      dataCount: parseInt(data.month_wait_data_count) || 0,
    });
  } catch (error: any) {
    console.error('Error fetching wait times:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 7: Delay Reasons (Motivos de Atraso)
// GET /api/clinics/:clinicId/metrics/delay-reasons
// ============================================================
router.get('/:clinicId/metrics/delay-reasons', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_delay_reasons
      WHERE clinic_id = $1
      ORDER BY count DESC
    `, [clinicId]);
    const data = result.rows;

    const total = data.reduce((sum, d) => sum + parseInt(d.count), 0);

    res.json({
      total,
      byReason: data.map(d => ({
        reason: d.delay_reason,
        count: parseInt(d.count),
        percentage: total > 0 ? (parseInt(d.count) / total) * 100 : 0,
        avgDelayMinutes: parseFloat(d.avg_delay_minutes) || 0,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching delay reasons:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 8: Appointment Conversion Rate
// GET /api/clinics/:clinicId/metrics/appointment-conversion
// ============================================================
router.get('/:clinicId/metrics/appointment-conversion', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_appointment_conversion
      WHERE clinic_id = $1
    `, [clinicId]);
    const data = result.rows[0];

    if (!data) {
      return res.json({
        totalAppointments: 0,
        completedAppointments: 0,
        completedWithEntry: 0,
        noShows: 0,
        cancelled: 0,
        rescheduled: 0,
        completionRate: 0,
        conversionRate: 0,
      });
    }

    const total = parseInt(data.total_appointments) || 0;
    const completed = parseInt(data.completed_appointments) || 0;
    const withEntry = parseInt(data.completed_with_entry) || 0;

    res.json({
      totalAppointments: total,
      completedAppointments: completed,
      completedWithEntry: withEntry,
      noShows: parseInt(data.no_shows) || 0,
      cancelled: parseInt(data.cancelled) || 0,
      rescheduled: parseInt(data.rescheduled) || 0,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      conversionRate: completed > 0 ? (withEntry / completed) * 100 : 0,
    });
  } catch (error: any) {
    console.error('Error fetching appointment conversion:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 9: Occupancy by Doctor
// GET /api/clinics/:clinicId/metrics/occupancy-by-doctor
// ============================================================
router.get('/:clinicId/metrics/occupancy-by-doctor', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_occupancy_by_doctor
      WHERE clinic_id = $1
      ORDER BY hours_used DESC
    `, [clinicId]);
    const data = result.rows;

    res.json({
      doctors: data.map(d => ({
        doctorId: d.doctor_id,
        doctorName: d.doctor_name,
        totalAppointments: parseInt(d.total_appointments) || 0,
        completedAppointments: parseInt(d.completed_appointments) || 0,
        hoursUsed: parseFloat(d.hours_used) || 0,
        hoursScheduled: parseFloat(d.hours_scheduled) || 0,
        occupancyRate:
          parseFloat(d.hours_scheduled) > 0
            ? (parseFloat(d.hours_used) / parseFloat(d.hours_scheduled)) * 100
            : 0,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching occupancy by doctor:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 10: Hourly Distribution (Horários Mais Produtivos)
// GET /api/clinics/:clinicId/metrics/hourly-distribution
// ============================================================
router.get('/:clinicId/metrics/hourly-distribution', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_hourly_distribution
      WHERE clinic_id = $1
      ORDER BY hour ASC
    `, [clinicId]);
    const data = result.rows;

    res.json({
      hourly: data.map(h => ({
        hour: parseInt(h.hour),
        totalAppointments: parseInt(h.total_appointments) || 0,
        completedAppointments: parseInt(h.completed_appointments) || 0,
        noShows: parseInt(h.no_shows) || 0,
        avgDurationMinutes: parseFloat(h.avg_duration_minutes) || 0,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching hourly distribution:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PHASE 3: MARKETING & ACQUISITION METRICS
// ============================================================

// ============================================================
// ENDPOINT 11: Conversion Funnel
// GET /api/clinics/:clinicId/metrics/conversion-funnel
// ============================================================
router.get('/:clinicId/metrics/conversion-funnel', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_conversion_funnel
      WHERE clinic_id = $1
    `, [clinicId]);
    const data = result.rows[0];

    if (!data) {
      return res.json({
        contactsThisMonth: 0,
        firstConsultationsThisMonth: 0,
        plansCreatedThisMonth: 0,
        plansPresentedThisMonth: 0,
        plansInExecutionThisMonth: 0,
        contactsPrevMonth: 0,
        firstConsultationsPrevMonth: 0,
        plansCreatedPrevMonth: 0,
        plansInExecutionPrevMonth: 0,
      });
    }

    res.json({
      contactsThisMonth: parseInt(data.contacts_this_month) || 0,
      firstConsultationsThisMonth: parseInt(data.first_consultations_this_month) || 0,
      plansCreatedThisMonth: parseInt(data.plans_created_this_month) || 0,
      plansPresentedThisMonth: parseInt(data.plans_presented_this_month) || 0,
      plansInExecutionThisMonth: parseInt(data.plans_in_execution_this_month) || 0,
      contactsPrevMonth: parseInt(data.contacts_prev_month) || 0,
      firstConsultationsPrevMonth: parseInt(data.first_consultations_prev_month) || 0,
      plansCreatedPrevMonth: parseInt(data.plans_created_prev_month) || 0,
      plansInExecutionPrevMonth: parseInt(data.plans_in_execution_prev_month) || 0,
    });
  } catch (error: any) {
    console.error('Error fetching conversion funnel:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 12: Source Performance
// GET /api/clinics/:clinicId/metrics/source-performance
// ============================================================
router.get('/:clinicId/metrics/source-performance', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_source_performance
      WHERE clinic_id = $1
      ORDER BY total_patients DESC, total_plan_value DESC
    `, [clinicId]);
    const data = result.rows;

    res.json({
      sources: data.map(s => {
        const last3m = parseInt(s.first_consult_last_3m) || 0;
        const prev3m = parseInt(s.first_consult_prev_3m) || 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (last3m > prev3m) trend = 'up';
        else if (last3m < prev3m) trend = 'down';

        return {
          sourceId: s.source_id,
          sourceName: s.source_name || 'Sem nome',
          totalPatients: parseInt(s.total_patients) || 0,
          firstConsultations: parseInt(s.first_consultations) || 0,
          plansCreated: parseInt(s.plans_created) || 0,
          plansPresented: parseInt(s.plans_presented) || 0,
          plansInExecution: parseInt(s.plans_in_execution) || 0,
          totalPlanValue: parseFloat(s.total_plan_value) || 0,
          avgPlanValue: parseFloat(s.avg_plan_value) || 0,
          firstConsultLast3m: last3m,
          firstConsultPrev3m: prev3m,
          trend,
        };
      }),
    });
  } catch (error: any) {
    console.error('Error fetching source performance:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 13: Acquisition Trends
// GET /api/clinics/:clinicId/metrics/acquisition-trends
// ============================================================
router.get('/:clinicId/metrics/acquisition-trends', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_acquisition_trends
      WHERE clinic_id = $1
      ORDER BY month DESC
      LIMIT 6
    `, [clinicId]);
    const data = result.rows;

    res.json({
      trends: data.map(t => ({
        month: t.month,
        newPatients: parseInt(t.new_patients) || 0,
        plansPresented: parseInt(t.plans_presented) || 0,
        plansStarted: parseInt(t.plans_started) || 0,
        totalValuePresented: parseFloat(t.total_value_presented) || 0,
      })),
    });
  } catch (error: any) {
    console.error('Error fetching acquisition trends:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ENDPOINT 14: Prospecting Pipeline
// GET /api/clinics/:clinicId/metrics/prospecting-pipeline
// ============================================================
router.get('/:clinicId/metrics/prospecting-pipeline', async (req, res) => {
  try {
    const { clinicId } = req.params;

    const result = await query(`
      SELECT * FROM v_prospecting_pipeline
      WHERE clinic_id = $1
    `, [clinicId]);
    const data = result.rows[0];

    if (!data) {
      return res.json({
        scheduledMonth: 0,
        phoneMonth: 0,
        whatsappMonth: 0,
        emailMonth: 0,
        smsMonth: 0,
        instagramMonth: 0,
        inPersonMonth: 0,
        totalContactsMonth: 0,
        scheduledWeek: 0,
        phoneWeek: 0,
        whatsappWeek: 0,
        inPersonWeek: 0,
        totalContactsWeek: 0,
        totalContactsPrevMonth: 0,
      });
    }

    res.json({
      scheduledMonth: parseInt(data.scheduled_month) || 0,
      phoneMonth: parseInt(data.phone_month) || 0,
      whatsappMonth: parseInt(data.whatsapp_month) || 0,
      emailMonth: parseInt(data.email_month) || 0,
      smsMonth: parseInt(data.sms_month) || 0,
      instagramMonth: parseInt(data.instagram_month) || 0,
      inPersonMonth: parseInt(data.in_person_month) || 0,
      totalContactsMonth: parseInt(data.total_contacts_month) || 0,
      scheduledWeek: parseInt(data.scheduled_week) || 0,
      phoneWeek: parseInt(data.phone_week) || 0,
      whatsappWeek: parseInt(data.whatsapp_week) || 0,
      inPersonWeek: parseInt(data.in_person_week) || 0,
      totalContactsWeek: parseInt(data.total_contacts_week) || 0,
      totalContactsPrevMonth: parseInt(data.total_contacts_prev_month) || 0,
    });
  } catch (error: any) {
    console.error('Error fetching prospecting pipeline:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
