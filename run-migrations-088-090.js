import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const connectionString = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

async function runMigrations() {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    console.log('✓ Conectado ao banco de dados');

    const migrations = [
      '088_add_treatment_stages.sql',
      '089_create_plan_procedures.sql',
      '090_add_treatment_triggers.sql'
    ];

    for (const migrationFile of migrations) {
      console.log(`\n→ Executando ${migrationFile}...`);
      const migrationPath = join(__dirname, 'server', 'migrations', migrationFile);
      const sql = readFileSync(migrationPath, 'utf8');

      await client.query(sql);
      console.log(`✓ ${migrationFile} executada com sucesso`);
    }

    console.log('\n✓ Todas as migrations foram executadas com sucesso!');
  } catch (error) {
    console.error('✗ Erro ao executar migrations:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
