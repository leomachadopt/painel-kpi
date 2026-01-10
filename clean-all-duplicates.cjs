require('dotenv').config()
const { Pool } = require('pg')

if (!process.env.DATABASE_URL) {
  console.error('❌ Erro: DATABASE_URL não está definida no arquivo .env')
  process.exit(1)
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
})

async function cleanAll() {
  try {
    console.log('🧹 Cleaning duplicate batches...\n')

    // Find batches with 0 items (these are the failed duplicates)
    const emptyBatches = await pool.query(`
      SELECT bb.id, bb.batch_number, bb.contract_id, bb.total_amount, bb.created_at
      FROM billing_batches bb
      LEFT JOIN billing_items bi ON bb.id = bi.batch_id
      WHERE bb.status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
      GROUP BY bb.id, bb.batch_number, bb.contract_id, bb.total_amount, bb.created_at
      HAVING COUNT(bi.id) = 0
      ORDER BY bb.created_at DESC
    `)

    if (emptyBatches.rows.length === 0) {
      console.log('✅ No empty batches found')
    } else {
      console.log(`Found ${emptyBatches.rows.length} empty batch(es) to delete:\n`)

      for (const batch of emptyBatches.rows) {
        console.log(`Deleting: ${batch.batch_number} (€${parseFloat(batch.total_amount).toFixed(2)}) - ${batch.created_at}`)

        await pool.query('DELETE FROM billing_batches WHERE id = $1', [batch.id])
        console.log(`  ✓ Deleted\n`)
      }

      console.log(`✅ Cleaned ${emptyBatches.rows.length} empty batch(es)`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

cleanAll()
