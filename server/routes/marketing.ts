import { Router } from 'express'
import { query } from '../db.js'
import { runMarketingJobForClinic } from '../marketing/run.js'
import { createOAuthState, consumeOAuthState } from '../marketing/oauthState.js'
import type { AuthedRequest } from '../middleware/auth.js'
import {
  exchangeMetaCodeForToken,
  fetchMetaPages,
  getMetaIntegration,
  updateMetaSelection,
  upsertMetaIntegration,
} from '../marketing/meta.js'
import {
  ensureGoogleAccessToken,
  exchangeGoogleCode,
  listGbpLocations,
  selectGbpLocation,
  upsertGbpIntegration,
} from '../marketing/google.js'

const router = Router()

type Provider = 'META' | 'GBP' | 'RANK_TRACKER'

const integrationId = (clinicId: string, provider: Provider) =>
  `integration-${clinicId}-${provider}`

function frontendBaseUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:8080'
}

function safeReturnTo(returnTo?: string) {
  const base = frontendBaseUrl()
  if (!returnTo) return `${base}/configuracoes`
  try {
    const url = new URL(returnTo)
    if (url.origin !== new URL(base).origin) return `${base}/configuracoes`
    return url.toString()
  } catch {
    // Treat as path
    if (!returnTo.startsWith('/')) return `${base}/configuracoes`
    return `${base}${returnTo}`
  }
}

function buildMetaOAuthUrl(clinicId: string, returnTo: string) {
  const clientId = process.env.META_APP_ID
  const redirectUri = process.env.META_REDIRECT_URI
  const clientSecret = process.env.META_APP_SECRET
  const missing = [
    !clientId ? 'META_APP_ID' : null,
    !clientSecret ? 'META_APP_SECRET' : null,
    !redirectUri ? 'META_REDIRECT_URI' : null,
  ].filter(Boolean)
  if (missing.length) {
    throw new Error(`${missing.join(', ')} not configured`)
  }

  const scopes =
    process.env.META_SCOPES ||
    'pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights'

  const state = createOAuthState({ provider: 'META', clinicId, returnTo })

  const url = new URL(
    `https://www.facebook.com/${process.env.META_API_VERSION || 'v20.0'}/dialog/oauth`
  )
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scopes)
  url.searchParams.set('state', state)
  return url.toString()
}

function buildGoogleOAuthUrl(clinicId: string, returnTo: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const missing = [
    !clientId ? 'GOOGLE_CLIENT_ID' : null,
    !clientSecret ? 'GOOGLE_CLIENT_SECRET' : null,
    !redirectUri ? 'GOOGLE_REDIRECT_URI' : null,
  ].filter(Boolean)
  if (missing.length) {
    throw new Error(`${missing.join(', ')} not configured`)
  }

  const scopes =
    process.env.GOOGLE_SCOPES ||
    'https://www.googleapis.com/auth/business.manage https://www.googleapis.com/auth/userinfo.email'

  const state = createOAuthState({ provider: 'GOOGLE', clinicId, returnTo })

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('include_granted_scopes', 'true')
  url.searchParams.set('scope', scopes)
  url.searchParams.set('state', state)
  return url.toString()
}

function mustHaveAuth(req: AuthedRequest) {
  if (!req.auth) return { ok: false, status: 401, error: 'Not authenticated' as const }
  return { ok: true as const }
}

function canReadClinic(req: AuthedRequest, clinicId: string) {
  if (!req.auth) return false
  if (req.auth.role === 'MENTORA') return true
  if (req.auth.role === 'GESTOR_CLINICA') return req.auth.clinicId === clinicId
  return false
}

function canManageClinic(req: AuthedRequest, clinicId: string) {
  if (!req.auth) return false
  return req.auth.role === 'GESTOR_CLINICA' && req.auth.clinicId === clinicId
}

// ================================
// INTEGRATIONS
// ================================

