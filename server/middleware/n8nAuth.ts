import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcrypt'
import { query } from '../db.js'

/**
 * Middleware de autenticação exclusivo para endpoints do n8n.
 * Verifica a API key global armazenada em system_settings.
 *
 * A chave pode vir de dois headers:
 * - Authorization: Bearer n8n_xxxxx
 * - X-N8N-API-Key: n8n_xxxxx
 */
export async function n8nAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // 1. Extrair API key do header
    let apiKey: string | undefined

    const authHeader = req.headers.authorization
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.slice('Bearer '.length).trim()
    }

    const customHeader = req.headers['x-n8n-api-key']
    if (!apiKey && customHeader && typeof customHeader === 'string') {
      apiKey = customHeader.trim()
    }

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing API key. Provide via Authorization: Bearer or X-N8N-API-Key header'
      })
    }

    // 2. Buscar hash armazenado em system_settings
    const result = await query(
      'SELECT value FROM system_settings WHERE key = $1',
      ['n8n_api_key_hash']
    )

    if (result.rows.length === 0 || !result.rows[0].value) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No API key configured. Contact administrator.'
      })
    }

    const storedHash = result.rows[0].value

    // 3. Comparar API key recebida com hash armazenado
    const isValid = await bcrypt.compare(apiKey, storedHash)

    if (!isValid) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      })
    }

    // 4. API key válida — prosseguir
    next()
  } catch (error) {
    console.error('n8n auth middleware error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}
