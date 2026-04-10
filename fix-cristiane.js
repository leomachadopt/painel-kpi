import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function fixCristiane() {
  try {
    const wrongId = 'clinic-1767296701478-doc-dr.-joão-silva';
    const clinicId = 'clinic-1767296701478';

    console.log('\n🔍 Verificando médico com ID errado...');

    // Check appointments
    const appointments = await pool.query(`
      SELECT id, date, scheduled_start, patient_name, patient_code
      FROM appointments
      WHERE doctor_id = $1
    `, [wrongId]);

    console.log(`\n📅 Agendamentos encontrados: ${appointments.rows.length}`);
    appointments.rows.forEach(apt => {
      console.log(`  - ${apt.date} ${apt.scheduled_start}: ${apt.patient_name} (${apt.patient_code})`);
    });

    console.log('\n❗ ATENÇÃO: Estes agendamentos serão DELETADOS.');
    console.log('❗ Você precisará recriá-los manualmente após a correção.');

    // Delete appointments
    console.log('\n🗑️  Deletando agendamentos...');
    await pool.query(`
      DELETE FROM appointments WHERE doctor_id = $1
    `, [wrongId]);
    console.log('✅ Agendamentos deletados!');

    // Delete references in other tables
    console.log('\n🗑️  Deletando referências em daily_service_time_entries...');
    await pool.query(`
      DELETE FROM daily_service_time_entries WHERE doctor_id = $1
    `, [wrongId]);
    console.log('✅ Referências deletadas!');

    console.log('\n🗑️  Deletando referências em daily_consultation_entries...');
    await pool.query(`
      DELETE FROM daily_consultation_entries WHERE doctor_id = $1
    `, [wrongId]);
    console.log('✅ Referências deletadas!');

    console.log('\n🗑️  Deletando referências em billing_batches...');
    await pool.query(`
      DELETE FROM billing_batches WHERE doctor_id = $1
    `, [wrongId]);
    console.log('✅ Referências deletadas!');

    // Delete wrong doctor
    console.log('\n🗑️  Deletando médico com ID errado...');
    await pool.query(`
      DELETE FROM clinic_doctors WHERE id = $1
    `, [wrongId]);
    console.log('✅ Médico deletado!');

    // Create correct doctor
    const correctId = '0.' + Math.random().toString(36).substring(2, 15);
    console.log(`\n➕ Criando Dra. Cristiane Martins com ID correto: ${correctId}`);

    await pool.query(`
      INSERT INTO clinic_doctors (id, clinic_id, name, email, whatsapp)
      VALUES ($1, $2, $3, $4, $5)
    `, [correctId, clinicId, 'Dra. Cristiane Martins', null, '+351967798664']);

    console.log('✅ Dra. Cristiane Martins criada com ID correto!');

    // Verify
    const doctors = await pool.query(`
      SELECT id, name
      FROM clinic_doctors
      WHERE clinic_id = $1
      ORDER BY name
    `, [clinicId]);

    console.log('\n✅ Médicos na clínica agora:');
    doctors.rows.forEach(doc => {
      console.log(`  - ${doc.name} (${doc.id})`);
    });

    console.log('\n⚠️  PRÓXIMOS PASSOS:');
    console.log('1. Recarregue a página de Configurações para atualizar a lista de médicos');
    console.log('2. Recrie os 4 agendamentos manualmente na Agenda');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

fixCristiane();