router.get('/integrations/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' })
    if (!canReadClinic(req, clinicId)) return res.status(403).json({ error: 'Forbidden' })
    const result = await query(
      `SELECT id, clinic_id, provider, status, token_expires_at, external_account_id, external_location_id, metadata, updated_at
       FROM clinic_integrations
       WHERE clinic_id = $1
       ORDER BY provider`,
      [clinicId]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Get integrations error:', error)
    res.status(500).json({ error: 'Failed to fetch integrations' })
  }
})

router.put('/integrations/:clinicId/meta', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!canManageClinic(req, clinicId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const {
      status = 'CONNECTED',
      accessToken,
      tokenExpiresAt,
      igBusinessId,
      facebookPageId,
    } = req.body || {}

    const metadata = {
      igBusinessId: igBusinessId || null,
      facebookPageId: facebookPageId || null,
    }

    await query(
      `INSERT INTO clinic_integrations
        (id, clinic_id, provider, status, access_token, token_expires_at, external_account_id, metadata)
       VALUES ($1, $2, 'META', $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (clinic_id, provider) DO UPDATE SET
         status = EXCLUDED.status,
         access_token = EXCLUDED.access_token,
         token_expires_at = EXCLUDED.token_expires_at,
         external_account_id = EXCLUDED.external_account_id,
         metadata = EXCLUDED.metadata
      `,
      [
        integrationId(clinicId, 'META'),
        clinicId,
        status,
        accessToken || null,
        tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        igBusinessId || null,
        JSON.stringify(metadata),
      ]
    )

    res.json({ message: 'Meta integration updated' })
  } catch (error) {
    console.error('Update meta integration error:', error)
    res.status(500).json({ error: 'Failed to update Meta integration' })
  }
})

router.put('/integrations/:clinicId/gbp', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!canManageClinic(req, clinicId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const {
      status = 'CONNECTED',
      refreshToken,
      accessToken,
      tokenExpiresAt,
      locationId,
      accountId,
    } = req.body || {}

    const metadata = {
      accountId: accountId || null,
    }

    await query(
      `INSERT INTO clinic_integrations
        (id, clinic_id, provider, status, access_token, refresh_token, token_expires_at, external_location_id, metadata)
       VALUES ($1, $2, 'GBP', $3, $4, $5, $6, $7, $8::jsonb)
       ON CONFLICT (clinic_id, provider) DO UPDATE SET
         status = EXCLUDED.status,
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expires_at = EXCLUDED.token_expires_at,
         external_location_id = EXCLUDED.external_location_id,
         metadata = EXCLUDED.metadata
      `,
      [
        integrationId(clinicId, 'GBP'),
        clinicId,
        status,
        accessToken || null,
        refreshToken || null,
        tokenExpiresAt ? new Date(tokenExpiresAt) : null,
        locationId || null,
        JSON.stringify(metadata),
      ]
    )

    res.json({ message: 'Google Business Profile integration updated' })
  } catch (error) {
    console.error('Update GBP integration error:', error)
    res
      .status(500)
      .json({ error: 'Failed to update Google Business Profile integration' })
  }
})

router.put('/integrations/:clinicId/rank-tracker', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!canManageClinic(req, clinicId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const { status = 'CONNECTED', provider = 'DATAFORSEO' } = req.body || {}

    const metadata = {
      provider,
    }

    await query(
      `INSERT INTO clinic_integrations
        (id, clinic_id, provider, status, metadata)
       VALUES ($1, $2, 'RANK_TRACKER', $3, $4::jsonb)
       ON CONFLICT (clinic_id, provider) DO UPDATE SET
         status = EXCLUDED.status,
         metadata = EXCLUDED.metadata
      `,
      [
        integrationId(clinicId, 'RANK_TRACKER'),
        clinicId,
        status,
        JSON.stringify(metadata),
      ]
    )

    res.json({ message: 'Rank tracker integration updated' })
  } catch (error) {
    console.error('Update rank tracker integration error:', error)
    res.status(500).json({ error: 'Failed to update rank tracker integration' })
  }
})

