// @ts-nocheck
import { Router } from 'express'
import { query } from '../db.js'
import type { AuthedRequest } from '../middleware/auth.js'
import { requirePermission } from '../middleware/permissions.js'

const router = Router()

function frontendBaseUrl() {
  return process.env.FRONTEND_URL || 'http://localhost:8080'
}

// ================================
// OAUTH - META
// ================================

// GET /api/marketing/oauth/meta/start → redireciona para o diálogo OAuth da Meta
router.get('/oauth/meta/start', async (req, res) => {
  try {
    const { clinic_id } = req.query as { clinic_id?: string }

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required' })
    }

    const clientId = process.env.META_APP_ID
    const redirectUri = process.env.META_REDIRECT_URI
    const clientSecret = process.env.META_APP_SECRET

    const missing = [
      !clientId ? 'META_APP_ID' : null,
      !clientSecret ? 'META_APP_SECRET' : null,
      !redirectUri ? 'META_REDIRECT_URI' : null,
    ].filter(Boolean)

    if (missing.length) {
      return res.status(500).json({ error: `${missing.join(', ')} not configured` })
    }

    const scopes = process.env.META_SCOPES ||
      'pages_show_list,pages_read_engagement,instagram_basic,instagram_manage_insights'

    // Create OAuth state (stateless - encoded in the state parameter itself)
    // This avoids issues with server restarts losing in-memory state
    const returnTo = frontendBaseUrl() + '/configuracoes'
    const statePayload = {
      provider: 'META',
      clinicId: clinic_id,
      returnTo,
      timestamp: Date.now()
    }
    const state = Buffer.from(JSON.stringify(statePayload)).toString('base64url')

    console.log('Created OAuth state:', { state, clinic_id, returnTo })

    const apiVersion = process.env.META_API_VERSION || 'v21.0'
    const url = new URL(`https://www.facebook.com/${apiVersion}/dialog/oauth`)
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('scope', scopes)
    url.searchParams.set('state', state)
    url.searchParams.set('display', 'page') // Use full page instead of popup

    res.redirect(url.toString())
  } catch (error) {
    console.error('Meta oauth start error:', error)
    res.status(500).json({ error: 'Failed to start Meta OAuth' })
  }
})

// GET /api/marketing/oauth/meta/callback → troca code por token, faz upgrade e guarda
router.get('/oauth/meta/callback', async (req, res) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string }

    console.log('Meta OAuth Callback received:', { code: code?.substring(0, 20) + '...', state })

    if (!code || !state) {
      console.error('Missing code or state:', { code: !!code, state: !!state })
      return res.status(400).send('Missing code/state')
    }

    // Decode OAuth state (stateless)
    let stateData
    try {
      const decoded = Buffer.from(state, 'base64url').toString('utf-8')
      stateData = JSON.parse(decoded)
      console.log('Decoded state:', stateData)
    } catch (err) {
      console.error('Failed to decode state:', err)
      return res.status(400).send('Invalid state parameter')
    }

    // Validate state
    if (!stateData || stateData.provider !== 'META') {
      console.error('Invalid state provider')
      return res.status(400).send('Invalid state parameter')
    }

    // Check timestamp (10 minute expiry)
    const STATE_TTL_MS = 10 * 60 * 1000
    if (Date.now() - stateData.timestamp > STATE_TTL_MS) {
      console.error('State expired')
      return res.status(400).send('State expired - please try again')
    }

    const clinic_id = stateData.clinicId

    const clientId = process.env.META_APP_ID
    const clientSecret = process.env.META_APP_SECRET
    const redirectUri = process.env.META_REDIRECT_URI
    const apiVersion = process.env.META_API_VERSION || 'v21.0'

    // 1. Exchange code for short-lived token
    const tokenUrl = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`)
    tokenUrl.searchParams.set('client_id', clientId)
    tokenUrl.searchParams.set('client_secret', clientSecret)
    tokenUrl.searchParams.set('redirect_uri', redirectUri)
    tokenUrl.searchParams.set('code', code)

    console.log('Exchanging code for token...')
    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    console.log('Token exchange response:', tokenData.error ? { error: tokenData.error } : { success: true })

    if (tokenData.error) {
      console.error('Token exchange failed:', tokenData.error)
      throw new Error(tokenData.error.message || 'Failed to exchange code for token')
    }

    const shortLivedToken = tokenData.access_token

    // 2. Upgrade to long-lived token (~60 days)
    const longLivedUrl = new URL(`https://graph.facebook.com/${apiVersion}/oauth/access_token`)
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', clientId)
    longLivedUrl.searchParams.set('client_secret', clientSecret)
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    const longLivedResponse = await fetch(longLivedUrl.toString())
    const longLivedData = await longLivedResponse.json()

    if (longLivedData.error) {
      throw new Error(longLivedData.error.message || 'Failed to upgrade token')
    }

    const accessToken = longLivedData.access_token
    const expiresIn = longLivedData.expires_in || 5184000 // 60 days default
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // 3. Fetch user's pages and Instagram accounts
    const pagesUrl = new URL(`https://graph.facebook.com/${apiVersion}/me/accounts`)
    pagesUrl.searchParams.set('access_token', accessToken)
    pagesUrl.searchParams.set('fields', 'id,name,instagram_business_account{id,username}')

    const pagesResponse = await fetch(pagesUrl.toString())
    const pagesData = await pagesResponse.json()

    console.log('Meta Pages Data:', JSON.stringify(pagesData, null, 2))

    let pageId = null
    let pageName = null
    let instagramId = null
    let instagramUsername = null

    // Get first page with Instagram connected
    if (pagesData.data && pagesData.data.length > 0) {
      console.log(`Found ${pagesData.data.length} Facebook page(s)`)

      for (const page of pagesData.data) {
        if (page.instagram_business_account) {
          pageId = page.id
          pageName = page.name
          instagramId = page.instagram_business_account.id
          instagramUsername = page.instagram_business_account.username
          console.log(`✅ Found page with Instagram: ${pageName} (@${instagramUsername})`)
          break
        }
      }

      // If no Instagram, just use first page
      if (!pageId && pagesData.data[0]) {
        pageId = pagesData.data[0].id
        pageName = pagesData.data[0].name
        console.log(`⚠️  Using page without Instagram: ${pageName}`)
      }
    } else {
      console.log('❌ No Facebook pages found')
    }

    // 4. Save to database (clinic_integrations table)
    const integrationId = `meta-${clinic_id}-${Date.now()}`
    const metadata = {
      facebookPageId: pageId,
      pageName: pageName,
      igBusinessId: instagramId,
      instagramUsername: instagramUsername,
    }

    await query(
      `INSERT INTO clinic_integrations
        (id, clinic_id, provider, status, access_token, token_expires_at, external_account_id, metadata)
       VALUES ($1, $2, 'META', 'CONNECTED', $3, $4, $5, $6::jsonb)
       ON CONFLICT (clinic_id, provider)
       DO UPDATE SET
         status = EXCLUDED.status,
         access_token = EXCLUDED.access_token,
         token_expires_at = EXCLUDED.token_expires_at,
         external_account_id = EXCLUDED.external_account_id,
         metadata = EXCLUDED.metadata,
         updated_at = CURRENT_TIMESTAMP`,
      [integrationId, clinic_id, accessToken, expiresAt, instagramId, JSON.stringify(metadata)]
    )

    // 5. Redirect to frontend
    const frontendUrl = `${stateData.returnTo}?oauth=meta&result=success`
    res.redirect(frontendUrl)
  } catch (error: any) {
    console.error('Meta oauth callback error:', error)
    const errorMessage = error?.message || 'Unknown error'
    console.error('Error details:', errorMessage)
    const returnTo = frontendBaseUrl() + '/configuracoes'
    const frontendUrl = `${returnTo}?oauth=meta&result=error&message=${encodeURIComponent(errorMessage)}`
    res.redirect(frontendUrl)
  }
})

