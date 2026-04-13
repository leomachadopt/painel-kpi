-- Migration: Add marketing_metrics_daily table for storing daily Instagram metrics
-- This allows historical tracking beyond Instagram API's 30-day limit

CREATE TABLE IF NOT EXISTS marketing_metrics_daily (
  id SERIAL PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('META', 'GBP', 'RANK_TRACKER')),
  metric_date DATE NOT NULL,

  -- Instagram metrics
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  profile_views INTEGER DEFAULT 0,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one record per clinic/provider/date
  UNIQUE(clinic_id, provider, metric_date)
);

-- Index for faster queries by clinic and date range
CREATE INDEX IF NOT EXISTS idx_marketing_metrics_clinic_date
  ON marketing_metrics_daily(clinic_id, provider, metric_date DESC);

-- Index for faster date range queries
CREATE INDEX IF NOT EXISTS idx_marketing_metrics_date
  ON marketing_metrics_daily(metric_date DESC);
