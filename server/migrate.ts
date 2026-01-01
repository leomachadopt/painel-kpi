import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrate = async () => {
  console.log('Starting database migration...')

  try {
    const schemaPath = path.join(__dirname, 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    await pool.query(schema)

    // Apply incremental migrations (idempotent)
    const migrationsDir = path.join(__dirname, 'migrations')
    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()

      for (const file of files) {
        const filePath = path.join(migrationsDir, file)
        const sql = fs.readFileSync(filePath, 'utf-8')
        console.log(`➡️  Applying migration: ${file}`)
        await pool.query(sql)
      }
    }

    console.log('✅ Database migration completed successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrate()
