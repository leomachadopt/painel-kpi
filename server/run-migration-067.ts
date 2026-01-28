import pool from './db'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function runMigration() {
  const client = await pool.connect()
  try {
    const migrationPath = path.join(__dirname, 'migrations', '067_add_view_all_doctors_consultations.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')

    console.log('Running migration 067...')
    await client.query(migrationSQL)
    console.log('Migration 067 completed successfully!')
  } catch (error) {
    console.error('Error running migration:', error)
    throw error
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
