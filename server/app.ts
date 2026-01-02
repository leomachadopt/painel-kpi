// @ts-nocheck
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import authRoutes from './routes/auth.js'
import clinicRoutes from './routes/clinics.js'
import monthlyDataRoutes from './routes/monthlyData.js'
import dailyEntriesRoutes from './routes/dailyEntries.js'
import patientRoutes from './routes/patients.js'
import configRoutes from './routes/config.js'
import marketingRoutes from './routes/marketing.js'
import { authOptional } from './middleware/auth.js'
import { verifyAuthToken } from './auth/token.js'

// Middleware que seta req.user (compatível com as rotas)
function setUserFromAuth(req: any, _res: any, next: any) {
  const header = req.headers.authorization
  if (header && header.startsWith('Bearer ')) {
    const token = header.slice('Bearer '.length).trim()
    const payload = verifyAuthToken(token)
    if (payload) {
      req.user = payload
      req.auth = payload
    }
  }
  next()
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '..', '.env')

function buildCorsOriginAllowlist() {
  const allowlist = new Set<string>()

  const raw = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:8080'
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((o) => allowlist.add(o))

  // Vercel define VERCEL_URL sem protocolo
  if (process.env.VERCEL_URL) {
    allowlist.add(`https://${process.env.VERCEL_URL}`)
  }

  return allowlist
}

export function createApp() {
  dotenv.config({ path: envPath, override: true })

  // Log para debug em produção
  if (process.env.VERCEL) {
    console.log('🚀 Creating Express app in Vercel environment')
    console.log('DATABASE_URL configured:', !!process.env.DATABASE_URL)
  }

  // Dev helper: reload .env when it changes (não roda em Vercel/serverless)
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    try {
      fs.watchFile(envPath, { interval: 500 }, () => {
        dotenv.config({ path: envPath, override: true })
        console.log('🔁 .env reloaded')
      })
    } catch {
      // ignore
    }
  }

  const corsAllowlist = buildCorsOriginAllowlist()

  const app = express()

  app.use(
    cors({
      origin(origin, callback) {
        // requests sem Origin (curl/server-to-server) devem passar
        if (!origin) return callback(null, true)

        if (corsAllowlist.has(origin)) return callback(null, true)

        // Em desenvolvimento, permitir qualquer localhost (qualquer porta)
        if (process.env.NODE_ENV !== 'production' && origin.startsWith('http://localhost:')) {
          return callback(null, true)
        }

        // opcionalmente permitir qualquer *.vercel.app (preview/prod) sem precisar setar env
        // Se quiser travar isso, defina CORS_ORIGINS explicitamente e remova este bloco.
        if (origin.startsWith('https://') && origin.endsWith('.vercel.app')) {
          return callback(null, true)
        }

        return callback(new Error(`CORS bloqueado para origin: ${origin}`), false)
      },
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  )

  app.use(express.json({ limit: '5mb' }))
  app.use(setUserFromAuth)

  // Serve static files from public directory
  app.use('/uploads', express.static(path.join(__dirname, '..', 'public', 'uploads')))

  // Routes
  app.use('/api/auth', authRoutes)
  app.use('/api/clinics', clinicRoutes)
  app.use('/api/monthly-data', monthlyDataRoutes)
  app.use('/api/daily-entries', dailyEntriesRoutes)
  app.use('/api/patients', patientRoutes)
  app.use('/api/config', configRoutes)
  app.use('/api/marketing', marketingRoutes)

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // 404 handler for API routes (for debugging)
  // IMPORTANTE: Este handler deve ser o último middleware para /api
  app.use('/api', (req: express.Request, res: express.Response) => {
    console.error(`[404] Route not found: ${req.method} ${req.url}`)
    console.error(`[404] Path: ${req.path}, OriginalUrl: ${req.originalUrl}`)
    console.error(`[404] BaseUrl: ${req.baseUrl}`)
    res.status(404).json({
      error: 'Route not found',
      method: req.method,
      url: req.url,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
    })
  })

  // Error handling middleware
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Error:', err)
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    })
  })

  return app
}