// GET /api/marketing/meta/status?clinic_id=X → devolve status da integração
router.get('/meta/status', requirePermission('canViewMarketing'), async (req: AuthedRequest, res) => {
  try {
    const { clinic_id } = req.query as { clinic_id?: string }

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required' })
    }

    const result = await query(
      `SELECT status, token_expires_at, metadata
       FROM clinic_integrations
       WHERE clinic_id = $1 AND provider = 'META'`,
      [clinic_id]
    )

    if (result.rows.length === 0) {
      return res.json({ connected: false })
    }

    const integration = result.rows[0]
    const isExpired = integration.token_expires_at && new Date(integration.token_expires_at) < new Date()
    const metadata = integration.metadata || {}

    res.json({
      connected: integration.status === 'CONNECTED' && !isExpired,
      page_name: metadata.pageName,
      instagram_username: metadata.instagramUsername,
      expires_at: integration.token_expires_at,
    })
  } catch (error) {
    console.error('Get meta status error:', error)
    res.status(500).json({ error: 'Failed to get Meta status' })
  }
})

// DELETE /api/marketing/oauth/meta/disconnect?clinic_id=X → apaga token
router.delete('/oauth/meta/disconnect', requirePermission('canEditMarketing'), async (req: AuthedRequest, res) => {
  try {
    const { clinic_id } = req.query as { clinic_id?: string }

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required' })
    }

    await query(
      `UPDATE clinic_integrations
       SET status = 'DISCONNECTED', access_token = NULL, metadata = '{}'::jsonb
       WHERE clinic_id = $1 AND provider = 'META'`,
      [clinic_id]
    )

    res.json({ message: 'Meta integration disconnected successfully' })
  } catch (error) {
    console.error('Disconnect meta error:', error)
    res.status(500).json({ error: 'Failed to disconnect Meta integration' })
  }
})

