import type { IncomingMessage, ServerResponse } from 'http'
import { createApp } from '../server/app.js'

let appInstance: ReturnType<typeof createApp> | null = null

function getApp() {
  if (!appInstance) {
    console.log('[API] Creating Express app instance')
    appInstance = createApp()
  }
  return appInstance
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = getApp()
    const originalUrl = req.url || '/'

    // Vercel routes /api/* to this function, but strips /api from req.url
    // So we need to add it back
    let finalUrl = originalUrl
    if (!finalUrl.startsWith('/api')) {
      finalUrl = `/api${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`
    }

    console.log(`[API] ${req.method} ${originalUrl} -> ${finalUrl}`)

    const originalUrlProp = req.url
    req.url = finalUrl

    return new Promise<void>((resolve, reject) => {
      const errorHandler = (err: any) => {
        console.error('[API] Express error:', err)
        console.error('[API] Stack:', err.stack)
        req.url = originalUrlProp

        if (!res.headersSent) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Internal server error', message: err.message }))
        }
        reject(err)
      }

      const finishHandler = () => {
        console.log(`[API] Response: ${res.statusCode}`)
        req.url = originalUrlProp
        resolve()
      }

      res.once('finish', finishHandler)
      res.once('close', finishHandler)
      res.once('error', errorHandler)

      app(req as any, res)
    })
  } catch (error: any) {
    console.error('[API] Fatal error:', error)
    console.error('[API] Stack:', error.stack)

    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({
        error: 'Fatal server error',
        message: error.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
      }))
    }

    throw error
  }
}
