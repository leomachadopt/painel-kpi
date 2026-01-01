-- Add Marketing / Social Integrations Tables

-- Stores tokens/IDs per clinic and provider (Meta, Google Business Profile, Rank Tracker)
CREATE TABLE IF NOT EXISTS clinic_integrations (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('META', 'GBP', 'RANK_TRACKER')),
  status VARCHAR(50) NOT NULL DEFAULT 'DISCONNECTED' CHECK (status IN ('DISCONNECTED', 'CONNECTED', 'ERROR')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  external_account_id TEXT,
  external_location_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_clinic_integrations_clinic_provider
  ON clinic_integrations(clinic_id, provider);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_clinic_integrations_updated_at'
  ) THEN
    CREATE TRIGGER update_clinic_integrations_updated_at BEFORE UPDATE ON clinic_integrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Daily snapshots of social/GBP metrics (aggregated)
CREATE TABLE IF NOT EXISTS social_daily_metrics (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('INSTAGRAM', 'FACEBOOK', 'GOOGLE_BUSINESS')),
  date DATE NOT NULL,

  followers_total INTEGER,
  followers_delta INTEGER,
  likes_total INTEGER,
  likes_delta INTEGER,
  comments_total INTEGER,
  comments_delta INTEGER,

  reviews_total INTEGER,
  reviews_new INTEGER,
  rating_avg DECIMAL(4, 2),

  profile_views INTEGER,
  reach INTEGER,
  impressions INTEGER,
  website_clicks INTEGER,
  calls INTEGER,
  directions INTEGER,

  raw JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, provider, date)
);

CREATE INDEX IF NOT EXISTS idx_social_daily_metrics_clinic_date
  ON social_daily_metrics(clinic_id, date);

-- Google Business Profile: search terms (usually best stored monthly)
CREATE TABLE IF NOT EXISTS gbp_search_terms_monthly (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  term TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, year, month, term)
);

CREATE INDEX IF NOT EXISTS idx_gbp_search_terms_monthly_clinic_ym
  ON gbp_search_terms_monthly(clinic_id, year, month);

-- Keywords defined by the clinic (limit enforced at API level: 10 active keywords)
CREATE TABLE IF NOT EXISTS clinic_keywords (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  city VARCHAR(255) NOT NULL,
  district VARCHAR(255),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, keyword, city, district)
);

CREATE INDEX IF NOT EXISTS idx_clinic_keywords_clinic_active
  ON clinic_keywords(clinic_id, active);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_clinic_keywords_updated_at'
  ) THEN
    CREATE TRIGGER update_clinic_keywords_updated_at BEFORE UPDATE ON clinic_keywords
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Daily rank tracking results per keyword (from 3rd-party provider)
CREATE TABLE IF NOT EXISTS keyword_rankings_daily (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  keyword_id VARCHAR(255) NOT NULL REFERENCES clinic_keywords(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'UNKNOWN',
  city VARCHAR(255) NOT NULL,
  district VARCHAR(255),
  position INTEGER,
  found BOOLEAN DEFAULT false,
  raw JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(keyword_id, date)
);

CREATE INDEX IF NOT EXISTS idx_keyword_rankings_daily_clinic_date
  ON keyword_rankings_daily(clinic_id, date);