// GET /api/marketing/meta/insights?clinic_id=X&period=day&since=YYYY-MM-DD&until=YYYY-MM-DD
router.get('/meta/insights', requirePermission('canViewMarketing'), async (req: AuthedRequest, res) => {
  try {
    const { clinic_id, period = 'day', since, until } = req.query as {
      clinic_id?: string
      period?: string
      since?: string
      until?: string
    }

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required' })
    }

    // Get access token from DB
    const integrationResult = await query(
      `SELECT access_token, token_expires_at, external_account_id, metadata
       FROM clinic_integrations
       WHERE clinic_id = $1 AND provider = 'META'`,
      [clinic_id]
    )

    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meta integration not found' })
    }

    const { access_token, token_expires_at, external_account_id, metadata } = integrationResult.rows[0]

    // Check if token expired
    if (token_expires_at && new Date(token_expires_at) < new Date()) {
      return res.status(401).json({ error: 'Meta token expired. Please reconnect.' })
    }

    const instagram_id = external_account_id || (metadata?.igBusinessId)
    if (!instagram_id) {
      return res.status(400).json({ error: 'No Instagram account connected' })
    }

    const apiVersion = process.env.META_API_VERSION || 'v21.0'

    // Fetch Instagram insights - metrics with total_value
    const metricsUrl = new URL(`https://graph.facebook.com/${apiVersion}/${instagram_id}/insights`)
    metricsUrl.searchParams.set('access_token', access_token)
    metricsUrl.searchParams.set('metric', 'reach,profile_views,accounts_engaged')
    metricsUrl.searchParams.set('period', period)
    metricsUrl.searchParams.set('metric_type', 'total_value')

    if (since) metricsUrl.searchParams.set('since', since)
    if (until) metricsUrl.searchParams.set('until', until)

    console.log('Fetching Instagram metrics from:', metricsUrl.toString().replace(access_token, 'TOKEN'))
    const metricsResponse = await fetch(metricsUrl.toString())
    const metricsData = await metricsResponse.json()

    console.log('Instagram metrics response:', JSON.stringify(metricsData, null, 2))

    if (metricsData.error) {
      throw new Error(metricsData.error.message || 'Failed to fetch insights')
    }

    // Fetch follower_count from IG account endpoint (not insights)
    const followersUrl = new URL(`https://graph.facebook.com/${apiVersion}/${instagram_id}`)
    followersUrl.searchParams.set('access_token', access_token)
    followersUrl.searchParams.set('fields', 'followers_count')

    console.log('Fetching followers_count from:', followersUrl.toString().replace(access_token, 'TOKEN'))
    const followersResponse = await fetch(followersUrl.toString())
    const followersData = await followersResponse.json()

    console.log('Followers count response:', JSON.stringify(followersData, null, 2))

    if (followersData.error) {
      console.warn('Failed to fetch followers_count:', followersData.error)
    }

    // Transform data for easier consumption
    const insights = {
      impressions: 0,
      reach: 0,
      engagement: 0,
      followers_count: 0,
    }

    // Process main metrics (using total_value for metric_type=total_value)
    if (metricsData.data) {
      for (const metric of metricsData.data) {
        // Note: impressions is not available, using reach as proxy
        if (metric.name === 'reach' && metric.total_value?.value != null) {
          insights.reach = metric.total_value.value
          insights.impressions = metric.total_value.value // Using reach as impressions proxy
        }
        if (metric.name === 'accounts_engaged' && metric.total_value?.value != null) {
          insights.engagement = metric.total_value.value
        }
        if (metric.name === 'profile_views' && metric.total_value?.value != null) {
          // Could also use profile_views as engagement metric
          console.log('Profile views:', metric.total_value.value)
        }
      }
    }

    // Process follower count (comes directly, not as insights array)
    if (followersData.followers_count != null) {
      insights.followers_count = followersData.followers_count
    }

    res.json(insights)
  } catch (error) {
    console.error('Get meta insights error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch Meta insights' })
  }
})

// GET /api/marketing/meta/history?clinic_id=X&since=YYYY-MM-DD&until=YYYY-MM-DD
// Retorna dados históricos do banco (daily + totals)
router.get('/meta/history', requirePermission('canViewMarketing'), async (req: AuthedRequest, res) => {
  try {
    const { clinic_id, since, until } = req.query as {
      clinic_id?: string
      since?: string
      until?: string
    }

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required' })
    }

    // Buscar dados do banco
    const result = await query(
      `SELECT metric_date, impressions, reach, engagement, followers_count, profile_views
       FROM marketing_metrics_daily
       WHERE clinic_id = $1 AND provider = 'META'
         AND metric_date >= $2 AND metric_date <= $3
       ORDER BY metric_date ASC`,
      [clinic_id, since || '2000-01-01', until || '2099-12-31']
    )

    // Calcular totais agregados
    const totals = {
      impressions: 0,
      reach: 0,
      engagement: 0,
      followers_count: 0, // Último valor
      profile_views: 0,
    }

    const daily = result.rows.map((row: any) => {
      totals.impressions += row.impressions || 0
      totals.reach += row.reach || 0
      totals.engagement += row.engagement || 0
      totals.profile_views += row.profile_views || 0

      // followers_count: usar o mais recente
      if (row.followers_count) {
        totals.followers_count = row.followers_count
      }

      return {
        date: row.metric_date,
        impressions: row.impressions || 0,
        reach: row.reach || 0,
        engagement: row.engagement || 0,
        followers_count: row.followers_count || 0,
        profile_views: row.profile_views || 0,
      }
    })

    res.json({
      totals,
      daily,
      count: daily.length,
    })
  } catch (error) {
    console.error('Get meta history error:', error)
    res.status(500).json({ error: 'Failed to fetch Meta history' })
  }
})

