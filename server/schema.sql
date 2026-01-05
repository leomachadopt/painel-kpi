-- Schema para o Painel KPI
-- PostgreSQL Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================
-- USERS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('MENTOR', 'GESTOR_CLINICA')),
  clinic_id VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- CLINICS TABLE
-- ================================
CREATE TABLE IF NOT EXISTS clinics (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  logo_url TEXT,
  active BOOLEAN DEFAULT true,
  last_update VARCHAR(100),

  -- Targets (Metas)
  target_revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  target_aligners_min INTEGER NOT NULL DEFAULT 0,
  target_aligners_max INTEGER NOT NULL DEFAULT 0,
  target_avg_ticket DECIMAL(12, 2) NOT NULL DEFAULT 0,
  target_acceptance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_occupancy_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_nps INTEGER NOT NULL DEFAULT 0,
  target_integration_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_attendance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_follow_up_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_wait_time INTEGER NOT NULL DEFAULT 0,
  target_complaints INTEGER NOT NULL DEFAULT 0,
  target_leads_min INTEGER NOT NULL DEFAULT 0,
  target_leads_max INTEGER NOT NULL DEFAULT 0,
  target_revenue_per_cabinet DECIMAL(12, 2) NOT NULL DEFAULT 0,
  target_plans_presented_adults INTEGER NOT NULL DEFAULT 0,
  target_plans_presented_kids INTEGER NOT NULL DEFAULT 0,

  -- Agenda Distribution Targets
  target_agenda_operational DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_agenda_planning DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_agenda_sales DECIMAL(5, 2) NOT NULL DEFAULT 0,
  target_agenda_leadership DECIMAL(5, 2) NOT NULL DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add foreign key for users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_user_clinic'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT fk_user_clinic
      FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ================================
-- CLINIC CONFIGURATION TABLES
-- ================================
CREATE TABLE IF NOT EXISTS clinic_categories (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinic_cabinets (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  standard_hours INTEGER NOT NULL DEFAULT 8,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinic_doctors (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinic_sources (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinic_campaigns (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinic_payment_sources (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clinic_aligner_brands (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- MONTHLY DATA TABLE
-- ================================
CREATE TABLE IF NOT EXISTS monthly_data (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,

  -- Financial
  revenue_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  revenue_aligners DECIMAL(12, 2) NOT NULL DEFAULT 0,
  revenue_pediatrics DECIMAL(12, 2) NOT NULL DEFAULT 0,
  revenue_dentistry DECIMAL(12, 2) NOT NULL DEFAULT 0,
  revenue_others DECIMAL(12, 2) NOT NULL DEFAULT 0,
  revenue_accepted_plans DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Clinical/Commercial
  plans_presented_adults INTEGER NOT NULL DEFAULT 0,
  plans_presented_kids INTEGER NOT NULL DEFAULT 0,
  plans_accepted INTEGER NOT NULL DEFAULT 0,
  aligners_started INTEGER NOT NULL DEFAULT 0,
  appointments_integrated INTEGER NOT NULL DEFAULT 0,
  appointments_total INTEGER NOT NULL DEFAULT 0,
  leads INTEGER NOT NULL DEFAULT 0,
  first_consultations_scheduled INTEGER NOT NULL DEFAULT 0,
  first_consultations_attended INTEGER NOT NULL DEFAULT 0,
  plans_not_accepted INTEGER NOT NULL DEFAULT 0,
  plans_not_accepted_follow_up INTEGER NOT NULL DEFAULT 0,

  -- Operational/Experience
  avg_wait_time INTEGER NOT NULL DEFAULT 0,
  nps INTEGER NOT NULL DEFAULT 0,
  referrals_spontaneous INTEGER NOT NULL DEFAULT 0,
  referrals_base_2025 INTEGER NOT NULL DEFAULT 0,
  complaints INTEGER NOT NULL DEFAULT 0,

  -- Agenda Owner Distribution
  agenda_owner_operational DECIMAL(12, 2) NOT NULL DEFAULT 0,
  agenda_owner_planning DECIMAL(12, 2) NOT NULL DEFAULT 0,
  agenda_owner_sales DECIMAL(12, 2) NOT NULL DEFAULT 0,
  agenda_owner_leadership DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Legacy/Basic
  expenses DECIMAL(12, 2) NOT NULL DEFAULT 0,
  marketing_cost DECIMAL(12, 2) NOT NULL DEFAULT 0,

  -- Aggregates (stored as JSONB for flexibility)
  revenue_by_category JSONB DEFAULT '{}'::jsonb,
  leads_by_channel JSONB DEFAULT '{}'::jsonb,
  source_distribution JSONB DEFAULT '{}'::jsonb,
  campaign_distribution JSONB DEFAULT '{}'::jsonb,
  delay_reasons JSONB DEFAULT '{"patient": 0, "doctor": 0}'::jsonb,
  entry_counts JSONB DEFAULT '{"financial": 0, "consultations": 0, "prospecting": 0, "cabinets": 0, "serviceTime": 0, "sources": 0}'::jsonb,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, month, year)
);

-- ================================
-- CABINET DATA (Part of Monthly Data)
-- ================================
CREATE TABLE IF NOT EXISTS monthly_cabinet_data (
  id VARCHAR(255) PRIMARY KEY,
  monthly_data_id VARCHAR(255) NOT NULL REFERENCES monthly_data(id) ON DELETE CASCADE,
  cabinet_id VARCHAR(255) NOT NULL REFERENCES clinic_cabinets(id) ON DELETE CASCADE,
  revenue DECIMAL(12, 2) NOT NULL DEFAULT 0,
  hours_available INTEGER NOT NULL DEFAULT 0,
  hours_occupied INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================
-- DAILY ENTRIES TABLES
-- ================================

-- Daily Financial Entries
CREATE TABLE IF NOT EXISTS daily_financial_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  category_id VARCHAR(255) NOT NULL REFERENCES clinic_categories(id) ON DELETE RESTRICT,
  value DECIMAL(12, 2) NOT NULL,
  cabinet_id VARCHAR(255) NOT NULL REFERENCES clinic_cabinets(id) ON DELETE RESTRICT,
  doctor_id VARCHAR(255) REFERENCES clinic_doctors(id) ON DELETE SET NULL,
  payment_source_id VARCHAR(255) REFERENCES clinic_payment_sources(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Consultation Entries
CREATE TABLE IF NOT EXISTS daily_consultation_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  plan_created BOOLEAN DEFAULT false,
  plan_created_at DATE,
  plan_presented BOOLEAN DEFAULT false,
  plan_presented_at DATE,
  plan_accepted BOOLEAN DEFAULT false,
  plan_accepted_at DATE,
  plan_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 1 registo de 1.ª consulta por paciente (por clínica)
  CONSTRAINT uniq_daily_consultation_clinic_code UNIQUE (clinic_id, code)
);

-- Daily Prospecting Entries
CREATE TABLE IF NOT EXISTS daily_prospecting_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  scheduled INTEGER NOT NULL DEFAULT 0,
  email INTEGER NOT NULL DEFAULT 0,
  sms INTEGER NOT NULL DEFAULT 0,
  whatsapp INTEGER NOT NULL DEFAULT 0,
  instagram INTEGER NOT NULL DEFAULT 0,
  phone INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, date)
);

-- Daily Cabinet Usage Entries
CREATE TABLE IF NOT EXISTS daily_cabinet_usage_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  cabinet_id VARCHAR(255) NOT NULL REFERENCES clinic_cabinets(id) ON DELETE RESTRICT,
  hours_available INTEGER NOT NULL DEFAULT 0,
  hours_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Service Time Entries
CREATE TABLE IF NOT EXISTS daily_service_time_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  doctor_id VARCHAR(255) NOT NULL REFERENCES clinic_doctors(id) ON DELETE RESTRICT,
  scheduled_time TIME NOT NULL,
  actual_start_time TIME NOT NULL,
  delay_reason VARCHAR(50) CHECK (delay_reason IN ('paciente', 'medico') OR delay_reason IS NULL),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Source Entries
CREATE TABLE IF NOT EXISTS daily_source_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  is_referral BOOLEAN DEFAULT false,
  source_id VARCHAR(255) NOT NULL REFERENCES clinic_sources(id) ON DELETE RESTRICT,
  referral_name VARCHAR(255),
  referral_code VARCHAR(100),
  campaign_id VARCHAR(255) REFERENCES clinic_campaigns(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily Consultation Control Entries
CREATE TABLE IF NOT EXISTS daily_consultation_control_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  no_show INTEGER NOT NULL DEFAULT 0,
  rescheduled INTEGER NOT NULL DEFAULT 0,
  cancelled INTEGER NOT NULL DEFAULT 0,
  old_patient_booking INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(clinic_id, date)
);

-- Daily Aligner Entries
CREATE TABLE IF NOT EXISTS daily_aligner_entries (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  patient_name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  aligner_brand_id VARCHAR(255) NOT NULL REFERENCES clinic_aligner_brands(id) ON DELETE RESTRICT,
  
  -- Data insertion fields
  data_insertion_active BOOLEAN DEFAULT false,
  data_insertion_activated_at DATE,
  has_scanner BOOLEAN DEFAULT false,
  scanner_collection_date DATE,
  has_photos BOOLEAN DEFAULT false,
  photos_status VARCHAR(50) CHECK (photos_status IN ('marked', 'dispensable') OR photos_status IS NULL),
  has_ortho BOOLEAN DEFAULT false,
  ortho_status VARCHAR(50) CHECK (ortho_status IN ('marked', 'dispensable') OR ortho_status IS NULL),
  has_tele BOOLEAN DEFAULT false,
  tele_status VARCHAR(50) CHECK (tele_status IN ('marked', 'dispensable') OR tele_status IS NULL),
  has_cbct BOOLEAN DEFAULT false,
  cbct_status VARCHAR(50) CHECK (cbct_status IN ('marked', 'dispensable') OR cbct_status IS NULL),
  
  -- Stage fields
  registration_created BOOLEAN DEFAULT false,
  registration_created_at DATE,
  cck_created BOOLEAN DEFAULT false,
  cck_created_at DATE,
  awaiting_plan BOOLEAN DEFAULT false,
  awaiting_plan_at DATE,
  awaiting_approval BOOLEAN DEFAULT false,
  awaiting_approval_at DATE,
  approved BOOLEAN DEFAULT false,
  approved_at DATE,
  treatment_plan_created BOOLEAN DEFAULT false,
  treatment_plan_created_at DATE,
  observations TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT uniq_daily_aligner_clinic_code UNIQUE (clinic_id, code)
);

-- ================================
-- INDEXES FOR PERFORMANCE
-- ================================
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinics_active ON clinics(active);
CREATE INDEX IF NOT EXISTS idx_monthly_data_clinic_date ON monthly_data(clinic_id, year, month);
CREATE INDEX IF NOT EXISTS idx_daily_financial_clinic_date ON daily_financial_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_consultation_clinic_date ON daily_consultation_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_prospecting_clinic_date ON daily_prospecting_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_cabinet_clinic_date ON daily_cabinet_usage_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_service_time_clinic_date ON daily_service_time_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_source_clinic_date ON daily_source_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_consultation_control_clinic_date ON daily_consultation_control_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_financial_doctor_id ON daily_financial_entries(doctor_id);
CREATE INDEX IF NOT EXISTS idx_daily_financial_payment_source_id ON daily_financial_entries(payment_source_id);
CREATE INDEX IF NOT EXISTS idx_clinic_payment_sources_clinic_id ON clinic_payment_sources(clinic_id);
CREATE INDEX IF NOT EXISTS idx_clinic_aligner_brands_clinic_id ON clinic_aligner_brands(clinic_id);
CREATE INDEX IF NOT EXISTS idx_daily_aligner_clinic_date ON daily_aligner_entries(clinic_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_aligner_brand_id ON daily_aligner_entries(aligner_brand_id);
CREATE INDEX IF NOT EXISTS idx_daily_aligner_code ON daily_aligner_entries(clinic_id, code);

-- ================================
-- TRIGGERS FOR updated_at
-- ================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_clinics_updated_at') THEN
    CREATE TRIGGER update_clinics_updated_at BEFORE UPDATE ON clinics
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_monthly_data_updated_at') THEN
    CREATE TRIGGER update_monthly_data_updated_at BEFORE UPDATE ON monthly_data
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_daily_aligner_entries_updated_at') THEN
    CREATE TRIGGER update_daily_aligner_entries_updated_at BEFORE UPDATE ON daily_aligner_entries
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ================================
-- MARKETING / SOCIAL INTEGRATIONS
-- ================================

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
