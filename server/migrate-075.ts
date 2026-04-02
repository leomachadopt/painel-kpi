import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrate = async () => {
  console.log('Starting migration 075: Kommo credentials per clinic...')

  try {
    // Migration 075: Add kommo_subdomain and kommo_token to clinics
    console.log('Running migration 075_add_kommo_credentials_to_clinics.sql...')
    const migration075Path = path.join(
      __dirname,
      'migrations',
      '075_add_kommo_credentials_to_clinics.sql'
    )
    const migration075 = fs.readFileSync(migration075Path, 'utf-8')
    await pool.query(migration075)
    console.log('✅ Migration 075 completed: kommo_subdomain and kommo_token columns added')

    console.log('✅ Migration 075 completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrate()
