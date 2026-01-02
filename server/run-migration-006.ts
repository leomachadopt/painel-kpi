import pool from './db.js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const runMigration = async () => {
  console.log('Running migration 006: Add customizable NPS question...')

  try {
    const migrationPath = join(__dirname, 'migrations', '006_add_nps_question.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    const client = await pool.connect()

    try {
      await client.query(migrationSQL)
      console.log('✅ Migration 006 completed successfully!')
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

runMigration()
