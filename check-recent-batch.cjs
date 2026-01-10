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

async function checkRecentBatch() {
  try {
    console.log('🔍 Checking batches with amount 253...\n')

    const result = await pool.query(`
      SELECT
        bb.id,
        bb.contract_id,
        bb.batch_number,
        bb.total_amount,
        bb.status,
        bb.created_at,
        COUNT(bi.id) as item_count
      FROM billing_batches bb
      LEFT JOIN billing_items bi ON bb.id = bi.batch_id
      WHERE bb.total_amount = 253
      GROUP BY bb.id, bb.contract_id, bb.batch_number, bb.total_amount, bb.status, bb.created_at
      ORDER BY bb.created_at DESC
    `)

    if (result.rows.length === 0) {
      console.log('No batches found with amount 253')
      return
    }

    console.log(`Found ${result.rows.length} batch(es) with amount €253:\n`)

    for (const batch of result.rows) {
      console.log(`Batch: ${batch.batch_number}`)
      console.log(`  ID: ${batch.id}`)
      console.log(`  Contract: ${batch.contract_id}`)
      console.log(`  Amount: €${parseFloat(batch.total_amount).toFixed(2)}`)
      console.log(`  Status: ${batch.status}`)
      console.log(`  Items: ${batch.item_count}`)
      console.log(`  Created: ${batch.created_at}`)
      console.log('')
    }

    // Check if there are duplicates
    const contractGroups = {}
    result.rows.forEach(batch => {
      if (!contractGroups[batch.contract_id]) {
        contractGroups[batch.contract_id] = []
      }
      contractGroups[batch.contract_id].push(batch)
    })

    Object.entries(contractGroups).forEach(([contractId, batches]) => {
      if (batches.length > 1) {
        console.log(`⚠️  DUPLICATE: Contract ${contractId} has ${batches.length} batches with €253`)
        batches.forEach((b, i) => {
          const timeDiff = i > 0
            ? ((new Date(b.created_at) - new Date(batches[i-1].created_at)) / 1000).toFixed(2)
            : 'N/A'
          console.log(`     ${i+1}. ${b.batch_number} (${timeDiff}s after previous)`)
        })
        console.log('')
      }
    })

    // Check what the contract summary shows
    if (result.rows.length > 0) {
      const contractId = result.rows[0].contract_id

      console.log(`\n📊 Checking contract ${contractId} totals:\n`)

      const paymentsResult = await pool.query(
        `SELECT SUM(amount::numeric) as total FROM advance_payments WHERE contract_id = $1`,
        [contractId]
      )

      const batchesResult = await pool.query(
        `SELECT SUM(total_amount::numeric) as total FROM billing_batches
         WHERE contract_id = $1 AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')`,
        [contractId]
      )

      const totalAdvanced = parseFloat(paymentsResult.rows[0]?.total || 0)
      const totalBilled = parseFloat(batchesResult.rows[0]?.total || 0)

      console.log(`Total Advanced: €${totalAdvanced.toFixed(2)}`)
      console.log(`Total Billed: €${totalBilled.toFixed(2)}`)
      console.log(`Balance: €${(totalAdvanced - totalBilled).toFixed(2)}`)
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkRecentBatch()
