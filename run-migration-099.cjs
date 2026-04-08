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
      path.join(__dirname, 'server/migrations/099_create_patient_documents.sql'),
      'utf8'
    )

    await client.query(migrationSQL)
    console.log('✅ Migration 099 executed successfully!')

    // Verificar se a tabela foi criada
    const result = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'patient_documents'
      ORDER BY ordinal_position;
    `)

    console.log('\nTabela patient_documents criada com colunas:')
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`)
    })

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

runMigration()
