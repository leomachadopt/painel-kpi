// Migration 101: Add procedure catalog references to pending_treatments
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'
})

async function migrate() {
  const client = await pool.connect()

  try {
    console.log('🚀 Starting Migration 101: Add procedure catalog references to pending_treatments')

    // Add procedure catalog reference fields
    console.log('📝 Adding procedure_code column...')
    await client.query(`
      ALTER TABLE pending_treatments
      ADD COLUMN IF NOT EXISTS procedure_code VARCHAR(50)
    `)

    console.log('📝 Adding procedure_base_id column...')
    await client.query(`
      ALTER TABLE pending_treatments
      ADD COLUMN IF NOT EXISTS procedure_base_id VARCHAR(255)
    `)

    console.log('📝 Adding insurance_provider_procedure_id column...')
    await client.query(`
      ALTER TABLE pending_treatments
      ADD COLUMN IF NOT EXISTS insurance_provider_procedure_id VARCHAR(255)
    `)

    console.log('✅ Columns added (no foreign keys - catalog may vary)')

    console.log('✅ Migration 101 completed successfully!')

  } catch (error) {
    console.error('❌ Migration 101 failed:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

migrate()
