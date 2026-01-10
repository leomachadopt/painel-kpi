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

async function checkTiming() {
  try {
    const contractId = 'contract-clinic-1767296701478-1768050786185-xba8i8v5'

    const result = await pool.query(`
      SELECT
        id,
        batch_number,
        total_amount,
        created_at,
        LAG(created_at) OVER (ORDER BY created_at) as prev_created_at
      FROM billing_batches
      WHERE contract_id = $1
        AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
      ORDER BY created_at
    `, [contractId])

    console.log('📊 Timing analysis for batches:\n')

    result.rows.forEach((batch, i) => {
      console.log(`Batch ${i + 1}: ${batch.batch_number}`)
      console.log(`  Amount: €${parseFloat(batch.total_amount).toFixed(2)}`)
      console.log(`  Created: ${batch.created_at}`)

      if (batch.prev_created_at) {
        const diffMs = new Date(batch.created_at) - new Date(batch.prev_created_at)
        const diffSec = (diffMs / 1000).toFixed(2)
        console.log(`  Time since previous: ${diffSec}s`)
      }
      console.log('')
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkTiming()
