import pool from './db.js'
import crypto from 'crypto'

// Script to create a test NPS survey and generate a valid link

async function createTestNPSSurvey() {
  console.log('Creating test NPS survey...\n')

  const client = await pool.connect()

  try {
    // Get first clinic
    const clinicsResult = await client.query(
      'SELECT id, name FROM clinics LIMIT 1'
    )

    if (clinicsResult.rows.length === 0) {
      console.log('❌ No clinics found in database')
      return
    }

    const clinic = clinicsResult.rows[0]
    console.log(`📍 Using clinic: ${clinic.name} (${clinic.id})\n`)

    // Check if patient exists, if not create one
    let patientResult = await client.query(
      'SELECT id, code, name FROM patients WHERE clinic_id = $1 LIMIT 1',
      [clinic.id]
    )

    let patient
    if (patientResult.rows.length === 0) {
      // Create test patient
      const patientId = `patient_${crypto.randomUUID()}`
      await client.query(
        `INSERT INTO patients (id, clinic_id, code, name, email)
         VALUES ($1, $2, $3, $4, $5)`,
        [patientId, clinic.id, '123456', 'João Silva', 'joao@exemplo.com']
      )
      patient = {
        id: patientId,
        code: '123456',
        name: 'João Silva',
        email: 'joao@exemplo.com',
      }
      console.log('✅ Created test patient: João Silva (123456)\n')
    } else {
      patient = patientResult.rows[0]
      console.log(`✅ Using existing patient: ${patient.name} (${patient.code})\n`)
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex')
    const surveyId = `nps_${crypto.randomUUID()}`

    // Set expiration to 30 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    // Create NPS survey
    await client.query(
      `INSERT INTO nps_surveys (
        id, clinic_id, patient_id, patient_name, patient_email, patient_code,
        token, survey_month, survey_year, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        surveyId,
        clinic.id,
        patient.id,
        patient.name,
        patient.email,
        patient.code,
        token,
        currentMonth,
        currentYear,
        expiresAt,
        'PENDING',
      ]
    )

    console.log('✅ NPS Survey created successfully!\n')
    console.log('📋 Survey Details:')
    console.log(`   ID: ${surveyId}`)
    console.log(`   Patient: ${patient.name}`)
    console.log(`   Month/Year: ${currentMonth}/${currentYear}`)
    console.log(`   Expires: ${expiresAt.toLocaleDateString('pt-BR')}\n`)

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:8080'
    const surveyLink = `${frontendUrl}/survey/${token}`

    console.log('🔗 Survey Link:')
    console.log(`   ${surveyLink}\n`)
    console.log('📌 Token:')
    console.log(`   ${token}\n`)

    console.log('✨ Test the survey by accessing the link above!')
    console.log('   The patient can now rate their experience from 0 to 10.\n')
  } catch (error) {
    console.error('❌ Error creating test survey:', error)
  } finally {
    client.release()
    await pool.end()
  }
}

createTestNPSSurvey()
