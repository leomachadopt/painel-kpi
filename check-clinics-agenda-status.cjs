// Script para verificar o status da agenda de cada clínica
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'
})

async function checkStatus() {
  const client = await pool.connect()

  try {
    console.log('🔍 Verificando status da agenda para cada clínica...\n')

    // Get all clinics with their agenda status
    const clinicsResult = await client.query(
      `SELECT id, name, agenda_enabled FROM clinics WHERE active = true ORDER BY name`
    )

    console.log(`Total de clínicas: ${clinicsResult.rows.length}\n`)

    // For each clinic, check if it has schedules configured
    for (const clinic of clinicsResult.rows) {
      const schedulesResult = await client.query(
        `SELECT COUNT(*) as total,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
         FROM clinic_schedules
         WHERE clinic_id = $1`,
        [clinic.id]
      )

      const total = parseInt(schedulesResult.rows[0].total)
      const active = parseInt(schedulesResult.rows[0].active_count)

      console.log(`📍 ${clinic.name}`)
      console.log(`   ID: ${clinic.id}`)
      console.log(`   Agenda Habilitada: ${clinic.agenda_enabled ? '✅ SIM' : '❌ NÃO'}`)
      console.log(`   Total de horários: ${total}`)
      console.log(`   Horários ativos: ${active}`)

      if (!clinic.agenda_enabled) {
        console.log(`   ⚠️  Agenda desabilitada - não aparecerá no menu`)
      } else if (total === 0) {
        console.log(`   ⚠️  Nenhum horário configurado - agenda ficará vazia`)
      } else if (active === 0) {
        console.log(`   ⚠️  Todos os horários estão inativos - agenda ficará vazia`)
      } else {
        console.log(`   ✅ Agenda operacional!`)
      }
      console.log('')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

checkStatus()