router.delete('/integrations/:clinicId/:provider', async (req: AuthedRequest, res) => {
  try {
    const { clinicId, provider } = req.params
    if (!canManageClinic(req, clinicId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    await query(
      `DELETE FROM clinic_integrations WHERE clinic_id = $1 AND provider = $2`,
      [clinicId, provider]
    )
    res.json({ message: 'Integration disconnected' })
  } catch (error) {
    console.error('Delete integration error:', error)
    res.status(500).json({ error: 'Failed to disconnect integration' })
  }
})

// ================================
// OAUTH - META
// ================================

// Build auth URL via API call (so Authorization header is included). Frontend should use this.
router.get('/oauth/meta/url/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' })
    if (!canManageClinic(req, clinicId)) return res.status(403).json({ error: 'Forbidden' })
    const returnTo = safeReturnTo(req.query.returnTo as string | undefined)
    const url = buildMetaOAuthUrl(clinicId, returnTo)
    res.json({ url })
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to build Meta OAuth URL' })
  }
})

router.get('/oauth/meta/start/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!canManageClinic(req, clinicId)) {
      const url = new URL(safeReturnTo(req.query.returnTo as string | undefined))
      url.searchParams.set('oauth', 'meta')
      url.searchParams.set('result', 'error')
      url.searchParams.set('message', 'Apenas o gestor da clínica pode conectar integrações.')
      return res.redirect(url.toString())
    }
    const returnTo = safeReturnTo(req.query.returnTo as string | undefined)

    try {
      res.redirect(buildMetaOAuthUrl(clinicId, returnTo))
    } catch {
      const url = new URL(returnTo)
      url.searchParams.set('oauth', 'meta')
      url.searchParams.set('result', 'error')
      url.searchParams.set(
        'message',
        'Integração Meta não configurada no servidor (META_APP_ID/META_REDIRECT_URI).'
      )
      return res.redirect(url.toString())
    }
  } catch (error) {
    console.error('Meta oauth start error:', error)
    res.status(500).json({ error: 'Failed to start Meta OAuth' })
  }
})

router.get('/oauth/meta/callback', async (req, res) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string }
    if (!code || !state) return res.status(400).send('Missing code/state')

    const payload = consumeOAuthState(state)
    if (!payload || payload.provider !== 'META') return res.status(400).send('Invalid state')

    const redirectUri = process.env.META_REDIRECT_URI
    if (!redirectUri) return res.status(500).send('META_REDIRECT_URI not configured')

    const token = await exchangeMetaCodeForToken(code, redirectUri)
    const pages = await fetchMetaPages(token.accessToken)

    const tokenExpiresAt = new Date(Date.now() + token.expiresIn * 1000)

    // If there is exactly one usable IG business account, auto-select it.
    const candidates = pages.filter((p) => p.igBusinessId)
    const auto = candidates.length === 1 ? candidates[0] : null

    await upsertMetaIntegration({
      clinicId: payload.clinicId,
      accessToken: token.accessToken,
      tokenExpiresAt,
      pages,
      selectedPageId: auto?.pageId || null,
      selectedIgBusinessId: auto?.igBusinessId || null,
    })

    const url = new URL(payload.returnTo)
    url.searchParams.set('oauth', 'meta')
    url.searchParams.set('result', 'success')
    url.searchParams.set('needsSelection', auto ? '0' : '1')
    res.redirect(url.toString())
  } catch (error) {
    console.error('Meta oauth callback error:', error)
    const base = frontendBaseUrl()
    const url = new URL(`${base}/configuracoes`)
    url.searchParams.set('oauth', 'meta')
    url.searchParams.set('result', 'error')
    url.searchParams.set('message', 'Falha ao conectar Meta')
    res.redirect(url.toString())
  }
})

