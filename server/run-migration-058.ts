import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const { Pool } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const connectionString = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'

async function runMigration() {
  const pool = new Pool({ connectionString })

  try {
    console.log('🔄 Running migration 058...')

    const migrationPath = join(__dirname, 'migrations', '058_add_email_to_doctors.sql')
    const sql = readFileSync(migrationPath, 'utf-8')

    await pool.query(sql)

    console.log('✅ Migration 058 completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
