import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pool from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const migrate = async () => {
  console.log('🚀 Starting database migration...')

  try {
    // Apply incremental migrations (idempotent)
    const migrationsDir = path.join(__dirname, 'migrations')
    if (!fs.existsSync(migrationsDir)) {
      console.log('❌ Migrations directory not found')
      return
    }

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort()

    console.log(`📋 Found ${files.length} migration files\n`)

    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (const file of files) {
      const filePath = path.join(migrationsDir, file)
      const sql = fs.readFileSync(filePath, 'utf-8')
      
      console.log(`➡️  Applying migration: ${file}`)
      
      try {
        await pool.query(sql)
        console.log(`✅ Migration ${file} applied successfully\n`)
        successCount++
      } catch (error: any) {
        // Se o erro for sobre coluna/tabela já existir, apenas avisar e continuar
        if (
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.code === '42P07' || // duplicate_table
          error.code === '42701' || // duplicate_column
          error.message?.includes('IF NOT EXISTS')
        ) {
          console.log(`⚠️  Migration ${file} skipped (already applied or non-critical)\n`)
          skipCount++
        } else {
          console.error(`❌ Migration ${file} failed:`)
          console.error(`   Error: ${error.message}`)
          if (error.detail) console.error(`   Detail: ${error.detail}`)
          console.error(`   Code: ${error.code}\n`)
          errorCount++
          // Continuar com outras migrations mesmo se uma falhar
        }
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   ✅ Successful: ${successCount}`)
    console.log(`   ⚠️  Skipped: ${skipCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    
    if (errorCount === 0) {
      console.log('\n✅ All migrations completed successfully!')
    } else {
      console.log(`\n⚠️  Completed with ${errorCount} error(s). Check logs above.`)
    }
  } catch (error) {
    console.error('❌ Migration process failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

migrate()