// GET /api/marketing/meta/posts?clinic_id=X&limit=25
// Retorna posts recentes do Instagram com métricas de engajamento
// Prioriza dados do banco (histórico) e complementa com API quando necessário
router.get('/meta/posts', requirePermission('canViewMarketing'), async (req: AuthedRequest, res) => {
  try {
    const { clinic_id, limit = '25' } = req.query as { clinic_id?: string; limit?: string }

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required' })
    }

    // Primeiro, buscar posts do banco (histórico salvo)
    const savedPostsResult = await query(
      `SELECT DISTINCT ON (post_id)
         post_id, post_type, caption, permalink, posted_at,
         metric_date, reach, impressions, engagement, like_count, comments_count, saved
       FROM marketing_posts_metrics
       WHERE clinic_id = $1 AND provider = 'META'
       ORDER BY post_id, metric_date DESC
       LIMIT $2`,
      [clinic_id, parseInt(limit)]
    )

    const savedPosts = new Map()
    savedPostsResult.rows.forEach((row: any) => {
      savedPosts.set(row.post_id, {
        id: row.post_id,
        caption: row.caption || '',
        media_type: row.post_type,
        media_url: '', // Não salvamos URL, apenas permalink
        thumbnail_url: '',
        permalink: row.permalink,
        timestamp: row.posted_at,
        like_count: row.like_count || 0,
        comments_count: row.comments_count || 0,
        reach: row.reach || 0,
        engagement: row.engagement || 0,
        impressions: row.impressions || 0,
        saved: row.saved || 0,
        engagement_rate: row.reach > 0 ? ((row.engagement / row.reach) * 100).toFixed(2) : '0',
        from_database: true, // Flag para indicar que veio do banco
      })
    })

    console.log(`📊 Found ${savedPosts.size} posts in database for clinic ${clinic_id}`)

    // Get access token from DB
    const integrationResult = await query(
      `SELECT access_token, token_expires_at, external_account_id, metadata
       FROM clinic_integrations
       WHERE clinic_id = $1 AND provider = 'META'`,
      [clinic_id]
    )

    if (integrationResult.rows.length === 0) {
      // Se não tem integração mas tem posts salvos, retornar apenas os salvos
      if (savedPosts.size > 0) {
        return res.json({ posts: Array.from(savedPosts.values()), count: savedPosts.size })
      }
      return res.status(404).json({ error: 'Meta integration not found' })
    }

    const { access_token, token_expires_at, external_account_id, metadata } = integrationResult.rows[0]

    if (token_expires_at && new Date(token_expires_at) < new Date()) {
      // Se token expirado mas tem posts salvos, retornar apenas os salvos
      if (savedPosts.size > 0) {
        return res.json({ posts: Array.from(savedPosts.values()), count: savedPosts.size })
      }
      return res.status(401).json({ error: 'Meta token expired. Please reconnect.' })
    }

    const instagram_id = external_account_id || metadata?.igBusinessId
    if (!instagram_id) {
      return res.status(400).json({ error: 'No Instagram account connected' })
    }

    const apiVersion = process.env.META_API_VERSION || 'v21.0'

    // Fetch recent media (posts)
    const mediaUrl = new URL(`https://graph.facebook.com/${apiVersion}/${instagram_id}/media`)
    mediaUrl.searchParams.set('access_token', access_token)
    mediaUrl.searchParams.set('fields', 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count')
    mediaUrl.searchParams.set('limit', limit)

    console.log('Fetching Instagram posts from:', mediaUrl.toString().replace(access_token, 'TOKEN'))
    const mediaResponse = await fetch(mediaUrl.toString())
    const mediaData = await mediaResponse.json()

    if (mediaData.error) {
      throw new Error(mediaData.error.message || 'Failed to fetch posts')
    }

    // Mesclar posts do banco com posts da API
    const posts = []
    if (mediaData.data) {
      for (const media of mediaData.data) {
        // Se já temos dados salvos deste post, usar os dados do banco (mais completos)
        if (savedPosts.has(media.id)) {
          const savedPost = savedPosts.get(media.id)
          // Atualizar com dados mais recentes da API (curtidas/comentários podem ter mudado)
          posts.push({
            ...savedPost,
            media_url: media.media_url,
            thumbnail_url: media.thumbnail_url,
            like_count: media.like_count || savedPost.like_count,
            comments_count: media.comments_count || savedPost.comments_count,
          })
          savedPosts.delete(media.id) // Remover do Map para não duplicar
          continue
        }

        // Post não está no banco, tentar buscar insights da API
        try {
          const insightsUrl = new URL(`https://graph.facebook.com/${apiVersion}/${media.id}/insights`)
          insightsUrl.searchParams.set('access_token', access_token)
          insightsUrl.searchParams.set('metric', 'reach,engagement,impressions,saved')

          const insightsResponse = await fetch(insightsUrl.toString())
          const insightsData = await insightsResponse.json()

          const insights = {
            reach: 0,
            engagement: 0,
            impressions: 0,
            saved: 0,
          }

          if (insightsData.data) {
            for (const metric of insightsData.data) {
              if (metric.name === 'reach' && metric.values?.[0]?.value != null) {
                insights.reach = metric.values[0].value
              }
              if (metric.name === 'engagement' && metric.values?.[0]?.value != null) {
                insights.engagement = metric.values[0].value
              }
              if (metric.name === 'impressions' && metric.values?.[0]?.value != null) {
                insights.impressions = metric.values[0].value
              }
              if (metric.name === 'saved' && metric.values?.[0]?.value != null) {
                insights.saved = metric.values[0].value
              }
            }
          }

          posts.push({
            id: media.id,
            caption: media.caption || '',
            media_type: media.media_type,
            media_url: media.media_url,
            thumbnail_url: media.thumbnail_url,
            permalink: media.permalink,
            timestamp: media.timestamp,
            like_count: media.like_count || 0,
            comments_count: media.comments_count || 0,
            ...insights,
            engagement_rate: insights.reach > 0 ? ((insights.engagement / insights.reach) * 100).toFixed(2) : '0',
            from_database: false,
          })
        } catch (error: any) {
          console.warn(`Failed to fetch insights for media ${media.id}:`, error.message)

          // Instagram Insights API only works for posts from last 24h for some accounts
          // For older posts or limited permissions, insights will be unavailable
          // We still include the post with basic metrics (likes, comments)
          posts.push({
            id: media.id,
            caption: media.caption || '',
            media_type: media.media_type,
            media_url: media.media_url,
            thumbnail_url: media.thumbnail_url,
            permalink: media.permalink,
            timestamp: media.timestamp,
            like_count: media.like_count || 0,
            comments_count: media.comments_count || 0,
            reach: 0,
            engagement: 0,
            impressions: 0,
            saved: 0,
            engagement_rate: '0',
          })
        }
      }
    }

    // Adicionar posts salvos que não estavam na resposta da API (posts antigos)
    savedPosts.forEach((post) => {
      posts.push(post)
    })

    console.log(`📊 Returning ${posts.length} posts (${posts.filter(p => p.from_database).length} from database)`)

    res.json({ posts, count: posts.length })
  } catch (error: any) {
    console.error('Get meta posts error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch Meta posts' })
  }
})

