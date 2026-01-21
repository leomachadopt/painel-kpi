import pg from 'pg'

const { Pool } = pg

const connectionString = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'

async function checkDoctorPermissions() {
  const pool = new Pool({ connectionString })

  try {
    console.log('🔍 Verificando permissões dos médicos...\n')

    // Buscar médicos e suas permissões
    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        up.can_edit_consultations
      FROM users u
      LEFT JOIN user_permissions up ON up.user_id = u.id
      WHERE u.email IN (
        SELECT email FROM clinic_doctors WHERE clinic_id = 'clinic-1767296701478' AND email IS NOT NULL
      )
      ORDER BY u.name
    `)

    console.log('📊 Médicos e suas permissões:')
    console.log('─'.repeat(100))
    result.rows.forEach((row) => {
      const hasPermission = row.can_edit_consultations ? '✅' : '❌'
      console.log(`${hasPermission} ${row.name.padEnd(30)} | ${row.email.padEnd(35)} | canEditConsultations: ${row.can_edit_consultations || false}`)
    })
    console.log('─'.repeat(100))

    // Contar quantos não têm permissão
    const withoutPermission = result.rows.filter(r => !r.can_edit_consultations)

    if (withoutPermission.length > 0) {
      console.log(`\n⚠️  ${withoutPermission.length} médicos sem permissão canEditConsultations`)
      console.log('💡 Para dar permissão, vá em Colaboradores → Permissões e ative "1.ªs Consultas" com nível "Editar"')
    } else {
      console.log('\n✅ Todos os médicos têm permissão canEditConsultations')
    }

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

checkDoctorPermissions()
