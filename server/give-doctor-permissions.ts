import pg from 'pg'

const { Pool } = pg

const connectionString = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'

async function giveDoctorPermissions() {
  const pool = new Pool({ connectionString })

  try {
    console.log('🔄 Dando permissões ao Dr. Paulo...\n')

    // Buscar ID do Dr. Paulo
    const userResult = await pool.query(
      `SELECT id, name, clinic_id FROM users WHERE email = $1`,
      ['sorrisosradiante@hotmail.com']
    )

    if (userResult.rows.length === 0) {
      console.log('❌ Dr. Paulo não encontrado')
      return
    }

    const user = userResult.rows[0]

    // Verificar se já tem permissões
    const permCheck = await pool.query(
      `SELECT id FROM user_permissions WHERE user_id = $1`,
      [user.id]
    )

    if (permCheck.rows.length > 0) {
      // Atualizar permissões existentes
      await pool.query(
        `UPDATE user_permissions SET
          can_view_reports = true,
          can_edit_consultations = true,
          can_view_report_consultations = true
         WHERE user_id = $1`,
        [user.id]
      )
      console.log('✅ Permissões atualizadas para Dr. Paulo')
    } else {
      // Criar permissões
      const permId = `perm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      await pool.query(
        `INSERT INTO user_permissions (
          id,
          user_id,
          clinic_id,
          can_view_reports,
          can_edit_consultations,
          can_view_report_consultations
        ) VALUES ($1, $2, $3, true, true, true)`,
        [permId, user.id, user.clinic_id]
      )
      console.log('✅ Permissões criadas para Dr. Paulo')
    }

    console.log('   - Visualizar Relatórios: ✅')
    console.log('   - Editar 1.ªs Consultas: ✅')
    console.log('   - Ver Relatório de 1.ªs Consultas: ✅')

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

giveDoctorPermissions()
