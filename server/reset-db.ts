import pool from './db.js'

const reset = async () => {
  console.log('⚠️  WARNING: This will DELETE ALL DATA from the database!')
  console.log('Dropping all tables...')

  try {
    await pool.query(`
      DROP TABLE IF EXISTS patients CASCADE;
      DROP TABLE IF EXISTS daily_source_entries CASCADE;
      DROP TABLE IF EXISTS daily_service_time_entries CASCADE;
      DROP TABLE IF EXISTS daily_cabinet_usage_entries CASCADE;
      DROP TABLE IF EXISTS daily_prospecting_entries CASCADE;
      DROP TABLE IF EXISTS daily_consultation_entries CASCADE;
      DROP TABLE IF EXISTS daily_financial_entries CASCADE;
      DROP TABLE IF EXISTS monthly_cabinet_data CASCADE;
      DROP TABLE IF EXISTS monthly_data CASCADE;
      DROP TABLE IF EXISTS clinic_campaigns CASCADE;
      DROP TABLE IF EXISTS clinic_sources CASCADE;
      DROP TABLE IF EXISTS clinic_doctors CASCADE;
      DROP TABLE IF EXISTS clinic_cabinets CASCADE;
      DROP TABLE IF EXISTS clinic_categories CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS clinics CASCADE;
    `)

    console.log('✅ All tables dropped successfully!')
  } catch (error) {
    console.error('❌ Reset failed:', error)
    throw error
  } finally {
    await pool.end()
  }
}

reset()
