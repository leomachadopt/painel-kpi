import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function runMigrations() {
  const migrations = [
    'server/migrations/078_create_appointment_types.sql',
    'server/migrations/077_create_appointments.sql',
    'server/migrations/079_add_agenda_enabled_to_clinics.sql'
  ];

  for (const migration of migrations) {
    console.log(`\n📦 Running ${migration}...`);
    const sql = readFileSync(migration, 'utf-8');

    try {
      await pool.query(sql);
      console.log(`✅ ${migration} completed successfully`);
    } catch (error) {
      console.error(`❌ Error running ${migration}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n✅ All migrations completed successfully!');
  await pool.end();
}

runMigrations();
