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
  
  // Na Vercel, quando você tem api/[...path].ts, a requisição /api/daily-entries/...
  // chega no handler. O req.url deve incluir o path completo com /api
  const originalUrl = req.url || '/'
  
  // Se a URL não começar com /api, adicionamos o prefixo
  // Na Vercel com [...path], o path pode vir sem /api
  let finalUrl = originalUrl
  if (!originalUrl.startsWith('/api')) {
    finalUrl = `/api${originalUrl.startsWith('/') ? '' : '/'}${originalUrl}`
  }
  
  // Atualizar req.url para o Express processar corretamente
  req.url = finalUrl
  
  // Log para debug
  console.log(`[API Handler] ${req.method} ${req.url} (original: ${originalUrl})`)
  
  // Express app processa a requisição diretamente
  // Não retornar nada - deixar Express gerenciar a resposta
  app(req as any, res as any)
}


