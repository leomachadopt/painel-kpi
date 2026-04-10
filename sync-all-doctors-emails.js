import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function syncAllDoctorsEmails() {
  const client = await pool.connect();

  try {
    console.log('🔄 SINCRONIZANDO EMAILS DE MÉDICOS - TODAS AS CLÍNICAS\n');
    console.log('==================================================================\n');

    // Listar todas as clínicas
    const clinics = await client.query(
      `SELECT id, name FROM clinics ORDER BY name`
    );

    console.log(`✅ Encontradas ${clinics.rows.length} clínicas\n`);

    let totalUpdated = 0;
    let totalDoctors = 0;
    let totalWithEmail = 0;

    await client.query('BEGIN');

    for (const clinic of clinics.rows) {
      console.log(`\n📍 CLÍNICA: ${clinic.name}`);
      console.log('   ' + '─'.repeat(60));

      // Buscar colaboradores médicos desta clínica
      const colaboradores = await client.query(
        `SELECT u.id, u.name, u.email
         FROM users u
         WHERE u.clinic_id = $1 AND u.role = 'COLABORADOR' AND u.active = true
         ORDER BY u.name`,
        [clinic.id]
      );

      if (colaboradores.rows.length === 0) {
        console.log('   ℹ️  Nenhum colaborador encontrado\n');
        continue;
      }

      console.log(`   ${colaboradores.rows.length} colaborador(es) encontrado(s)\n`);

      let clinicUpdated = 0;

      for (const colaborador of colaboradores.rows) {
        // Tentar encontrar médico pelo nome (simplificado)
        const nameSearch = colaborador.name.toLowerCase()
          .replace(/dr\.|dra\.|dr |dra /gi, '')
          .trim();

        const doctor = await client.query(
          `SELECT id, name, email
           FROM clinic_doctors
           WHERE clinic_id = $1
           AND (
             LOWER(REPLACE(REPLACE(REPLACE(REPLACE(name, 'Dr. ', ''), 'Dra. ', ''), 'Dr ', ''), 'Dra ', '')) LIKE $2
             OR LOWER(name) LIKE $2
           )
           ORDER BY
             CASE
               WHEN LOWER(REPLACE(REPLACE(REPLACE(REPLACE(name, 'Dr. ', ''), 'Dra. ', ''), 'Dr ', ''), 'Dra ', '')) = LOWER($3) THEN 1
               ELSE 2
             END,
             name
           LIMIT 1`,
          [clinic.id, `%${nameSearch}%`, nameSearch]
        );

        if (doctor.rows.length > 0) {
          const d = doctor.rows[0];

          if (!d.email) {
            // Atualizar email do médico
            await client.query(
              `UPDATE clinic_doctors
               SET email = $1
               WHERE id = $2`,
              [colaborador.email, d.id]
            );

            console.log(`   ✅ ${colaborador.name} → ${d.name}`);
            console.log(`      Email: ${colaborador.email}`);
            console.log(`      Doctor ID: ${d.id}`);

            clinicUpdated++;
            totalUpdated++;
          }
        }
      }

      if (clinicUpdated > 0) {
        console.log(`\n   📊 ${clinicUpdated} médico(s) atualizado(s) nesta clínica`);
      }
    }

    await client.query('COMMIT');

    console.log('\n\n==================================================================');
    console.log('📊 ESTATÍSTICAS GERAIS:\n');

    // Estatísticas globais
    const globalStats = await client.query(
      `SELECT
         COUNT(DISTINCT clinic_id) as total_clinics,
         COUNT(*) as total_doctors,
         COUNT(email) as doctors_with_email,
         COUNT(*) - COUNT(email) as doctors_without_email
       FROM clinic_doctors`
    );

    const stats = globalStats.rows[0];
    console.log(`   Clínicas no sistema: ${stats.total_clinics}`);
    console.log(`   Total de médicos: ${stats.total_doctors}`);
    console.log(`   Com email: ${stats.doctors_with_email} (${Math.round(stats.doctors_with_email / stats.total_doctors * 100)}%)`);
    console.log(`   Sem email: ${stats.doctors_without_email} (${Math.round(stats.doctors_without_email / stats.total_doctors * 100)}%)`);
    console.log(`\n   ✅ ${totalUpdated} email(s) sincronizado(s) nesta execução\n`);

    // Listar médicos ainda sem email por clínica
    const withoutEmail = await client.query(
      `SELECT c.name as clinic_name, cd.name as doctor_name, cd.id as doctor_id
       FROM clinic_doctors cd
       INNER JOIN clinics c ON cd.clinic_id = c.id
       WHERE cd.email IS NULL
       ORDER BY c.name, cd.name`
    );

    if (withoutEmail.rows.length > 0) {
      console.log('\n⚠️  MÉDICOS AINDA SEM EMAIL:\n');
      let currentClinic = '';
      withoutEmail.rows.forEach(row => {
        if (row.clinic_name !== currentClinic) {
          console.log(`\n   📍 ${row.clinic_name}:`);
          currentClinic = row.clinic_name;
        }
        console.log(`      - ${row.doctor_name}`);
      });
      console.log('');
    }

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

syncAllDoctorsEmails().catch(console.error);
