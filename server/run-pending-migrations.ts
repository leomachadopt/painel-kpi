import pool from './db'

interface MigrationStep {
  migration: string
  description: string
  sql: string
  checkQuery: string
  alreadyExists: (result: any) => boolean
}

const migrations: MigrationStep[] = [
  // ========================================
  // Migration 073: system_settings table
  // ========================================
  {
    migration: '073_add_system_settings',
    description: 'Criar tabela system_settings',
    sql: `
      CREATE TABLE IF NOT EXISTS system_settings (
        key        VARCHAR(255) PRIMARY KEY,
        value      TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      INSERT INTO system_settings (key, value)
      VALUES ('n8n_api_key_hash', NULL)
      ON CONFLICT (key) DO NOTHING;

      COMMENT ON TABLE system_settings IS
        'Configurações globais — apenas o MENTOR tem acesso de escrita.';
      COMMENT ON COLUMN system_settings.value IS
        'Chaves sensíveis são guardadas como hash bcrypt, nunca em plaintext.';
    `,
    checkQuery: `
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'system_settings'
      ) as exists
    `,
    alreadyExists: (result) => result.rows[0].exists
  },

  // ========================================
  // Migration 074: clinic notification settings
  // ========================================
  {
    migration: '074_add_clinic_notification_settings',
    description: 'Adicionar colunas de notificações às clínicas',
    sql: `
      ALTER TABLE clinics
        ADD COLUMN IF NOT EXISTS kommo_contact_id    VARCHAR(255),
        ADD COLUMN IF NOT EXISTS owner_whatsapp      VARCHAR(50),
        ADD COLUMN IF NOT EXISTS n8n_reports_enabled BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS n8n_report_time     VARCHAR(5) NOT NULL DEFAULT '08:30';

      COMMENT ON COLUMN clinics.kommo_contact_id    IS 'ID do contacto do dono no Kommo CRM';
      COMMENT ON COLUMN clinics.owner_whatsapp      IS 'WhatsApp do dono (+351XXXXXXXXX)';
      COMMENT ON COLUMN clinics.n8n_reports_enabled IS 'Relatórios automáticos activos';
      COMMENT ON COLUMN clinics.n8n_report_time     IS 'Hora do relatório diário (HH:MM)';
    `,
    checkQuery: `
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'clinics'
        AND column_name IN (
          'kommo_contact_id',
          'owner_whatsapp',
          'n8n_reports_enabled',
          'n8n_report_time'
        )
    `,
    alreadyExists: (result) => result.rows[0].count === '4'
  },

  // ========================================
  // Migration 075: kommo credentials
  // ========================================
  {
    migration: '075_add_kommo_credentials_to_clinics',
    description: 'Adicionar credenciais Kommo às clínicas',
    sql: `
      ALTER TABLE clinics
        ADD COLUMN IF NOT EXISTS kommo_subdomain VARCHAR(255),
        ADD COLUMN IF NOT EXISTS kommo_token     TEXT;

      COMMENT ON COLUMN clinics.kommo_subdomain IS
        'Subdomínio da conta Kommo da clínica. Ex: se URL é clinica.kommo.com → "clinica"';
      COMMENT ON COLUMN clinics.kommo_token IS
        'Long-term token OAuth da conta Kommo da clínica.';
    `,
    checkQuery: `
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'clinics'
        AND column_name IN (
          'kommo_subdomain',
          'kommo_token'
        )
    `,
    alreadyExists: (result) => result.rows[0].count === '2'
  }
]

async function runMigrations() {
  console.log('\n🚀 A executar migrations pendentes...\n')

  let executedCount = 0
  let skippedCount = 0

  for (const migration of migrations) {
    console.log(`📋 ${migration.migration}: ${migration.description}`)

    try {
      // Verificar se já existe
      const checkResult = await pool.query(migration.checkQuery)
      const exists = migration.alreadyExists(checkResult)

      if (exists) {
        console.log(`   ✅ Já existe — a saltar\n`)
        skippedCount++
        continue
      }

      // Executar a migration
      console.log(`   🔧 A executar...`)
      await pool.query(migration.sql)
      console.log(`   ✅ Executada com sucesso\n`)
      executedCount++

    } catch (error) {
      console.error(`   ❌ Erro ao executar ${migration.migration}:`, error)
      throw error
    }
  }

  console.log('━'.repeat(60))
  console.log(`✅ Concluído!`)
  console.log(`   Executadas: ${executedCount}`)
  console.log(`   Saltadas:   ${skippedCount}`)
  console.log(`   Total:      ${migrations.length}\n`)
}

async function main() {
  try {
    await runMigrations()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Falha ao executar migrations:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
