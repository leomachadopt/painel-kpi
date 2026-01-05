import { query } from '../db.js'

export type MarketingRunMode = 'stub'

export async function runMarketingJobForClinic(
  clinicId: string,
  date: string,
  mode: MarketingRunMode = 'stub'
) {
  const upsertMetric = async (provider: string) => {
    const id = `metric-${clinicId}-${provider}-${date}`
    await query(
      `INSERT INTO social_daily_metrics (id, clinic_id, provider, date, raw)
       VALUES ($1, $2, $3, $4, $5::jsonb)
       ON CONFLICT (clinic_id, provider, date) DO UPDATE SET raw = EXCLUDED.raw`,
      [id, clinicId, provider, date, JSON.stringify({ mode })]
    )
  }

  await upsertMetric('INSTAGRAM')
  await upsertMetric('FACEBOOK')
  await upsertMetric('GOOGLE_BUSINESS')

  // Keyword rankings: we only create placeholder rows for configured keywords.
  const kw = await query(
    `SELECT id, city, district
     FROM clinic_keywords
     WHERE clinic_id = $1 AND active = true`,
    [clinicId]
  )

  for (const row of kw.rows) {
    const id = `rank-${row.id}-${date}`
    await query(
      `INSERT INTO keyword_rankings_daily
        (id, clinic_id, keyword_id, date, provider, city, district, position, found, raw)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       ON CONFLICT (keyword_id, date) DO UPDATE SET
         provider = EXCLUDED.provider,
         city = EXCLUDED.city,
         district = EXCLUDED.district,
         position = EXCLUDED.position,
         found = EXCLUDED.found,
         raw = EXCLUDED.raw`,
      [
        id,
        clinicId,
        row.id,
        date,
        'STUB',
        row.city,
        row.district,
        null,
        false,
        JSON.stringify({ mode }),
      ]
    )
  }
}

export async function runMarketingJobForAllClinics(date: string) {
  const clinics = await query(
    `SELECT id FROM clinics WHERE active = true ORDER BY id`
  )
  for (const c of clinics.rows) {
    await runMarketingJobForClinic(c.id, date, 'stub')
  }
}





