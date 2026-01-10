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

async function checkDuplicates() {
  try {
    console.log('🔍 Checking for duplicate billing batches...\n')

    // Check for contracts with multiple batches
    const result = await pool.query(`
      SELECT
        contract_id,
        COUNT(*) as batch_count,
        SUM(total_amount::numeric) as total_billed,
        STRING_AGG(batch_number || ' (' || total_amount || ')', ', ' ORDER BY created_at) as batches
      FROM billing_batches
      WHERE status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
      GROUP BY contract_id
      HAVING COUNT(*) > 1
      ORDER BY batch_count DESC
      LIMIT 5
    `)

    if (result.rows.length === 0) {
      console.log('✅ No contracts with multiple batches found')
    } else {
      console.log(`Found ${result.rows.length} contracts with multiple batches:\n`)
      result.rows.forEach(row => {
        console.log(`Contract: ${row.contract_id}`)
        console.log(`  Batches: ${row.batch_count}`)
        console.log(`  Total Billed: €${parseFloat(row.total_billed).toFixed(2)}`)
        console.log(`  Details: ${row.batches}`)
        console.log('')
      })
    }

    // Check for potential issues with the sum calculation
    console.log('\n🔍 Checking individual contract totals vs manual calculation...\n')

    const contracts = await pool.query(`
      SELECT DISTINCT contract_id
      FROM billing_batches
      WHERE status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
      LIMIT 3
    `)

    for (const { contract_id } of contracts.rows) {
      const batches = await pool.query(`
        SELECT id, batch_number, total_amount
        FROM billing_batches
        WHERE contract_id = $1
          AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
        ORDER BY created_at
      `, [contract_id])

      const sumQuery = await pool.query(`
        SELECT SUM(total_amount::numeric) as total
        FROM billing_batches
        WHERE contract_id = $1
          AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
      `, [contract_id])

      console.log(`Contract: ${contract_id}`)
      console.log(`  Number of batches: ${batches.rows.length}`)
      batches.rows.forEach((b, i) => {
        console.log(`  Batch ${i + 1}: ${b.batch_number} - €${parseFloat(b.total_amount).toFixed(2)}`)
      })
      const manualSum = batches.rows.reduce((sum, b) => sum + parseFloat(b.total_amount), 0)
      const dbSum = parseFloat(sumQuery.rows[0].total)
      console.log(`  Manual Sum: €${manualSum.toFixed(2)}`)
      console.log(`  DB SUM(): €${dbSum.toFixed(2)}`)
      console.log(`  Match: ${manualSum === dbSum ? '✅' : '❌'}`)
      console.log('')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

checkDuplicates()
