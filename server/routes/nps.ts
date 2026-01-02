import { Router } from 'express'
import { query } from '../db.js'
import crypto from 'crypto'

const router = Router()

// ================================
// PRIVATE ROUTES (Authenticated)
// ================================

// Get all NPS surveys for a clinic
router.get('/:clinicId/surveys', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { month, year, status, page = '1', limit = '50' } = req.query

    // Check access
    if (
      req.user?.role === 'GESTOR_CLINICA' &&
      req.user?.clinicId !== clinicId
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    let queryText = `
      SELECT
        id, clinic_id, patient_id, patient_name, patient_email, patient_code,
        token, score, feedback, comment, sent_at, responded_at, expires_at,
        survey_month, survey_year, status, created_at, updated_at
      FROM nps_surveys
      WHERE clinic_id = $1
    `
    const params: any[] = [clinicId]
    let paramCount = 1

    if (month) {
      paramCount++
      queryText += ` AND survey_month = $${paramCount}`
      params.push(parseInt(month as string))
    }

    if (year) {
      paramCount++
      queryText += ` AND survey_year = $${paramCount}`
      params.push(parseInt(year as string))
    }

    if (status) {
      paramCount++
      queryText += ` AND status = $${paramCount}`
      params.push(status)
    }

    queryText += ` ORDER BY created_at DESC`

    // Pagination
    const pageNum = parseInt(page as string)
    const limitNum = parseInt(limit as string)
    const offset = (pageNum - 1) * limitNum

    paramCount++
    queryText += ` LIMIT $${paramCount}`
    params.push(limitNum)

    paramCount++
    queryText += ` OFFSET $${paramCount}`
    params.push(offset)

    const result = await query(queryText, params)

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM nps_surveys WHERE clinic_id = $1`,
      [clinicId]
    )

    res.json({
      surveys: result.rows.map((row) => ({
        id: row.id,
        clinicId: row.clinic_id,
        patientId: row.patient_id,
        patientName: row.patient_name,
        patientEmail: row.patient_email,
        patientCode: row.patient_code,
        token: row.token,
        score: row.score,
        feedback: row.feedback,
        comment: row.comment,
        sentAt: row.sent_at,
        respondedAt: row.responded_at,
        expiresAt: row.expires_at,
        surveyMonth: row.survey_month,
        surveyYear: row.survey_year,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limitNum),
      },
    })
  } catch (error) {
    console.error('Get NPS surveys error:', error)
    res.status(500).json({ error: 'Failed to fetch NPS surveys' })
  }
})

// Get NPS survey by ID
router.get('/:clinicId/surveys/:surveyId', async (req, res) => {
  try {
    const { clinicId, surveyId } = req.params

    // Check access
    if (
      req.user?.role === 'GESTOR_CLINICA' &&
      req.user?.clinicId !== clinicId
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const result = await query(
      `SELECT
        id, clinic_id, patient_id, patient_name, patient_email, patient_code,
        token, score, feedback, comment, sent_at, responded_at, expires_at,
        survey_month, survey_year, status, created_at, updated_at
       FROM nps_surveys
       WHERE id = $1 AND clinic_id = $2`,
      [surveyId, clinicId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Survey not found' })
    }

    const row = result.rows[0]
    res.json({
      id: row.id,
      clinicId: row.clinic_id,
      patientId: row.patient_id,
      patientName: row.patient_name,
      patientEmail: row.patient_email,
      patientCode: row.patient_code,
      token: row.token,
      score: row.score,
      feedback: row.feedback,
      comment: row.comment,
      sentAt: row.sent_at,
      respondedAt: row.responded_at,
      expiresAt: row.expires_at,
      surveyMonth: row.survey_month,
      surveyYear: row.survey_year,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })
  } catch (error) {
    console.error('Get NPS survey error:', error)
    res.status(500).json({ error: 'Failed to fetch survey' })
  }
})

// Create NPS survey
router.post('/:clinicId/surveys', async (req, res) => {
  try {
    const { clinicId } = req.params
    const {
      patientId,
      patientName,
      patientEmail,
      patientCode,
      surveyMonth,
      surveyYear,
      expiresInDays = 30,
    } = req.body

    // Check access - only GESTOR can create surveys
    if (
      req.user?.role !== 'GESTOR_CLINICA' ||
      req.user?.clinicId !== clinicId
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Validate required fields
    if (!patientName || !surveyMonth || !surveyYear) {
      return res.status(400).json({
        error: 'patientName, surveyMonth, and surveyYear are required',
      })
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex')

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const id = `nps_${crypto.randomUUID()}`

    await query(
      `INSERT INTO nps_surveys (
        id, clinic_id, patient_id, patient_name, patient_email, patient_code,
        token, survey_month, survey_year, expires_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        clinicId,
        patientId || null,
        patientName,
        patientEmail || null,
        patientCode || null,
        token,
        surveyMonth,
        surveyYear,
        expiresAt,
        'PENDING',
      ]
    )

    res.status(201).json({
      id,
      token,
      surveyLink: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/survey/${token}`,
      expiresAt,
    })
  } catch (error) {
    console.error('Create NPS survey error:', error)
    res.status(500).json({ error: 'Failed to create survey' })
  }
})

// Create multiple NPS surveys (bulk)
router.post('/:clinicId/surveys/bulk', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { patients, surveyMonth, surveyYear, expiresInDays = 30 } = req.body

    // Check access - only GESTOR can create surveys
    if (
      req.user?.role !== 'GESTOR_CLINICA' ||
      req.user?.clinicId !== clinicId
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Validate required fields
    if (!Array.isArray(patients) || !surveyMonth || !surveyYear) {
      return res.status(400).json({
        error: 'patients (array), surveyMonth, and surveyYear are required',
      })
    }

    if (patients.length === 0) {
      return res.status(400).json({ error: 'patients array cannot be empty' })
    }

    // Calculate expiration date
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + expiresInDays)

    const created = []

    for (const patient of patients) {
      const { patientId, patientName, patientEmail, patientCode } = patient

      if (!patientName) continue

      const token = crypto.randomBytes(32).toString('hex')
      const id = `nps_${crypto.randomUUID()}`

      await query(
        `INSERT INTO nps_surveys (
          id, clinic_id, patient_id, patient_name, patient_email, patient_code,
          token, survey_month, survey_year, expires_at, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          clinicId,
          patientId || null,
          patientName,
          patientEmail || null,
          patientCode || null,
          token,
          surveyMonth,
          surveyYear,
          expiresAt,
          'PENDING',
        ]
      )

      created.push({
        id,
        patientName,
        token,
        surveyLink: `${process.env.FRONTEND_URL || 'http://localhost:8080'}/survey/${token}`,
      })
    }

    res.status(201).json({
      created: created.length,
      surveys: created,
      expiresAt,
    })
  } catch (error) {
    console.error('Create bulk NPS surveys error:', error)
    res.status(500).json({ error: 'Failed to create surveys' })
  }
})

