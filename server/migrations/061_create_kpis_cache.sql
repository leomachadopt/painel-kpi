-- Migration: Criar tabela de cache de KPIs pré-calculados
-- Objetivo: Reduzir queries complexas calculando KPIs em background
-- Fase 2 de otimizações

-- Tabela para armazenar KPIs diários pré-calculados
CREATE TABLE IF NOT EXISTS daily_kpis_cache (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  date DATE NOT NULL,

  -- KPIs de Receita
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  revenue_by_source JSONB DEFAULT '{}',

  -- KPIs de Consultas
  total_consultations INTEGER DEFAULT 0,
  consultation_types JSONB DEFAULT '{}',
  first_consultations INTEGER DEFAULT 0,
  return_consultations INTEGER DEFAULT 0,

  -- KPIs de Planos
  plans_presented INTEGER DEFAULT 0,
  plans_accepted INTEGER DEFAULT 0,
  acceptance_rate DECIMAL(5, 2) DEFAULT 0,

  -- KPIs de Leads
  total_leads INTEGER DEFAULT 0,
  leads_by_channel JSONB DEFAULT '{}',
  conversion_rate DECIMAL(5, 2) DEFAULT 0,

  -- KPIs de Alinhadores
  aligners_started INTEGER DEFAULT 0,
  aligners_active INTEGER DEFAULT 0,

  -- KPIs de Gabinete
  total_hours_available DECIMAL(10, 2) DEFAULT 0,
  total_hours_occupied DECIMAL(10, 2) DEFAULT 0,
  occupancy_rate DECIMAL(5, 2) DEFAULT 0,

  -- KPIs de Tempo de Atendimento
  avg_wait_time INTEGER DEFAULT 0,
  avg_service_time INTEGER DEFAULT 0,

  -- Metadata
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, date)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_daily_kpis_clinic_date ON daily_kpis_cache(clinic_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_kpis_date ON daily_kpis_cache(date DESC);

-- Tabela para armazenar KPIs mensais pré-calculados
CREATE TABLE IF NOT EXISTS monthly_kpis_cache (
  id TEXT PRIMARY KEY,
  clinic_id TEXT NOT NULL REFERENCES clinics(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,

  -- KPIs de Receita
  total_revenue DECIMAL(10, 2) DEFAULT 0,
  revenue_aligners DECIMAL(10, 2) DEFAULT 0,
  revenue_pediatrics DECIMAL(10, 2) DEFAULT 0,
  revenue_dentistry DECIMAL(10, 2) DEFAULT 0,
  revenue_others DECIMAL(10, 2) DEFAULT 0,
  avg_ticket DECIMAL(10, 2) DEFAULT 0,

  -- KPIs de Volume
  total_consultations INTEGER DEFAULT 0,
  total_plans_presented INTEGER DEFAULT 0,
  total_plans_accepted INTEGER DEFAULT 0,
  total_aligners_started INTEGER DEFAULT 0,
  total_leads INTEGER DEFAULT 0,

  -- KPIs de Taxa
  acceptance_rate DECIMAL(5, 2) DEFAULT 0,
  conversion_rate DECIMAL(5, 2) DEFAULT 0,
  occupancy_rate DECIMAL(5, 2) DEFAULT 0,
  integration_rate DECIMAL(5, 2) DEFAULT 0,
  attendance_rate DECIMAL(5, 2) DEFAULT 0,

  -- KPIs de Qualidade
  nps DECIMAL(5, 2) DEFAULT 0,
  avg_wait_time INTEGER DEFAULT 0,
  complaints INTEGER DEFAULT 0,

  -- Distribuições
  revenue_by_category JSONB DEFAULT '{}',
  leads_by_channel JSONB DEFAULT '{}',
  consultation_distribution JSONB DEFAULT '{}',

  -- Metadata
  last_calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(clinic_id, year, month)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_monthly_kpis_clinic_year_month ON monthly_kpis_cache(clinic_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_monthly_kpis_year_month ON monthly_kpis_cache(year DESC, month DESC);

-- Comentários
COMMENT ON TABLE daily_kpis_cache IS 'Cache de KPIs diários pré-calculados para reduzir queries complexas';
COMMENT ON TABLE monthly_kpis_cache IS 'Cache de KPIs mensais pré-calculados para reduzir queries complexas';
COMMENT ON COLUMN daily_kpis_cache.last_calculated_at IS 'Última vez que os KPIs foram recalculados';
COMMENT ON COLUMN monthly_kpis_cache.last_calculated_at IS 'Última vez que os KPIs foram recalculados';
