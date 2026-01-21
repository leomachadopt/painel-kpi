import { query } from '../db.js'
import { decryptIfNeeded, encryptIfPossible } from '../security/crypto.js'

export type GbpLocation = {
  accountId: string
  locationId: string
  title?: string
  storeCode?: string
  address?: string
}

function nowPlusSeconds(seconds: number) {
  return new Date(Date.now() + seconds * 1000)
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(body)
  }
  return res.json()
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not configured')
  }

  const body = new URLSearchParams()
  body.set('code', code)
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('redirect_uri', redirectUri)
  body.set('grant_type', 'authorization_code')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Google token exchange failed: ${txt}`)
  }

  const json = (await res.json()) as {
    access_token: string
    expires_in: number
    refresh_token?: string
    token_type?: string
    scope?: string
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token || null,
    expiresAt: nowPlusSeconds(json.expires_in || 3600),
  }
}

export async function refreshGoogleAccessToken(refreshToken: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET not configured')
  }

  const body = new URLSearchParams()
  body.set('client_id', clientId)
  body.set('client_secret', clientSecret)
  body.set('refresh_token', refreshToken)
  body.set('grant_type', 'refresh_token')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Google refresh failed: ${txt}`)
  }

  const json = (await res.json()) as { access_token: string; expires_in: number }
  return {
    accessToken: json.access_token,
    expiresAt: nowPlusSeconds(json.expires_in || 3600),
  }
}

export async function getGbpIntegrationTokens(clinicId: string) {
  const res = await query(
    `SELECT access_token, refresh_token, token_expires_at, metadata
     FROM clinic_integrations
     WHERE clinic_id = $1 AND provider = 'GBP'`,
    [clinicId]
  )
  if (res.rows.length === 0) return null
  return {
    accessToken: decryptIfNeeded(res.rows[0].access_token as string | null),
    refreshToken: decryptIfNeeded(res.rows[0].refresh_token as string | null),
    tokenExpiresAt: res.rows[0].token_expires_at as Date | null,
    metadata: res.rows[0].metadata as any,
  }
}

export async function ensureGoogleAccessToken(clinicId: string) {
  const row = await getGbpIntegrationTokens(clinicId)
  if (!row || !row.refreshToken) {
    throw new Error('GBP integration not configured (missing refresh token)')
  }
  const exp = row.tokenExpiresAt?.getTime() || 0
  const isValid = row.accessToken && exp > Date.now() + 60 * 1000
  if (isValid) return row.accessToken as string

  const refreshed = await refreshGoogleAccessToken(row.refreshToken)
  await query(
    `UPDATE clinic_integrations
     SET access_token = $1, token_expires_at = $2, status = 'CONNECTED'
     WHERE clinic_id = $3 AND provider = 'GBP'`,
    [encryptIfPossible(refreshed.accessToken), refreshed.expiresAt, clinicId]
  )
  return refreshed.accessToken
}

export async function upsertGbpIntegration(opts: {
  clinicId: string
  accessToken: string
  refreshToken: string | null
  tokenExpiresAt: Date
}) {
  const id = `integration-${opts.clinicId}-GBP`
  const existing = await query(
    `SELECT refresh_token FROM clinic_integrations WHERE clinic_id = $1 AND provider = 'GBP'`,
    [opts.clinicId]
  )
  const keepRefresh =
    existing.rows[0]?.refresh_token && !opts.refreshToken
      ? decryptIfNeeded(existing.rows[0].refresh_token as string)
      : null

  const rt = opts.refreshToken || keepRefresh

  await query(
    `INSERT INTO clinic_integrations
      (id, clinic_id, provider, status, access_token, refresh_token, token_expires_at, metadata)
     VALUES ($1, $2, 'GBP', 'CONNECTED', $3, $4, $5, $6::jsonb)
     ON CONFLICT (clinic_id, provider) DO UPDATE SET
       status = 'CONNECTED',
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, clinic_integrations.refresh_token),
       token_expires_at = EXCLUDED.token_expires_at`,
    [
      id,
      opts.clinicId,
      encryptIfPossible(opts.accessToken),
      rt ? encryptIfPossible(rt) : null,
      opts.tokenExpiresAt,
      JSON.stringify({}),
    ]
  )
}

