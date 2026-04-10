import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function testQuery() {
  try {
    const clinicId = 'clinic-1767296701478';

    console.log('\n🔍 Testing exact query used by /api/clinics endpoint:');
    console.log(`SELECT id, name, email, whatsapp FROM clinic_doctors WHERE clinic_id = '${clinicId}'`);
    console.log('');

    const doctors = await pool.query(
      'SELECT id, name, email, whatsapp FROM clinic_doctors WHERE clinic_id = $1',
      [clinicId]
    );

    console.log(`\n📋 Results: ${doctors.rows.length} doctors found\n`);

    doctors.rows.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.name}`);
      console.log(`   ID: ${doc.id}`);
      console.log(`   Email: ${doc.email}`);
      console.log(`   WhatsApp: ${doc.whatsapp}`);
      console.log('');
    });

    // Check if phantom exists
    const phantom = doctors.rows.find(d => d.id === 'clinic-1767296701478-doc-dr.-joão-silva');
    if (phantom) {
      console.log('❌ MÉDICO FANTASMA ENCONTRADO!');
      console.log(phantom);
    } else {
      console.log('✅ Médico fantasma NÃO encontrado na query');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

testQuery();
