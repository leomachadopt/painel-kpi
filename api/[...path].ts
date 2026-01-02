import type { IncomingMessage, ServerResponse } from 'http'
import { createApp } from '../server/app.js'

// Criar a app uma vez (singleton para serverless)
// O Vercel reutiliza a mesma instância entre requisições para otimização
let appInstance: ReturnType<typeof createApp> | null = null

function getApp() {
  if (!appInstance) {
    console.log('[Vercel] Creating new Express app instance')
    appInstance = createApp()
  }
  return appInstance
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
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

    // Log detalhado para debug em produção
    console.log(`[API Handler] ${req.method} ${finalUrl} (original: ${originalUrlProp})`)
    console.log(`[API Handler] Headers:`, JSON.stringify(req.headers, null, 2))

    // Processar a requisição com Express diretamente
    // O Express vai processar req.url e fazer match com as rotas
    return new Promise<void>((resolve, reject) => {
      // Handler de erro do Express
      const errorHandler = (err: any) => {
        console.error('[API Handler] Express error:', err)
        console.error('[API Handler] Stack:', err.stack)
        // Restaurar URL original em caso de erro
        req.url = originalUrlProp

        // Enviar resposta de erro se ainda não foi enviada
        if (!res.headersSent) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Internal server error', message: err.message }))
        }
        reject(err)
      }

      // Handler de finalização
      const finishHandler = () => {
        console.log(`[API Handler] Response finished: ${res.statusCode}`)
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
  } catch (error: any) {
    console.error('[API Handler] Fatal error:', error)
    console.error('[API Handler] Stack:', error.stack)

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


