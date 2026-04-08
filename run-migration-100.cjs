require('dotenv').config()
const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

async function runMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('Connected to database')

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'server/migrations/100_add_cloudinary_resource_type.sql'),
      'utf8'
    )

    await client.query(migrationSQL)
    console.log('✅ Migration 100 executed successfully!')

    // Verificar se a coluna foi adicionada
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'patient_documents' AND column_name = 'cloudinary_resource_type';
    `)

    if (result.rows.length > 0) {
      console.log('\nColuna cloudinary_resource_type adicionada:')
      console.log(`  - ${result.rows[0].column_name}: ${result.rows[0].data_type} (default: ${result.rows[0].column_default})`)
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
