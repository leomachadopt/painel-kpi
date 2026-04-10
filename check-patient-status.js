// Script para verificar status do paciente
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'
})

async function checkStatus() {
  const client = await pool.connect()

  try {
    console.log('🔍 Verificando status do paciente P-0001...\n')

    const result = await client.query(
      `SELECT
        code,
        patient_name,
        plan_created,
        plan_presented,
        plan_presented_at,
        waiting_start,
        waiting_start_at,
        in_execution,
        plan_finished,
        abandoned
       FROM daily_consultation_entries
       WHERE code = 'P-0001'
       AND clinic_id = 'clinic-1767296701478'`,
    )

    if (result.rows.length === 0) {
      console.log('❌ Paciente não encontrado')
      return
    }

    const patient = result.rows[0]
    console.log('📋 Status atual:')
    console.log(`   Paciente: ${patient.patient_name} (${patient.code})`)
    console.log(`   ✅ plan_created: ${patient.plan_created}`)
    console.log(`   📝 plan_presented: ${patient.plan_presented}`)
    console.log(`   📅 plan_presented_at: ${patient.plan_presented_at}`)
    console.log(`   ⏳ waiting_start: ${patient.waiting_start}`)
    console.log(`   📅 waiting_start_at: ${patient.waiting_start_at}`)
    console.log(`   🚀 in_execution: ${patient.in_execution}`)
    console.log(`   ✔️  plan_finished: ${patient.plan_finished}`)
    console.log(`   ❌ abandoned: ${patient.abandoned}`)

  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    client.release()
    await pool.end()
  }
}

checkStatus()
