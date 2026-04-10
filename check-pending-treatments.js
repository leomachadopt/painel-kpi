// Script para verificar tratamentos pendentes
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'
})

async function checkPendingTreatments() {
  const client = await pool.connect()

  try {
    console.log('🔍 Verificando tratamentos pendentes para P-0001...\n')

    const result = await client.query(
      `SELECT
        pt.id,
        pt.description,
        pt.unit_value,
        pt.total_quantity,
        pt.pending_quantity,
        pt.created_at
       FROM pending_treatments pt
       INNER JOIN pending_treatment_patients ptp ON pt.pending_treatment_patient_id = ptp.id
       WHERE ptp.clinic_id = 'clinic-1767296701478'
         AND ptp.patient_code = 'P-0001'
       ORDER BY pt.created_at DESC`,
    )

    if (result.rows.length === 0) {
      console.log('❌ Nenhum tratamento pendente encontrado')
      return
    }

    console.log(`📋 Encontrados ${result.rows.length} tratamentos pendentes:\n`)

    let totalValue = 0
    result.rows.forEach((treatment, index) => {
      console.log(`${index + 1}. ${treatment.description}`)
      console.log(`   Valor unitário: €${treatment.unit_value}`)
      console.log(`   Quantidade total: ${treatment.total_quantity}`)
      console.log(`   Quantidade pendente: ${treatment.pending_quantity}`)
      console.log(`   Criado em: ${treatment.created_at}`)
      console.log('')

      totalValue += parseFloat(treatment.unit_value) * parseInt(treatment.pending_quantity)
    })

    console.log(`💰 Valor total pendente: €${totalValue.toFixed(2)}`)

  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    client.release()
    await pool.end()
  }
}

checkPendingTreatments()
