// @ts-nocheck
import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { query } from '../db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

// Migration endpoint (use with caution - should be protected in production)
router.post('/migrate', async (req, res) => {
  try {
    console.log('Starting database migration via API...')

    // Execute schema
    const schemaPath = path.join(__dirname, '..', 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    await query(schema)
    console.log('✅ Schema applied')

    // Apply incremental migrations
    const migrationsDir = path.join(__dirname, '..', 'migrations')
    const migrations: string[] = []

    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort()

      for (const file of files) {
        const filePath = path.join(migrationsDir, file)
        const sql = fs.readFileSync(filePath, 'utf-8')
        console.log(`➡️  Applying migration: ${file}`)
        await query(sql)
        migrations.push(file)
      }
    }

    console.log('✅ Database migration completed successfully!')

    res.json({
      success: true,
      message: 'Migrations completed successfully',
      migrations
    })
  } catch (error: any) {
    console.error('❌ Migration failed:', error)
    res.status(500).json({
      success: false,
      error: 'Migration failed',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

export default router
