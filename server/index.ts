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
import { startMarketingScheduler } from './marketing/scheduler.js'
import { authOptional } from './middleware/auth.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.join(__dirname, '..', '.env')

dotenv.config({ path: envPath, override: true })

// Dev helper: reload .env when it changes (so OAuth vars update without manual restart)
if (process.env.NODE_ENV !== 'production') {
  try {
    fs.watchFile(envPath, { interval: 500 }, () => {
      dotenv.config({ path: envPath, override: true })
      console.log('🔁 .env reloaded')
    })
  } catch {
    // ignore
  }
}

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json())
app.use(authOptional)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/clinics', clinicRoutes)
app.use('/api/monthly-data', monthlyDataRoutes)
app.use('/api/daily-entries', dailyEntriesRoutes)
app.use('/api/patients', patientRoutes)
app.use('/api/config', configRoutes)
app.use('/api/marketing', marketingRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`)
  console.log(`📊 API available at http://localhost:${PORT}/api`)
  startMarketingScheduler()
})
