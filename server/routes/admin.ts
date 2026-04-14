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

// Run specific migration endpoint
router.post('/migrate/:migrationNumber', async (req, res) => {
  try {
    const { migrationNumber } = req.params
    console.log(`Running specific migration: ${migrationNumber}...`)

    const migrationsDir = path.join(__dirname, '..', 'migrations')
    const migrationFile = fs.readdirSync(migrationsDir)
      .filter(f => f.startsWith(migrationNumber + '_'))
      .sort()
      [0]

    if (!migrationFile) {
      return res.status(404).json({
        success: false,
        error: 'Migration not found',
        message: `No migration file found starting with ${migrationNumber}_`
      })
    }

    const filePath = path.join(migrationsDir, migrationFile)
    const sql = fs.readFileSync(filePath, 'utf-8')

    console.log(`➡️  Applying migration: ${migrationFile}`)
    await query(sql)

    console.log(`✅ Migration ${migrationFile} completed successfully!`)

    res.json({
      success: true,
      message: `Migration ${migrationFile} completed successfully`,
      migration: migrationFile
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
