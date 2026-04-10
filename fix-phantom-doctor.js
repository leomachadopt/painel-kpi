import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function fixPhantomDoctor() {
  try {
    const phantomId = 'clinic-1767296701478-doc-dr.-joão-silva';
    const correctId = '0.p3xmfuewgi'; // Dra. Liliana (que era a Cristiane?)

    console.log('\n🔍 Verificando médico fantasma...');

    // Check if phantom doctor exists
    const phantom = await pool.query(`
      SELECT * FROM clinic_doctors WHERE id = $1
    `, [phantomId]);

    console.log('Médico fantasma encontrado:', phantom.rows);

    // Check appointments with phantom doctor
    const appointments = await pool.query(`
      SELECT id, date, scheduled_start, patient_name
      FROM appointments
      WHERE doctor_id = $1
    `, [phantomId]);

    console.log(`\n📅 Agendamentos com médico fantasma: ${appointments.rows.length}`);
    appointments.rows.forEach(apt => {
      console.log(`  - ${apt.date} ${apt.scheduled_start}: ${apt.patient_name}`);
    });

    console.log(`\n🔧 Atualizando ${appointments.rows.length} agendamentos para o médico correto...`);

    // Update appointments to correct doctor
    await pool.query(`
      UPDATE appointments
      SET doctor_id = $1
      WHERE doctor_id = $2
    `, [correctId, phantomId]);

    console.log('✅ Agendamentos atualizados!');

    // Delete phantom doctor
    console.log('\n🗑️  Deletando médico fantasma...');
    await pool.query(`
      DELETE FROM clinic_doctors WHERE id = $1
    `, [phantomId]);

    console.log('✅ Médico fantasma removido!');

    // Verify
    const finalAppointments = await pool.query(`
      SELECT a.id, a.date, a.scheduled_start, a.patient_name, cd.name as doctor_name
      FROM appointments a
      LEFT JOIN clinic_doctors cd ON a.doctor_id = cd.id
      WHERE a.doctor_id = $1
    `, [correctId]);

    console.log(`\n✅ Agendamentos agora associados corretamente:`);
    finalAppointments.rows.forEach(apt => {
      console.log(`  - ${apt.date} ${apt.scheduled_start}: ${apt.patient_name} (${apt.doctor_name})`);
    });

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await pool.end();
  }
}

fixPhantomDoctor();
