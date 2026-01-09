import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkDocs() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        file_name,
        processing_status,
        processed,
        created_at,
        extracted_data IS NOT NULL as has_extracted_data,
        LENGTH(CAST(extracted_data AS TEXT)) as data_length
      FROM insurance_provider_documents
      ORDER BY created_at DESC
      LIMIT 5
    `)

    console.log('\n=== Recent Insurance Provider Documents ===\n')

    if (result.rows.length === 0) {
      console.log('No documents found')
    } else {
      for (const doc of result.rows) {
        console.log(`ID: ${doc.id}`)
        console.log(`File: ${doc.file_name}`)
        console.log(`Status: ${doc.processing_status}`)
        console.log(`Processed: ${doc.processed}`)
        console.log(`Has Data: ${doc.has_extracted_data}`)
        console.log(`Data Length: ${doc.data_length || 0} chars`)
        console.log(`Created: ${doc.created_at}`)
        console.log('---')
      }
    }

    await pool.end()
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

checkDocs()
