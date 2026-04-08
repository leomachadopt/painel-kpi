const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('neon.tech') ? {
    rejectUnauthorized: false,
  } : undefined,
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log('Starting migration 098...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'server/migrations/098_create_pending_reschedules.sql'),
      'utf8'
    );

    await client.query(migrationSQL);

    console.log('✅ Migration 098 completed successfully!');
    console.log('Created table: pending_reschedules');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
