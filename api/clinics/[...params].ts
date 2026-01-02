import type { IncomingMessage, ServerResponse } from 'http'
import { createApp } from '../../server/app.js'

let appInstance: ReturnType<typeof createApp> | null = null

function getApp() {
  if (!appInstance) {
    appInstance = createApp()
  }
  return appInstance
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = getApp()
    const originalUrl = req.url || '/'
    let finalUrl = originalUrl

    if (!finalUrl.startsWith('/api/clinics')) {
      if (finalUrl.startsWith('/clinics')) {
        finalUrl = `/api${finalUrl}`
      } else {
        finalUrl = `/api/clinics${finalUrl.startsWith('/') ? '' : '/'}${finalUrl}`
      }
    }

    console.log(`[clinics] ${req.method} ${originalUrl} -> ${finalUrl}`)

    const originalUrlProp = req.url
    req.url = finalUrl

    return new Promise<void>((resolve, reject) => {
      const errorHandler = (err: any) => {
        console.error('[clinics] Error:', err)
        req.url = originalUrlProp
        if (!res.headersSent) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Internal server error', message: err.message }))
        }
        reject(err)
      }

      const finishHandler = () => {
        console.log(`[clinics] Response: ${res.statusCode}`)
        req.url = originalUrlProp
        resolve()
      }

      res.once('finish', finishHandler)
      res.once('close', finishHandler)
      res.once('error', errorHandler)

      app(req as any, res)
    })
  } catch (error: any) {
    console.error('[clinics] Fatal error:', error)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Server error', message: error.message }))
    }
    throw error
  }
}
