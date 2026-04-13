import { runMarketingJobForAllClinics } from './run.js'
import { collectAllStories } from './stories.js'

function getMsUntilNextRun(targetHourLocal: number) {
  const now = new Date()
  const next = new Date(now)
  next.setHours(targetHourLocal, 0, 0, 0)
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }
  return next.getTime() - now.getTime()
}

function getMsUntilNextInterval(intervalHours: number) {
  const now = new Date()
  const currentHour = now.getHours()
  const nextRunHour = Math.ceil(currentHour / intervalHours) * intervalHours
  const next = new Date(now)
  next.setHours(nextRunHour, 0, 0, 0)
  if (next <= now) {
    next.setHours(nextRunHour + intervalHours, 0, 0, 0)
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

export function startStoriesScheduler() {
  const enabled = process.env.STORIES_JOBS_ENABLED !== 'false'
  if (!enabled) {
    console.log('🟡 Stories scheduler disabled (STORIES_JOBS_ENABLED=false)')
    return
  }

  // Run every 6 hours by default (to capture stories before they expire in 24h)
  const intervalHours = parseInt(process.env.STORIES_JOBS_INTERVAL_HOURS || '6', 10)
  const safeInterval = Number.isFinite(intervalHours) ? Math.max(intervalHours, 1) : 6

  const scheduleNext = () => {
    const ms = getMsUntilNextInterval(safeInterval)
    setTimeout(async () => {
      try {
        console.log('📸 Running Instagram Stories collection for all clinics...')
        const result = await collectAllStories()
        console.log(
          `✅ Stories collection finished. Collected ${result.totalCollected} stories from ${result.totalClinics} clinics`
        )
      } catch (err) {
        console.error('❌ Stories collection failed:', err)
      } finally {
        scheduleNext()
      }
    }, ms)
  }

  scheduleNext()
  console.log(`📸 Stories scheduler armed (every ${safeInterval} hours)`)
}