export async function listGbpLocations(accessToken: string): Promise<GbpLocation[]> {
  // 1) Accounts
  const accountsJson = (await fetchJson(
    'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )) as { accounts?: Array<{ name: string; accountName?: string }> }

  const accounts = (accountsJson.accounts || []).map((a) => a.name) // e.g. "accounts/123"

  const out: GbpLocation[] = []

  // 2) Locations for each account
  for (const accountName of accounts) {
    const url = new URL(
      `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`
    )
    url.searchParams.set(
      'readMask',
      'name,title,storeCode,storefrontAddress'
    )

    const locJson = (await fetchJson(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })) as {
      locations?: Array<{
        name: string
        title?: string
        storeCode?: string
        storefrontAddress?: {
          addressLines?: string[]
          locality?: string
          administrativeArea?: string
          postalCode?: string
        }
      }>
    }

    for (const loc of locJson.locations || []) {
      const addr = loc.storefrontAddress
      const address = [
        ...(addr?.addressLines || []),
        addr?.locality,
        addr?.administrativeArea,
        addr?.postalCode,
      ]
        .filter(Boolean)
        .join(', ')

      out.push({
        accountId: accountName,
        locationId: loc.name, // e.g. "accounts/123/locations/456"
        title: loc.title,
        storeCode: loc.storeCode,
        address: address || undefined,
      })
    }
  }

  return out
}

export async function selectGbpLocation(opts: {
  clinicId: string
  accountId: string
  locationId: string
}) {
  const current = await getGbpIntegrationTokens(opts.clinicId)
  if (!current) throw new Error('GBP integration not configured')

  const newMeta = {
    ...(current.metadata || {}),
    accountId: opts.accountId,
  }

  await query(
    `UPDATE clinic_integrations
     SET external_location_id = $1, metadata = $2::jsonb, status = 'CONNECTED'
     WHERE clinic_id = $3 AND provider = 'GBP'`,
    [opts.locationId, JSON.stringify(newMeta), opts.clinicId]
  )
}

/**
 * Fetch insights (metrics) from Google Business Profile Performance API
 *
 * Available metrics:
 * - QUERIES_DIRECT: Direct searches (by business name)
 * - QUERIES_INDIRECT: Discovery searches (by category/service)
 * - VIEWS_MAPS: Views on Google Maps
 * - VIEWS_SEARCH: Views on Google Search
 * - ACTIONS_WEBSITE: Website clicks
 * - ACTIONS_PHONE: Phone call clicks
 * - ACTIONS_DRIVING_DIRECTIONS: Driving direction requests
 * - PHOTOS_VIEWS_MERCHANT: Photo views (merchant photos)
 * - PHOTOS_VIEWS_CUSTOMERS: Photo views (customer photos)
 * - LOCAL_POST_VIEWS_SEARCH: Local post views
 */
export async function fetchGbpInsights(opts: {
  accessToken: string
  locationId: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}) {
  const { accessToken, locationId, startDate, endDate } = opts

  // Build the request body
  const body = {
    locationNames: [locationId],
    basicRequest: {
      metricRequests: [
        { metric: 'QUERIES_DIRECT' },
        { metric: 'QUERIES_INDIRECT' },
        { metric: 'VIEWS_MAPS' },
        { metric: 'VIEWS_SEARCH' },
        { metric: 'ACTIONS_WEBSITE' },
        { metric: 'ACTIONS_PHONE' },
        { metric: 'ACTIONS_DRIVING_DIRECTIONS' },
        { metric: 'PHOTOS_VIEWS_MERCHANT' },
        { metric: 'PHOTOS_VIEWS_CUSTOMERS' },
        { metric: 'LOCAL_POST_VIEWS_SEARCH' },
      ],
      timeRange: {
        startTime: `${startDate}T00:00:00Z`,
        endTime: `${endDate}T23:59:59Z`,
      },
    },
  }

  const url = `https://businessprofileperformance.googleapis.com/v1/locations:fetchMultiDailyMetricsTimeSeries`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Failed to fetch GBP insights: ${res.status} ${txt}`)
  }

  const data = (await res.json()) as {
    multiDailyMetricTimeSeries?: Array<{
      dailyMetricTimeSeries?: {
        timeSeries?: {
          datedValues?: Array<{
            date?: { year?: number; month?: number; day?: number }
            value?: string | number
          }>
        }
        dailyMetric?: string
      }
    }>
  }

  return data
}

/**
 * Fetch reviews from Google My Business
 *
 * ⚠️ DEPRECATED - This function uses the legacy mybusiness.googleapis.com v4 API
 * which cannot be enabled for new Google Cloud projects (as of 2025).
 *
 * Google has not yet migrated the reviews functionality to the new APIs
 * (mybusinessbusinessinformation, businessprofileperformance).
 *
 * Status:
 * - Legacy API: mybusiness.googleapis.com/v4 (deprecated, cannot enable)
 * - New APIs: Do not have reviews endpoint yet
 * - Current solution: This function is disabled in run.ts
 *
 * Alternatives:
 * 1. Wait for Google to add reviews to new APIs
 * 2. Use Google Places API (different quotas/pricing)
 * 3. Web scraping (against ToS)
 * 4. Third-party review aggregators
 *
 * @see https://developers.google.com/my-business/content/review-data
 * @deprecated Cannot be used in new projects
 */
export async function fetchGbpReviews(opts: {
  accessToken: string
  accountId: string
  locationId: string
  pageSize?: number
  orderBy?: string
}) {
  const { accessToken, locationId, pageSize = 50, orderBy = 'updateTime desc' } = opts

  const url = new URL(`https://mybusiness.googleapis.com/v4/${locationId}/reviews`)
  url.searchParams.set('pageSize', pageSize.toString())
  url.searchParams.set('orderBy', orderBy)

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Failed to fetch GBP reviews: ${res.status} ${txt}`)
  }

  const data = (await res.json()) as {
    reviews?: Array<{
      reviewId?: string
      reviewer?: {
        profilePhotoUrl?: string
        displayName?: string
        isAnonymous?: boolean
      }
      starRating?: 'ONE' | 'TWO' | 'THREE' | 'FOUR' | 'FIVE'
      comment?: string
      createTime?: string
      updateTime?: string
      reviewReply?: {
        comment?: string
        updateTime?: string
      }
    }>
    averageRating?: number
    totalReviewCount?: number
    nextPageToken?: string
  }

  return data
}

/**
 * Fetch search keywords that led users to the business profile
 * Note: This endpoint may have limited availability depending on the Google API version
 */
export async function fetchGbpSearchKeywords(opts: {
  accessToken: string
  locationId: string
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
}) {
  const { accessToken, locationId, startDate, endDate } = opts

  // Try the new Performance API for search queries
  const body = {
    locationNames: [locationId],
    basicRequest: {
      metricRequests: [{ metric: 'QUERIES_DIRECT' }, { metric: 'QUERIES_INDIRECT' }],
      timeRange: {
        startTime: `${startDate}T00:00:00Z`,
        endTime: `${endDate}T23:59:59Z`,
      },
    },
  }

  const url = `https://businessprofileperformance.googleapis.com/v1/locations:fetchMultiDailyMetricsTimeSeries`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const txt = await res.text()
    // Don't throw, just return empty - search keywords may not be available
    console.warn(`GBP search keywords not available: ${res.status} ${txt}`)
    return { queries: [] }
  }

  const data = await res.json()
  return data
}


