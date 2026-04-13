-- Migration: Add marketing_reports table for monthly automated PDF reports
-- This stores generated marketing reports with metadata

CREATE TABLE IF NOT EXISTS marketing_reports (
  id SERIAL PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,

  -- Report period
  report_month DATE NOT NULL, -- First day of the month being reported
  report_type VARCHAR(50) DEFAULT 'MONTHLY' CHECK (report_type IN ('MONTHLY', 'CUSTOM')),

  -- Date range for custom reports
  period_start DATE,
  period_end DATE,

  -- PDF storage
  pdf_url VARCHAR(500),
  pdf_size INTEGER, -- bytes

  -- Generation metadata
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generated_by VARCHAR(255), -- user_id if manually generated

  -- Email tracking
  sent_at TIMESTAMP,
  sent_to TEXT, -- comma-separated emails

  -- Report data snapshot (JSON with all metrics)
  report_data JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Unique constraint: one report per clinic per month
  UNIQUE(clinic_id, report_month, report_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_clinic ON marketing_reports(clinic_id);
CREATE INDEX IF NOT EXISTS idx_reports_month ON marketing_reports(report_month DESC);
CREATE INDEX IF NOT EXISTS idx_reports_generated ON marketing_reports(generated_at DESC);
