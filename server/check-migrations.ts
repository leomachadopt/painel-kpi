import pool from './db'

interface CheckResult {
  migration: string
  status: 'OK' | 'MISSING'
  details: string
}

async function checkMigrations(): Promise<CheckResult[]> {
  const results: CheckResult[] = []

  try {
    // ========================================
    // Migration 073: system_settings table
    // ========================================
    const check073 = await pool.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'system_settings'
      ) as exists
    `)

    const has073 = check073.rows[0].exists
    results.push({
      migration: '073_add_system_settings',
      status: has073 ? 'OK' : 'MISSING',
      details: has073 ? 'Tabela system_settings existe' : 'Tabela system_settings NÃO existe'
    })

    // ========================================
    // Migration 074: clinic notification columns
    // ========================================
    const check074 = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'clinics'
        AND column_name IN (
          'kommo_contact_id',
          'owner_whatsapp',
          'n8n_reports_enabled',
          'n8n_report_time'
        )
    `)

    const cols074 = check074.rows.map(r => r.column_name)
    const expectedCols074 = ['kommo_contact_id', 'owner_whatsapp', 'n8n_reports_enabled', 'n8n_report_time']
    const missing074 = expectedCols074.filter(c => !cols074.includes(c))

    results.push({
      migration: '074_add_clinic_notification_settings',
      status: missing074.length === 0 ? 'OK' : 'MISSING',
      details: missing074.length === 0
        ? `Todas as 4 colunas existem`
        : `Faltam ${missing074.length}/4 colunas: ${missing074.join(', ')}`
    })

    // ========================================
    // Migration 075: kommo credentials columns
    // ========================================
    const check075 = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'clinics'
        AND column_name IN (
          'kommo_subdomain',
          'kommo_token'
        )
    `)

    const cols075 = check075.rows.map(r => r.column_name)
    const expectedCols075 = ['kommo_subdomain', 'kommo_token']
    const missing075 = expectedCols075.filter(c => !cols075.includes(c))

    results.push({
      migration: '075_add_kommo_credentials_to_clinics',
      status: missing075.length === 0 ? 'OK' : 'MISSING',
      details: missing075.length === 0
        ? `Todas as 2 colunas existem`
        : `Faltam ${missing075.length}/2 colunas: ${missing075.join(', ')}`
    })

    return results

  } catch (error) {
    console.error('❌ Erro ao verificar migrations:', error)
    throw error
  }
}

async function main() {
  console.log('\n🔍 A verificar estado das migrations recentes...\n')

  try {
    const results = await checkMigrations()

    let allOk = true
    for (const result of results) {
      const icon = result.status === 'OK' ? '✅' : '❌'
      console.log(`${icon} ${result.migration}: ${result.status}`)
      console.log(`   ${result.details}\n`)

      if (result.status === 'MISSING') {
        allOk = false
      }
    }

    if (allOk) {
      console.log('✅ Todas as migrations estão aplicadas!\n')
      process.exit(0)
    } else {
      console.log('⚠️  Algumas migrations estão em falta. Execute run-pending-migrations.ts para as aplicar.\n')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ Falha na verificação:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

main()
