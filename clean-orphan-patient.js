import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function cleanOrphanPatient() {
  const client = await pool.connect();

  try {
    const patientCode = 'P-0001';
    const clinicId = 'clinic-1767296701478';

    console.log(`🔍 Checking for orphan patient with code ${patientCode}...`);

    // Check if patient exists in patients table
    const patientCheck = await client.query(
      'SELECT id FROM patients WHERE code = $1 AND clinic_id = $2',
      [patientCode, clinicId]
    );

    if (patientCheck.rows.length > 0) {
      console.log(`⚠️  Patient ${patientCode} exists in patients table. Not deleting.`);
      return;
    }

    console.log(`✅ Patient ${patientCode} does NOT exist in patients table. Cleaning up orphan entries...`);

    await client.query('BEGIN');

    // Delete from daily_consultation_entries
    const consultResult = await client.query(
      'DELETE FROM daily_consultation_entries WHERE clinic_id = $1 AND code = $2',
      [clinicId, patientCode]
    );
    console.log(`   Deleted ${consultResult.rowCount} rows from daily_consultation_entries`);

    // Delete from daily_financial_entries
    const finResult = await client.query(
      'DELETE FROM daily_financial_entries WHERE clinic_id = $1 AND code = $2',
      [clinicId, patientCode]
    );
    console.log(`   Deleted ${finResult.rowCount} rows from daily_financial_entries`);

    // Delete from daily_service_time_entries
    const serviceResult = await client.query(
      'DELETE FROM daily_service_time_entries WHERE clinic_id = $1 AND code = $2',
      [clinicId, patientCode]
    );
    console.log(`   Deleted ${serviceResult.rowCount} rows from daily_service_time_entries`);

    // Delete from daily_source_entries
    const sourceResult = await client.query(
      'DELETE FROM daily_source_entries WHERE clinic_id = $1 AND code = $2',
      [clinicId, patientCode]
    );
    console.log(`   Deleted ${sourceResult.rowCount} rows from daily_source_entries`);

    await client.query('COMMIT');

    console.log(`\n✅ Successfully cleaned up all orphan entries for patient ${patientCode}`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error cleaning orphan patient:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanOrphanPatient().catch(console.error);
