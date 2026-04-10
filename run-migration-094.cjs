const { execSync } = require('child_process');
const path = require('path');

const dbUrl = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const migrationFile = path.join(__dirname, 'server/migrations/094_create_dashboard_metrics_views.sql');

console.log('Running migration 094_create_dashboard_metrics_views.sql...');

try {
  const output = execSync(`psql "${dbUrl}" -f "${migrationFile}"`, {
    encoding: 'utf-8',
    stdio: 'pipe'
  });
  console.log(output);
  console.log('✓ Migration completed successfully!');
} catch (error) {
  console.error('Migration failed:', error.message);
  if (error.stdout) console.log('STDOUT:', error.stdout);
  if (error.stderr) console.error('STDERR:', error.stderr);
  process.exit(1);
}
