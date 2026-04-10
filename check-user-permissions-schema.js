import pg from 'pg';
const { Pool } = pg;

const DATABASE_URL = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function checkSchema() {
  const client = await pool.connect();

  try {
    // Get table schema
    const schema = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_permissions'
      ORDER BY ordinal_position
    `);

    console.log('📋 user_permissions table schema:\n');
    schema.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.column_default ? `DEFAULT ${col.column_default}` : ''} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

checkSchema().catch(console.error);
