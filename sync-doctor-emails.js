import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function syncDoctorEmails() {
  const client = await pool.connect();

  try {
    const clinicId = 'clinic-1767296701478';

    console.log('🔄 SINCRONIZANDO EMAILS DE MÉDICOS\n');
    console.log('==================================================================\n');

    // Mapear colaboradores médicos para clinic_doctors
    const colaboradores = await client.query(
      `SELECT u.id, u.name, u.email
       FROM users u
       WHERE u.clinic_id = $1 AND u.role = 'COLABORADOR' AND u.active = true
       ORDER BY u.name`,
      [clinicId]
    );

    console.log(`✅ Encontrados ${colaboradores.rows.length} colaboradores\n`);

    await client.query('BEGIN');

    let updatedCount = 0;

    for (const colaborador of colaboradores.rows) {
      // Tentar encontrar médico pelo nome (simplificado)
      const nameSearch = colaborador.name.toLowerCase().replace(/dr\.|dra\./gi, '').trim();

      const doctor = await client.query(
        `SELECT id, name, email
         FROM clinic_doctors
         WHERE clinic_id = $1
         AND LOWER(REPLACE(REPLACE(name, 'Dr. ', ''), 'Dra. ', '')) LIKE $2
         ORDER BY name
         LIMIT 1`,
        [clinicId, `%${nameSearch}%`]
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

          console.log(`✅ ${colaborador.name} → ${d.name}`);
          console.log(`   Email: ${colaborador.email}`);
          console.log(`   Doctor ID: ${d.id}\n`);

          updatedCount++;
        } else {
          console.log(`ℹ️  ${d.name} já tem email: ${d.email}\n`);
        }
      } else {
        console.log(`⚠️  Nenhum médico encontrado para: ${colaborador.name}\n`);
      }
    }

    await client.query('COMMIT');

    console.log('==================================================================');
    console.log(`✅ ${updatedCount} médico(s) atualizado(s) com sucesso!\n`);

    // Verificar resultado
    const verification = await client.query(
      `SELECT COUNT(*) as total,
              COUNT(email) as with_email,
              COUNT(*) - COUNT(email) as without_email
       FROM clinic_doctors
       WHERE clinic_id = $1`,
      [clinicId]
    );

    const v = verification.rows[0];
    console.log('📊 RESULTADO:');
    console.log(`   Total de médicos: ${v.total}`);
    console.log(`   Com email: ${v.with_email}`);
    console.log(`   Sem email: ${v.without_email}\n`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

syncDoctorEmails().catch(console.error);
