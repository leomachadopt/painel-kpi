// Script para debugar problemas de sincronização
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'
})

async function debugSync() {
  const client = await pool.connect()

  try {
    console.log('🔍 Investigando sincronização para P-0001...\n')

    // 1. Estado da consulta
    console.log('1️⃣ Estado da Daily Consultation Entry:')
    const entryResult = await client.query(
      `SELECT
        id, code, patient_name,
        waiting_start, in_execution, plan_finished,
        plan_procedures_total, plan_procedures_completed
       FROM daily_consultation_entries
       WHERE code = 'P-0001' AND clinic_id = 'clinic-1767296701478'`
    )
    console.table(entryResult.rows)

    // 2. Estado dos plan_procedures
    console.log('\n2️⃣ Estado dos Plan Procedures:')
    const procResult = await client.query(
      `SELECT
        pp.id,
        pp.procedure_code,
        pp.procedure_description,
        pp.completed,
        pp.completed_at,
        pp.pending_treatment_id,
        pp.price_at_creation
       FROM plan_procedures pp
       INNER JOIN daily_consultation_entries dce ON pp.consultation_entry_id = dce.id
       WHERE dce.code = 'P-0001' AND dce.clinic_id = 'clinic-1767296701478'
       ORDER BY pp.sort_order`
    )
    console.table(procResult.rows)

    // 3. Estado dos pending_treatments
    console.log('\n3️⃣ Estado dos Pending Treatments:')
    const pendingResult = await client.query(
      `SELECT
        pt.id,
        pt.description,
        pt.status,
        pt.total_quantity,
        pt.pending_quantity,
        pt.unit_value,
        pt.plan_procedure_id
       FROM pending_treatments pt
       INNER JOIN pending_treatment_patients ptp ON pt.pending_treatment_patient_id = ptp.id
       WHERE ptp.patient_code = 'P-0001' AND ptp.clinic_id = 'clinic-1767296701478'
       ORDER BY pt.created_at`
    )
    console.table(pendingResult.rows)

    // 4. Verificar links
    console.log('\n4️⃣ Verificação de Links Bidirecionais:')
    const linksResult = await client.query(
      `SELECT
        pp.id as proc_id,
        pp.procedure_code,
        pp.completed as proc_completed,
        pp.pending_treatment_id,
        pt.id as treatment_id,
        pt.status as treatment_status,
        pt.plan_procedure_id,
        CASE
          WHEN pp.pending_treatment_id = pt.id THEN '✅'
          ELSE '❌'
        END as link_forward,
        CASE
          WHEN pt.plan_procedure_id = pp.id THEN '✅'
          ELSE '❌'
        END as link_backward
       FROM plan_procedures pp
       INNER JOIN daily_consultation_entries dce ON pp.consultation_entry_id = dce.id
       LEFT JOIN pending_treatments pt ON pp.pending_treatment_id = pt.id
       WHERE dce.code = 'P-0001' AND dce.clinic_id = 'clinic-1767296701478'`
    )
    console.table(linksResult.rows)

  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    client.release()
    await pool.end()
  }
}

debugSync()
