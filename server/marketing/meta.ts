import { query } from '../db.js'
import { decryptIfNeeded, encryptIfPossible } from '../security/crypto.js'

const DEFAULT_VERSION = process.env.META_API_VERSION || 'v20.0'

function graphUrl(path: string) {
  return `https://graph.facebook.com/${DEFAULT_VERSION}${path}`
}

export type MetaPageAsset = {
  pageId: string
  name: string
  igBusinessId?: string | null
}

export async function exchangeMetaCodeForToken(code: string, redirectUri: string) {
  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('META_APP_ID/META_APP_SECRET not configured')
  }

  const tokenUrl = new URL(graphUrl('/oauth/access_token'))
  tokenUrl.searchParams.set('client_id', clientId)
  tokenUrl.searchParams.set('redirect_uri', redirectUri)
  tokenUrl.searchParams.set('client_secret', clientSecret)
  tokenUrl.searchParams.set('code', code)

  const shortRes = await fetch(tokenUrl.toString())
  if (!shortRes.ok) {
    const body = await shortRes.text()
    throw new Error(`Meta token exchange failed: ${body}`)
  }
  const shortJson = (await shortRes.json()) as { access_token: string; token_type?: string }

  // Exchange for long-lived token
  const longUrl = new URL(graphUrl('/oauth/access_token'))
  longUrl.searchParams.set('grant_type', 'fb_exchange_token')
  longUrl.searchParams.set('client_id', clientId)
  longUrl.searchParams.set('client_secret', clientSecret)
  longUrl.searchParams.set('fb_exchange_token', shortJson.access_token)

  const longRes = await fetch(longUrl.toString())
  if (!longRes.ok) {
    const body = await longRes.text()
    throw new Error(`Meta long-lived token exchange failed: ${body}`)
  }
  const longJson = (await longRes.json()) as { access_token: string; expires_in?: number }

  return {
    accessToken: longJson.access_token,
    expiresIn: longJson.expires_in || 60 * 60 * 24 * 60, // fallback ~60 days
  }
}

export async function fetchMetaPages(accessToken: string): Promise<MetaPageAsset[]> {
  const url = new URL(graphUrl('/me/accounts'))
  url.searchParams.set('fields', 'id,name,instagram_business_account')
  url.searchParams.set('access_token', accessToken)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Meta pages fetch failed: ${body}`)
  }

  const json = (await res.json()) as {
    data?: Array<{ id: string; name: string; instagram_business_account?: { id: string } }>
  }

  return (json.data || []).map((p) => ({
    pageId: p.id,
    name: p.name,
    igBusinessId: p.instagram_business_account?.id || null,
  }))
}

export async function upsertMetaIntegration(opts: {
  clinicId: string
  accessToken: string
  tokenExpiresAt: Date
  pages: MetaPageAsset[]
  selectedPageId?: string | null
  selectedIgBusinessId?: string | null
}) {
  const id = `integration-${opts.clinicId}-META`
  const metadata = {
    pages: opts.pages,
    facebookPageId: opts.selectedPageId || null,
    igBusinessId: opts.selectedIgBusinessId || null,
  }

  await query(
    `INSERT INTO clinic_integrations
      (id, clinic_id, provider, status, access_token, token_expires_at, external_account_id, metadata)
     VALUES ($1, $2, 'META', 'CONNECTED', $3, $4, $5, $6::jsonb)
     ON CONFLICT (clinic_id, provider) DO UPDATE SET
       status = 'CONNECTED',
       access_token = EXCLUDED.access_token,
       token_expires_at = EXCLUDED.token_expires_at,
       external_account_id = EXCLUDED.external_account_id,
       metadata = EXCLUDED.metadata`,
    [
      id,
      opts.clinicId,
      encryptIfPossible(opts.accessToken),
      opts.tokenExpiresAt,
      opts.selectedIgBusinessId || null,
      JSON.stringify(metadata),
    ]
  )
}

export async function getMetaIntegration(clinicId: string) {
  const res = await query(
    `SELECT access_token, metadata
     FROM clinic_integrations
     WHERE clinic_id = $1 AND provider = 'META'`,
    [clinicId]
  )
  if (res.rows.length === 0) return null
  return {
    accessToken: decryptIfNeeded(res.rows[0].access_token as string | null),
    metadata: res.rows[0].metadata as any,
  }
}

export async function updateMetaSelection(opts: {
  clinicId: string
  facebookPageId: string
  igBusinessId: string
}) {
  const current = await getMetaIntegration(opts.clinicId)
  if (!current) throw new Error('META integration not configured')

  const pages: MetaPageAsset[] = current.metadata?.pages || []
  const found = pages.find(
    (p) => p.pageId === opts.facebookPageId && (p.igBusinessId || '') === opts.igBusinessId
  )
  if (!found) {
    throw new Error('Invalid selection (page/IG not found)')
  }

  const newMeta = {
    ...(current.metadata || {}),
    facebookPageId: opts.facebookPageId,
    igBusinessId: opts.igBusinessId,
  }

  await query(
    `UPDATE clinic_integrations
     SET external_account_id = $1, metadata = $2::jsonb, status = 'CONNECTED'
     WHERE clinic_id = $3 AND provider = 'META'`,
    [opts.igBusinessId, JSON.stringify(newMeta), opts.clinicId]
  )
}


