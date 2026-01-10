import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

async function checkMappings() {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) as total_mappings,
        COUNT(CASE WHEN mapped_procedure_base_id IS NOT NULL THEN 1 END) as auto_matched,
        COUNT(CASE WHEN mapped_procedure_base_id IS NULL THEN 1 END) as needs_review
      FROM procedure_mappings
      WHERE document_id = '9b2d0b0b-35b7-4d8a-9029-66df6e6ec8ca'
    `)

    console.log('\n=== Mapeamentos Salvos ===\n')
    console.log(`Total de procedimentos: ${result.rows[0].total_mappings}`)
    console.log(`Match automático: ${result.rows[0].auto_matched}`)
    console.log(`Precisam revisão: ${result.rows[0].needs_review}`)

    // Get sample mappings
    const sample = await pool.query(`
      SELECT
        extracted_code,
        extracted_description,
        extracted_value,
        mapped_procedure_base_id
      FROM procedure_mappings
      WHERE document_id = '9b2d0b0b-35b7-4d8a-9029-66df6e6ec8ca'
      LIMIT 5
    `)

    console.log('\n=== Exemplos de Mapeamentos ===\n')
    for (const row of sample.rows) {
      console.log(`Código: ${row.extracted_code}`)
      console.log(`Descrição: ${row.extracted_description}`)
      console.log(`Valor: ${row.extracted_value}`)
      console.log(`Match: ${row.mapped_procedure_base_id || 'Nenhum'}`)
      console.log('---')
    }

    await pool.end()
  } catch (err) {
    console.error('Error:', err)
    process.exit(1)
  }
}

checkMappings()
