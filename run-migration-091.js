import pg from 'pg'
import fs from 'fs'
const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'
})

async function runMigration() {
  const client = await pool.connect()

  try {
    console.log('🔄 Running migration 091_add_pending_treatment_link...\n')

    const sql = fs.readFileSync('./server/migrations/091_add_pending_treatment_link.sql', 'utf8')

    await client.query(sql)

    console.log('✅ Migration completed successfully!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