// GET /api/marketing/meta/audience?clinic_id=X
// Retorna dados demográficos da audiência (idade, gênero, localização)
router.get('/meta/audience', requirePermission('canViewMarketing'), async (req: AuthedRequest, res) => {
  try {
    const { clinic_id } = req.query as { clinic_id?: string }

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required' })
    }

    // Get access token from DB
    const integrationResult = await query(
      `SELECT access_token, token_expires_at, external_account_id, metadata
       FROM clinic_integrations
       WHERE clinic_id = $1 AND provider = 'META'`,
      [clinic_id]
    )

    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meta integration not found' })
    }

    const { access_token, token_expires_at, external_account_id, metadata } = integrationResult.rows[0]

    if (token_expires_at && new Date(token_expires_at) < new Date()) {
      return res.status(401).json({ error: 'Meta token expired. Please reconnect.' })
    }

    const instagram_id = external_account_id || metadata?.igBusinessId
    if (!instagram_id) {
      return res.status(400).json({ error: 'No Instagram account connected' })
    }

    const apiVersion = process.env.META_API_VERSION || 'v21.0'

    // Fetch audience demographics using follower_demographics (lifetime metric)
    const audienceUrl = new URL(`https://graph.facebook.com/${apiVersion}/${instagram_id}/insights`)
    audienceUrl.searchParams.set('access_token', access_token)
    audienceUrl.searchParams.set('metric', 'follower_demographics')
    audienceUrl.searchParams.set('period', 'lifetime')
    audienceUrl.searchParams.set('metric_type', 'total_value')

    console.log('Fetching audience demographics from:', audienceUrl.toString().replace(access_token, 'TOKEN'))
    const audienceResponse = await fetch(audienceUrl.toString())
    const audienceData = await audienceResponse.json()

    console.log('Audience API response:', JSON.stringify(audienceData, null, 2))

    if (audienceData.error) {
      console.error('Audience API error:', audienceData.error)
      throw new Error(audienceData.error.message || 'Failed to fetch audience data')
    }

    const demographics = {
      gender_age: {},
      cities: {},
      countries: {},
    }

    // Process follower_demographics response
    // Format: { data: [{ name: "follower_demographics", period: "lifetime", values: [...], total_value: {...} }] }
    if (audienceData.data && audienceData.data.length > 0) {
      const followerDemo = audienceData.data[0]

      // Check if total_value exists and has breakdowns
      if (followerDemo.total_value?.breakdowns) {
        for (const breakdown of followerDemo.total_value.breakdowns) {
          const dimensionKeys = breakdown.dimension_keys || []

          for (const result of breakdown.results || []) {
            const dims = result.dimension_values || []
            const value = result.value || 0

            // Gender-Age breakdown (e.g., dimension_keys: ["age", "gender"])
            if (dimensionKeys.includes('age') && dimensionKeys.includes('gender')) {
              const ageIdx = dimensionKeys.indexOf('age')
              const genderIdx = dimensionKeys.indexOf('gender')
              const age = dims[ageIdx]
              const gender = dims[genderIdx]
              if (age && gender) {
                // Format: "M.18-24", "F.25-34", etc.
                const key = `${gender}.${age}`
                demographics.gender_age[key] = value
              }
            }

            // City breakdown
            if (dimensionKeys.includes('city')) {
              const cityIdx = dimensionKeys.indexOf('city')
              const city = dims[cityIdx]
              if (city) {
                demographics.cities[city] = (demographics.cities[city] || 0) + value
              }
            }

            // Country breakdown
            if (dimensionKeys.includes('country')) {
              const countryIdx = dimensionKeys.indexOf('country')
              const country = dims[countryIdx]
              if (country) {
                demographics.countries[country] = (demographics.countries[country] || 0) + value
              }
            }
          }
        }
      }

      // Fallback: check values array (older format or different breakdowns)
      if (followerDemo.values && followerDemo.values.length > 0) {
        for (const valueObj of followerDemo.values) {
          if (valueObj.value && typeof valueObj.value === 'object') {
            // Try to extract demographics from value object
            for (const [key, val] of Object.entries(valueObj.value)) {
              // Gender-age format: "M.18-24"
              if (key.match(/^[MFU]\.\d+-\d+$/)) {
                demographics.gender_age[key] = val as number
              }
              // City names
              else if (key.match(/^[A-Z]/)) {
                const isCountryCode = key.length === 2
                if (isCountryCode) {
                  demographics.countries[key] = (demographics.countries[key] || 0) + (val as number)
                } else {
                  demographics.cities[key] = (demographics.cities[key] || 0) + (val as number)
                }
              }
            }
          }
        }
      }
    }

    console.log('Extracted demographics:', {
      gender_age_keys: Object.keys(demographics.gender_age),
      cities_keys: Object.keys(demographics.cities).slice(0, 5),
      countries_keys: Object.keys(demographics.countries).slice(0, 5),
    })

    // Process gender_age into separate arrays for easier charting
    const ageRanges: { [key: string]: number } = {}
    const genderData = { M: 0, F: 0, U: 0 }

    Object.entries(demographics.gender_age).forEach(([key, value]) => {
      const match = key.match(/^([MFU])\.(\d+-\d+)$/)
      if (match) {
        const [, gender, ageRange] = match
        genderData[gender as 'M' | 'F' | 'U'] += value as number
        ageRanges[ageRange] = (ageRanges[ageRange] || 0) + (value as number)
      }
    })

    // Sort cities and countries by follower count
    const topCities = Object.entries(demographics.cities)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([city, count]) => ({ city, count }))

    const topCountries = Object.entries(demographics.countries)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }))

    res.json({
      gender: genderData,
      age_ranges: ageRanges,
      top_cities: topCities,
      top_countries: topCountries,
      raw: demographics, // Include raw data for advanced analysis
    })
  } catch (error: any) {
    console.error('Get meta audience error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch Meta audience data' })
  }
})

