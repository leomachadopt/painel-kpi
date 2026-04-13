-- Migration: Add marketing_posts_metrics table for historical post metrics tracking
-- This preserves Instagram Insights data beyond the 24-48h API limitation

CREATE TABLE IF NOT EXISTS marketing_posts_metrics (
  id SERIAL PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('META', 'GBP', 'RANK_TRACKER')),

  -- Post identification
  post_id VARCHAR(255) NOT NULL,
  post_type VARCHAR(50), -- IMAGE, VIDEO, CAROUSEL_ALBUM
  caption TEXT,
  permalink VARCHAR(500),
  posted_at TIMESTAMP,

  -- Metrics snapshot (daily)
  metric_date DATE NOT NULL,
  reach INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  engagement INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  saved INTEGER DEFAULT 0,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Unique constraint: one snapshot per post per day
  UNIQUE(clinic_id, provider, post_id, metric_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_metrics_clinic ON marketing_posts_metrics(clinic_id);
CREATE INDEX IF NOT EXISTS idx_posts_metrics_post ON marketing_posts_metrics(post_id);
CREATE INDEX IF NOT EXISTS idx_posts_metrics_date ON marketing_posts_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_metrics_posted ON marketing_posts_metrics(posted_at DESC);