// Delete NPS survey
router.delete('/:clinicId/surveys/:surveyId', async (req, res) => {
  try {
    const { clinicId, surveyId } = req.params

    // Check access - only GESTOR can delete
    if (
      req.user?.role !== 'GESTOR_CLINICA' ||
      req.user?.clinicId !== clinicId
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const result = await query(
      `DELETE FROM nps_surveys WHERE id = $1 AND clinic_id = $2`,
      [surveyId, clinicId]
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Survey not found' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Delete NPS survey error:', error)
    res.status(500).json({ error: 'Failed to delete survey' })
  }
})

// Mark survey as sent
router.post('/:clinicId/surveys/:surveyId/send', async (req, res) => {
  try {
    const { clinicId, surveyId } = req.params

    // Check access
    if (
      req.user?.role !== 'GESTOR_CLINICA' ||
      req.user?.clinicId !== clinicId
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const result = await query(
      `UPDATE nps_surveys
       SET status = 'SENT', sent_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND clinic_id = $2 AND status = 'PENDING'`,
      [surveyId, clinicId]
    )

    if (result.rowCount === 0) {
      return res
        .status(404)
        .json({ error: 'Survey not found or already sent' })
    }

    res.json({ success: true })
  } catch (error) {
    console.error('Mark survey as sent error:', error)
    res.status(500).json({ error: 'Failed to mark survey as sent' })
  }
})

// Calculate NPS for a period
router.get('/:clinicId/calculate', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { month, year } = req.query

    // Check access
    if (
      req.user?.role === 'GESTOR_CLINICA' &&
      req.user?.clinicId !== clinicId
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    if (!month || !year) {
      return res.status(400).json({ error: 'month and year are required' })
    }

    const result = await query(
      `SELECT calculate_nps($1, $2, $3) as nps`,
      [clinicId, parseInt(month as string), parseInt(year as string)]
    )

    // Get detailed breakdown
    const detailsResult = await query(
      `SELECT
        COUNT(*) FILTER (WHERE score >= 9) as promoters,
        COUNT(*) FILTER (WHERE score >= 7 AND score <= 8) as passives,
        COUNT(*) FILTER (WHERE score <= 6) as detractors,
        COUNT(*) as total,
        AVG(score) as avg_score
       FROM nps_surveys
       WHERE clinic_id = $1
         AND survey_month = $2
         AND survey_year = $3
         AND status = 'RESPONDED'
         AND score IS NOT NULL`,
      [clinicId, parseInt(month as string), parseInt(year as string)]
    )

    const details = detailsResult.rows[0]

    res.json({
      nps: result.rows[0].nps,
      promoters: parseInt(details.promoters || 0),
      passives: parseInt(details.passives || 0),
      detractors: parseInt(details.detractors || 0),
      total: parseInt(details.total || 0),
      averageScore: parseFloat(details.avg_score || 0).toFixed(2),
    })
  } catch (error) {
    console.error('Calculate NPS error:', error)
    res.status(500).json({ error: 'Failed to calculate NPS' })
  }
})

// Get NPS statistics/history
router.get('/:clinicId/stats', async (req, res) => {
  try {
    const { clinicId } = req.params
    const { months = '6' } = req.query

    // Check access
    if (
      req.user?.role === 'GESTOR_CLINICA' &&
      req.user?.clinicId !== clinicId
    ) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Get NPS history from monthly_data
    const result = await query(
      `SELECT month, year, nps
       FROM monthly_data
       WHERE clinic_id = $1
         AND nps IS NOT NULL
       ORDER BY year DESC, month DESC
       LIMIT $2`,
      [clinicId, parseInt(months as string)]
    )

    // Get response rate
    const responseRateResult = await query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'RESPONDED') as responded,
        COUNT(*) FILTER (WHERE status IN ('SENT', 'PENDING')) as pending,
        COUNT(*) as total
       FROM nps_surveys
       WHERE clinic_id = $1`,
      [clinicId]
    )

    const responseRate = responseRateResult.rows[0]

    res.json({
      history: result.rows.map((row) => ({
        month: row.month,
        year: row.year,
        nps: row.nps,
      })),
      responseRate: {
        responded: parseInt(responseRate.responded || 0),
        pending: parseInt(responseRate.pending || 0),
        total: parseInt(responseRate.total || 0),
        rate:
          responseRate.total > 0
            ? ((responseRate.responded / responseRate.total) * 100).toFixed(2)
            : 0,
      },
    })
  } catch (error) {
    console.error('Get NPS stats error:', error)
    res.status(500).json({ error: 'Failed to fetch NPS statistics' })
  }
})

export default router
