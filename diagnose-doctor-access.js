import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function diagnoseDoctorAccess() {
  const client = await pool.connect();

  try {
    const clinicId = 'clinic-1767296701478';

    console.log('🔍 DIAGNÓSTICO: Acesso de Médicos à Página de Planos e Consultas\n');
    console.log('==================================================================\n');

    // 1. Listar colaboradores da clínica
    console.log('1️⃣ COLABORADORES DA CLÍNICA:');
    const colaboradores = await client.query(
      `SELECT u.id, u.name, u.email, u.role, u.active
       FROM users u
       WHERE u.clinic_id = $1 AND u.role = 'COLABORADOR' AND u.active = true
       ORDER BY u.name`,
      [clinicId]
    );

    if (colaboradores.rows.length === 0) {
      console.log('   ⚠️  Nenhum colaborador encontrado\n');
    } else {
      colaboradores.rows.forEach(c => {
        console.log(`   - ${c.name} (${c.email})`);
      });
      console.log('');
    }

    // 2. Para cada colaborador, verificar permissões e associação com doctor
    for (const colaborador of colaboradores.rows) {
      console.log(`\n📋 COLABORADOR: ${colaborador.name} (${colaborador.email})`);
      console.log('   ' + '='.repeat(60));

      // Verificar permissões
      const perms = await client.query(
        `SELECT can_view_all_doctors_consultations, can_edit_consultations
         FROM user_permissions
         WHERE user_id = $1 AND clinic_id = $2`,
        [colaborador.id, clinicId]
      );

      if (perms.rows.length === 0) {
        console.log('   ⚠️  SEM PERMISSÕES CADASTRADAS');
      } else {
        const p = perms.rows[0];
        console.log(`   Permissões:`);
        console.log(`     - can_view_all_doctors_consultations: ${p.can_view_all_doctors_consultations}`);
        console.log(`     - can_edit_consultations: ${p.can_edit_consultations}`);

        // Verificar se é médico
        const doctor = await client.query(
          `SELECT id, name, email, whatsapp
           FROM clinic_doctors
           WHERE clinic_id = $1 AND email = $2`,
          [clinicId, colaborador.email]
        );

        if (doctor.rows.length > 0) {
          const d = doctor.rows[0];
          console.log(`\n   👨‍⚕️ É MÉDICO:`);
          console.log(`     - ID: ${d.id}`);
          console.log(`     - Nome: ${d.name}`);
          console.log(`     - Email: ${d.email}`);
          console.log(`     - WhatsApp: ${d.whatsapp || 'não cadastrado'}`);

          // Contar consultas deste médico
          const consultations = await client.query(
            `SELECT COUNT(*) as total
             FROM daily_consultation_entries
             WHERE clinic_id = $1 AND doctor_id = $2`,
            [clinicId, d.id]
          );

          console.log(`\n   📊 Consultas do médico: ${consultations.rows[0].total}`);

          // Resultado esperado
          console.log(`\n   🎯 RESULTADO ESPERADO NO SISTEMA:`);
          if (p.can_view_all_doctors_consultations) {
            console.log(`     ✅ Deve ver TODAS as consultas (tem can_view_all_doctors_consultations)`);
          } else if (p.can_edit_consultations) {
            console.log(`     ✅ Deve ver APENAS suas ${consultations.rows[0].total} consultas (filtrado por doctor_id)`);
          } else {
            console.log(`     ❌ NÃO deve ver nenhuma consulta (sem permissões)`);
          }
        } else {
          console.log(`\n   ℹ️  Não é médico (email não encontrado em clinic_doctors)`);

          if (p.can_view_all_doctors_consultations) {
            console.log(`\n   🎯 RESULTADO: Deve ver TODAS as consultas`);
          } else if (p.can_edit_consultations) {
            console.log(`\n   🎯 RESULTADO: Tentará filtrar por doctor_id, mas não encontrará → verá lista vazia`);
          } else {
            console.log(`\n   🎯 RESULTADO: Não deve ver nenhuma consulta`);
          }
        }
      }
    }

    // 3. Listar médicos sem usuário
    console.log('\n\n3️⃣ MÉDICOS SEM USUÁRIO (não podem acessar o sistema):');
    const doctorsWithoutUser = await client.query(
      `SELECT cd.id, cd.name, cd.email, cd.whatsapp
       FROM clinic_doctors cd
       LEFT JOIN users u ON cd.email = u.email AND cd.clinic_id = u.clinic_id
       WHERE cd.clinic_id = $1 AND u.id IS NULL
       ORDER BY cd.name`,
      [clinicId]
    );

    if (doctorsWithoutUser.rows.length === 0) {
      console.log('   ✅ Todos os médicos têm usuário cadastrado\n');
    } else {
      doctorsWithoutUser.rows.forEach(d => {
        console.log(`   - ${d.name} (${d.email || 'sem email'})`);
      });
      console.log('');
    }

    // 4. Estatísticas de consultas
    console.log('\n4️⃣ ESTATÍSTICAS DE CONSULTAS:');
    const stats = await client.query(
      `SELECT
         COUNT(*) as total,
         COUNT(doctor_id) as with_doctor,
         COUNT(*) - COUNT(doctor_id) as without_doctor
       FROM daily_consultation_entries
       WHERE clinic_id = $1`,
      [clinicId]
    );

    const s = stats.rows[0];
    console.log(`   Total de consultas: ${s.total}`);
    console.log(`   Com doctor_id: ${s.with_doctor} (${Math.round(s.with_doctor / s.total * 100)}%)`);
    console.log(`   Sem doctor_id: ${s.without_doctor} (${Math.round(s.without_doctor / s.total * 100)}%)`);

    if (s.without_doctor > 0) {
      console.log(`\n   ⚠️  ${s.without_doctor} consultas sem doctor_id não serão visíveis para médicos!`);
    }

    console.log('\n==================================================================');
    console.log('✅ Diagnóstico completo!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseDoctorAccess().catch(console.error);
