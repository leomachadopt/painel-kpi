import pg from 'pg';

const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'
});

async function verify() {
  try {
    await client.connect();

    console.log('📊 Role Distribution:\n');
    const roleResult = await client.query(`
      SELECT
        role,
        COUNT(*) as total
      FROM users
      WHERE role != 'MENTOR'
      GROUP BY role
      ORDER BY role
    `);

    roleResult.rows.forEach(row => {
      console.log(`${row.role}: ${row.total}`);
    });

    console.log('\n📧 Doctor Email Status:\n');
    const emailResult = await client.query(`
      SELECT
        COUNT(*) as total_doctors,
        COUNT(CASE WHEN email LIKE '%@dentalkpi.com' THEN 1 END) as fictitious,
        COUNT(CASE WHEN email NOT LIKE '%@dentalkpi.com' THEN 1 END) as real
      FROM clinic_doctors
    `);

    const stats = emailResult.rows[0];
    console.log(`Total doctors: ${stats.total_doctors}`);
    console.log(`Real emails: ${stats.real}`);
    console.log(`Fictitious emails: ${stats.fictitious}`);

    console.log('\n✅ MEDICO users with permissions:\n');
    const medicoResult = await client.query(`
      SELECT
        u.name,
        up.can_edit_consultations,
        up.can_view_reports,
        up.can_edit_patients
      FROM users u
      LEFT JOIN user_permissions up ON u.id = up.user_id
      WHERE u.role = 'MEDICO'
      ORDER BY u.name
      LIMIT 5
    `);

    medicoResult.rows.forEach(row => {
      console.log(`${row.name}: consultations=${row.can_edit_consultations}, reports=${row.can_view_reports}, patients=${row.can_edit_patients}`);
    });

    console.log('\n✅ Implementation complete!');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

verify();
