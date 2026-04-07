-- Migration 095: Dashboard Metrics - Phase 2: Agenda Efficiency
-- Created: 2026-04-07
-- Purpose: Create optimized views for agenda/schedule efficiency metrics

-- =====================================================
-- VIEW 1: Schedule Occupancy (Taxa de Ocupação)
-- =====================================================
CREATE OR REPLACE VIEW v_schedule_occupancy AS
SELECT
  clinic_id,
  -- Current month stats
  SUM(
    CASE WHEN date >= date_trunc('month', CURRENT_DATE) AND status = 'completed'
      THEN EXTRACT(EPOCH FROM (actual_end - actual_start))/3600
      ELSE 0
    END
  ) as current_month_hours_used,
  SUM(
    CASE WHEN date >= date_trunc('month', CURRENT_DATE) AND status = 'completed'
      THEN EXTRACT(EPOCH FROM (scheduled_end - scheduled_start))/3600
      ELSE 0
    END
  ) as current_month_hours_scheduled,
  -- Current week stats
  SUM(
    CASE WHEN date >= date_trunc('week', CURRENT_DATE) AND status = 'completed'
      THEN EXTRACT(EPOCH FROM (actual_end - actual_start))/3600
      ELSE 0
    END
  ) as current_week_hours_used,
  SUM(
    CASE WHEN date >= date_trunc('week', CURRENT_DATE) AND status = 'completed'
      THEN EXTRACT(EPOCH FROM (scheduled_end - scheduled_start))/3600
      ELSE 0
    END
  ) as current_week_hours_scheduled,
  -- Today stats
  SUM(
    CASE WHEN date = CURRENT_DATE AND status = 'completed'
      THEN EXTRACT(EPOCH FROM (actual_end - actual_start))/3600
      ELSE 0
    END
  ) as today_hours_used,
  SUM(
    CASE WHEN date = CURRENT_DATE AND status = 'completed'
      THEN EXTRACT(EPOCH FROM (scheduled_end - scheduled_start))/3600
      ELSE 0
    END
  ) as today_hours_scheduled
FROM appointments
GROUP BY clinic_id;

-- =====================================================
-- VIEW 2: Wait Times (Tempo de Espera)
-- =====================================================
CREATE OR REPLACE VIEW v_wait_times AS
SELECT
  clinic_id,
  -- Current month average wait time
  AVG(
    CASE WHEN date >= date_trunc('month', CURRENT_DATE)
      AND actual_arrival IS NOT NULL
      AND actual_start IS NOT NULL
      THEN EXTRACT(EPOCH FROM (actual_start - actual_arrival))/60
    END
  ) as avg_wait_minutes_month,
  -- Current week average wait time
  AVG(
    CASE WHEN date >= date_trunc('week', CURRENT_DATE)
      AND actual_arrival IS NOT NULL
      AND actual_start IS NOT NULL
      THEN EXTRACT(EPOCH FROM (actual_start - actual_arrival))/60
    END
  ) as avg_wait_minutes_week,
  -- Count of appointments with wait time data
  COUNT(
    CASE WHEN date >= date_trunc('month', CURRENT_DATE)
      AND actual_arrival IS NOT NULL
      AND actual_start IS NOT NULL
    THEN 1 END
  ) as month_wait_data_count
FROM appointments
GROUP BY clinic_id;

-- =====================================================
-- VIEW 3: Delay Reasons (Motivos de Atraso)
-- =====================================================
CREATE OR REPLACE VIEW v_delay_reasons AS
SELECT
  clinic_id,
  delay_reason,
  COUNT(*) as count,
  AVG(
    CASE WHEN actual_start IS NOT NULL AND scheduled_start IS NOT NULL
      THEN EXTRACT(EPOCH FROM (actual_start - (date + scheduled_start)))/60
    END
  ) as avg_delay_minutes
FROM appointments
WHERE date >= date_trunc('month', CURRENT_DATE)
  AND delay_reason IS NOT NULL
GROUP BY clinic_id, delay_reason;

-- =====================================================
-- VIEW 4: Appointment Conversion Rate
-- =====================================================
CREATE OR REPLACE VIEW v_appointment_conversion AS
SELECT
  a.clinic_id,
  -- Total appointments
  COUNT(*) as total_appointments,
  -- Completed appointments
  COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
  -- Completed with consultation entry
  COUNT(
    CASE WHEN a.status = 'completed'
      AND EXISTS (
        SELECT 1 FROM daily_consultation_entries dce
        WHERE dce.id = a.consultation_entry_id
          AND dce.consultation_completed = true
      )
    THEN 1 END
  ) as completed_with_entry,
  -- No-shows
  COUNT(CASE WHEN a.status = 'no_show' THEN 1 END) as no_shows,
  -- Cancelled
  COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled,
  -- Rescheduled
  COUNT(CASE WHEN a.status = 'rescheduled' THEN 1 END) as rescheduled
