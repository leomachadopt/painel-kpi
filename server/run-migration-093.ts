import { query } from './db.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  try {
    console.log('Running migration 093: Fix KPIs trigger field name...')

    const migrationPath = path.join(__dirname, 'migrations', '093_fix_kpis_trigger_field_name.sql')
    const sql = fs.readFileSync(migrationPath, 'utf-8')

    await query(sql)

    console.log('✅ Migration 093 completed successfully!')
    process.exit(0)
  } catch (error: any) {
    console.error('❌ Migration 093 failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

runMigration()
