import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrate = async () => {
  console.log('Starting marketing tables migration...')

  try {
    const migrationPath = path.join(
      __dirname,
      'migrations',
      '002_add_marketing.sql'
    )
    const migration = fs.readFileSync(migrationPath, 'utf-8')

    await pool.query(migration)

    console.log('✅ Marketing migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrate()








