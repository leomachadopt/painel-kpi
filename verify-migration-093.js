import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function verifyMigration() {
  const client = await pool.connect();

  try {
    console.log('🔍 VERIFICANDO MIGRAÇÃO 093\\n');
    console.log('==================================================================\\n');

    // 1. Users by role
    const usersByRole = await client.query(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE role != 'MENTOR'
      GROUP BY role
      ORDER BY role
    `);

    console.log('1️⃣ USUÁRIOS POR ROLE:');
    usersByRole.rows.forEach(row => {
      console.log(`   ${row.role}: ${row.count}`);
    });

    // 2. Clinic doctors with/without email
    const doctorsEmail = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN email LIKE '%@dentalkpi.com' THEN 1 END) as fictitious,
        COUNT(CASE WHEN email NOT LIKE '%@dentalkpi.com' THEN 1 END) as real
      FROM clinic_doctors
    `);

    const de = doctorsEmail.rows[0];
    console.log('\\n2️⃣ EMAILS EM CLINIC_DOCTORS:');
    console.log(`   Total de médicos: ${de.total}`);
    console.log(`   Com email real: ${de.real}`);
    console.log(`   Com email fictício (@dentalkpi.com): ${de.fictitious}`);

    // 3. MEDICO users with permissions
    const medicoPermissions = await client.query(`
      SELECT
        COUNT(DISTINCT u.id) as total_medicos,
        COUNT(DISTINCT up.user_id) as with_permissions
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.role = 'MEDICO'
    `);

    const mp = medicoPermissions.rows[0];
    console.log('\\n3️⃣ PERMISSÕES DOS MÉDICOS:');
    console.log(`   Total MEDICO users: ${mp.total_medicos}`);
    console.log(`   Com permissões: ${mp.with_permissions}`);

    // 4. Sample MEDICO users
    const sampleMedicos = await client.query(`
      SELECT u.id, u.name, u.email, cd.name as doctor_name,
             up.can_edit_consultations, up.can_view_reports, up.can_edit_patients
      FROM users u
      INNER JOIN clinic_doctors cd ON u.email = cd.email AND u.clinic_id = cd.clinic_id
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.role = 'MEDICO'
      LIMIT 5
    `);

    if (sampleMedicos.rows.length > 0) {
      console.log('\\n4️⃣ AMOSTRA DE MÉDICOS (primeiros 5):');
      sampleMedicos.rows.forEach(m => {
        console.log(`\\n   ${m.name} (${m.email})`);
        console.log(`     Doctor name: ${m.doctor_name}`);
        console.log(`     Permissions: edit_consultations=${m.can_edit_consultations}, view_reports=${m.can_view_reports}, edit_patients=${m.can_edit_patients}`);
      });
    }

    // 5. Check constraint
    const constraint = await client.query(`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conname = 'users_role_check'
    `);

    console.log('\\n5️⃣ CONSTRAINT users_role_check:');
    if (constraint.rows.length > 0) {
      console.log(`   ${constraint.rows[0].definition}`);
    }

    console.log('\\n==================================================================');
    console.log('✅ Verificação completa!\\n');

  } catch (error) {
    console.error('❌ Erro:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

verifyMigration().catch(console.error);
