import { query } from '../db.js'
import { getMetaIntegration } from './meta.js'

const DEFAULT_VERSION = process.env.META_API_VERSION || 'v20.0'

function graphUrl(path: string) {
  return `https://graph.facebook.com/${DEFAULT_VERSION}${path}`
}

interface StoryMedia {
  id: string
  media_type: 'IMAGE' | 'VIDEO'
  media_url: string
  timestamp: string
}

interface StoryInsights {
  impressions: number
  reach: number
  replies: number
  exits: number
  taps_forward: number
  taps_back: number
}

/**
 * Fetch active stories from Instagram Business Account
 * Stories are only available for 24 hours via API
 */
export async function fetchInstagramStories(
  igBusinessId: string,
  accessToken: string
): Promise<StoryMedia[]> {
  const url = new URL(graphUrl(`/${igBusinessId}/stories`))
  url.searchParams.set('fields', 'id,media_type,media_url,timestamp')
  url.searchParams.set('access_token', accessToken)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Failed to fetch Instagram stories: ${body}`)
  }

  const json = (await res.json()) as {
    data?: StoryMedia[]
    paging?: { next?: string; previous?: string }
  }

  return json.data || []
}

/**
 * Fetch insights for a specific story
 * Available metrics: impressions, reach, replies, exits, taps_forward, taps_back
 */
export async function fetchStoryInsights(
  storyId: string,
  accessToken: string
): Promise<StoryInsights> {
  const url = new URL(graphUrl(`/${storyId}/insights`))
  url.searchParams.set(
    'metric',
    'impressions,reach,replies,exits,taps_forward,taps_back'
  )
  url.searchParams.set('access_token', accessToken)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.text()
    // If insights are not available yet, return zeros
    if (body.includes('Insights data is not available')) {
      return {
        impressions: 0,
        reach: 0,
        replies: 0,
        exits: 0,
        taps_forward: 0,
        taps_back: 0,
      }
    }
    throw new Error(`Failed to fetch story insights: ${body}`)
  }

  const json = (await res.json()) as {
    data?: Array<{ name: string; values: Array<{ value: number }> }>
  }

  const insights: StoryInsights = {
    impressions: 0,
    reach: 0,
    replies: 0,
    exits: 0,
    taps_forward: 0,
    taps_back: 0,
  }

  if (json.data) {
    for (const metric of json.data) {
      const value = metric.values?.[0]?.value || 0
      switch (metric.name) {
        case 'impressions':
          insights.impressions = value
          break
        case 'reach':
          insights.reach = value
          break
        case 'replies':
          insights.replies = value
          break
        case 'exits':
          insights.exits = value
          break
        case 'taps_forward':
          insights.taps_forward = value
          break
        case 'taps_back':
          insights.taps_back = value
          break
      }
    }
  }

  return insights
}

/**
 * Save story metrics to database
 * Uses upsert to update if story already exists for this date
 */
export async function saveStoryMetrics(
  clinicId: string,
  story: StoryMedia,
  insights: StoryInsights
) {
  const metricDate = new Date().toISOString().split('T')[0]
  const postedAt = new Date(story.timestamp)
  const expiresAt = new Date(postedAt.getTime() + 24 * 60 * 60 * 1000) // +24h

  await query(
    `INSERT INTO marketing_stories_metrics
      (clinic_id, provider, story_id, media_type, media_url, posted_at, expires_at,
       metric_date, impressions, reach, replies, exits, taps_forward, taps_back, metadata)
     VALUES ($1, 'META', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, '{}'::jsonb)
     ON CONFLICT (clinic_id, provider, story_id, metric_date)
     DO UPDATE SET
       impressions = EXCLUDED.impressions,
       reach = EXCLUDED.reach,
       replies = EXCLUDED.replies,
       exits = EXCLUDED.exits,
       taps_forward = EXCLUDED.taps_forward,
       taps_back = EXCLUDED.taps_back`,
    [
      clinicId,
      story.id,
      story.media_type,
      story.media_url,
      postedAt,
      expiresAt,
      metricDate,
      insights.impressions,
      insights.reach,
      insights.replies,
      insights.exits,
      insights.taps_forward,
      insights.taps_back,
    ]
  )
}

/**
 * Collect stories for a specific clinic
 * Should be run multiple times per day (every 6-12h) to capture all stories before they expire
 */
export async function collectStoriesForClinic(clinicId: string) {
  console.log(`[Stories] Collecting stories for clinic ${clinicId}`)

  // Get Meta integration
  const integration = await getMetaIntegration(clinicId)
  if (!integration || integration.status !== 'CONNECTED') {
    console.log(`[Stories] Clinic ${clinicId} has no active Meta integration`)
    return { collected: 0, message: 'No active Meta integration' }
  }

  const igBusinessId = integration.metadata?.igBusinessId
  const accessToken = integration.accessToken

  if (!igBusinessId || !accessToken) {
    console.log(`[Stories] Clinic ${clinicId} missing igBusinessId or accessToken`)
    return { collected: 0, message: 'Missing igBusinessId or accessToken' }
  }

  try {
    // Fetch active stories
    const stories = await fetchInstagramStories(igBusinessId, accessToken)
    console.log(`[Stories] Found ${stories.length} active stories for clinic ${clinicId}`)

    let collected = 0
    for (const story of stories) {
      try {
        // Fetch insights for each story
        const insights = await fetchStoryInsights(story.id, accessToken)

        // Save to database
        await saveStoryMetrics(clinicId, story, insights)
        collected++
        console.log(
          `[Stories] Saved story ${story.id} - Impressions: ${insights.impressions}, Reach: ${insights.reach}`
        )
      } catch (err: any) {
        console.error(`[Stories] Error collecting story ${story.id}:`, err.message)
        // Continue with next story
      }
    }

    return {
      collected,
      total: stories.length,
      message: `Collected ${collected} of ${stories.length} stories`,
    }
  } catch (err: any) {
    console.error(`[Stories] Error collecting stories for clinic ${clinicId}:`, err.message)
    throw err
  }
}

/**
 * Collect stories for all clinics with active Meta integration
 * Should be scheduled to run every 6-12 hours
 */
export async function collectAllStories() {
  console.log('[Stories] Starting collection for all clinics')

  const result = await query(
    `SELECT DISTINCT clinic_id
     FROM clinic_integrations
     WHERE provider = 'META'
       AND status = 'CONNECTED'
       AND metadata->>'igBusinessId' IS NOT NULL`
  )

  const clinics = result.rows.map((r) => r.clinic_id)
  console.log(`[Stories] Found ${clinics.length} clinics with active Meta integration`)

  const results = []
  for (const clinicId of clinics) {
    try {
      const result = await collectStoriesForClinic(clinicId)
      results.push({ clinicId, ...result })
    } catch (err: any) {
      console.error(`[Stories] Failed for clinic ${clinicId}:`, err.message)
      results.push({ clinicId, error: err.message })
    }
  }

  const totalCollected = results.reduce((sum, r) => sum + (r.collected || 0), 0)
  console.log(`[Stories] Collection complete. Total stories collected: ${totalCollected}`)

  return {
    totalClinics: clinics.length,
    totalCollected,
    results,
  }
}
