import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrate = async () => {
  console.log('Starting n8n integration migrations...')

  try {
    // Migration 073: system_settings table
    console.log('Running migration 073_add_system_settings.sql...')
    const migration073Path = path.join(
      __dirname,
      'migrations',
      '073_add_system_settings.sql'
    )
    const migration073 = fs.readFileSync(migration073Path, 'utf-8')
    await pool.query(migration073)
    console.log('✅ Migration 073 completed: system_settings table created')

    // Migration 074: clinic notification settings columns
    console.log('Running migration 074_add_clinic_notification_settings.sql...')
    const migration074Path = path.join(
      __dirname,
      'migrations',
      '074_add_clinic_notification_settings.sql'
    )
    const migration074 = fs.readFileSync(migration074Path, 'utf-8')
    await pool.query(migration074)
    console.log('✅ Migration 074 completed: clinic notification columns added')

    console.log('✅ All n8n integration migrations completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrate()
