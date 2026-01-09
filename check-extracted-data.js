import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkExtractedData() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        file_name,
        processing_status,
        extracted_data
      FROM insurance_provider_documents
      ORDER BY created_at DESC
      LIMIT 3
    `)

    console.log('\n=== Extracted Data Content ===\n')

    for (const doc of result.rows) {
      console.log(`File: ${doc.file_name}`)
      console.log(`Status: ${doc.processing_status}`)
      console.log(`Extracted Data:`, JSON.stringify(doc.extracted_data, null, 2))
      console.log('---\n')
    }

    await pool.end()
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

checkExtractedData()
