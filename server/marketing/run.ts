import { query } from '../db.js'
import {
  getGbpIntegrationTokens,
  ensureGoogleAccessToken,
  fetchGbpInsights,
  fetchGbpReviews,
} from './google.js'

export type MarketingRunMode = 'stub' | 'real'

/**
 * Process Google Business Profile insights data into daily metrics
 */
async function processGbpInsights(
  clinicId: string,
  date: string,
  insightsData: any
) {
  const metrics: Record<string, number> = {}

  // Parse the API response
  const timeSeries = insightsData?.multiDailyMetricTimeSeries || []

  for (const series of timeSeries) {
    const metric = series?.dailyMetricTimeSeries?.dailyMetric
    const values = series?.dailyMetricTimeSeries?.timeSeries?.datedValues || []

    // Find value for the specific date
    for (const datedValue of values) {
      const d = datedValue.date
      if (!d) continue

      const dateStr = `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
      if (dateStr === date) {
        const value = parseInt(String(datedValue.value || '0'), 10)
        metrics[metric || 'UNKNOWN'] = value
      }
    }
  }

  // Map Google metrics to our database fields
  const profileViews = (metrics.VIEWS_MAPS || 0) + (metrics.VIEWS_SEARCH || 0)
  const websiteClicks = metrics.ACTIONS_WEBSITE || 0
  const calls = metrics.ACTIONS_PHONE || 0
  const directions = metrics.ACTIONS_DRIVING_DIRECTIONS || 0
  const impressions =
    (metrics.QUERIES_DIRECT || 0) + (metrics.QUERIES_INDIRECT || 0)

  const id = `metric-${clinicId}-GOOGLE_BUSINESS-${date}`
  await query(
    `INSERT INTO social_daily_metrics
      (id, clinic_id, provider, date, profile_views, website_clicks, calls, directions, impressions, raw)
     VALUES ($1, $2, 'GOOGLE_BUSINESS', $3, $4, $5, $6, $7, $8, $9::jsonb)
     ON CONFLICT (clinic_id, provider, date) DO UPDATE SET
       profile_views = EXCLUDED.profile_views,
       website_clicks = EXCLUDED.website_clicks,
       calls = EXCLUDED.calls,
       directions = EXCLUDED.directions,
       impressions = EXCLUDED.impressions,
       raw = EXCLUDED.raw`,
    [
      id,
      clinicId,
      date,
      profileViews,
      websiteClicks,
      calls,
      directions,
      impressions,
      JSON.stringify(metrics),
    ]
  )
}

/**
 * Process Google Business Profile reviews
 */
async function processGbpReviews(clinicId: string, date: string, reviewsData: any) {
  const reviews = reviewsData?.reviews || []
  const totalReviews = reviewsData?.totalReviewCount || reviews.length
  const avgRating = reviewsData?.averageRating || null

  // Count new reviews for this date
  let newReviewsCount = 0
  for (const review of reviews) {
    const createTime = review.createTime
    if (createTime) {
      const reviewDate = createTime.split('T')[0] // Get YYYY-MM-DD
      if (reviewDate === date) {
        newReviewsCount++
      }
    }
  }

  // Update the metric with review data
  await query(
    `UPDATE social_daily_metrics
     SET reviews_total = $1, reviews_new = $2, rating_avg = $3
     WHERE clinic_id = $4 AND provider = 'GOOGLE_BUSINESS' AND date = $5`,
    [totalReviews, newReviewsCount, avgRating, clinicId, date]
  )
}

/**
 * Collect real data from Google Business Profile
 */
async function collectGbpData(clinicId: string, date: string) {
  try {
    // Get integration details
    const integration = await getGbpIntegrationTokens(clinicId)
    if (!integration || !integration.metadata?.accountId) {
      console.log(`Clinic ${clinicId}: GBP not configured or location not selected`)
      return false
    }

    const locationId = await query(
      `SELECT external_location_id FROM clinic_integrations WHERE clinic_id = $1 AND provider = 'GBP'`,
      [clinicId]
    )

    if (locationId.rows.length === 0 || !locationId.rows[0].external_location_id) {
      console.log(`Clinic ${clinicId}: GBP location not selected`)
      return false
    }

    const location = locationId.rows[0].external_location_id

    // Get fresh access token
    const accessToken = await ensureGoogleAccessToken(clinicId)

    // Fetch insights for the date
    const insightsData = await fetchGbpInsights({
      accessToken,
      locationId: location,
      startDate: date,
      endDate: date,
    })

    // Process and store insights
    await processGbpInsights(clinicId, date, insightsData)

    // Fetch and process reviews
    // NOTE: Reviews API (mybusiness.googleapis.com v4) was deprecated and cannot be enabled
    // for new projects. This functionality is temporarily disabled until Google provides
    // an alternative in the new APIs.
    // See: https://developers.google.com/my-business/content/review-data
    try {
      // Temporarily disabled - API no longer available for new projects
      // const reviewsData = await fetchGbpReviews({
      //   accessToken,
      //   accountId: integration.metadata.accountId,
      //   locationId: location,
      //   pageSize: 100,
      // })
      // await processGbpReviews(clinicId, date, reviewsData)
      console.log(`ℹ️  Reviews collection skipped (API deprecated - not available for new projects)`)
    } catch (reviewError: any) {
      console.warn(`Failed to fetch reviews for clinic ${clinicId}:`, reviewError.message)
      // Continue even if reviews fail
    }

    console.log(`✅ Collected GBP data for clinic ${clinicId} on ${date}`)
    return true
  } catch (error: any) {
    console.error(`❌ Failed to collect GBP data for clinic ${clinicId}:`, error.message)
    return false
  }
}

/**
 * Run marketing data collection for a single clinic
 */
export async function runMarketingJobForClinic(
  clinicId: string,
  date: string,
  mode: MarketingRunMode = 'real'
) {
  if (mode === 'stub') {
    // Legacy stub mode for testing
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
  } else {
    // Real mode: collect actual data
    console.log(`\n📊 Collecting marketing data for clinic ${clinicId} on ${date}...`)

    // Collect Google Business Profile data
    await collectGbpData(clinicId, date)

    // TODO: Collect Instagram data (Meta API)
    // TODO: Collect Facebook data (Meta API)
  }

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
        mode === 'stub' ? 'STUB' : 'PENDING',
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












