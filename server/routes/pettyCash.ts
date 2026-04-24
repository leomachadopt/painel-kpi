// @ts-nocheck
import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'
import { query } from '../db.js'
import { authRequired } from '../middleware/auth.js'
import { getUserPermissions } from '../middleware/permissions.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME

const uploadDir = path.join(__dirname, '../../public/uploads/petty-cash')

const storage = isServerless
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, _file, cb) => {
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true })
        }
        cb(null, uploadDir)
      },
      filename: (_req, file, cb) => {
        const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`
        cb(null, uniqueName)
      },
    })

const receiptUpload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Apenas JPG, PNG, WEBP ou PDF são permitidos'))
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
})

async function canViewPettyCash(req, clinicId) {
  if (!req.user || !req.user.sub) return false
  const { sub: userId, role, clinicId: userClinicId } = req.user
  if (userClinicId !== clinicId) return false
  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') return true
  if (role === 'COLABORADOR' || role === 'MEDICO') {
    const perms = await getUserPermissions(userId, role, clinicId)
    return perms.canViewPettyCash === true || perms.canEditPettyCash === true
  }
  return false
}

async function canEditPettyCash(req, clinicId) {
  if (!req.user || !req.user.sub) return false
  const { sub: userId, role, clinicId: userClinicId } = req.user
  if (userClinicId !== clinicId) return false
  if (role === 'GESTOR_CLINICA' || role === 'MENTOR') return true
  if (role === 'COLABORADOR' || role === 'MEDICO') {
    const perms = await getUserPermissions(userId, role, clinicId)
    return perms.canEditPettyCash === true
  }
  return false
}

function mapCategoryRow(row) {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    name: row.name,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapEntryRow(row) {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    date: row.date,
    amount: Number(row.amount),
    categoryId: row.category_id,
    categoryName: row.category_name || null,
    description: row.description,
    paymentMethod: row.payment_method,
    receipt: row.receipt_filename
      ? {
          filename: row.receipt_filename,
          originalFilename: row.receipt_original_filename,
          mimeType: row.receipt_mime_type,
          size: row.receipt_size,
        }
      : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapIncomeRow(row) {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    date: row.date,
    amount: Number(row.amount),
    description: row.description,
    financialEntryId: row.financial_entry_id,
    paymentSourceId: row.payment_source_id,
    paymentSourceName: row.payment_source_name || null,
    patientName: row.patient_name,
    patientCode: row.patient_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// =============================
// INCOME (auto-sincronizado de lançamentos financeiros Numerário)
// =============================

router.get('/:clinicId/income', authRequired, async (req, res) => {
  try {
    const { clinicId } = req.params
    if (!(await canViewPettyCash(req, clinicId))) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const { startDate, endDate } = req.query
    const params = [clinicId]
    let where = 'i.clinic_id = $1'
    if (startDate) {
      params.push(startDate)
      where += ` AND i.date >= $${params.length}`
    }
    if (endDate) {
      params.push(endDate)
      where += ` AND i.date <= $${params.length}`
    }
    try {
      const result = await query(
        `SELECT i.*, ps.name AS payment_source_name
         FROM petty_cash_income i
         LEFT JOIN clinic_payment_sources ps ON ps.id = i.payment_source_id
         WHERE ${where}
         ORDER BY i.date ASC, i.created_at ASC`,
        params
      )
      res.json(result.rows.map(mapIncomeRow))
    } catch (err: any) {
      // Se a tabela ainda não existe (migração 120 pendente), degrada pra lista vazia
      if (err?.code === '42P01') {
        return res.json([])
      }
      throw err
    }
  } catch (err) {
    console.error('Get petty cash income error:', err)
    res.status(500).json({ error: 'Failed to fetch income' })
  }
})

// =============================
// CATEGORIES
// =============================

router.get('/:clinicId/categories', authRequired, async (req, res) => {
  try {
    const { clinicId } = req.params
    if (!(await canViewPettyCash(req, clinicId))) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const result = await query(
      `SELECT id, clinic_id, name, active, created_at, updated_at
       FROM petty_cash_categories
       WHERE clinic_id = $1
       ORDER BY name ASC`,
      [clinicId]
    )
    res.json(result.rows.map(mapCategoryRow))
  } catch (err) {
    console.error('Get petty cash categories error:', err)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

router.post('/:clinicId/categories', authRequired, async (req, res) => {
  try {
    const { clinicId } = req.params
    if (!(await canEditPettyCash(req, clinicId))) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const { name, active } = req.body
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' })
    }
    const id = uuidv4()
    try {
      const result = await query(
        `INSERT INTO petty_cash_categories (id, clinic_id, name, active)
         VALUES ($1, $2, $3, COALESCE($4, true))
         RETURNING id, clinic_id, name, active, created_at, updated_at`,
        [id, clinicId, name.trim(), active ?? true]
      )
      res.status(201).json(mapCategoryRow(result.rows[0]))
    } catch (err) {
      if (err.code === '23505') {
        return res.status(409).json({ error: 'Category already exists' })
      }
      throw err
    }
  } catch (err) {
    console.error('Create petty cash category error:', err)
    res.status(500).json({ error: 'Failed to create category' })
  }
})

router.put('/:clinicId/categories/:categoryId', authRequired, async (req, res) => {
  try {
    const { clinicId, categoryId } = req.params
    if (!(await canEditPettyCash(req, clinicId))) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const { name, active } = req.body
    const result = await query(
      `UPDATE petty_cash_categories
       SET name = COALESCE($3, name),
           active = COALESCE($4, active),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND clinic_id = $2
       RETURNING id, clinic_id, name, active, created_at, updated_at`,
      [categoryId, clinicId, name?.trim() ?? null, typeof active === 'boolean' ? active : null]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.json(mapCategoryRow(result.rows[0]))
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Category name already exists' })
    }
    console.error('Update petty cash category error:', err)
    res.status(500).json({ error: 'Failed to update category' })
  }
})

router.delete('/:clinicId/categories/:categoryId', authRequired, async (req, res) => {
  try {
    const { clinicId, categoryId } = req.params
    if (!(await canEditPettyCash(req, clinicId))) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const result = await query(
      `DELETE FROM petty_cash_categories WHERE id = $1 AND clinic_id = $2 RETURNING id`,
      [categoryId, clinicId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Category not found' })
    }
    res.json({ message: 'Category deleted' })
  } catch (err) {
    console.error('Delete petty cash category error:', err)
    res.status(500).json({ error: 'Failed to delete category' })
  }
})

// =============================
// ENTRIES
// =============================

router.get('/:clinicId/entries', authRequired, async (req, res) => {
  try {
    const { clinicId } = req.params
    if (!(await canViewPettyCash(req, clinicId))) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const { startDate, endDate, categoryId, paymentMethod } = req.query
    const params = [clinicId]
    let where = 'e.clinic_id = $1'
    if (startDate) {
      params.push(startDate)
      where += ` AND e.date >= $${params.length}`
    }
    if (endDate) {
      params.push(endDate)
      where += ` AND e.date <= $${params.length}`
    }
    if (categoryId) {
      params.push(categoryId)
      where += ` AND e.category_id = $${params.length}`
    }
    if (paymentMethod) {
      params.push(paymentMethod)
      where += ` AND e.payment_method = $${params.length}`
    }
    const result = await query(
      `SELECT e.*, c.name AS category_name
       FROM petty_cash_entries e
       LEFT JOIN petty_cash_categories c ON c.id = e.category_id
       WHERE ${where}
       ORDER BY e.date DESC, e.created_at DESC`,
      params
    )
    res.json(result.rows.map(mapEntryRow))
  } catch (err) {
    console.error('Get petty cash entries error:', err)
    res.status(500).json({ error: 'Failed to fetch entries' })
  }
})

router.post(
  '/:clinicId/entries',
  authRequired,
  receiptUpload.single('receipt'),
  async (req, res) => {
    try {
      const { clinicId } = req.params
      if (!(await canEditPettyCash(req, clinicId))) {
        if (req.file?.path) {
          try { fs.unlinkSync(req.file.path) } catch {}
        }
        return res.status(403).json({ error: 'Forbidden' })
      }
      const { date, amount, categoryId, description, paymentMethod } = req.body
      if (!date || !amount) {
        return res.status(400).json({ error: 'date and amount are required' })
      }
      const numericAmount = Number(amount)
      if (!Number.isFinite(numericAmount) || numericAmount < 0) {
        return res.status(400).json({ error: 'amount must be a non-negative number' })
      }
      const method = paymentMethod || 'cash'
      const id = uuidv4()
      const file = req.file
      const receiptPath = file ? (file.path || path.join(uploadDir, file.filename || '')) : null
      const result = await query(
        `INSERT INTO petty_cash_entries
          (id, clinic_id, date, amount, category_id, description, payment_method,
           receipt_filename, receipt_original_filename, receipt_path, receipt_mime_type, receipt_size,
           created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *,
           (SELECT name FROM petty_cash_categories WHERE id = $5) AS category_name`,
        [
          id,
          clinicId,
          date,
          numericAmount,
          categoryId || null,
          description?.trim() || null,
          method,
          file?.filename || null,
          file?.originalname || null,
          receiptPath,
          file?.mimetype || null,
          file?.size || null,
          req.user.sub,
        ]
      )
      res.status(201).json(mapEntryRow(result.rows[0]))
    } catch (err) {
      console.error('Create petty cash entry error:', err)
      res.status(500).json({ error: 'Failed to create entry' })
    }
  }
)

router.put(
  '/:clinicId/entries/:entryId',
  authRequired,
  receiptUpload.single('receipt'),
  async (req, res) => {
    try {
      const { clinicId, entryId } = req.params
      if (!(await canEditPettyCash(req, clinicId))) {
        if (req.file?.path) {
          try { fs.unlinkSync(req.file.path) } catch {}
        }
        return res.status(403).json({ error: 'Forbidden' })
      }
      const existing = await query(
        `SELECT * FROM petty_cash_entries WHERE id = $1 AND clinic_id = $2`,
        [entryId, clinicId]
      )
      if (existing.rows.length === 0) {
        return res.status(404).json({ error: 'Entry not found' })
      }
      const { date, amount, categoryId, description, paymentMethod, removeReceipt } = req.body

      const file = req.file
      const hasNewReceipt = !!file
      const shouldRemoveReceipt = removeReceipt === 'true' || removeReceipt === true
      const old = existing.rows[0]

      let receiptFields = {
        filename: old.receipt_filename,
        original: old.receipt_original_filename,
        filePath: old.receipt_path,
        mime: old.receipt_mime_type,
        size: old.receipt_size,
      }
      if (hasNewReceipt) {
        if (old.receipt_path) {
          try { fs.unlinkSync(old.receipt_path) } catch {}
        }
        receiptFields = {
          filename: file.filename || null,
          original: file.originalname || null,
          filePath: file.path || path.join(uploadDir, file.filename || ''),
          mime: file.mimetype || null,
          size: file.size || null,
        }
      } else if (shouldRemoveReceipt) {
        if (old.receipt_path) {
          try { fs.unlinkSync(old.receipt_path) } catch {}
        }
        receiptFields = { filename: null, original: null, filePath: null, mime: null, size: null }
      }

      const numericAmount = amount !== undefined ? Number(amount) : null
      if (amount !== undefined && (!Number.isFinite(numericAmount) || numericAmount < 0)) {
        return res.status(400).json({ error: 'amount must be a non-negative number' })
      }

      const result = await query(
        `UPDATE petty_cash_entries SET
          date = COALESCE($3, date),
          amount = COALESCE($4, amount),
          category_id = $5,
          description = $6,
          payment_method = COALESCE($7, payment_method),
          receipt_filename = $8,
          receipt_original_filename = $9,
          receipt_path = $10,
          receipt_mime_type = $11,
          receipt_size = $12,
          updated_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND clinic_id = $2
         RETURNING *,
           (SELECT name FROM petty_cash_categories WHERE id = category_id) AS category_name`,
        [
          entryId,
          clinicId,
          date || null,
          numericAmount,
          categoryId === '' ? null : (categoryId ?? old.category_id),
          description !== undefined ? (description?.trim() || null) : old.description,
          paymentMethod || null,
          receiptFields.filename,
          receiptFields.original,
          receiptFields.filePath,
          receiptFields.mime,
          receiptFields.size,
        ]
      )
      res.json(mapEntryRow(result.rows[0]))
    } catch (err) {
      console.error('Update petty cash entry error:', err)
      res.status(500).json({ error: 'Failed to update entry' })
    }
  }
)

router.delete('/:clinicId/entries/:entryId', authRequired, async (req, res) => {
  try {
    const { clinicId, entryId } = req.params
    if (!(await canEditPettyCash(req, clinicId))) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const existing = await query(
      `SELECT receipt_path FROM petty_cash_entries WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' })
    }
    if (existing.rows[0].receipt_path) {
      try { fs.unlinkSync(existing.rows[0].receipt_path) } catch {}
    }
    await query(
      `DELETE FROM petty_cash_entries WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )
    res.json({ message: 'Entry deleted' })
  } catch (err) {
    console.error('Delete petty cash entry error:', err)
    res.status(500).json({ error: 'Failed to delete entry' })
  }
})

router.get('/:clinicId/entries/:entryId/receipt', authRequired, async (req, res) => {
  try {
    const { clinicId, entryId } = req.params
    if (!(await canViewPettyCash(req, clinicId))) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const result = await query(
      `SELECT receipt_path, receipt_mime_type, receipt_original_filename
       FROM petty_cash_entries WHERE id = $1 AND clinic_id = $2`,
      [entryId, clinicId]
    )
    if (result.rows.length === 0 || !result.rows[0].receipt_path) {
      return res.status(404).json({ error: 'Receipt not found' })
    }
    const row = result.rows[0]
    if (!fs.existsSync(row.receipt_path)) {
      return res.status(404).json({ error: 'Receipt file missing' })
    }
    res.setHeader('Content-Type', row.receipt_mime_type || 'application/octet-stream')
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${row.receipt_original_filename || 'receipt'}"`
    )
    fs.createReadStream(row.receipt_path).pipe(res)
  } catch (err) {
    console.error('Get petty cash receipt error:', err)
    res.status(500).json({ error: 'Failed to fetch receipt' })
  }
})

export default router
