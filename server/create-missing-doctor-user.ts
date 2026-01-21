import pg from 'pg'

const { Pool } = pg

const connectionString = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'

async function createMissingUser() {
  const pool = new Pool({ connectionString })

  try {
    // Verificar se Dr. Paulo já tem usuário
    const existingUser = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      ['sorrisosradiante@hotmail.com']
    )

    if (existingUser.rows.length > 0) {
      console.log('✅ Dr. Paulo já tem usuário criado')
      return
    }

    // Buscar clínica
    const clinicResult = await pool.query(
      `SELECT c.id, c.name
       FROM clinics c
       JOIN users u ON u.clinic_id = c.id
       WHERE u.email = $1 AND u.role = 'GESTOR_CLINICA'
       LIMIT 1`,
      ['martinscristiane73@gmail.com']
    )

    if (clinicResult.rows.length === 0) {
      throw new Error('❌ Clínica não encontrada')
    }

    const clinic = clinicResult.rows[0]
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const email = 'sorrisosradiante@hotmail.com'
    const password = 'cmartins123'
    const name = 'Dr. Paulo'

    console.log(`🔄 Criando usuário para ${name}...`)

    await pool.query(
      `INSERT INTO users (id, email, password_hash, role, clinic_id, name, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [userId, email, password, 'COLABORADOR', clinic.id, name]
    )

    console.log(`✅ Usuário criado com sucesso!`)
    console.log(`   Email: ${email}`)
    console.log(`   Senha: ${password}`)
    console.log(`   Role: COLABORADOR`)
    console.log(`   Clínica: ${clinic.name}`)

  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await pool.end()
  }
}

createMissingUser()