// GET /api/marketing/conversions?clinic_id=X&since=YYYY-MM-DD&until=YYYY-MM-DD
// Retorna dados de conversão (pacientes/agendamentos por fonte)
router.get('/conversions', requirePermission('canViewMarketing'), async (req: AuthedRequest, res) => {
  try {
    const { clinic_id, since, until } = req.query as {
      clinic_id?: string
      since?: string
      until?: string
    }

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required' })
    }

    const sinceDate = since || '2000-01-01'
    const untilDate = until || '2099-12-31'

    // Get patients by source
    const patientsResult = await query(
      `SELECT source, COUNT(*) as count
       FROM patients
       WHERE clinic_id = $1
         AND created_at >= $2::date
         AND created_at <= $3::date
         AND source IS NOT NULL
       GROUP BY source
       ORDER BY count DESC`,
      [clinic_id, sinceDate, untilDate]
    )

    // Get appointments by source
    const appointmentsResult = await query(
      `SELECT source, COUNT(*) as count
       FROM appointments
       WHERE clinic_id = $1
         AND appointment_date >= $2::date
         AND appointment_date <= $3::date
         AND source IS NOT NULL
       GROUP BY source
       ORDER BY count DESC`,
      [clinic_id, sinceDate, untilDate]
    )

    // Get daily trend of new patients with source
    const dailyTrendResult = await query(
      `SELECT DATE(created_at) as date, source, COUNT(*) as count
       FROM patients
       WHERE clinic_id = $1
         AND created_at >= $2::date
         AND created_at <= $3::date
         AND source IS NOT NULL
       GROUP BY DATE(created_at), source
       ORDER BY date ASC`,
      [clinic_id, sinceDate, untilDate]
    )

    // Calculate conversion rate (appointments that resulted in new patients)
    const conversionResult = await query(
      `SELECT
         COUNT(DISTINCT a.id) FILTER (WHERE p.id IS NOT NULL) as converted_appointments,
         COUNT(DISTINCT a.id) as total_appointments
       FROM appointments a
       LEFT JOIN patients p ON p.email = a.patient_email
         AND p.clinic_id = a.clinic_id
         AND DATE(p.created_at) = DATE(a.appointment_date)
       WHERE a.clinic_id = $1
         AND a.appointment_date >= $2::date
         AND a.appointment_date <= $3::date
         AND a.source IS NOT NULL`,
      [clinic_id, sinceDate, untilDate]
    )

    const conversionRate = conversionResult.rows[0]?.total_appointments > 0
      ? ((conversionResult.rows[0].converted_appointments / conversionResult.rows[0].total_appointments) * 100).toFixed(2)
      : '0'

    res.json({
      patients_by_source: patientsResult.rows,
      appointments_by_source: appointmentsResult.rows,
      daily_trend: dailyTrendResult.rows,
      conversion_rate: conversionRate,
      total_patients: patientsResult.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0),
      total_appointments: appointmentsResult.rows.reduce((sum: number, row: any) => sum + parseInt(row.count), 0),
    })
  } catch (error: any) {
    console.error('Get conversions error:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch conversion data' })
  }
})