router.get('/meta/assets/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' })
    if (!canReadClinic(req, clinicId)) return res.status(403).json({ error: 'Forbidden' })
    const integ = await getMetaIntegration(clinicId)
    if (!integ?.accessToken) {
      return res.status(404).json({ error: 'META integration not configured' })
    }
    const pages = await fetchMetaPages(integ.accessToken)
    res.json({ pages })
  } catch (error) {
    console.error('Get meta assets error:', error)
    res.status(500).json({ error: 'Failed to fetch Meta assets' })
  }
})

router.post('/meta/select/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!canManageClinic(req, clinicId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const { facebookPageId, igBusinessId } = req.body || {}
    if (!facebookPageId || !igBusinessId) {
      return res.status(400).json({ error: 'facebookPageId and igBusinessId are required' })
    }
    await updateMetaSelection({ clinicId, facebookPageId, igBusinessId })
    res.json({ message: 'Meta selection saved' })
  } catch (error: any) {
    console.error('Meta selection error:', error)
    res.status(500).json({ error: error?.message || 'Failed to save Meta selection' })
  }
})

// ================================
// OAUTH - GOOGLE (GBP)
// ================================

// Diagnostic endpoint (does NOT reveal secrets). Useful to confirm server env is loaded.
router.get('/oauth/google/config', async (_req, res) => {
  const missing = [
    !process.env.GOOGLE_CLIENT_ID ? 'GOOGLE_CLIENT_ID' : null,
    !process.env.GOOGLE_CLIENT_SECRET ? 'GOOGLE_CLIENT_SECRET' : null,
    !process.env.GOOGLE_REDIRECT_URI ? 'GOOGLE_REDIRECT_URI' : null,
  ].filter(Boolean)
  res.json({
    configured: missing.length === 0,
    missing,
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasRedirectUri: !!process.env.GOOGLE_REDIRECT_URI,
  })
})

// Build auth URL via API call (so Authorization header is included). Frontend should use this.
router.get('/oauth/google/url/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' })
    if (!canManageClinic(req, clinicId)) return res.status(403).json({ error: 'Forbidden' })
    const returnTo = safeReturnTo(req.query.returnTo as string | undefined)
    const url = buildGoogleOAuthUrl(clinicId, returnTo)
    res.json({ url })
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to build Google OAuth URL' })
  }
})

router.get('/oauth/google/start/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!canManageClinic(req, clinicId)) {
      const url = new URL(safeReturnTo(req.query.returnTo as string | undefined))
      url.searchParams.set('oauth', 'google')
      url.searchParams.set('result', 'error')
      url.searchParams.set('message', 'Apenas o gestor da clínica pode conectar integrações.')
      return res.redirect(url.toString())
    }
    const returnTo = safeReturnTo(req.query.returnTo as string | undefined)

    try {
      res.redirect(buildGoogleOAuthUrl(clinicId, returnTo))
    } catch {
      const url = new URL(returnTo)
      url.searchParams.set('oauth', 'google')
      url.searchParams.set('result', 'error')
      url.searchParams.set(
        'message',
        'Integração Google não configurada no servidor (GOOGLE_CLIENT_ID/GOOGLE_REDIRECT_URI).'
      )
      return res.redirect(url.toString())
    }
  } catch (error) {
    console.error('Google oauth start error:', error)
    res.status(500).json({ error: 'Failed to start Google OAuth' })
  }
})

router.get('/oauth/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string }
    if (!code || !state) return res.status(400).send('Missing code/state')

    const payload = consumeOAuthState(state)
    if (!payload || payload.provider !== 'GOOGLE') return res.status(400).send('Invalid state')

    const redirectUri = process.env.GOOGLE_REDIRECT_URI
    if (!redirectUri) return res.status(500).send('GOOGLE_REDIRECT_URI not configured')

    const token = await exchangeGoogleCode(code, redirectUri)
    await upsertGbpIntegration({
      clinicId: payload.clinicId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      tokenExpiresAt: token.expiresAt,
    })

    const url = new URL(payload.returnTo)
    url.searchParams.set('oauth', 'google')
    url.searchParams.set('result', 'success')
    res.redirect(url.toString())
  } catch (error) {
    console.error('Google oauth callback error:', error)
    const base = frontendBaseUrl()
    const url = new URL(`${base}/configuracoes`)
    url.searchParams.set('oauth', 'google')
    url.searchParams.set('result', 'error')
    url.searchParams.set('message', 'Falha ao conectar Google')
    res.redirect(url.toString())
  }
})

