import pg from 'pg'

const { Pool } = pg

const connectionString = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'

async function checkDoctorConsultations() {
  const pool = new Pool({ connectionString })

  try {
    console.log('🔍 Verificando médicos e suas consultas...\n')

    const result = await pool.query(`
      SELECT
        cd.name as doctor_name,
        cd.email,
        cd.id as doctor_id,
        COUNT(dce.id) as total_consultations
      FROM clinic_doctors cd
      LEFT JOIN daily_consultation_entries dce ON dce.doctor_id = cd.id
      WHERE cd.clinic_id = 'clinic-1767296701478'
        AND cd.email IS NOT NULL
      GROUP BY cd.id, cd.name, cd.email
      ORDER BY total_consultations DESC
    `)

    console.log('📊 Resultado:')
    console.log('─'.repeat(80))
    result.rows.forEach((row) => {
      console.log(`${row.doctor_name.padEnd(30)} | ${row.email.padEnd(35)} | ${row.total_consultations} consultas`)
    })
    console.log('─'.repeat(80))

    // Verificar usuários criados
    console.log('\n👤 Verificando usuários criados para esses médicos:\n')

    const usersResult = await pool.query(`
      SELECT
        u.name,
        u.email,
        u.role,
        u.active
      FROM users u
      WHERE u.email IN (
        SELECT email FROM clinic_doctors WHERE clinic_id = 'clinic-1767296701478' AND email IS NOT NULL
      )
      ORDER BY u.name
    `)

    console.log('─'.repeat(80))
    usersResult.rows.forEach((row) => {
      const status = row.active ? '✅' : '❌'
      console.log(`${status} ${row.name.padEnd(30)} | ${row.email.padEnd(35)} | ${row.role}`)
    })
    console.log('─'.repeat(80))

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

checkDoctorConsultations()
