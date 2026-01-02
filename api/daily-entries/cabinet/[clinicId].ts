import type { IncomingMessage, ServerResponse } from 'http'
import { createApp } from '../../../server/app.js'

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
    let finalUrl = `/api/daily-entries/cabinet${originalUrl}`

    console.log(`[cabinet] ${req.method} ${originalUrl} -> ${finalUrl}`)

    req.url = finalUrl
    app(req as any, res)
  } catch (error: any) {
    console.error('[cabinet] Fatal error:', error)
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'Server error', message: error.message }))
    }
  }
}
