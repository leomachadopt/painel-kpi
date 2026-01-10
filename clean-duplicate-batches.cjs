const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require',
})

async function cleanDuplicates() {
  try {
    console.log('🧹 Cleaning duplicate batches...\n')

    // Find duplicates (same contract, same amount, created within 10 seconds of each other)
    const duplicatesQuery = `
      WITH batches_with_rank AS (
        SELECT
          id,
          contract_id,
          batch_number,
          total_amount,
          created_at,
          ROW_NUMBER() OVER (
            PARTITION BY contract_id, total_amount::numeric
            ORDER BY created_at ASC
          ) as rn
        FROM billing_batches
        WHERE status IN ('ISSUED', 'PAID', 'PARTIALLY_PAID')
      ),
      duplicates AS (
        SELECT
          b1.id as keep_id,
          b1.batch_number as keep_batch,
          b2.id as delete_id,
          b2.batch_number as delete_batch,
          b1.contract_id,
          b1.total_amount
        FROM batches_with_rank b1
        INNER JOIN batches_with_rank b2
          ON b1.contract_id = b2.contract_id
          AND b1.total_amount = b2.total_amount
          AND b1.rn = 1  -- Keep first one
          AND b2.rn = 2  -- Delete second one
          AND b2.created_at - b1.created_at < INTERVAL '10 seconds'
      )
      SELECT * FROM duplicates
    `

    const result = await pool.query(duplicatesQuery)

    if (result.rows.length === 0) {
      console.log('✅ No duplicates found!')
      return
    }

    console.log(`Found ${result.rows.length} duplicate batch(es):\n`)

    for (const dup of result.rows) {
      console.log(`Contract: ${dup.contract_id}`)
      console.log(`  Amount: €${parseFloat(dup.total_amount).toFixed(2)}`)
      console.log(`  Keeping: ${dup.keep_batch}`)
      console.log(`  Deleting: ${dup.delete_batch}`)

      // Delete items first (foreign key)
      await pool.query(
        'DELETE FROM billing_items WHERE batch_id = $1',
        [dup.delete_id]
      )
      console.log(`    ✓ Deleted items`)

      // Delete batch
      await pool.query(
        'DELETE FROM billing_batches WHERE id = $1',
        [dup.delete_id]
      )
      console.log(`    ✓ Deleted batch`)
      console.log('')
    }

    console.log(`✅ Cleaned ${result.rows.length} duplicate batch(es)`)

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await pool.end()
  }
}

cleanDuplicates()
