// Script para verificar horários configurados para cada clínica
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'
})

async function checkSchedules() {
  const client = await pool.connect()

  try {
    console.log('🔍 Verificando horários configurados para cada clínica...\n')

    // Get all clinics
    const clinicsResult = await client.query(
      `SELECT id, name FROM clinics ORDER BY name`
    )

    console.log(`Total de clínicas: ${clinicsResult.rows.length}\n`)

    // For each clinic, check schedules
    for (const clinic of clinicsResult.rows) {
      const schedulesResult = await client.query(
        `SELECT
          id,
          day_of_week,
          shift_name,
          start_time,
          end_time,
          is_active
         FROM clinic_schedules
         WHERE clinic_id = $1
         ORDER BY day_of_week, start_time`,
        [clinic.id]
      )

      console.log(`📍 ${clinic.name} (${clinic.id})`)
      console.log(`   Total de horários: ${schedulesResult.rows.length}`)

      if (schedulesResult.rows.length === 0) {
        console.log('   ⚠️  NENHUM HORÁRIO CONFIGURADO - A agenda não será exibida!')
      } else {
        console.log('   Horários:')
        const days = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
        schedulesResult.rows.forEach(schedule => {
          const active = schedule.is_active ? '✓' : '✗'
          console.log(`     ${active} ${days[schedule.day_of_week]}: ${schedule.start_time} - ${schedule.end_time} ${schedule.shift_name ? `(${schedule.shift_name})` : ''}`)
        })
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

checkSchedules()
