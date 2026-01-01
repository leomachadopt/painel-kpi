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
  
  // Modificar o req original diretamente (mais compatível com Express)
  // O Express espera que req.url seja modificável
  const originalUrlProp = req.url
  req.url = finalUrl
  
  // Log detalhado para debug
  console.log(`[API Handler] ${req.method} ${finalUrl} (original: ${originalUrlProp})`)
  
  // Processar a requisição com Express diretamente
  // O Express vai processar req.url e fazer match com as rotas
  return new Promise<void>((resolve, reject) => {
    // Handler de erro do Express
    const errorHandler = (err: any) => {
      console.error('[API Handler] Express error:', err)
      // Restaurar URL original em caso de erro
      req.url = originalUrlProp
      reject(err)
    }
    
    // Handler de finalização
    const finishHandler = () => {
      // Restaurar URL original após processamento
      req.url = originalUrlProp
      resolve()
    }
    
    res.once('finish', finishHandler)
    res.once('close', finishHandler)
    res.once('error', errorHandler)
    
    // Processar com Express - passar req e res diretamente
    app(req as any, res)
  })
}


