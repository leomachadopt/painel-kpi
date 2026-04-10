import { runNoShowCheckForAllClinics } from './noShowChecker.js'

/**
 * Calcula quantos ms faltam até o próximo horário target (em hora local)
 */
function getMsUntilNextRun(targetHourLocal: number, targetMinutes: number = 0) {
  const now = new Date()
  const next = new Date(now)
  next.setHours(targetHourLocal, targetMinutes, 0, 0)

  // Se já passou o horário hoje, agendar para amanhã
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }

  return next.getTime() - now.getTime()
}

/**
 * Inicia o scheduler para verificação diária de no-show
 * Roda às 23:59 todos os dias (fim do dia)
 */
export function startNoShowScheduler() {
  const enabled = process.env.NO_SHOW_CHECKER_ENABLED !== 'false'

  if (!enabled) {
    console.log('🟡 No-show checker disabled (NO_SHOW_CHECKER_ENABLED=false)')
    return
  }

  // Permitir configurar horário via env (padrão: 23:59)
  const hour = parseInt(process.env.NO_SHOW_CHECKER_HOUR || '23', 10)
  const minutes = parseInt(process.env.NO_SHOW_CHECKER_MINUTES || '59', 10)

  const safeHour = Number.isFinite(hour) ? Math.min(Math.max(hour, 0), 23) : 23
  const safeMinutes = Number.isFinite(minutes) ? Math.min(Math.max(minutes, 0), 59) : 59

  const scheduleNext = () => {
    const ms = getMsUntilNextRun(safeHour, safeMinutes)

    setTimeout(async () => {
      // Processar o dia ATUAL (que está acabando)
      const date = new Date().toISOString().split('T')[0]

      try {
        console.log(`⏰ Running no-show check for ${date}...`)
        const result = await runNoShowCheckForAllClinics(date)
        console.log(`✅ No-show check finished: ${result.processedCount} marked as no-show`)
      } catch (err) {
        console.error('❌ No-show check failed:', err)
      } finally {
        // Agendar próxima execução
        scheduleNext()
      }
    }, ms)

    const nextRun = new Date(Date.now() + ms)
    console.log(
      `🕒 No-show checker armed (next run: ${nextRun.toLocaleString('pt-BR')} - ${safeHour}:${safeMinutes.toString().padStart(2, '0')})`
    )
  }

  scheduleNext()
}
