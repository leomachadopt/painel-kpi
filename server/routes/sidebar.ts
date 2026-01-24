import { Router } from 'express'
import { query } from '../db.js'
import { authRequired, type AuthedRequest } from '../middleware/auth.js'

const router = Router()

/**
 * GET /api/sidebar/counts/:clinicId
 *
 * Endpoint consolidado que retorna TODOS os contadores do sidebar em uma única request.
 * Substitui 5 endpoints separados que eram chamados a cada 30s.
 *
 * Reduz de 5 requests/30s para 1 request/60s = 83% de redução
 */
router.get('/counts/:clinicId', authRequired, async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    const userId = req.auth?.sub

    console.log('🔐 Sidebar auth debug:', {
      clinicId,
      userId,
      hasAuth: !!req.auth,
      authKeys: req.auth ? Object.keys(req.auth) : 'no auth',
      headers: req.headers.authorization ? 'present' : 'missing'
    })

    if (!userId) {
      console.error('❌ No userId found in req.auth:', req.auth)
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Executar queries com fallback individual para evitar quebrar tudo se uma tabela não existir
    const getOrdersCounts = async () => {
      // Tabela orders não existe - retornar 0 sempre
      return { pending: 0, paymentPending: 0, invoicePending: 0 }
    }

    const getTicketsCounts = async () => {
      try {
        console.log('🎫 Fetching tickets counts for:', { clinicId, userId })
        const result = await query(
          `SELECT
            COUNT(*) FILTER (WHERE assigned_to = $2) as assigned_to_me,
            COUNT(*) FILTER (WHERE assigned_to IS NULL OR assigned_to != $2) as others
          FROM tickets
          WHERE clinic_id = $1
            AND status IN ('PENDING', 'IN_PROGRESS')`,
          [clinicId, userId]
        )
        const counts = {
          assignedToMe: parseInt(result.rows[0]?.assigned_to_me || '0'),
          others: parseInt(result.rows[0]?.others || '0'),
        }
        console.log('🎫 Tickets counts result:', counts)
        return counts
      } catch (error) {
        console.error('Error fetching tickets counts:', error)
        return { assignedToMe: 0, others: 0 }
      }
    }

    const getAccountsPayableCounts = async () => {
      try {
        const result = await query(
          `SELECT
            COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND paid = false) as overdue,
            COUNT(*) FILTER (WHERE due_date = CURRENT_DATE AND paid = false) as today,
            COUNT(*) FILTER (WHERE due_date > CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days' AND paid = false) as week
          FROM accounts_payable
          WHERE clinic_id = $1`,
          [clinicId]
        )
        return {
          overdue: parseInt(result.rows[0]?.overdue || '0'),
          today: parseInt(result.rows[0]?.today || '0'),
          week: parseInt(result.rows[0]?.week || '0'),
        }
      } catch (error) {
        console.error('Error fetching accounts payable counts:', error)
        return { overdue: 0, today: 0, week: 0 }
      }
    }

    // Executar todas em paralelo
    const [orders, tickets, accountsPayable] = await Promise.all([
      getOrdersCounts(),
      getTicketsCounts(),
      getAccountsPayableCounts(),
    ])

    const counts = {
      orders,
      tickets,
      accountsPayable,
    }

    // Cache: 60 segundos no cliente, 120 segundos no edge
    // stale-while-revalidate permite servir cache enquanto revalida
    res.setHeader('Cache-Control', 'max-age=60, s-maxage=120, stale-while-revalidate=30')
    res.json(counts)
  } catch (error: any) {
    console.error('Error fetching sidebar counts:', error)
    res.status(500).json({
      error: 'Failed to fetch sidebar counts',
      message: error.message
    })
  }
})

export default router
