import pool from './db'

async function checkClinicData() {
  console.log('\n🔍 A verificar dados da clínica em produção...\n')

  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        kommo_contact_id,
        owner_whatsapp,
        kommo_subdomain,
        kommo_token IS NOT NULL as has_kommo_token,
        LENGTH(kommo_token) as token_length,
        n8n_reports_enabled,
        n8n_report_time
      FROM clinics
      WHERE id = 'clinic-1767296701478'
    `)

    if (result.rows.length === 0) {
      console.log('❌ Clínica não encontrada!\n')
      process.exit(1)
    }

    const clinic = result.rows[0]

    console.log('✅ Clínica encontrada:\n')
    console.log(`   ID:                    ${clinic.id}`)
    console.log(`   Nome:                  ${clinic.name}`)
    console.log(`   Kommo Contact ID:      ${clinic.kommo_contact_id || '(não definido)'}`)
    console.log(`   Owner WhatsApp:        ${clinic.owner_whatsapp || '(não definido)'}`)
    console.log(`   Kommo Subdomain:       ${clinic.kommo_subdomain || '(não definido)'}`)
    console.log(`   Kommo Token:           ${clinic.has_kommo_token ? `✅ Configurado (${clinic.token_length} chars)` : '❌ Não configurado'}`)
    console.log(`   Relatórios N8N:        ${clinic.n8n_reports_enabled ? '✅ Activos' : '❌ Desactivados'}`)
    console.log(`   Hora do Relatório:     ${clinic.n8n_report_time}`)
    console.log()

    // Verificar se todos os campos necessários estão preenchidos
    const missingFields = []
    if (!clinic.kommo_contact_id) missingFields.push('kommo_contact_id')
    if (!clinic.owner_whatsapp) missingFields.push('owner_whatsapp')
    if (!clinic.kommo_subdomain) missingFields.push('kommo_subdomain')
    if (!clinic.has_kommo_token) missingFields.push('kommo_token')

    if (missingFields.length > 0) {
      console.log('⚠️  Campos em falta para relatórios automáticos:')
      missingFields.forEach(field => console.log(`   - ${field}`))
      console.log('\n💡 Execute o seguinte para configurar:')
      console.log(`   UPDATE clinics SET`)
      console.log(`     kommo_contact_id = '20419586',`)
      console.log(`     owner_whatsapp = '+351912345678',`)
      console.log(`     kommo_subdomain = 'clinicadentariavitoria',`)
      console.log(`     kommo_token = 'seu_token_aqui',`)
      console.log(`     n8n_reports_enabled = true,`)
      console.log(`     n8n_report_time = '21:05'`)
      console.log(`   WHERE id = 'clinic-1767296701478';\n`)
    } else {
      console.log('✅ Todos os campos necessários estão configurados!\n')
    }

  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error)
    throw error
  } finally {
    await pool.end()
  }
}

checkClinicData()
