import pool from './db.js'

const migrate = async () => {
  console.log('Starting marketing tokens migration...')

  try {
    const migration = `
      -- Tabela para armazenar tokens OAuth de integrações de marketing
      CREATE TABLE IF NOT EXISTS marketing_integrations (
        id VARCHAR(255) PRIMARY KEY,
        clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        access_token TEXT NOT NULL,
        page_id TEXT,
        page_name TEXT,
        instagram_id TEXT,
        instagram_username TEXT,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(clinic_id, provider)
      );

      -- Tabela para armazenar métricas de marketing
      CREATE TABLE IF NOT EXISTS marketing_metrics (
        id VARCHAR(255) PRIMARY KEY,
        clinic_id VARCHAR(255) NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        metric_date DATE NOT NULL,
        impressions INT DEFAULT 0,
        reach INT DEFAULT 0,
        engagement INT DEFAULT 0,
        followers_count INT DEFAULT 0,
        synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(clinic_id, provider, metric_date)
      );

      -- Índices para melhor performance
      CREATE INDEX IF NOT EXISTS idx_marketing_integrations_clinic
        ON marketing_integrations(clinic_id);

      CREATE INDEX IF NOT EXISTS idx_marketing_integrations_provider
        ON marketing_integrations(provider);

      CREATE INDEX IF NOT EXISTS idx_marketing_metrics_clinic_date
        ON marketing_metrics(clinic_id, metric_date);

      CREATE INDEX IF NOT EXISTS idx_marketing_metrics_provider
        ON marketing_metrics(provider);
    `

    await pool.query(migration)

    console.log('✅ Marketing tokens migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrate()
