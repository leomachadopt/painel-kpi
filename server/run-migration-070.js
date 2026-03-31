/**
 * Script para executar migration 070_add_revenue_forecast.sql
 * Uso: node server/run-migration-070.js
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pkg from 'pg'
const { Pool } = pkg

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DATABASE_URL = 'postgresql://neondb_owner:npg_0xmMIovdFCh5@ep-cold-resonance-abyfebsq-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require'

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
  })

  try {
    console.log('📋 Lendo arquivo de migration...')
    const migrationPath = join(__dirname, 'migrations', '070_add_revenue_forecast.sql')
    const sql = readFileSync(migrationPath, 'utf8')

    console.log('🔌 Conectando ao banco de dados...')
    const client = await pool.connect()

    console.log('⚡ Executando migration 070_add_revenue_forecast.sql...')
    await client.query(sql)

    console.log('✅ Migration executada com sucesso!')
    console.log('')
    console.log('📊 Tabelas criadas:')
    console.log('  - revenue_plans')
    console.log('  - revenue_installments')
    console.log('  - pending_treatment_patients')
    console.log('  - pending_treatments')
    console.log('')
    console.log('🎉 Sistema de Previsão de Receitas está pronto para uso!')

    client.release()
  } catch (error) {
    console.error('❌ Erro ao executar migration:', error.message)
    console.error('')
    console.error('Detalhes:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runMigration()
