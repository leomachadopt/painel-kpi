import type { IncomingMessage, ServerResponse } from 'http'
import { createApp } from '../../server/app.js'

let appInstance: ReturnType<typeof createApp> | null = null

function getApp() {
  if (!appInstance) {
    console.log('[Vercel daily-entries] Creating Express app')
    appInstance = createApp()
  }
  return appInstance
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = getApp()
    const originalUrl = req.url || '/'

    // Construir a URL completa: /api/daily-entries/...
    let finalUrl = `/api/daily-entries${originalUrl}`

    const originalUrlProp = req.url
    req.url = finalUrl

    console.log(`[daily-entries] ${req.method} ${finalUrl}`)

    return new Promise<void>((resolve, reject) => {
      const errorHandler = (err: any) => {
        console.error('[daily-entries] Error:', err)
        req.url = originalUrlProp

        if (!res.headersSent) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Internal server error', message: err.message }))
        }
        reject(err)
      }

      const finishHandler = () => {
        console.log(`[daily-entries] Response: ${res.statusCode}`)
        req.url = originalUrlProp
        resolve()
      }

      res.once('finish', finishHandler)
      res.once('close', finishHandler)
      res.once('error', errorHandler)

      app(req as any, res)
    })
  } catch (error: any) {
    console.error('[daily-entries] Fatal error:', error)

    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Server error', message: error.message }))
    }

    throw error
  }
}