// POST /api/marketing/meta/collect-posts → Coleta métricas de posts recentes manualmente
router.post('/meta/collect-posts', async (req, res) => {
  try {
    const { clinic_id } = req.body as { clinic_id?: string }

    if (!clinic_id) {
      return res.status(400).json({ error: 'clinic_id is required' })
    }

    const apiVersion = process.env.META_API_VERSION || 'v21.0'
    const metricDate = new Date().toISOString().split('T')[0]

    // Get access token
    const integrationResult = await query(
      `SELECT access_token, token_expires_at, external_account_id, metadata
       FROM clinic_integrations
       WHERE clinic_id = $1 AND provider = 'META'`,
      [clinic_id]
    )

    if (integrationResult.rows.length === 0) {
      return res.status(404).json({ error: 'Meta integration not found' })
    }

    const { access_token, token_expires_at, external_account_id, metadata } = integrationResult.rows[0]

    if (token_expires_at && new Date(token_expires_at) < new Date()) {
      return res.status(401).json({ error: 'Meta token expired' })
    }

    const instagram_id = external_account_id || metadata?.igBusinessId
    if (!instagram_id) {
      return res.status(400).json({ error: 'No Instagram account connected' })
    }

    // Buscar posts dos últimos 7 dias
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const mediaUrl = new URL(`https://graph.facebook.com/${apiVersion}/${instagram_id}/media`)
    mediaUrl.searchParams.set('access_token', access_token)
    mediaUrl.searchParams.set('fields', 'id,caption,media_type,permalink,timestamp,like_count,comments_count')
    mediaUrl.searchParams.set('since', sevenDaysAgo)
    mediaUrl.searchParams.set('limit', '50')

    const mediaResponse = await fetch(mediaUrl.toString())
    const mediaData = await mediaResponse.json()

    if (mediaData.error || !mediaData.data) {
      return res.status(400).json({ error: mediaData.error?.message || 'No posts found' })
    }

    let savedCount = 0
    let skippedCount = 0

    for (const media of mediaData.data) {
      try {
        const insightsUrl = new URL(`https://graph.facebook.com/${apiVersion}/${media.id}/insights`)
        insightsUrl.searchParams.set('access_token', access_token)
        insightsUrl.searchParams.set('metric', 'reach,engagement,impressions,saved')

        const insightsResponse = await fetch(insightsUrl.toString())
        const insightsData = await insightsResponse.json()

        const insights = {
          reach: 0,
          engagement: 0,
          impressions: 0,
          saved: 0,
        }

        if (insightsData.data) {
          for (const metric of insightsData.data) {
            if (metric.name === 'reach' && metric.values?.[0]?.value != null) {
              insights.reach = metric.values[0].value
            }
            if (metric.name === 'engagement' && metric.values?.[0]?.value != null) {
              insights.engagement = metric.values[0].value
            }
            if (metric.name === 'impressions' && metric.values?.[0]?.value != null) {
              insights.impressions = metric.values[0].value
            }
            if (metric.name === 'saved' && metric.values?.[0]?.value != null) {
              insights.saved = metric.values[0].value
            }
          }
        }

        await query(
          `INSERT INTO marketing_posts_metrics
            (clinic_id, provider, post_id, post_type, caption, permalink, posted_at, metric_date,
             reach, impressions, engagement, like_count, comments_count, saved)
           VALUES ($1, 'META', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (clinic_id, provider, post_id, metric_date)
           DO UPDATE SET
             reach = EXCLUDED.reach,
             impressions = EXCLUDED.impressions,
             engagement = EXCLUDED.engagement,
             like_count = EXCLUDED.like_count,
             comments_count = EXCLUDED.comments_count,
             saved = EXCLUDED.saved`,
          [
            clinic_id,
            media.id,
            media.media_type,
            media.caption?.substring(0, 500) || '',
            media.permalink,
            media.timestamp,
            metricDate,
            insights.reach,
            insights.impressions,
            insights.engagement,
            media.like_count || 0,
            media.comments_count || 0,
            insights.saved
          ]
        )

        savedCount++
      } catch (error: any) {
        skippedCount++
      }
    }

    res.json({
      message: `Collected posts metrics for ${clinic_id}`,
      saved: savedCount,
      skipped: skippedCount,
      total: mediaData.data.length
    })
  } catch (error: any) {
    console.error('Collect posts error:', error)
    res.status(500).json({ error: error.message || 'Failed to collect posts' })
  }
})

