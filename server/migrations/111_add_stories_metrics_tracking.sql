-- Migration: Add marketing_stories_metrics table for Instagram Stories tracking
-- This preserves Instagram Stories Insights data beyond the 24h availability window

CREATE TABLE IF NOT EXISTS marketing_stories_metrics (
  id SERIAL PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('META', 'GBP', 'RANK_TRACKER')),

  -- Story identification
  story_id VARCHAR(255) NOT NULL,
  media_type VARCHAR(50), -- IMAGE, VIDEO
  media_url VARCHAR(500),
  posted_at TIMESTAMP,
  expires_at TIMESTAMP,

  -- Metrics snapshot (collected while available)
  metric_date DATE NOT NULL,
  impressions INTEGER DEFAULT 0,
  reach INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  exits INTEGER DEFAULT 0,
  taps_forward INTEGER DEFAULT 0,
  taps_back INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one snapshot per story per day
  UNIQUE(clinic_id, provider, story_id, metric_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stories_metrics_clinic ON marketing_stories_metrics(clinic_id);
CREATE INDEX IF NOT EXISTS idx_stories_metrics_story ON marketing_stories_metrics(story_id);
CREATE INDEX IF NOT EXISTS idx_stories_metrics_date ON marketing_stories_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_stories_metrics_posted ON marketing_stories_metrics(posted_at DESC);
