import { Router, Response } from 'express'
import { query } from '../db.js'
import { authRequired, type AuthedRequest } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permissions.js'
import crypto from 'crypto'

const router = Router()

// All routes require authentication
router.use(authRequired)

// GET /api/tickets/:clinicId/count - Contar tickets pendentes (deve vir antes de /:clinicId)
router.get('/:clinicId/count', requirePermission('canViewTickets'), async (req: AuthedRequest, res: Response) => {
  try {
    const { clinicId } = req.params
    const userId = req.auth?.sub
    const role = req.auth?.role

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    if (!clinicId) {
      return res.status(400).json({ error: 'ID da clínica é obrigatório' })
    }

    // Verificar se usuário tem acesso à clínica
    if (role === 'COLABORADOR') {
      const userClinic = await query(
        'SELECT clinic_id FROM users WHERE id = $1',
        [userId]
      )
      if (userClinic.rows[0]?.clinic_id !== clinicId) {
        return res.status(403).json({ error: 'Acesso negado' })
      }
    }

    const result = await query(
      `SELECT COUNT(*) as count
      FROM tickets
      WHERE clinic_id = $1 AND status = 'PENDING'`,
      [clinicId]
    )

    const count = Number(result.rows[0]?.count || 0)
    
    res.json({ count })
  } catch (error: any) {
    console.error('Error counting tickets:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    })
    res.status(500).json({ 
      error: 'Erro ao contar tickets',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// GET /api/tickets/ticket/:ticketId - Buscar ticket por ID (usando prefixo para evitar conflito)
router.get('/ticket/:ticketId', requirePermission('canViewTickets'), async (req: AuthedRequest, res: Response) => {
  try {
    const { ticketId } = req.params
    const userId = req.auth?.sub
    const role = req.auth?.role

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    const result = await query(
      `SELECT 
        t.*,
        u1.name as created_by_name,
        u1.avatar_url as created_by_avatar,
        u2.name as assigned_to_name,
        u2.avatar_url as assigned_to_avatar,
        (SELECT COUNT(*) FROM ticket_comments WHERE ticket_id = t.id) as comments_count
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.id = $1`,
      [ticketId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket não encontrado' })
    }

    const ticket = result.rows[0]

    // Verificar se usuário tem acesso à clínica do ticket
    if (role === 'COLABORADOR') {
      const userClinic = await query(
        'SELECT clinic_id FROM users WHERE id = $1',
        [userId]
      )
      if (userClinic.rows[0]?.clinic_id !== ticket.clinic_id) {
        return res.status(403).json({ error: 'Acesso negado' })
      }
    }

    res.json({ ticket: result.rows[0] })
  } catch (error: any) {
    console.error('Error fetching ticket:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    })
    res.status(500).json({ 
      error: 'Erro ao buscar ticket',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// GET /api/tickets/:clinicId - Listar tickets da clínica
router.get('/:clinicId', requirePermission('canViewTickets'), async (req: AuthedRequest, res: Response) => {
  try {
    const { clinicId } = req.params
    const userId = req.auth?.sub
    const role = req.auth?.role

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    // Verificar se usuário tem acesso à clínica
    if (role === 'COLABORADOR') {
      const userClinic = await query(
        'SELECT clinic_id FROM users WHERE id = $1',
        [userId]
      )
      if (userClinic.rows[0]?.clinic_id !== clinicId) {
        return res.status(403).json({ error: 'Acesso negado' })
      }
    }

    const { status, assignedTo } = req.query

    let sql = `
      SELECT 
        t.*,
        u1.name as created_by_name,
        u1.avatar_url as created_by_avatar,
        u2.name as assigned_to_name,
        u2.avatar_url as assigned_to_avatar,
        (SELECT COUNT(*) FROM ticket_comments WHERE ticket_id = t.id) as comments_count
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.clinic_id = $1
    `
    const params: any[] = [clinicId]
    let paramIndex = 2

    if (status && status !== 'all') {
      sql += ` AND t.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (assignedTo && assignedTo !== 'all') {
      sql += ` AND t.assigned_to = $${paramIndex}`
      params.push(assignedTo)
      paramIndex++
    }

    sql += ` ORDER BY t.created_at DESC`

    const result = await query(sql, params)
    res.json({ tickets: result.rows })
  } catch (error: any) {
    console.error('Error fetching tickets:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    })
    res.status(500).json({ 
      error: 'Erro ao buscar tickets',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// POST /api/tickets/:clinicId - Criar novo ticket
router.post('/:clinicId', requirePermission('canEditTickets'), async (req: AuthedRequest, res: Response) => {
  try {
    const { clinicId } = req.params
    const userId = req.auth?.sub
    const { title, description, priority, assignedTo, dueDate } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' })
    }

    // Normalizar assignedTo: se for 'none', converter para null
    const normalizedAssignedTo = assignedTo === 'none' || assignedTo === '' ? null : assignedTo

    const id = crypto.randomUUID()
    await query(
      `INSERT INTO tickets (id, clinic_id, title, description, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, clinicId, title, description || null, normalizedAssignedTo, userId]
    )

    const result = await query(
      `SELECT 
        t.*,
        u1.name as created_by_name,
        u1.avatar_url as created_by_avatar,
        u2.name as assigned_to_name,
        u2.avatar_url as assigned_to_avatar
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.id = $1`,
      [id]
    )

    res.status(201).json({ ticket: result.rows[0] })
  } catch (error: any) {
    console.error('Error creating ticket:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    })
    res.status(500).json({ 
      error: 'Erro ao criar ticket',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// GET /api/tickets/:ticketId/comments - Listar comentários (deve vir antes de /:ticketId)
router.get('/:ticketId/comments', requirePermission('canViewTickets'), async (req: AuthedRequest, res: Response) => {
  try {
    const { ticketId } = req.params

    // Verificar se o ticket existe
    const ticketCheck = await query('SELECT id FROM tickets WHERE id = $1', [ticketId])
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket não encontrado' })
    }

    const result = await query(
      `SELECT 
        tc.*,
        u.name as user_name,
        u.avatar_url as user_avatar
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.ticket_id = $1
      ORDER BY tc.created_at ASC`,
      [ticketId]
    )

    res.json({ comments: result.rows })
  } catch (error: any) {
    console.error('Error fetching comments:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    })
    res.status(500).json({ 
      error: 'Erro ao buscar comentários',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// PUT /api/tickets/:ticketId - Atualizar ticket
router.put('/:ticketId', requirePermission('canEditTickets'), async (req: AuthedRequest, res: Response) => {
  try {
    const { ticketId } = req.params
    const userId = req.auth?.sub
    const { title, description, status, assignedTo } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    // Verificar se ticket existe e usuário tem permissão
    const ticketCheck = await query('SELECT * FROM tickets WHERE id = $1', [ticketId])
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket não encontrado' })
    }

    const updates: string[] = []
    const params: any[] = []
    let paramIndex = 1

    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`)
      params.push(title)
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`)
      params.push(description)
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`)
      params.push(status)
      if (status === 'COMPLETED') {
        updates.push(`completed_at = CURRENT_TIMESTAMP`)
      } else if (status !== 'COMPLETED') {
        updates.push(`completed_at = NULL`)
      }
    }
    if (assignedTo !== undefined) {
      // Normalizar assignedTo: se for 'none', converter para null
      const normalizedAssignedTo = assignedTo === 'none' || assignedTo === '' ? null : assignedTo
      updates.push(`assigned_to = $${paramIndex++}`)
      params.push(normalizedAssignedTo)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    params.push(ticketId)
    await query(
      `UPDATE tickets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
      params
    )

    const result = await query(
      `SELECT 
        t.*,
        u1.name as created_by_name,
        u1.avatar_url as created_by_avatar,
        u2.name as assigned_to_name,
        u2.avatar_url as assigned_to_avatar
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.id = $1`,
      [ticketId]
    )

    res.json({ ticket: result.rows[0] })
  } catch (error: any) {
    console.error('Error updating ticket:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    })
    res.status(500).json({ 
      error: 'Erro ao atualizar ticket',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// DELETE /api/tickets/:ticketId - Deletar ticket
router.delete('/:ticketId', requirePermission('canEditTickets'), async (req: AuthedRequest, res: Response) => {
  try {
    const { ticketId } = req.params
    const userId = req.auth?.sub

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    // Verificar se ticket existe e se usuário é o criador ou gestor
    const ticket = await query('SELECT * FROM tickets WHERE id = $1', [ticketId])
    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket não encontrado' })
    }

    const user = await query('SELECT role, clinic_id FROM users WHERE id = $1', [userId])
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    const userRole = user.rows[0]?.role
    const isCreator = ticket.rows[0].created_by === userId
    const isGestor = userRole === 'GESTOR_CLINICA' || userRole === 'MENTOR'

    if (!isCreator && !isGestor) {
      return res.status(403).json({ error: 'Sem permissão para deletar este ticket' })
    }

    await query('DELETE FROM tickets WHERE id = $1', [ticketId])
    res.json({ message: 'Ticket deletado com sucesso' })
  } catch (error: any) {
    console.error('Error deleting ticket:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    })
    res.status(500).json({ 
      error: 'Erro ao deletar ticket',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

// POST /api/tickets/:ticketId/comments - Adicionar comentário
router.post('/:ticketId/comments', requirePermission('canEditTickets'), async (req: AuthedRequest, res: Response) => {
  try {
    const { ticketId } = req.params
    const userId = req.auth?.sub
    const { comment } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    if (!comment) {
      return res.status(400).json({ error: 'Comentário é obrigatório' })
    }

    // Verificar se o ticket existe
    const ticketCheck = await query('SELECT id FROM tickets WHERE id = $1', [ticketId])
    if (ticketCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket não encontrado' })
    }

    const id = crypto.randomUUID()
    await query(
      'INSERT INTO ticket_comments (id, ticket_id, user_id, comment) VALUES ($1, $2, $3, $4)',
      [id, ticketId, userId, comment]
    )

    const result = await query(
      `SELECT 
        tc.*,
        u.name as user_name,
        u.avatar_url as user_avatar
      FROM ticket_comments tc
      JOIN users u ON tc.user_id = u.id
      WHERE tc.id = $1`,
      [id]
    )

    res.status(201).json({ comment: result.rows[0] })
  } catch (error: any) {
    console.error('Error creating comment:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail
    })
    res.status(500).json({ 
      error: 'Erro ao criar comentário',
      message: error.message,
      detail: error.detail || error.toString()
    })
  }
})

export default router