FROM appointments a
WHERE a.date >= date_trunc('month', CURRENT_DATE)
GROUP BY a.clinic_id;

-- =====================================================
-- VIEW 5: Average Duration by Appointment Type
-- =====================================================
CREATE OR REPLACE VIEW v_avg_duration_by_type AS
SELECT
  a.clinic_id,
  at.name as appointment_type,
  at.id as appointment_type_id,
  COUNT(*) as count,
  AVG(
    CASE WHEN a.actual_end IS NOT NULL AND a.actual_start IS NOT NULL
      THEN EXTRACT(EPOCH FROM (a.actual_end - a.actual_start))/60
    END
  ) as avg_actual_duration_minutes,
  AVG(
    EXTRACT(EPOCH FROM (a.scheduled_end - a.scheduled_start))/60
  ) as avg_scheduled_duration_minutes
FROM appointments a
LEFT JOIN appointment_types at ON a.appointment_type_id = at.id
WHERE a.date >= date_trunc('month', CURRENT_DATE)
  AND a.status = 'completed'
GROUP BY a.clinic_id, at.id, at.name;

-- =====================================================
-- VIEW 6: Occupancy by Doctor
-- =====================================================
CREATE OR REPLACE VIEW v_occupancy_by_doctor AS
SELECT
  a.clinic_id,
  a.doctor_id,
  cd.name as doctor_name,
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
  SUM(
    CASE WHEN a.status = 'completed' AND a.actual_end IS NOT NULL AND a.actual_start IS NOT NULL
      THEN EXTRACT(EPOCH FROM (a.actual_end - a.actual_start))/3600
      ELSE 0
    END
  ) as hours_used,
  SUM(
    CASE WHEN a.status = 'completed'
      THEN EXTRACT(EPOCH FROM (a.scheduled_end - a.scheduled_start))/3600
      ELSE 0
    END
  ) as hours_scheduled
FROM appointments a
LEFT JOIN clinic_doctors cd ON a.doctor_id = cd.id
WHERE a.date >= date_trunc('month', CURRENT_DATE)
GROUP BY a.clinic_id, a.doctor_id, cd.name;

-- =====================================================
-- VIEW 7: Occupancy by Cabinet
-- =====================================================
CREATE OR REPLACE VIEW v_occupancy_by_cabinet AS
SELECT
  a.clinic_id,
  a.cabinet_id,
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
  SUM(
    CASE WHEN a.status = 'completed' AND a.actual_end IS NOT NULL AND a.actual_start IS NOT NULL
      THEN EXTRACT(EPOCH FROM (a.actual_end - a.actual_start))/3600
      ELSE 0
    END
  ) as hours_used,
  SUM(
    CASE WHEN a.status = 'completed'
      THEN EXTRACT(EPOCH FROM (a.scheduled_end - a.scheduled_start))/3600
      ELSE 0
    END
  ) as hours_scheduled
FROM appointments a
WHERE a.date >= date_trunc('month', CURRENT_DATE)
  AND a.cabinet_id IS NOT NULL
GROUP BY a.clinic_id, a.cabinet_id;

-- =====================================================
-- VIEW 8: Hourly Distribution (Peak Hours)
-- =====================================================
CREATE OR REPLACE VIEW v_hourly_distribution AS
SELECT
  clinic_id,
  EXTRACT(HOUR FROM scheduled_start) as hour,
  COUNT(*) as total_appointments,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_appointments,
  COUNT(CASE WHEN status = 'no_show' THEN 1 END) as no_shows,
  AVG(
    CASE WHEN status = 'completed' AND actual_end IS NOT NULL AND actual_start IS NOT NULL
      THEN EXTRACT(EPOCH FROM (actual_end - actual_start))/60
    END
  ) as avg_duration_minutes
FROM appointments
WHERE date >= date_trunc('month', CURRENT_DATE)
GROUP BY clinic_id, EXTRACT(HOUR FROM scheduled_start);

-- =====================================================
-- VIEW 9: Confirmation Rate
-- =====================================================
CREATE OR REPLACE VIEW v_confirmation_rate AS
SELECT
  clinic_id,
  -- Future appointments
  COUNT(CASE WHEN date >= CURRENT_DATE THEN 1 END) as future_appointments,
  -- Confirmed future appointments
  COUNT(
    CASE WHEN date >= CURRENT_DATE AND confirmed_at IS NOT NULL
    THEN 1 END
  ) as confirmed_future,
  -- Average hours to confirm
  AVG(
    CASE WHEN confirmed_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (confirmed_at - created_at))/3600
    END
  ) as avg_hours_to_confirm
FROM appointments
WHERE date >= date_trunc('month', CURRENT_DATE)
GROUP BY clinic_id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date ON appointments(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_date ON appointments(doctor_id, date);
CREATE INDEX IF NOT EXISTS idx_appointments_cabinet_date ON appointments(cabinet_id, date) WHERE cabinet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_appointments_type_date ON appointments(appointment_type_id, date);
