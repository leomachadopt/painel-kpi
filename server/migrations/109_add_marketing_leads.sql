-- Migration: Add marketing_leads table for Instagram DM leads

CREATE TABLE IF NOT EXISTS marketing_leads (
  id VARCHAR(255) PRIMARY KEY,
  clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  source VARCHAR(50) NOT NULL CHECK (source IN ('INSTAGRAM_DM', 'FACEBOOK_DM', 'WHATSAPP', 'MANUAL')),

  -- Contact info
  name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  message TEXT,

  -- Instagram specific
  instagram_user_id VARCHAR(255),
  instagram_username VARCHAR(255),
  conversation_id VARCHAR(255),

  -- Lead management
  status VARCHAR(50) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST')),
  assigned_to VARCHAR(255) REFERENCES users(id),
  notes TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- Indexes
  CONSTRAINT unique_instagram_conversation UNIQUE (clinic_id, instagram_user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_clinic ON marketing_leads(clinic_id);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON marketing_leads(status);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_source ON marketing_leads(source);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_created ON marketing_leads(created_at DESC);
