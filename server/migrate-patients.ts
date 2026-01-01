import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrate = async () => {
  console.log('Starting patients table migration...')

  try {
    const migrationPath = path.join(__dirname, 'migrations', '001_add_patients.sql')
    const migration = fs.readFileSync(migrationPath, 'utf-8')

    await pool.query(migration)

    console.log('✅ Patients table migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrate()
