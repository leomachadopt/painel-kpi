import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function diagnoseDoctorMismatch() {
  const client = await pool.connect();

  try {
    console.log('\n🔍 DIAGNÓSTICO: Médicas com dados incorretos\n');
    console.log('=' .repeat(70));

    // 1. Listar todos os usuários com role MEDICO
    console.log('\n1️⃣  USUÁRIOS COM ROLE MEDICO:');
    const medicos = await client.query(`
      SELECT u.id, u.name as user_name, u.email as user_email, u.clinic_id, u.active
      FROM users u
      WHERE u.role = 'MEDICO'
      ORDER BY u.clinic_id, u.name
    `);

    if (medicos.rows.length === 0) {
      console.log('   ⚠️  Nenhum usuário com role MEDICO encontrado\n');
    } else {
      console.log(`   Total: ${medicos.rows.length} usuários\n`);

      for (const medico of medicos.rows) {
        console.log(`\n   👤 ${medico.user_name} (${medico.user_email})`);
        console.log(`      User ID: ${medico.id}`);
        console.log(`      Clinic ID: ${medico.clinic_id}`);
        console.log(`      Active: ${medico.active}`);

        // Buscar registros em clinic_doctors com este email
        const doctorsWithEmail = await client.query(`
          SELECT id, name, email, whatsapp, clinic_id
          FROM clinic_doctors
          WHERE email = $1
          ORDER BY clinic_id
        `, [medico.user_email]);

        console.log(`\n      🔗 Registros em clinic_doctors com este email:`);
        if (doctorsWithEmail.rows.length === 0) {
          console.log(`      ❌ NENHUM registro encontrado!`);
          console.log(`      ⚠️  Este usuário não conseguirá ver seus dados!`);
        } else if (doctorsWithEmail.rows.length > 1) {
          console.log(`      ⚠️  MÚLTIPLOS registros encontrados (${doctorsWithEmail.rows.length}):`);
          for (const doc of doctorsWithEmail.rows) {
            console.log(`         - ${doc.name} | ID: ${doc.id} | Clinic: ${doc.clinic_id}`);
          }
          console.log(`      ⚠️  PROBLEMA: Pode estar vendo dados de outro médico!`);
        } else {
          const doc = doctorsWithEmail.rows[0];
          console.log(`      ✅ 1 registro encontrado:`);
          console.log(`         - Nome: ${doc.name}`);
          console.log(`         - Doctor ID: ${doc.id}`);
          console.log(`         - Clinic ID: ${doc.clinic_id}`);

          if (doc.clinic_id !== medico.clinic_id) {
            console.log(`      ⚠️  PROBLEMA: Clínicas diferentes!`);
            console.log(`      - Usuário está na clínica: ${medico.clinic_id}`);
            console.log(`      - Doctor está na clínica: ${doc.clinic_id}`);
          }

          // Contar dados associados a este doctor_id
          const consultasCount = await client.query(`
            SELECT COUNT(*) as total FROM daily_consultation_entries
            WHERE doctor_id = $1
          `, [doc.id]);

          const agendamentosCount = await client.query(`
            SELECT COUNT(*) as total FROM appointments
            WHERE doctor_id = $1
          `, [doc.id]);

          console.log(`\n      📊 Dados associados a este doctor_id:`);
          console.log(`         - Consultas: ${consultasCount.rows[0].total}`);
          console.log(`         - Agendamentos: ${agendamentosCount.rows[0].total}`);
        }

        // Buscar outros doctors na mesma clínica com nomes similares
        const similarDoctors = await client.query(`
          SELECT id, name, email, whatsapp
          FROM clinic_doctors
          WHERE clinic_id = $1
            AND id != ALL(SELECT id FROM clinic_doctors WHERE email = $2)
            AND (LOWER(name) LIKE LOWER($3) OR LOWER($3) LIKE LOWER(name))
          ORDER BY name
        `, [medico.clinic_id, medico.user_email, `%${medico.user_name.split(' ')[0]}%`]);

        if (similarDoctors.rows.length > 0) {
          console.log(`\n      🔎 Médicos com nomes similares na mesma clínica:`);
          for (const sim of similarDoctors.rows) {
            console.log(`         - ${sim.name} | Email: ${sim.email || 'não cadastrado'} | ID: ${sim.id}`);

            // Contar dados
            const simConsultas = await client.query(`
              SELECT COUNT(*) as total FROM daily_consultation_entries
              WHERE doctor_id = $1
            `, [sim.id]);

            const simAgendamentos = await client.query(`
              SELECT COUNT(*) as total FROM appointments
              WHERE doctor_id = $1
            `, [sim.id]);

            console.log(`           Consultas: ${simConsultas.rows[0].total} | Agendamentos: ${simAgendamentos.rows[0].total}`);
          }
        }

        console.log('\n      ' + '-'.repeat(60));
      }
    }

    // 2. Listar clinic_doctors sem usuário correspondente
    console.log('\n\n2️⃣  MÉDICOS EM clinic_doctors SEM USUÁRIO:');
    const doctorsWithoutUser = await client.query(`
      SELECT cd.id, cd.name, cd.email, cd.clinic_id, cd.whatsapp
      FROM clinic_doctors cd
      LEFT JOIN users u ON cd.email = u.email AND cd.clinic_id = u.clinic_id
      WHERE u.id IS NULL
      ORDER BY cd.clinic_id, cd.name
    `);

    if (doctorsWithoutUser.rows.length === 0) {
      console.log('   ✅ Todos os médicos têm usuário correspondente\n');
    } else {
      console.log(`   Total: ${doctorsWithoutUser.rows.length} médicos sem usuário\n`);
      for (const doc of doctorsWithoutUser.rows) {
        console.log(`   - ${doc.name}`);
        console.log(`     Email: ${doc.email || 'não cadastrado'}`);
        console.log(`     Clinic: ${doc.clinic_id}`);
        console.log(`     Doctor ID: ${doc.id}`);

        // Contar dados
        const consultas = await client.query(`
          SELECT COUNT(*) as total FROM daily_consultation_entries
          WHERE doctor_id = $1
        `, [doc.id]);

        const agendamentos = await client.query(`
          SELECT COUNT(*) as total FROM appointments
          WHERE doctor_id = $1
        `, [doc.id]);

        console.log(`     Consultas: ${consultas.rows[0].total} | Agendamentos: ${agendamentos.rows[0].total}`);
        console.log('');
      }
    }

    // 3. Emails duplicados em clinic_doctors
    console.log('\n3️⃣  EMAILS DUPLICADOS EM clinic_doctors:');
    const duplicateEmails = await client.query(`
      SELECT email, COUNT(*) as count, array_agg(id) as doctor_ids, array_agg(name) as names
      FROM clinic_doctors
      WHERE email IS NOT NULL
      GROUP BY email
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    if (duplicateEmails.rows.length === 0) {
      console.log('   ✅ Nenhum email duplicado encontrado\n');
    } else {
      console.log(`   ⚠️  ${duplicateEmails.rows.length} emails duplicados:\n`);
      for (const dup of duplicateEmails.rows) {
        console.log(`   📧 ${dup.email} (${dup.count} registros):`);
        for (let i = 0; i < dup.doctor_ids.length; i++) {
          console.log(`      - ${dup.names[i]} | ID: ${dup.doctor_ids[i]}`);
        }
        console.log('');
      }
    }

    console.log('=' .repeat(70));
    console.log('✅ Diagnóstico completo!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseDoctorMismatch().catch(console.error);
