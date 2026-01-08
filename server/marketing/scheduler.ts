import { runMarketingJobForAllClinics } from './run.js'

function getMsUntilNextRun(targetHourLocal: number) {
  const now = new Date()
  const next = new Date(now)
  next.setHours(targetHourLocal, 0, 0, 0)
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime() - now.getTime()
}

export function startMarketingScheduler() {
  const enabled = process.env.MARKETING_JOBS_ENABLED !== 'false'
  if (!enabled) {
    console.log('🟡 Marketing scheduler disabled (MARKETING_JOBS_ENABLED=false)')
    return
  }

  const hour = parseInt(process.env.MARKETING_JOBS_HOUR || '3', 10)
  const safeHour = Number.isFinite(hour) ? Math.min(Math.max(hour, 0), 23) : 3

  const scheduleNext = () => {
    const ms = getMsUntilNextRun(safeHour)
    setTimeout(async () => {
      const date = new Date().toISOString().split('T')[0]
      try {
        console.log(`📣 Running marketing job for all clinics (${date})...`)
        await runMarketingJobForAllClinics(date)
        console.log('✅ Marketing job finished')
      } catch (err) {
        console.error('❌ Marketing job failed:', err)
      } finally {
        scheduleNext()
      }
    }, ms)
  }

  scheduleNext()
  console.log(`🕒 Marketing scheduler armed (daily at ${safeHour}:00 local time)`)
}








