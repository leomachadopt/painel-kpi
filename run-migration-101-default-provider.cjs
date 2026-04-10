// Migration 101: Add is_default_for_clinic flag to insurance_providers
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'
})

async function migrate() {
  const client = await pool.connect()

  try {
    console.log('🚀 Starting Migration 101: Add is_default_for_clinic flag to insurance_providers')

    // Read SQL file
    const sqlPath = path.join(__dirname, 'server', 'migrations', '101_add_default_provider_flag.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    // Execute migration
    console.log('📝 Executing migration SQL...')
    await client.query(sql)

    console.log('✅ Migration 101 completed successfully!')
    console.log('   - Added is_default_for_clinic column to insurance_providers')
    console.log('   - Created unique index to ensure only one default per clinic')

  } catch (error) {
    console.error('❌ Migration 101 failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
