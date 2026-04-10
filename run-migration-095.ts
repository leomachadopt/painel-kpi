import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const { Pool } = pg;

async function runMigration() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    const migrationPath = path.join(__dirname, 'server', 'migrations', '095_create_agenda_metrics_views.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Running migration 095...');
    await pool.query(sql);
    console.log('✅ Migration 095 completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigration();
