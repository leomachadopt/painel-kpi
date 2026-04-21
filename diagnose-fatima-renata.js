import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function diagnoseFatimaRenata() {
  const client = await pool.connect();

  try {
    console.log('\n🔍 DIAGNÓSTICO ESPECÍFICO: Dra. Fátima vendo dados da Dra. Renata\n');
    console.log('=' .repeat(70));

    // Buscar informações da Dra. Fátima
    console.log('\n1️⃣  DRA. FÁTIMA:');
    const fatima = await client.query(`
      SELECT u.id, u.name, u.email, u.clinic_id
      FROM users u
      WHERE u.email = 'fatimahartenbach@gmail.com'
    `);

    if (fatima.rows.length === 0) {
      console.log('   ❌ Usuária não encontrada!');
      return;
    }

    const fatimaUser = fatima.rows[0];
    console.log(`   Nome: ${fatimaUser.name}`);
    console.log(`   Email: ${fatimaUser.email}`);
    console.log(`   User ID: ${fatimaUser.id}`);
    console.log(`   Clinic ID: ${fatimaUser.clinic_id}`);

    // Buscar doctor_id da Fátima
    const fatimaDoctor = await client.query(`
      SELECT id, name, email
      FROM clinic_doctors
      WHERE email = $1 AND clinic_id = $2
    `, [fatimaUser.email, fatimaUser.clinic_id]);

    if (fatimaDoctor.rows.length === 0) {
      console.log('   ❌ Doctor_id não encontrado!');
      return;
    }

    const fatimaDoctorId = fatimaDoctor.rows[0].id;
    console.log(`\n   Doctor ID que deveria ser usado: ${fatimaDoctorId}`);
    console.log(`   Nome em clinic_doctors: ${fatimaDoctor.rows[0].name}`);

    // Contar consultas da Fátima
    const fatimaConsultas = await client.query(`
      SELECT COUNT(*) as total,
             array_agg(code) as codes,
             array_agg(patient_name) as patients
      FROM daily_consultation_entries
      WHERE doctor_id = $1
      LIMIT 10
    `, [fatimaDoctorId]);

    console.log(`\n   📊 Consultas com doctor_id da Fátima (${fatimaDoctorId}):`);
    console.log(`      Total: ${fatimaConsultas.rows[0].total}`);
    if (fatimaConsultas.rows[0].total > 0) {
      console.log(`      Pacientes:`);
      for (let i = 0; i < Math.min(5, fatimaConsultas.rows[0].codes.length); i++) {
        console.log(`         - ${fatimaConsultas.rows[0].codes[i]}: ${fatimaConsultas.rows[0].patients[i]}`);
      }
    }

    // Buscar informações da Dra. Renata
    console.log('\n\n2️⃣  DRA. RENATA:');
    const renata = await client.query(`
      SELECT u.id, u.name, u.email, u.clinic_id
      FROM users u
      WHERE u.email = 'renata.aquino.montei@terra.com.br'
    `);

    if (renata.rows.length === 0) {
      console.log('   ❌ Usuária não encontrada!');
      return;
    }

    const renataUser = renata.rows[0];
    console.log(`   Nome: ${renataUser.name}`);
    console.log(`   Email: ${renataUser.email}`);
    console.log(`   User ID: ${renataUser.id}`);
    console.log(`   Clinic ID: ${renataUser.clinic_id}`);

    // Buscar doctor_id da Renata
    const renataDoctor = await client.query(`
      SELECT id, name, email
      FROM clinic_doctors
      WHERE email = $1 AND clinic_id = $2
    `, [renataUser.email, renataUser.clinic_id]);

    if (renataDoctor.rows.length === 0) {
      console.log('   ❌ Doctor_id não encontrado!');
      return;
    }

    const renataDoctorId = renataDoctor.rows[0].id;
    console.log(`\n   Doctor ID da Renata: ${renataDoctorId}`);
    console.log(`   Nome em clinic_doctors: ${renataDoctor.rows[0].name}`);

    // Contar consultas da Renata
    const renataConsultas = await client.query(`
      SELECT COUNT(*) as total,
             array_agg(code) as codes,
             array_agg(patient_name) as patients
      FROM daily_consultation_entries
      WHERE doctor_id = $1
      LIMIT 10
    `, [renataDoctorId]);

    console.log(`\n   📊 Consultas com doctor_id da Renata (${renataDoctorId}):`);
    console.log(`      Total: ${renataConsultas.rows[0].total}`);
    if (renataConsultas.rows[0].total > 0) {
      console.log(`      Pacientes (primeiros 5):`);
      for (let i = 0; i < Math.min(5, renataConsultas.rows[0].codes.length); i++) {
        console.log(`         - ${renataConsultas.rows[0].codes[i]}: ${renataConsultas.rows[0].patients[i]}`);
      }
    }

    // Verificar se há consultas que deveriam ser da Fátima mas estão com doctor_id da Renata
    console.log('\n\n3️⃣  ANÁLISE DO PROBLEMA:');
    console.log(`\n   ❓ Por que a Dra. Fátima está vendo dados da Dra. Renata?`);
    console.log(`\n   Possíveis causas:`);
    console.log(`   1. Bug no código de filtro (usando doctor_id errado)`);
    console.log(`   2. Consultas com doctor_id incorreto no banco`);
    console.log(`   3. Permissões configuradas incorretamente`);

    // Verificar permissões da Fátima
    const fatimaPerms = await client.query(`
      SELECT can_view_all_doctors_consultations, can_edit_consultations
      FROM user_permissions
      WHERE user_id = $1 AND clinic_id = $2
    `, [fatimaUser.id, fatimaUser.clinic_id]);

    console.log(`\n   🔐 Permissões da Dra. Fátima:`);
    if (fatimaPerms.rows.length === 0) {
      console.log(`      ⚠️  SEM PERMISSÕES CADASTRADAS`);
    } else {
      const perms = fatimaPerms.rows[0];
      console.log(`      - can_view_all_doctors_consultations: ${perms.can_view_all_doctors_consultations}`);
      console.log(`      - can_edit_consultations: ${perms.can_edit_consultations}`);

      if (perms.can_view_all_doctors_consultations) {
        console.log(`\n      ⚠️  PROBLEMA ENCONTRADO!`);
        console.log(`      A Dra. Fátima tem permissão para ver TODAS as consultas.`);
        console.log(`      Isso está correto se ela for gestora/admin.`);
        console.log(`      Mas se ela é apenas médica, deveria ver só suas consultas.`);
      } else if (perms.can_edit_consultations) {
        console.log(`\n      ✅ Permissões parecem corretas.`);
        console.log(`      Ela deveria ver apenas suas consultas (filtradas por doctor_id).`);
      }
    }

    // Verificar role da Fátima
    const fatimaRole = await client.query(`
      SELECT role FROM users WHERE id = $1
    `, [fatimaUser.id]);

    console.log(`\n   👤 Role da Dra. Fátima: ${fatimaRole.rows[0].role}`);

    if (fatimaRole.rows[0].role === 'MEDICO') {
      console.log(`      ✅ Role correto (MEDICO)`);
      console.log(`      Ela deveria ver apenas consultas com doctor_id = ${fatimaDoctorId}`);
    }

    console.log('\n\n4️⃣  CONSULTAS SENDO EXIBIDAS PARA FÁTIMA (na imagem):');
    console.log(`   - JOÃO MIGUEL MONTEIRO DE PINHO (9106) → Dra. Renata`);
    console.log(`   - SUSANA ANDREIA OLIVEIRA LEITE (9032) → Dra. Renata`);
    console.log(`   - KAÊ FEITOSA GUIMARÃES (9086) → Dra. Renata`);
    console.log(`   - MANUEL DIAS VALENTE (9065) → Dra. Renata`);
    console.log(`   - FERNANDA CASSIA DA SILVA MORAIS (9112) → Dra. Renata`);
    console.log(`   - ANTÓNIO MANUEL DE ALMEIDA PINHO (9103) → Dra. Renata`);

    // Verificar essas consultas específicas
    const consultas = ['9106', '9032', '9086', '9065', '9112', '9103'];
    console.log(`\n   🔎 Verificando doctor_id dessas consultas no banco:`);

    for (const code of consultas) {
      const result = await client.query(`
        SELECT code, patient_name, doctor_id
        FROM daily_consultation_entries
        WHERE code = $1 AND clinic_id = $2
      `, [code, fatimaUser.clinic_id]);

      if (result.rows.length > 0) {
        const consulta = result.rows[0];
        const isRenata = consulta.doctor_id === renataDoctorId;
        const isFatima = consulta.doctor_id === fatimaDoctorId;

        console.log(`      ${code}: doctor_id = ${consulta.doctor_id || 'NULL'} ${isRenata ? '(Renata) ❌' : isFatima ? '(Fátima) ✅' : '(Outro médico)'}`);
      } else {
        console.log(`      ${code}: NÃO ENCONTRADO`);
      }
    }

    console.log('\n\n5️⃣  CONCLUSÃO:');
    console.log(`   Se as consultas acima têm doctor_id da Renata:`);
    console.log(`   → O problema é que o FILTRO não está funcionando corretamente`);
    console.log(`   → A Fátima está vendo TODAS as consultas em vez de apenas as dela`);
    console.log(`\n   Se as consultas acima têm doctor_id da Fátima:`);
    console.log(`   → O problema é que os dados estão corretos no banco`);
    console.log(`   → Mas a UI está mostrando "Dra. Renata" incorretamente`);

    console.log('\n' + '=' .repeat(70));
    console.log('✅ Diagnóstico completo!\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseFatimaRenata().catch(console.error);
