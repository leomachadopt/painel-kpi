const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require',
})

async function debugContract() {
  try {
    const contractId = 'contract-clinic-1767296701478-1768050786185-xba8i8v5'

    console.log('🔍 Debugging contract:', contractId)
    console.log('\n1. Payments (Total Advanced):\n')

    const payments = await pool.query(`
      SELECT id, amount, payment_date, created_at
      FROM advance_payments
      WHERE contract_id = $1
      ORDER BY created_at
    `, [contractId])

    payments.rows.forEach((p, i) => {
      console.log(`  Payment ${i + 1}: €${parseFloat(p.amount).toFixed(2)} (${p.payment_date})`)
    })

    const paymentSum = payments.rows.reduce((sum, p) => sum + parseFloat(p.amount), 0)
    console.log(`  \nTotal Advanced: €${paymentSum.toFixed(2)}`)

    console.log('\n2. Billing Batches (Total Billed):\n')

    const batches = await pool.query(`
      SELECT id, batch_number, total_amount, status, created_at
      FROM billing_batches
      WHERE contract_id = $1
      ORDER BY created_at
    `, [contractId])

    batches.rows.forEach((b, i) => {
      console.log(`  Batch ${i + 1}: ${b.batch_number} - €${parseFloat(b.total_amount).toFixed(2)} (${b.status})`)
    })

    const batchSum = batches.rows
      .filter(b => ['ISSUED', 'PAID', 'PARTIALLY_PAID'].includes(b.status))
      .reduce((sum, b) => sum + parseFloat(b.total_amount), 0)

    console.log(`  \nTotal Billed: €${batchSum.toFixed(2)}`)
    console.log(`  Balance: €${(paymentSum - batchSum).toFixed(2)}`)

    console.log('\n3. What the API returns:\n')

    const apiResult = await pool.query(`
      SELECT
        ac.id,
        ac.contract_number,
        p.name AS patient_name
       FROM advance_contracts ac
       LEFT JOIN patients p ON ac.patient_id = p.id
       WHERE ac.id = $1
    `, [contractId])

    const contract = apiResult.rows[0]

    // Get total advanced
    const paymentsResult = await pool.query(`
      SELECT SUM(amount::numeric) as total
       FROM advance_payments
       WHERE contract_id = $1
    `, [contract.id])

    const totalAdvanced = parseFloat(paymentsResult.rows[0]?.total || '0')

    // Get total billed
    const batchesResult = await pool.query(`
      SELECT SUM(total_amount::numeric) as total
       FROM billing_batches
       WHERE contract_id = $1
         AND status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
    `, [contract.id])

    const totalBilled = parseFloat(batchesResult.rows[0]?.total || '0')

    console.log(`  Patient: ${contract.patient_name}`)
    console.log(`  Total Advanced: €${totalAdvanced.toFixed(2)}`)
    console.log(`  Total Billed: €${totalBilled.toFixed(2)}`)
    console.log(`  Balance to Bill: €${(totalAdvanced - totalBilled).toFixed(2)}`)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await pool.end()
  }
}

debugContract()
