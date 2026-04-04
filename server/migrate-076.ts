import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrate = async () => {
  console.log('Starting migration 076: Add WhatsApp to doctors...')

  try {
    // Migration 076: Add whatsapp column to clinic_doctors
    console.log('Running migration 076_add_whatsapp_to_doctors.sql...')
    const migration076Path = path.join(
      __dirname,
      'migrations',
      '076_add_whatsapp_to_doctors.sql'
    )
    const migration076 = fs.readFileSync(migration076Path, 'utf-8')
    await pool.query(migration076)
    console.log('✅ Migration 076 completed: whatsapp column added to clinic_doctors')

    console.log('✅ Migration 076 completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrate()
