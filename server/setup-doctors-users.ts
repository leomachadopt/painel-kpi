import pg from 'pg'

const { Pool } = pg

const connectionString = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'

// Mapeamento: Nome do médico → Email
const doctorsEmails: Record<string, string> = {
  'Dr. Paulo': 'sorrisosradiante@hotmail.com',
  'Dra. Nícia': 'niciafilipa88@hotmail.com',
  'Dra. Mariana': 'marianabmonte@gmail.com',
  'Dra. Renata': 'renata.aquino.montei@terra.com.br',
  'Dra. Liliana': 'lilianadacosta_11338md@hotmail.com',
  'Dra. Fátima': 'fatimahartenbach@gmail.com',
  'Dr. Leonardo': 'leofmachado@gmail.com',
  'Dra. Thânia': 'thania@cristianemartins.pt',
  'Dra. Goreti Anjos': 'goreti@cristianemartins.pt',
}

async function setupDoctorsUsers() {
  const pool = new Pool({ connectionString })

  try {
    console.log('🔄 Iniciando configuração de médicos e usuários...\n')

    // 1. Buscar clínica da Dra. Cristiane Martins
    console.log('1️⃣ Buscando clínica da Dra. Cristiane Martins...')
    const clinicResult = await pool.query(
      `SELECT c.id, c.name
       FROM clinics c
       JOIN users u ON u.clinic_id = c.id
       WHERE u.email = $1 AND u.role = 'GESTOR_CLINICA'
       LIMIT 1`,
      ['martinscristiane73@gmail.com']
    )

    if (clinicResult.rows.length === 0) {
      throw new Error('❌ Clínica da Dra. Cristiane não encontrada')
    }

    const clinic = clinicResult.rows[0]
    console.log(`✅ Clínica encontrada: ${clinic.name} (ID: ${clinic.id})\n`)

    // 2. Buscar médicos dessa clínica
    console.log('2️⃣ Buscando médicos cadastrados...')
    const doctorsResult = await pool.query(
      `SELECT id, name, email FROM clinic_doctors WHERE clinic_id = $1`,
      [clinic.id]
    )

    console.log(`✅ ${doctorsResult.rows.length} médicos encontrados\n`)

    // 3. Associar emails aos médicos
    console.log('3️⃣ Associando emails aos médicos...')
    let emailsAssociated = 0

    for (const doctor of doctorsResult.rows) {
      const email = doctorsEmails[doctor.name]

      if (email) {
        // Verificar se já não tem email
        if (doctor.email) {
          console.log(`⏭️  ${doctor.name} já tem email: ${doctor.email}`)
          continue
        }

        await pool.query(
          `UPDATE clinic_doctors SET email = $1 WHERE id = $2`,
          [email, doctor.id]
        )
        console.log(`✅ ${doctor.name} → ${email}`)
        emailsAssociated++
      } else {
        console.log(`⚠️  ${doctor.name} não encontrado na lista de emails`)
      }
    }

    console.log(`\n✅ ${emailsAssociated} emails associados\n`)

    // 4. Criar usuários para os médicos
    console.log('4️⃣ Criando usuários para os médicos...')
    const password = 'cmartins123'
    let usersCreated = 0

    for (const [doctorName, email] of Object.entries(doctorsEmails)) {
      // Verificar se usuário já existe
      const existingUser = await pool.query(
        `SELECT id, email, role FROM users WHERE email = $1`,
        [email]
      )

      if (existingUser.rows.length > 0) {
        const user = existingUser.rows[0]
        console.log(`⏭️  ${doctorName} (${email}) já tem usuário - Role: ${user.role}`)
        continue
      }

      // Criar usuário
      const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      await pool.query(
        `INSERT INTO users (id, email, password_hash, role, clinic_id, name, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [userId, email, password, 'COLABORADOR', clinic.id, doctorName]
      )

      console.log(`✅ Usuário criado: ${doctorName} (${email})`)
      usersCreated++
    }

    console.log(`\n✅ ${usersCreated} usuários criados\n`)

    // 5. Resumo final
    console.log('📊 RESUMO FINAL:')
    console.log(`   Clínica: ${clinic.name}`)
    console.log(`   Médicos com email: ${emailsAssociated}`)
    console.log(`   Novos usuários criados: ${usersCreated}`)
    console.log(`   Senha inicial: ${password}`)
    console.log('\n✅ Configuração concluída com sucesso!')

  } catch (error) {
    console.error('\n❌ Erro durante configuração:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

setupDoctorsUsers()
