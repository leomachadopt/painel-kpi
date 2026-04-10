import { query } from './db.js'
import crypto from 'crypto'

/**
 * Job diário: Verifica consultas do dia sem "Paciente chegou?" e marca como no_show
 *
 * Lógica:
 * - Busca appointments com status 'scheduled' ou 'confirmed'
 * - Sem actualArrival (paciente NÃO chegou)
 * - Marca como no_show
 * - Incrementa métrica daily_consultation_control_entries
 */
export async function runNoShowCheckForAllClinics(date: string) {
  try {
    console.log(`[NO_SHOW_CHECKER] Running no-show check for date: ${date}`)

    // Buscar todas as consultas do dia sem actualArrival
    const result = await query(
      `SELECT id, clinic_id, date, patient_name, patient_code
       FROM appointments
       WHERE date = $1
         AND status IN ('scheduled', 'confirmed')
         AND actual_arrival IS NULL`,
      [date]
    )

    const appointments = result.rows

    if (appointments.length === 0) {
      console.log(`[NO_SHOW_CHECKER] No appointments to mark as no-show for ${date}`)
      return { processedCount: 0 }
    }

    console.log(`[NO_SHOW_CHECKER] Found ${appointments.length} appointments without arrival`)

    let processedCount = 0

    for (const appointment of appointments) {
      try {
        // 1. Atualizar status do appointment para no_show
        await query(
          `UPDATE appointments
           SET status = 'no_show'
           WHERE id = $1 AND clinic_id = $2`,
          [appointment.id, appointment.clinic_id]
        )

        // 2. Incrementar métrica de no_show
        await query(
          `INSERT INTO daily_consultation_control_entries
            (id, clinic_id, date, no_show, rescheduled, cancelled, old_patient_booking)
           VALUES ($1, $2, $3, 1, 0, 0, 0)
           ON CONFLICT (clinic_id, date)
           DO UPDATE SET no_show = daily_consultation_control_entries.no_show + 1`,
          [crypto.randomUUID(), appointment.clinic_id, appointment.date]
        )

        processedCount++
        console.log(
          `[NO_SHOW_CHECKER] Marked as no_show: ${appointment.patient_code} - ${appointment.patient_name}`
        )
      } catch (error) {
        console.error(
          `[NO_SHOW_CHECKER] Error processing appointment ${appointment.id}:`,
          error
        )
        // Continuar processando os outros mesmo se um falhar
      }
    }

    console.log(`[NO_SHOW_CHECKER] Processed ${processedCount}/${appointments.length} appointments`)

    return { processedCount, totalFound: appointments.length }
  } catch (error) {
    console.error('[NO_SHOW_CHECKER] Failed to run no-show check:', error)
    throw error
  }
}
