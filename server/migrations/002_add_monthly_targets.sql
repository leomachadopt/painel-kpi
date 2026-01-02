-- Migration to add monthly_targets table
CREATE TABLE IF NOT EXISTS monthly_targets (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  target_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  target_aligners_min INTEGER NOT NULL DEFAULT 0,
  target_aligners_max INTEGER NOT NULL DEFAULT 0,
  target_avg_ticket DECIMAL(12, 2) NOT NULL DEFAULT 0,
  target_acceptance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_occupancy_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_nps INTEGER NOT NULL DEFAULT 0,
  target_integration_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_agenda_operational DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_agenda_planning DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_agenda_sales DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_agenda_leadership DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_attendance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_follow_up_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_wait_time INTEGER NOT NULL DEFAULT 0,
  target_complaints INTEGER NOT NULL DEFAULT 0,
  target_leads_min INTEGER NOT NULL DEFAULT 0,
  target_leads_max INTEGER NOT NULL DEFAULT 0,
  target_revenue_per_cabinet DECIMAL(12, 2) NOT NULL DEFAULT 0,
  target_plans_adults INTEGER NOT NULL DEFAULT 0,
  target_plans_kids INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(clinic_id, month, year)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_monthly_targets_clinic_date ON monthly_targets(clinic_id, year, month);
