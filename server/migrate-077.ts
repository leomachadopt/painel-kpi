import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrate = async () => {
  console.log('Starting migration 077: Add WhatsApp to users...')

  try {
    // Migration 077: Add whatsapp column to users
    console.log('Running migration 077_add_whatsapp_to_users.sql...')
    const migration077Path = path.join(
      __dirname,
      'migrations',
      '077_add_whatsapp_to_users.sql'
    )
    const migration077 = fs.readFileSync(migration077Path, 'utf-8')
    await pool.query(migration077)
    console.log('✅ Migration 077 completed: whatsapp column added to users')

    console.log('✅ Migration 077 completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrate()
