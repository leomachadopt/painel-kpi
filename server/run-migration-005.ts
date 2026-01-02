import pool from './db.js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const runMigration = async () => {
  console.log('Running migration 005: Add NPS Survey System...')

  try {
    const migrationPath = join(__dirname, 'migrations', '005_add_nps_surveys.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    const client = await pool.connect()

    try {
      await client.query(migrationSQL)
      console.log('✅ Migration 005 completed successfully!')
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
