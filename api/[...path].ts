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
  
  // Garantir que req.url tenha o prefixo /api se necessário
  // Na Vercel, quando acessamos /api/auth, o req.url deve ser /api/auth
  // Mas vamos garantir que está correto
  const originalUrl = req.url || '/'
  
  // Se a URL não começar com /api, adicionamos o prefixo
  // Isso garante compatibilidade mesmo se a Vercel passar apenas o path sem /api
  if (!originalUrl.startsWith('/api')) {
    req.url = `/api${originalUrl.startsWith('/') ? '' : '/'}${originalUrl}`
  }
  
  // Express app processa a requisição diretamente
  // Não retornar nada - deixar Express gerenciar a resposta
  app(req as any, res as any)
}


