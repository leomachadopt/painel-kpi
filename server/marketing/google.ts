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


