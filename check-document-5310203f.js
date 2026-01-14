import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config()

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
})

const documentId = '5310203f-6b43-4897-a876-1db00bfd959f'

async function checkDocument() {
  try {
    const result = await pool.query(`
      SELECT
        id,
        file_name,
        processing_status,
        processing_progress,
        processing_stage,
        extracted_data,
        created_at,
        processed_at
      FROM insurance_provider_documents
      WHERE id = $1
    `, [documentId])

    if (result.rows.length === 0) {
      console.log('❌ Documento não encontrado')
      return
    }

    const doc = result.rows[0]
    console.log('\n=== Documento Encontrado ===\n')
    console.log(`ID: ${doc.id}`)
    console.log(`Arquivo: ${doc.file_name}`)
    console.log(`Status: ${doc.processing_status}`)
    console.log(`Progresso: ${doc.processing_progress}%`)
    console.log(`Estágio: ${doc.processing_stage}`)
    console.log(`Criado em: ${doc.created_at}`)
    console.log(`Processado em: ${doc.processed_at}`)
    console.log(`\nDados Extraídos:`)
    console.log(JSON.stringify(doc.extracted_data, null, 2))
    
    if (doc.extracted_data && doc.extracted_data.procedures) {
      console.log(`\n📊 Total de procedimentos: ${doc.extracted_data.procedures.length}`)
      if (doc.extracted_data.procedures.length > 0) {
        console.log(`\nPrimeiros 10 procedimentos:`)
        doc.extracted_data.procedures.slice(0, 10).forEach((proc, idx) => {
          console.log(`  ${idx + 1}. ${proc.code} - ${proc.description?.substring(0, 50) || 'Sem descrição'} (${proc.value ? `€${proc.value}` : 'Sem valor'})`)
        })
      } else {
        console.log(`\n⚠️ Nenhum procedimento encontrado nos dados extraídos`)
      }
    } else {
      console.log(`\n⚠️ Estrutura de dados inválida ou vazia`)
    }

    await pool.end()
  } catch (err) {
    console.error('❌ Erro:', err)
    process.exit(1)
  }
}

checkDocument()



