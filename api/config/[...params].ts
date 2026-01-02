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
  const app = getApp()
  const originalUrl = req.url || '/'
  const finalUrl = `/api/config${originalUrl}`

  req.url = finalUrl
  app(req as any, res)
}
