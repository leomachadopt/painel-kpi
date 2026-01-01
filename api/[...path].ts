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
  
  // Na Vercel com api/[...path].ts, quando você acessa /api/daily-entries/...
  // O req.url já vem com /api/daily-entries/... (completo)
  const originalUrl = req.url || '/'
  
  // Se a URL não começar com /api, adicionamos o prefixo
  // Isso é necessário caso a Vercel passe apenas o path sem /api
  let finalUrl = originalUrl
  if (!originalUrl.startsWith('/api')) {
    finalUrl = `/api${originalUrl.startsWith('/') ? '' : '/'}${originalUrl}`
  }
  
  // Atualizar req.url para o Express processar
  // O Express vai processar a URL completa e fazer match com as rotas registradas
  req.url = finalUrl
  
  // Log para debug
  console.log(`[API Handler] ${req.method} ${finalUrl} (original: ${originalUrl})`)
  
  // Express app processa a requisição diretamente
  // O Express vai processar a URL e fazer match com as rotas registradas em app.use('/api/...', ...)
  app(req as any, res as any)
}


