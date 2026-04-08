require('dotenv').config()
const { Client } = require('pg')
const { v2: cloudinary } = require('cloudinary')

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function deleteAllPatientDocuments() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  })

  try {
    await client.connect()
    console.log('Connected to database')

    // Buscar todos os documentos
    const result = await client.query(
      'SELECT id, filename, cloudinary_resource_type FROM patient_documents'
    )

    console.log(`Found ${result.rows.length} documents to delete`)

    if (result.rows.length === 0) {
      console.log('No documents to delete')
      return
    }

    // Confirmar
    console.log('\n⚠️  WARNING: This will delete ALL patient documents from Cloudinary and database!')
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')
    await new Promise(resolve => setTimeout(resolve, 5000))

    let deleted = 0
    let failed = 0

    // Deletar cada documento
    for (const doc of result.rows) {
      try {
        console.log(`Deleting from Cloudinary: ${doc.filename}`)

        // Tentar deletar como 'upload' (público)
        try {
          await cloudinary.uploader.destroy(doc.filename, {
            resource_type: doc.cloudinary_resource_type || 'image',
            type: 'upload',
            invalidate: true
          })
        } catch (err) {
          // Se falhar, tentar como 'authenticated' (privado)
          await cloudinary.uploader.destroy(doc.filename, {
            resource_type: doc.cloudinary_resource_type || 'image',
            type: 'authenticated',
            invalidate: true
          })
        }

        console.log(`✅ Deleted from Cloudinary: ${doc.filename}`)
        deleted++
      } catch (error) {
        console.error(`❌ Failed to delete from Cloudinary: ${doc.filename}`, error.message)
        failed++
      }
    }

    // Deletar do banco
    console.log('\nDeleting from database...')
    await client.query('DELETE FROM patient_documents')
    console.log('✅ Deleted from database')

    console.log(`\n📊 Summary:`)
    console.log(`   Cloudinary: ${deleted} deleted, ${failed} failed`)
    console.log(`   Database: ${result.rows.length} records deleted`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

deleteAllPatientDocuments()
