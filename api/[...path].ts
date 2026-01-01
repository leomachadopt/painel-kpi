import type { IncomingMessage, ServerResponse } from 'http'
import { createApp } from '../server/app.js'

// Criar a app uma vez (singleton para serverless)
let appInstance: ReturnType<typeof createApp> | null = null

function getApp() {
  if (!appInstance) {
    appInstance = createApp()
  }
  return appInstance
}

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const app = getApp()
  // Express app processa a requisição diretamente
  app(req as any, res as any)
}


