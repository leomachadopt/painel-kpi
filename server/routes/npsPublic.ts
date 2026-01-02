import { Router } from 'express'
import { query } from '../db.js'

const router = Router()

// ================================
// PUBLIC ROUTES (No authentication required)
// ================================

// Get survey by token (public access)
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params

    const result = await query(
      `SELECT
        id, clinic_id, patient_name, score, status, expires_at,
        survey_month, survey_year, responded_at
       FROM nps_surveys
       WHERE token = $1`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' })
    }

    const survey = result.rows[0]

    // Check if already responded
    if (survey.status === 'RESPONDED') {
      return res.status(400).json({
        error: 'Survey already completed',
        alreadyResponded: true,
        respondedAt: survey.responded_at,
      })
    }

    // Check if expired
    if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
      // Mark as expired
      await query(
        `UPDATE nps_surveys SET status = 'EXPIRED' WHERE id = $1`,
        [survey.id]
      )

      return res.status(400).json({
        error: 'Survey has expired',
        expired: true,
        expiresAt: survey.expires_at,
      })
    }

    // Get clinic info
    const clinicResult = await query(
      `SELECT id, name, logo_url, nps_question FROM clinics WHERE id = $1`,
      [survey.clinic_id]
    )

    const clinic = clinicResult.rows[0] || {}

    res.json({
      id: survey.id,
      patientName: survey.patient_name,
      clinic: {
        id: clinic.id,
        name: clinic.name,
        logoUrl: clinic.logo_url,
        npsQuestion: clinic.nps_question || 'Gostaríamos de saber o quanto você recomendaria nossa clínica para um amigo ou familiar?',
      },
      surveyMonth: survey.survey_month,
      surveyYear: survey.survey_year,
      expiresAt: survey.expires_at,
    })
  } catch (error) {
    console.error('Get public NPS survey error:', error)
    res.status(500).json({ error: 'Failed to fetch survey' })
  }
})

// Submit NPS response (public)
router.post('/:token/respond', async (req, res) => {
  try {
    const { token } = req.params
    const { score, feedback, comment } = req.body

    // Validate score
    if (score === undefined || score === null) {
      return res.status(400).json({ error: 'score is required' })
    }

    const scoreNum = parseInt(score)
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      return res.status(400).json({ error: 'score must be between 0 and 10' })
    }

    // Get survey
    const surveyResult = await query(
      `SELECT id, status, expires_at FROM nps_surveys WHERE token = $1`,
      [token]
    )

    if (surveyResult.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' })
    }

    const survey = surveyResult.rows[0]

    // Check if already responded
    if (survey.status === 'RESPONDED') {
      return res.status(400).json({
        error: 'Survey already completed',
        alreadyResponded: true,
      })
    }

    // Check if expired
    if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
      await query(
        `UPDATE nps_surveys SET status = 'EXPIRED' WHERE id = $1`,
        [survey.id]
      )

      return res.status(400).json({
        error: 'Survey has expired',
        expired: true,
      })
    }

    // Update survey with response
    await query(
      `UPDATE nps_surveys
       SET score = $1,
           feedback = $2,
           comment = $3,
           status = 'RESPONDED',
           responded_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [scoreNum, feedback || null, comment || null, survey.id]
    )

    // The trigger will automatically update monthly_data.nps

    res.json({
      success: true,
      message: 'Thank you for your feedback!',
      score: scoreNum,
    })
  } catch (error) {
    console.error('Submit NPS response error:', error)
    res.status(500).json({ error: 'Failed to submit response' })
  }
})

// Check if survey is valid (for pre-validation)
router.head('/:token', async (req, res) => {
  try {
    const { token } = req.params

    const result = await query(
      `SELECT id, status, expires_at FROM nps_surveys WHERE token = $1`,
      [token]
    )

    if (result.rows.length === 0) {
      return res.status(404).end()
    }

    const survey = result.rows[0]

    if (survey.status === 'RESPONDED') {
      return res.status(410).end() // Gone - already responded
    }

    if (survey.expires_at && new Date(survey.expires_at) < new Date()) {
      return res.status(410).end() // Gone - expired
    }

    res.status(200).end()
  } catch (error) {
    console.error('Check survey validity error:', error)
    res.status(500).end()
  }
})

export default router
