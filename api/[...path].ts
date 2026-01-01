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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = getApp()
  
  // Na Vercel com api/[...path].ts, quando você acessa /api/daily-entries/...
  // O req.url pode vir como /daily-entries/... (sem /api) OU /api/daily-entries/...
  const originalUrl = req.url || '/'
  
  // CRÍTICO: Garantir que sempre tenha /api no início
  let finalUrl = originalUrl
  if (!originalUrl.startsWith('/api')) {
    finalUrl = `/api${originalUrl.startsWith('/') ? '' : '/'}${originalUrl}`
  }
  
  // Criar um novo objeto req com todas as propriedades necessárias para o Express
  // O Express precisa de propriedades específicas que podem não estar no IncomingMessage
  const expressReq = Object.create(req) as any
  
  // Definir propriedades críticas que o Express usa para roteamento
  expressReq.url = finalUrl
  expressReq.originalUrl = finalUrl
  expressReq.path = finalUrl.split('?')[0] // Remove query string
  expressReq.baseUrl = ''
  expressReq.method = req.method || 'GET'
  
  // Preservar headers e outras propriedades importantes
  expressReq.headers = req.headers || {}
  expressReq.headers.host = req.headers?.host || ''
  expressReq.headers['x-forwarded-for'] = req.headers?.['x-forwarded-for'] || ''
  expressReq.headers['x-forwarded-proto'] = req.headers?.['x-forwarded-proto'] || 'https'
  
  // Log detalhado para debug
  console.log(`[API Handler] ${req.method} ${finalUrl}`)
  console.log(`[API Handler] Express will receive path: ${expressReq.path}`)
  
  // Processar a requisição com Express
  // Usar Promise para garantir que o Express termine de processar
  return new Promise<void>((resolve, reject) => {
    // Handler de erro do Express
    const errorHandler = (err: any) => {
      console.error('[API Handler] Express error:', err)
      reject(err)
    }
    
    // Handler de finalização
    const finishHandler = () => {
      resolve()
    }
    
    res.once('finish', finishHandler)
    res.once('close', finishHandler)
    res.once('error', errorHandler)
    
    // Processar com Express
    app(expressReq, res)
  })
}