router.get('/gbp/locations/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' })
    if (!canReadClinic(req, clinicId)) return res.status(403).json({ error: 'Forbidden' })
    const token = await ensureGoogleAccessToken(clinicId)
    const locations = await listGbpLocations(token)
    res.json({ locations })
  } catch (error: any) {
    console.error('List GBP locations error:', error)
    res.status(500).json({ error: error?.message || 'Failed to list GBP locations' })
  }
})

router.post('/gbp/select/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!canManageClinic(req, clinicId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const { accountId, locationId } = req.body || {}
    if (!accountId || !locationId) {
      return res.status(400).json({ error: 'accountId and locationId are required' })
    }
    await selectGbpLocation({ clinicId, accountId, locationId })
    res.json({ message: 'GBP location saved' })
  } catch (error: any) {
    console.error('Select GBP location error:', error)
    res.status(500).json({ error: error?.message || 'Failed to save GBP location' })
  }
})

// ================================
// KEYWORDS (max 10 active per clinic)
// ================================

router.get('/keywords/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' })
    if (!canReadClinic(req, clinicId)) return res.status(403).json({ error: 'Forbidden' })
    const result = await query(
      `SELECT id, clinic_id, keyword, city, district, active, created_at, updated_at
       FROM clinic_keywords
       WHERE clinic_id = $1
       ORDER BY active DESC, keyword ASC`,
      [clinicId]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Get keywords error:', error)
    res.status(500).json({ error: 'Failed to fetch keywords' })
  }
})

router.post('/keywords/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!canManageClinic(req, clinicId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const { keyword, city, district } = req.body || {}

    if (!keyword || !city) {
      return res.status(400).json({ error: 'keyword and city are required' })
    }

    const activeCount = await query(
      `SELECT COUNT(*)::int AS count FROM clinic_keywords WHERE clinic_id = $1 AND active = true`,
      [clinicId]
    )
    if ((activeCount.rows[0]?.count || 0) >= 10) {
      return res
        .status(400)
        .json({ error: 'Keyword limit reached (max 10 active keywords)' })
    }

    const id = `kw-${clinicId}-${Math.random().toString(36).slice(2, 10)}`
    const result = await query(
      `INSERT INTO clinic_keywords (id, clinic_id, keyword, city, district, active)
       VALUES ($1, $2, $3, $4, $5, true)
       RETURNING id, clinic_id, keyword, city, district, active, created_at, updated_at`,
      [id, clinicId, keyword, city, district || null]
    )

    res.status(201).json(result.rows[0])
  } catch (error) {
    console.error('Create keyword error:', error)
    res.status(500).json({ error: 'Failed to create keyword' })
  }
})

router.put('/keywords/:clinicId/:keywordId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId, keywordId } = req.params
    if (!canManageClinic(req, clinicId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const { keyword, city, district, active } = req.body || {}

    const result = await query(
      `UPDATE clinic_keywords
       SET keyword = COALESCE($1, keyword),
           city = COALESCE($2, city),
           district = COALESCE($3, district),
           active = COALESCE($4, active)
       WHERE id = $5 AND clinic_id = $6
       RETURNING id, clinic_id, keyword, city, district, active, created_at, updated_at`,
      [
        keyword ?? null,
        city ?? null,
        district ?? null,
        typeof active === 'boolean' ? active : null,
        keywordId,
        clinicId,
      ]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Keyword not found' })
    }
    res.json(result.rows[0])
  } catch (error) {
    console.error('Update keyword error:', error)
    res.status(500).json({ error: 'Failed to update keyword' })
  }
})

