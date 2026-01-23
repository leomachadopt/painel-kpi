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

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Executar queries com fallback individual para evitar quebrar tudo se uma tabela não existir
    const getOrdersCounts = async () => {
      try {
        const result = await query(
          `SELECT
            COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
            COUNT(*) FILTER (WHERE status = 'PAYMENT_PENDING') as payment_pending,
            COUNT(*) FILTER (WHERE status = 'INVOICE_PENDING') as invoice_pending
          FROM orders
          WHERE clinic_id = $1 AND deleted_at IS NULL`,
          [clinicId]
        )
        return {
          pending: parseInt(result.rows[0]?.pending || '0'),
          paymentPending: parseInt(result.rows[0]?.payment_pending || '0'),
          invoicePending: parseInt(result.rows[0]?.invoice_pending || '0'),
        }
      } catch (error) {
        console.error('Error fetching orders counts:', error)
        return { pending: 0, paymentPending: 0, invoicePending: 0 }
      }
    }

    const getTicketsCounts = async () => {
      try {
        const result = await query(
          `SELECT
            COUNT(*) FILTER (
              WHERE EXISTS (
                SELECT 1 FROM ticket_assignees
                WHERE ticket_assignees.ticket_id = tickets.id
                AND ticket_assignees.user_id = $2
              )
            ) as assigned_to_me,
            COUNT(*) FILTER (
              WHERE NOT EXISTS (
                SELECT 1 FROM ticket_assignees
                WHERE ticket_assignees.ticket_id = tickets.id
                AND ticket_assignees.user_id = $2
              )
            ) as others
          FROM tickets
          WHERE clinic_id = $1
            AND status IN ('OPEN', 'IN_PROGRESS')
            AND deleted_at IS NULL`,
          [clinicId, userId]
        )
        return {
          assignedToMe: parseInt(result.rows[0]?.assigned_to_me || '0'),
          others: parseInt(result.rows[0]?.others || '0'),
        }
      } catch (error) {
        console.error('Error fetching tickets counts:', error)
        return { assignedToMe: 0, others: 0 }
      }
    }

    const getAccountsPayableCounts = async () => {
      try {
        const result = await query(
          `SELECT
            COUNT(*) FILTER (WHERE due_date < CURRENT_DATE) as overdue,
            COUNT(*) FILTER (WHERE due_date = CURRENT_DATE) as today,
            COUNT(*) FILTER (WHERE due_date > CURRENT_DATE AND due_date <= CURRENT_DATE + INTERVAL '7 days') as week
          FROM accounts_payable_documents
          WHERE clinic_id = $1
            AND status = 'PENDING'
            AND deleted_at IS NULL`,
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
