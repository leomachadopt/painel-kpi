import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATABASE_URL = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Running migration 092_resync_pending_treatments.sql...');

    const migrationPath = path.join(__dirname, 'server', 'migrations', '092_resync_pending_treatments.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    await client.query(sql);

    console.log('✅ Migration completed successfully!');

    // Verificar resultados
    const result = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'CONCLUIDO' THEN 1 END) as concluidos,
        COUNT(CASE WHEN status = 'PARCIAL' THEN 1 END) as parciais,
        COUNT(CASE WHEN status = 'PENDENTE' THEN 1 END) as pendentes
      FROM pending_treatments
    `);

    console.log('\n📊 Status dos tratamentos pendentes:');
    console.log(`   Total: ${result.rows[0].total}`);
    console.log(`   Concluídos: ${result.rows[0].concluidos}`);
    console.log(`   Parciais: ${result.rows[0].parciais}`);
    console.log(`   Pendentes: ${result.rows[0].pendentes}`);

  } catch (error) {
    console.error('❌ Error running migration:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);