router.delete('/keywords/:clinicId/:keywordId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId, keywordId } = req.params
    if (!canManageClinic(req, clinicId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const result = await query(
      `DELETE FROM clinic_keywords WHERE id = $1 AND clinic_id = $2 RETURNING id`,
      [keywordId, clinicId]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Keyword not found' })
    }
    res.json({ message: 'Keyword deleted' })
  } catch (error) {
    console.error('Delete keyword error:', error)
    res.status(500).json({ error: 'Failed to delete keyword' })
  }
})

// ================================
// METRICS & REPORTING
// ================================

router.get('/metrics/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' })
    if (!canReadClinic(req, clinicId)) return res.status(403).json({ error: 'Forbidden' })
    const { start, end } = req.query as { start?: string; end?: string }

    const params: any[] = [clinicId]
    let where = `clinic_id = $1`
    if (start) {
      params.push(start)
      where += ` AND date >= $${params.length}`
    }
    if (end) {
      params.push(end)
      where += ` AND date <= $${params.length}`
    }

    const result = await query(
      `SELECT *
       FROM social_daily_metrics
       WHERE ${where}
       ORDER BY date ASC, provider ASC`,
      params
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Get metrics error:', error)
    res.status(500).json({ error: 'Failed to fetch metrics' })
  }
})

router.get('/gbp/search-terms/:clinicId/:year/:month', async (req: AuthedRequest, res) => {
  try {
    const { clinicId, year, month } = req.params
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' })
    if (!canReadClinic(req, clinicId)) return res.status(403).json({ error: 'Forbidden' })
    const result = await query(
      `SELECT term, impressions
       FROM gbp_search_terms_monthly
       WHERE clinic_id = $1 AND year = $2 AND month = $3
       ORDER BY impressions DESC, term ASC`,
      [clinicId, parseInt(year), parseInt(month)]
    )
    res.json(result.rows)
  } catch (error) {
    console.error('Get GBP search terms error:', error)
    res.status(500).json({ error: 'Failed to fetch GBP search terms' })
  }
})

router.get('/rankings/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!req.auth) return res.status(401).json({ error: 'Not authenticated' })
    if (!canReadClinic(req, clinicId)) return res.status(403).json({ error: 'Forbidden' })
    const { start, end } = req.query as { start?: string; end?: string }

    const params: any[] = [clinicId]
    let where = `krd.clinic_id = $1`
    if (start) {
      params.push(start)
      where += ` AND krd.date >= $${params.length}`
    }
    if (end) {
      params.push(end)
      where += ` AND krd.date <= $${params.length}`
    }

    const result = await query(
      `SELECT
        krd.id,
        krd.keyword_id,
        ck.keyword,
        ck.city,
        ck.district,
        krd.date,
        krd.provider,
        krd.position,
        krd.found
       FROM keyword_rankings_daily krd
       JOIN clinic_keywords ck ON ck.id = krd.keyword_id
       WHERE ${where}
       ORDER BY krd.date ASC, ck.keyword ASC`,
      params
    )

    res.json(result.rows)
  } catch (error) {
    console.error('Get rankings error:', error)
    res.status(500).json({ error: 'Failed to fetch rankings' })
  }
})

// Manual stub runner (useful while wiring OAuth/providers)
router.post('/run/:clinicId', async (req: AuthedRequest, res) => {
  try {
    const { clinicId } = req.params
    if (!canManageClinic(req, clinicId)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    const date = new Date().toISOString().split('T')[0]
    await runMarketingJobForClinic(clinicId, date, 'stub')

    res.json({
      message:
        'Run executed (stub). Configure providers/tokens to fetch real data.',
      date,
    })
  } catch (error) {
    console.error('Run marketing job error:', error)
    res.status(500).json({ error: 'Failed to run marketing job' })
  }
})

export default router