// POST /api/marketing/meta/collect → Coleta métricas do dia anterior e salva no banco
// Este endpoint pode ser chamado manualmente ou por um scheduler diário
router.post('/meta/collect', async (req, res) => {
  try {
    const { clinic_id, date } = req.body as { clinic_id?: string; date?: string }
    const apiVersion = process.env.META_API_VERSION || 'v21.0'

    // Se clinic_id não especificado, coletar de todas as clínicas conectadas
    let clinicsToCollect: string[] = []

    if (clinic_id) {
      clinicsToCollect = [clinic_id]
    } else {
      // Buscar todas as clínicas com Meta conectado
      const result = await query(
        `SELECT clinic_id FROM clinic_integrations
         WHERE provider = 'META' AND status = 'CONNECTED'
         AND token_expires_at > NOW()`
      )
      clinicsToCollect = result.rows.map((r: any) => r.clinic_id)
    }

    console.log(`📊 Collecting Meta metrics for ${clinicsToCollect.length} clinic(s)`)

    const results = []

    for (const cId of clinicsToCollect) {
      try {
        // Buscar token de acesso
        const integrationResult = await query(
          `SELECT access_token, token_expires_at, external_account_id, metadata
           FROM clinic_integrations
           WHERE clinic_id = $1 AND provider = 'META'`,
          [cId]
        )

        if (integrationResult.rows.length === 0) {
          console.warn(`⚠️  Clinic ${cId}: No Meta integration found`)
          continue
        }

        const { access_token, token_expires_at, external_account_id, metadata } = integrationResult.rows[0]

        if (token_expires_at && new Date(token_expires_at) < new Date()) {
          console.warn(`⚠️  Clinic ${cId}: Token expired`)
          continue
        }

        const instagram_id = external_account_id || metadata?.igBusinessId
        if (!instagram_id) {
          console.warn(`⚠️  Clinic ${cId}: No Instagram account connected`)
          continue
        }

        // Data a coletar: ontem (padrão) ou data especificada
        const metricDate = date || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        console.log(`  Clinic ${cId}: Fetching metrics for ${metricDate}`)

        // Buscar métricas com total_value (soma do dia)
        const metricsUrl = new URL(`https://graph.facebook.com/${apiVersion}/${instagram_id}/insights`)
        metricsUrl.searchParams.set('access_token', access_token)
        metricsUrl.searchParams.set('metric', 'reach,profile_views,accounts_engaged')
        metricsUrl.searchParams.set('period', 'day')
        metricsUrl.searchParams.set('metric_type', 'total_value')
        metricsUrl.searchParams.set('since', metricDate)
        metricsUrl.searchParams.set('until', metricDate)

        const metricsResponse = await fetch(metricsUrl.toString())
        const metricsData = await metricsResponse.json()

        if (metricsData.error) {
          console.error(`  ❌ Clinic ${cId}: ${metricsData.error.message}`)
          continue
        }

        // Buscar followers_count
        const followersUrl = new URL(`https://graph.facebook.com/${apiVersion}/${instagram_id}`)
        followersUrl.searchParams.set('access_token', access_token)
        followersUrl.searchParams.set('fields', 'followers_count')

        const followersResponse = await fetch(followersUrl.toString())
        const followersData = await followersResponse.json()

        // Processar métricas
        const metrics = {
          impressions: 0,
          reach: 0,
          engagement: 0,
          profile_views: 0,
          followers_count: 0,
        }

        if (metricsData.data) {
          for (const metric of metricsData.data) {
            if (metric.name === 'reach' && metric.total_value?.value != null) {
              metrics.reach = metric.total_value.value
              metrics.impressions = metric.total_value.value // Proxy
            }
            if (metric.name === 'accounts_engaged' && metric.total_value?.value != null) {
              metrics.engagement = metric.total_value.value
            }
            if (metric.name === 'profile_views' && metric.total_value?.value != null) {
              metrics.profile_views = metric.total_value.value
            }
          }
        }

        if (followersData.followers_count != null) {
          metrics.followers_count = followersData.followers_count
        }

        // Salvar no banco (UPSERT)
        await query(
          `INSERT INTO marketing_metrics_daily
            (clinic_id, provider, metric_date, impressions, reach, engagement, followers_count, profile_views)
           VALUES ($1, 'META', $2, $3, $4, $5, $6, $7)
           ON CONFLICT (clinic_id, provider, metric_date)
           DO UPDATE SET
             impressions = EXCLUDED.impressions,
             reach = EXCLUDED.reach,
             engagement = EXCLUDED.engagement,
             followers_count = EXCLUDED.followers_count,
             profile_views = EXCLUDED.profile_views,
             updated_at = CURRENT_TIMESTAMP`,
          [cId, metricDate, metrics.impressions, metrics.reach, metrics.engagement, metrics.followers_count, metrics.profile_views]
        )

        console.log(`  ✅ Clinic ${cId}: Saved metrics (reach: ${metrics.reach}, engagement: ${metrics.engagement})`)

        results.push({
          clinic_id: cId,
          date: metricDate,
          success: true,
          metrics,
        })
      } catch (error: any) {
        console.error(`  ❌ Clinic ${cId}: ${error.message}`)
        results.push({
          clinic_id: cId,
          success: false,
          error: error.message,
        })
      }
    }

    res.json({
      message: `Collected metrics for ${results.filter(r => r.success).length}/${results.length} clinics`,
      results,
    })
  } catch (error) {
    console.error('Meta collect error:', error)
    res.status(500).json({ error: 'Failed to collect Meta metrics' })
  }
})

export default router
