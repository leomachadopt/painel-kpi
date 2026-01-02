import type { IncomingMessage, ServerResponse } from 'http'
import { createApp } from '../../server/app.js'

let appInstance: ReturnType<typeof createApp> | null = null

function getApp() {
  if (!appInstance) {
    console.log('[auth] Creating Express app')
    appInstance = createApp()
  }
  return appInstance
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = getApp()
    const originalUrl = req.url || '/'

    // No Vercel, quando chamamos /api/auth/login, o req.url pode vir como:
    // - "/login" (sem /auth)
    // - "/auth/login" (com /auth mas sem /api)
    // - "/api/auth/login" (URL completa)
    let finalUrl = originalUrl

    // Se não começa com /api/auth, adicionar
    if (!finalUrl.startsWith('/api/auth')) {
      // Se começa com /auth, apenas adicionar /api
      if (finalUrl.startsWith('/auth')) {
        finalUrl = `/api${finalUrl}`
      } else {
        // Caso contrário, adicionar /api/auth
        finalUrl = `/api/auth${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`
      }
    }

    console.log(`[auth] ${req.method} ${originalUrl} -> ${finalUrl}`)

    const originalUrlProp = req.url
    req.url = finalUrl

    return new Promise<void>((resolve, reject) => {
      const errorHandler = (err: any) => {
        console.error('[auth] Error:', err)
        req.url = originalUrlProp
        if (!res.headersSent) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Internal server error', message: err.message }))
        }
        reject(err)
      }

      const finishHandler = () => {
        console.log(`[auth] Response: ${res.statusCode}`)
        req.url = originalUrlProp
        resolve()
      }

      res.once('finish', finishHandler)
      res.once('close', finishHandler)
      res.once('error', errorHandler)

      app(req as any, res)
    })
  } catch (error: any) {
    console.error('[auth] Fatal error:', error)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Server error', message: error.message }))
    }
    throw error
  }
}
