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

    // Verificar se a tabela ticket_assignees existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ticket_assignees'
      )
    `)
    const hasTicketAssigneesTable = tableExists.rows[0]?.exists || false

    // Se for gestora, retornar contagens separadas
    if (role === 'GESTOR_CLINICA' || role === 'MENTOR') {
      // Contar tickets atribuídos à gestora (criados por ela, atribuídos a ela, ou na tabela assignees)
      let assignedToMeSql = `
        SELECT COUNT(DISTINCT t.id) as count
        FROM tickets t
        WHERE t.clinic_id = $1 AND t.status = 'PENDING' AND (
          t.created_by = $2
          OR t.assigned_to = $2
      `
      
      if (hasTicketAssigneesTable) {
        assignedToMeSql += ` OR EXISTS (SELECT 1 FROM ticket_assignees ta WHERE ta.ticket_id = t.id AND ta.user_id = $2)`
      }
      
      assignedToMeSql += `)`

      const assignedToMeResult = await query(assignedToMeSql, [clinicId, userId])
      const assignedToMeCount = Number(assignedToMeResult.rows[0]?.count || 0)

      // Contar outros tickets abertos (não criados pela gestora, não atribuídos a ela, e não na tabela assignees)
      let othersSql = `
        SELECT COUNT(DISTINCT t.id) as count
        FROM tickets t
        WHERE t.clinic_id = $1 AND t.status = 'PENDING' 
          AND t.created_by != $2
          AND (t.assigned_to IS NULL OR t.assigned_to != $2)
      `
      
      if (hasTicketAssigneesTable) {
        othersSql += ` AND NOT EXISTS (SELECT 1 FROM ticket_assignees ta WHERE ta.ticket_id = t.id AND ta.user_id = $2)`
      }

      const othersResult = await query(othersSql, [clinicId, userId])
      const othersCount = Number(othersResult.rows[0]?.count || 0)

      return res.json({ 
        count: assignedToMeCount + othersCount, // Total para compatibilidade
        assignedToMe: assignedToMeCount,
        others: othersCount
      })
    }

    // Para outros usuários, manter comportamento atual
    let sql = `
      SELECT COUNT(DISTINCT t.id) as count
      FROM tickets t
    `
    
    if (hasTicketAssigneesTable) {
      sql += `LEFT JOIN ticket_assignees ta ON ta.ticket_id = t.id`
    }
    
    sql += ` WHERE t.clinic_id = $1 AND t.status = 'PENDING'`
    
    const params: any[] = [clinicId]

    if (hasTicketAssigneesTable) {
      sql += ` AND (t.created_by = $2 OR t.assigned_to = $2 OR ta.user_id = $2)`
    } else {
      sql += ` AND (t.created_by = $2 OR t.assigned_to = $2)`
    }
    params.push(userId)

    const result = await query(sql, params)
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

    // Verificar se a tabela ticket_assignees existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ticket_assignees'
      )
    `)
    const hasTicketAssigneesTable = tableExists.rows[0]?.exists || false

    let assigneesQuery = `'[]'::json as assignees`
    if (hasTicketAssigneesTable) {
      assigneesQuery = `COALESCE(
        (SELECT json_agg(json_build_object(
          'id', u3.id,
          'name', u3.name,
          'avatar_url', u3.avatar_url
        ))
        FROM ticket_assignees ta
        JOIN users u3 ON ta.user_id = u3.id
        WHERE ta.ticket_id = t.id),
        '[]'::json
      ) as assignees`
    }

    const result = await query(
      `SELECT 
        t.*,
        u1.name as created_by_name,
        u1.avatar_url as created_by_avatar,
        u2.name as assigned_to_name,
        u2.avatar_url as assigned_to_avatar,
        (SELECT COUNT(*) FROM ticket_comments WHERE ticket_id = t.id) as comments_count,
        ${assigneesQuery}
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

    // Verificar se usuário está envolvido no ticket (criador, responsável ou atribuído)
    // Gestores podem ver todos os tickets da clínica
    if (role !== 'GESTOR_CLINICA' && role !== 'MENTOR') {
      let isAssigned = false
      if (hasTicketAssigneesTable && ticket.assignees) {
        const assignees = ticket.assignees || []
        isAssigned = Array.isArray(assignees) && assignees.some((a: any) => a.id === userId)
      }
      if (ticket.created_by !== userId && ticket.assigned_to !== userId && !isAssigned) {
        return res.status(403).json({ error: 'Acesso negado: você não está envolvido neste ticket' })
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

// GET /api/tickets/:clinicId/users - Listar usuários da clínica para atribuição de tickets
router.get('/:clinicId/users', requirePermission('canViewTickets'), async (req: AuthedRequest, res: Response) => {
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

    // Buscar todos os usuários ativos da clínica (colaboradores e gestores)
    const result = await query(
      `SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.avatar_url
      FROM users u
      WHERE u.clinic_id = $1 
        AND u.active = true
        AND (u.role = 'COLABORADOR' OR u.role = 'GESTOR_CLINICA')
      ORDER BY 
        CASE u.role 
          WHEN 'GESTOR_CLINICA' THEN 1
          WHEN 'COLABORADOR' THEN 2
        END,
        u.name ASC`,
      [clinicId]
    )

    res.json({ users: result.rows })
  } catch (error: any) {
    console.error('Error fetching clinic users:', error)
    res.status(500).json({ 
      error: 'Erro ao buscar usuários',
      message: error.message
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

    // Verificar se a tabela ticket_assignees existe
    let hasTicketAssigneesTable = false
    try {
      const tableExists = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'ticket_assignees'
        )
      `)
      hasTicketAssigneesTable = tableExists.rows[0]?.exists || false
    } catch (err) {
      // Se houver erro ao verificar, assumir que a tabela não existe
      hasTicketAssigneesTable = false
    }

    let assigneesSubquery = `'[]'::json as assignees`
    if (hasTicketAssigneesTable) {
      assigneesSubquery = `COALESCE(
        (SELECT json_agg(json_build_object(
          'id', u3.id,
          'name', u3.name,
          'avatar_url', u3.avatar_url
        ))
        FROM ticket_assignees ta
        JOIN users u3 ON ta.user_id = u3.id
        WHERE ta.ticket_id = t.id),
        '[]'::json
      ) as assignees`
    }

    const params: any[] = [clinicId]
    let paramIndex = 2
    let userFilter = ''
    let statusFilter = ''
    let assignedToFilter = ''

    // Filtrar apenas tickets onde o usuário está envolvido (criador, responsável ou atribuído)
    // Gestores podem ver todos os tickets da clínica
    if (role !== 'GESTOR_CLINICA' && role !== 'MENTOR') {
      if (hasTicketAssigneesTable) {
        userFilter = ` AND (
          t.created_by = $${paramIndex} 
          OR t.assigned_to = $${paramIndex} 
          OR EXISTS (SELECT 1 FROM ticket_assignees ta WHERE ta.ticket_id = t.id AND ta.user_id = $${paramIndex})
        )`
      } else {
        userFilter = ` AND (t.created_by = $${paramIndex} OR t.assigned_to = $${paramIndex})`
      }
      params.push(userId)
      paramIndex++
    }

    if (status && status !== 'all') {
      statusFilter = ` AND t.status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    if (assignedTo && assignedTo !== 'all') {
      if (hasTicketAssigneesTable) {
        assignedToFilter = ` AND (
          t.assigned_to = $${paramIndex} 
          OR EXISTS (SELECT 1 FROM ticket_assignees ta WHERE ta.ticket_id = t.id AND ta.user_id = $${paramIndex})
        )`
      } else {
        assignedToFilter = ` AND t.assigned_to = $${paramIndex}`
      }
      params.push(assignedTo)
      paramIndex++
    }

    const sqlQuery = `
      SELECT 
        t.*,
        u1.name as created_by_name,
        u1.avatar_url as created_by_avatar,
        u2.name as assigned_to_name,
        u2.avatar_url as assigned_to_avatar,
        (SELECT COUNT(*) FROM ticket_comments WHERE ticket_id = t.id) as comments_count,
        ${assigneesSubquery}
      FROM tickets t
      LEFT JOIN users u1 ON t.created_by = u1.id
      LEFT JOIN users u2 ON t.assigned_to = u2.id
      WHERE t.clinic_id = $1${userFilter}${statusFilter}${assignedToFilter}
      ORDER BY t.created_at DESC
    `

    const result = await query(sqlQuery, params)
    res.json({ tickets: result.rows })
  } catch (error: any) {
    console.error('Error fetching tickets:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
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
    const { title, description, assignedTo, assignedToMultiple } = req.body

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' })
    }

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' })
    }

    // Suportar tanto assignedTo (string única) quanto assignedToMultiple (array)
    // Para compatibilidade com código antigo
    let assignees: string[] = []
    if (assignedToMultiple && Array.isArray(assignedToMultiple)) {
      assignees = assignedToMultiple.filter((id: string) => id && id !== 'none')
    } else if (assignedTo && assignedTo !== 'none' && assignedTo !== '') {
      assignees = [assignedTo]
    }

    // Normalizar assignedTo para manter compatibilidade: usar o primeiro da lista ou null
    const normalizedAssignedTo = assignees.length > 0 ? assignees[0] : null

    const id = crypto.randomUUID()
    await query(
      `INSERT INTO tickets (id, clinic_id, title, description, assigned_to, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, clinicId, title, description || null, normalizedAssignedTo, userId]
    )

    // Verificar se a tabela ticket_assignees existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ticket_assignees'
      )
    `)
    const hasTicketAssigneesTable = tableExists.rows[0]?.exists || false

    // Inserir múltiplos colaboradores na tabela ticket_assignees
    if (hasTicketAssigneesTable && assignees.length > 0) {
      for (const assigneeId of assignees) {
        const assigneeId_uuid = crypto.randomUUID()
        await query(
          `INSERT INTO ticket_assignees (id, ticket_id, user_id)
           VALUES ($1, $2, $3)
           ON CONFLICT (ticket_id, user_id) DO NOTHING`,
          [assigneeId_uuid, id, assigneeId]
        )
      }
    }

    let assigneesQuery = `'[]'::json as assignees`
    if (hasTicketAssigneesTable) {
      assigneesQuery = `COALESCE(
        (SELECT json_agg(json_build_object(
          'id', u3.id,
          'name', u3.name,
          'avatar_url', u3.avatar_url
        ))
        FROM ticket_assignees ta
        JOIN users u3 ON ta.user_id = u3.id
        WHERE ta.ticket_id = t.id),
        '[]'::json
      ) as assignees`
    }

    const result = await query(
      `SELECT 
        t.*,
        u1.name as created_by_name,
        u1.avatar_url as created_by_avatar,
        u2.name as assigned_to_name,
        u2.avatar_url as assigned_to_avatar,
        ${assigneesQuery}
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
    const { title, description, status, assignedTo, assignedToMultiple } = req.body

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

    // Suportar tanto assignedTo (string única) quanto assignedToMultiple (array)
    let assignees: string[] = []
    if (assignedToMultiple !== undefined) {
      if (Array.isArray(assignedToMultiple)) {
        assignees = assignedToMultiple.filter((id: string) => id && id !== 'none')
      }
    } else if (assignedTo !== undefined) {
      if (assignedTo === 'none' || assignedTo === '') {
        assignees = []
      } else {
        assignees = [assignedTo]
      }
    }

    // Atualizar assigned_to (para compatibilidade) - usar o primeiro da lista ou null
    if (assignedTo !== undefined || assignedToMultiple !== undefined) {
      const normalizedAssignedTo = assignees.length > 0 ? assignees[0] : null
      updates.push(`assigned_to = $${paramIndex++}`)
      params.push(normalizedAssignedTo)
    }

    if (updates.length === 0 && assignedToMultiple === undefined) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' })
    }

    // Atualizar ticket
    if (updates.length > 0) {
      params.push(ticketId)
      await query(
        `UPDATE tickets SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`,
        params
      )
    }

    // Verificar se a tabela ticket_assignees existe
    const tableExists = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ticket_assignees'
      )
    `)
    const hasTicketAssigneesTable = tableExists.rows[0]?.exists || false

    // Atualizar lista de colaboradores atribuídos
    if (hasTicketAssigneesTable && (assignedToMultiple !== undefined || assignedTo !== undefined)) {
      // Remover todos os assignees existentes
      await query('DELETE FROM ticket_assignees WHERE ticket_id = $1', [ticketId])
      
      // Inserir novos assignees
      if (assignees.length > 0) {
        for (const assigneeId of assignees) {
          const assigneeId_uuid = crypto.randomUUID()
          await query(
            `INSERT INTO ticket_assignees (id, ticket_id, user_id)
             VALUES ($1, $2, $3)`,
            [assigneeId_uuid, ticketId, assigneeId]
          )
        }
      }
    }

    let assigneesQuery = `'[]'::json as assignees`
    if (hasTicketAssigneesTable) {
      assigneesQuery = `COALESCE(
        (SELECT json_agg(json_build_object(
          'id', u3.id,
          'name', u3.name,
          'avatar_url', u3.avatar_url
        ))
        FROM ticket_assignees ta
        JOIN users u3 ON ta.user_id = u3.id
        WHERE ta.ticket_id = t.id),
        '[]'::json
      ) as assignees`
    }

    const result = await query(
      `SELECT 
        t.*,
        u1.name as created_by_name,
        u1.avatar_url as created_by_avatar,
        u2.name as assigned_to_name,
        u2.avatar_url as assigned_to_avatar,
        ${assigneesQuery}
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

