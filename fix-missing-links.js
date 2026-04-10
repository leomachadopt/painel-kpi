// Script para corrigir links faltantes entre plan_procedures e pending_treatments
import pg from 'pg'
const { Pool } = pg

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'
})

async function fixLinks() {
  const client = await pool.connect()

  try {
    console.log('🔧 Corrigindo links para P-0001...\n')

    // Buscar plan_procedures e pending_treatments na ordem certa
    const procResult = await client.query(
      `SELECT pp.id, pp.procedure_code, pp.procedure_description, pp.completed
       FROM plan_procedures pp
       INNER JOIN daily_consultation_entries dce ON pp.consultation_entry_id = dce.id
       WHERE dce.code = 'P-0001' AND dce.clinic_id = 'clinic-1767296701478'
       ORDER BY pp.sort_order`
    )

    const treatmentResult = await client.query(
      `SELECT pt.id, pt.description, pt.status
       FROM pending_treatments pt
       INNER JOIN pending_treatment_patients ptp ON pt.pending_treatment_patient_id = ptp.id
       WHERE ptp.patient_code = 'P-0001' AND ptp.clinic_id = 'clinic-1767296701478'
       ORDER BY pt.created_at`
    )

    const procedures = procResult.rows
    const treatments = treatmentResult.rows

    if (procedures.length !== treatments.length) {
      console.log(`⚠️ Quantidade diferente: ${procedures.length} procedimentos vs ${treatments.length} tratamentos`)
    }

    // Criar links bidirecionais
    for (let i = 0; i < Math.min(procedures.length, treatments.length); i++) {
      const proc = procedures[i]
      const treatment = treatments[i]

      console.log(`Linking ${i + 1}/${procedures.length}:`)
      console.log(`  Procedure: ${proc.procedure_code} - ${proc.procedure_description}`)
      console.log(`  Treatment: ${treatment.description}`)
      console.log(`  Status: proc.completed=${proc.completed}, treatment.status=${treatment.status}`)

      // Atualizar plan_procedure com link para pending_treatment
      await client.query(
        `UPDATE plan_procedures
         SET pending_treatment_id = $1
         WHERE id = $2`,
        [treatment.id, proc.id]
      )

      // Atualizar pending_treatment com link para plan_procedure
      await client.query(
        `UPDATE pending_treatments
         SET plan_procedure_id = $1
         WHERE id = $2`,
        [proc.id, treatment.id]
      )

      // Sincronizar status se necessário
      if (treatment.status === 'CONCLUIDO' && !proc.completed) {
        console.log(`  🔄 Syncing: Marking procedure as completed`)
        await client.query(
          `UPDATE plan_procedures
           SET completed = true,
               completed_at = NOW()
           WHERE id = $1`,
          [proc.id]
        )
      } else if (proc.completed && treatment.status !== 'CONCLUIDO') {
        console.log(`  🔄 Syncing: Marking treatment as completed`)
        await client.query(
          `UPDATE pending_treatments
           SET status = 'CONCLUIDO',
               pending_quantity = 0
           WHERE id = $1`,
          [treatment.id]
        )
      }

      console.log(`  ✅ Linked!\n`)
    }

    // Atualizar contadores na consulta
    const statsResult = await client.query(
      `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE completed = true) as completed
       FROM plan_procedures pp
       INNER JOIN daily_consultation_entries dce ON pp.consultation_entry_id = dce.id
       WHERE dce.code = 'P-0001' AND dce.clinic_id = 'clinic-1767296701478'`
    )

    const stats = statsResult.rows[0]
    const completedCount = parseInt(stats.completed)
    const totalCount = parseInt(stats.total)

    console.log(`📊 Stats: ${completedCount} de ${totalCount} procedimentos completados`)

    // Atualizar flags da consulta
    if (completedCount > 0 && completedCount < totalCount) {
      // Tem alguns completos mas não todos → Em Execução
      await client.query(
        `UPDATE daily_consultation_entries
         SET in_execution = true,
             in_execution_at = NOW(),
             waiting_start = false,
             plan_procedures_completed = $1,
             plan_procedures_total = $2
         WHERE code = 'P-0001' AND clinic_id = 'clinic-1767296701478'`,
        [completedCount, totalCount]
      )
      console.log('✅ Card movido para "Em Execução"')
    } else if (completedCount === totalCount && totalCount > 0) {
      // Todos completos → Finalizado
      await client.query(
        `UPDATE daily_consultation_entries
         SET plan_finished = true,
             plan_finished_at = NOW(),
             in_execution = false,
             waiting_start = false,
             plan_procedures_completed = $1,
             plan_procedures_total = $2
         WHERE code = 'P-0001' AND clinic_id = 'clinic-1767296701478'`,
        [completedCount, totalCount]
      )
      console.log('✅ Card movido para "Finalizado"')
    } else {
      // Atualizar apenas contadores
      await client.query(
        `UPDATE daily_consultation_entries
         SET plan_procedures_completed = $1,
             plan_procedures_total = $2
         WHERE code = 'P-0001' AND clinic_id = 'clinic-1767296701478'`,
        [completedCount, totalCount]
      )
      console.log('✅ Contadores atualizados')
    }

    console.log('\n🎉 Correção completa!')

  } catch (error) {
    console.error('❌ Erro:', error.message)
    console.error(error)
  } finally {
    client.release()
    await pool.end()
  }
}

fixLinks()
