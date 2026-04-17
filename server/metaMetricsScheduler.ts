/**
 * Scheduler para coleta automática de métricas do Instagram/Meta
 * Roda diariamente às 00:05 para coletar métricas do dia anterior
 */

import { query } from './db.js'

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
 * Coleta métricas de posts recentes do Instagram
 */
async function collectPostsMetrics(clinic_id: string, access_token: string, instagram_id: string, metricDate: string, apiVersion: string) {
  try {
    // Buscar posts recentes (últimos 7 dias para garantir que pegamos posts ainda com insights disponíveis)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const mediaUrl = new URL(`https://graph.facebook.com/${apiVersion}/${instagram_id}/media`)
    mediaUrl.searchParams.set('access_token', access_token)
    mediaUrl.searchParams.set('fields', 'id,caption,media_type,permalink,timestamp,like_count,comments_count')
    mediaUrl.searchParams.set('since', sevenDaysAgo)
    mediaUrl.searchParams.set('limit', '50')

    const mediaResponse = await fetch(mediaUrl.toString())
    const mediaData = await mediaResponse.json()

    if (mediaData.error || !mediaData.data) {
      console.warn(`  ⚠️  No posts data for clinic ${clinic_id}`)
      return 0
    }

    let savedPosts = 0

    for (const media of mediaData.data) {
      try {
        // Buscar insights do post
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

        // Salvar snapshot no banco
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

        savedPosts++
      } catch (error: any) {
        // Insights podem falhar para posts antigos - ignorar silenciosamente
        console.debug(`    Skipped post ${media.id}: ${error.message}`)
      }
    }

    return savedPosts
  } catch (error: any) {
    console.error(`  ❌ Failed to collect posts metrics for clinic ${clinic_id}: ${error.message}`)
    return 0
  }
}

/**
 * Coleta métricas de stories recentes do Instagram (antes que expirem em 24h)
 */
async function collectStoriesMetrics(clinic_id: string, access_token: string, instagram_id: string, metricDate: string, apiVersion: string) {
  try {
    // Buscar stories disponíveis (apenas últimas 24h)
    const storiesUrl = new URL(`https://graph.facebook.com/${apiVersion}/${instagram_id}/stories`)
    storiesUrl.searchParams.set('access_token', access_token)
    storiesUrl.searchParams.set('fields', 'id,media_type,media_url,timestamp')

    const storiesResponse = await fetch(storiesUrl.toString())
    const storiesData = await storiesResponse.json()

    if (storiesData.error || !storiesData.data) {
      // Não é erro - pode simplesmente não ter stories ativas
      return 0
    }

    let savedStories = 0

    for (const story of storiesData.data) {
      try {
        // Buscar insights do story
        const insightsUrl = new URL(`https://graph.facebook.com/${apiVersion}/${story.id}/insights`)
        insightsUrl.searchParams.set('access_token', access_token)
        insightsUrl.searchParams.set('metric', 'impressions,reach,replies,exits,taps_forward,taps_back')

        const insightsResponse = await fetch(insightsUrl.toString())
        const insightsData = await insightsResponse.json()

        const insights = {
          impressions: 0,
          reach: 0,
          replies: 0,
          exits: 0,
          taps_forward: 0,
          taps_back: 0,
        }

        if (insightsData.data) {
          for (const metric of insightsData.data) {
            if (metric.name === 'impressions' && metric.values?.[0]?.value != null) {
              insights.impressions = metric.values[0].value
            }
            if (metric.name === 'reach' && metric.values?.[0]?.value != null) {
              insights.reach = metric.values[0].value
            }
            if (metric.name === 'replies' && metric.values?.[0]?.value != null) {
              insights.replies = metric.values[0].value
            }
            if (metric.name === 'exits' && metric.values?.[0]?.value != null) {
              insights.exits = metric.values[0].value
            }
            if (metric.name === 'taps_forward' && metric.values?.[0]?.value != null) {
              insights.taps_forward = metric.values[0].value
            }
            if (metric.name === 'taps_back' && metric.values?.[0]?.value != null) {
              insights.taps_back = metric.values[0].value
            }
          }
        }

        // Calcular expires_at (24h após posted_at)
        const postedAt = new Date(story.timestamp)
        const expiresAt = new Date(postedAt.getTime() + 24 * 60 * 60 * 1000)

        // Salvar snapshot no banco
        await query(
          `INSERT INTO marketing_stories_metrics
            (clinic_id, provider, story_id, media_type, media_url, posted_at, expires_at,
             metric_date, impressions, reach, replies, exits, taps_forward, taps_back)
           VALUES ($1, 'META', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (clinic_id, provider, story_id, metric_date)
           DO UPDATE SET
             impressions = EXCLUDED.impressions,
             reach = EXCLUDED.reach,
             replies = EXCLUDED.replies,
             exits = EXCLUDED.exits,
             taps_forward = EXCLUDED.taps_forward,
             taps_back = EXCLUDED.taps_back`,
          [
            clinic_id,
            story.id,
            story.media_type,
            story.media_url || '',
            story.timestamp,
            expiresAt.toISOString(),
            metricDate,
            insights.impressions,
            insights.reach,
            insights.replies,
            insights.exits,
            insights.taps_forward,
            insights.taps_back
          ]
        )

        savedStories++
      } catch (error: any) {
        // Insights podem falhar - ignorar silenciosamente
        console.debug(`    Skipped story ${story.id}: ${error.message}`)
      }
    }

    return savedStories
  } catch (error: any) {
    console.error(`  ❌ Failed to collect stories metrics for clinic ${clinic_id}: ${error.message}`)
    return 0
  }
}

/**
 * Coleta dados demográficos da audiência do Instagram
 */
async function collectAudienceDemographics(clinic_id: string, access_token: string, instagram_id: string, metricDate: string, apiVersion: string) {
  try {
    // Buscar demographics lifetime insights
    const demographicsUrl = new URL(`https://graph.facebook.com/${apiVersion}/${instagram_id}/insights`)
    demographicsUrl.searchParams.set('access_token', access_token)
    demographicsUrl.searchParams.set('metric', 'audience_gender_age,audience_city,audience_country')
    demographicsUrl.searchParams.set('period', 'lifetime')

    const demographicsResponse = await fetch(demographicsUrl.toString())
    const demographicsData = await demographicsResponse.json()

    if (demographicsData.error || !demographicsData.data) {
      return false
    }

    // Processar dados demográficos
    const demographics: any = {}

    for (const metric of demographicsData.data) {
      if (metric.name === 'audience_gender_age' && metric.values?.[0]?.value) {
        demographics.genderAge = metric.values[0].value
      }
      if (metric.name === 'audience_city' && metric.values?.[0]?.value) {
        demographics.city = metric.values[0].value
      }
      if (metric.name === 'audience_country' && metric.values?.[0]?.value) {
        demographics.country = metric.values[0].value
      }
    }

    // Salvar no metadata da marketing_metrics_daily
    await query(
      `UPDATE marketing_metrics_daily
       SET metadata = metadata || $1::jsonb
       WHERE clinic_id = $2 AND provider = 'META' AND metric_date = $3`,
      [JSON.stringify({ demographics }), clinic_id, metricDate]
    )

    return true
  } catch (error: any) {
    console.error(`  ❌ Failed to collect demographics for clinic ${clinic_id}: ${error.message}`)
    return false
  }
}

/**
 * Coleta métricas do Instagram para todas as clínicas com Meta conectado
 */
async function collectMetaMetrics() {
  try {
    const apiVersion = process.env.META_API_VERSION || 'v21.0'

    // Buscar todas as clínicas com Meta conectado e token válido
    const result = await query(
      `SELECT clinic_id, access_token, external_account_id, metadata
       FROM clinic_integrations
       WHERE provider = 'META' AND status = 'CONNECTED'
       AND token_expires_at > NOW()`
    )

    const clinics = result.rows
    console.log(`📊 Collecting Meta metrics for ${clinics.length} clinic(s)`)

    if (clinics.length === 0) {
      console.log('⚠️  No clinics with active Meta integration')
      return { success: 0, failed: 0, total: 0 }
    }

    // Data de ontem
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const metricDate = yesterday.toISOString().split('T')[0]

    let successCount = 0
    let failedCount = 0

    for (const clinic of clinics) {
      const { clinic_id, access_token, external_account_id, metadata } = clinic

      try {
        const instagram_id = external_account_id || metadata?.igBusinessId
        if (!instagram_id) {
          console.warn(`⚠️  Clinic ${clinic_id}: No Instagram account`)
          failedCount++
          continue
        }

        console.log(`  Clinic ${clinic_id}: Fetching metrics for ${metricDate}`)

        // Buscar métricas com total_value
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
          console.error(`  ❌ Clinic ${clinic_id}: ${metricsData.error.message}`)
          failedCount++
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
              metrics.impressions = metric.total_value.value
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
          [clinic_id, metricDate, metrics.impressions, metrics.reach, metrics.engagement, metrics.followers_count, metrics.profile_views]
        )

        console.log(`  ✅ Clinic ${clinic_id}: Saved metrics (reach: ${metrics.reach}, engagement: ${metrics.engagement}, followers: ${metrics.followers_count})`)

        // Também coletar métricas de posts recentes (últimos 7 dias)
        const savedPostsCount = await collectPostsMetrics(clinic_id, access_token, instagram_id, metricDate, apiVersion)
        if (savedPostsCount > 0) {
          console.log(`  ✅ Clinic ${clinic_id}: Saved ${savedPostsCount} post snapshots`)
        }

        // Coletar métricas de stories ativas (antes de expirarem em 24h)
        const savedStoriesCount = await collectStoriesMetrics(clinic_id, access_token, instagram_id, metricDate, apiVersion)
        if (savedStoriesCount > 0) {
          console.log(`  ✅ Clinic ${clinic_id}: Saved ${savedStoriesCount} story snapshots`)
        }

        // Coletar dados demográficos da audiência
        const savedDemographics = await collectAudienceDemographics(clinic_id, access_token, instagram_id, metricDate, apiVersion)
        if (savedDemographics) {
          console.log(`  ✅ Clinic ${clinic_id}: Saved audience demographics`)
        }

        successCount++
      } catch (error: any) {
        console.error(`  ❌ Clinic ${clinic_id}: ${error.message}`)
        failedCount++
      }
    }

    return { success: successCount, failed: failedCount, total: clinics.length }
  } catch (error) {
    console.error('❌ Meta metrics collection error:', error)
    throw error
  }
}

/**
 * Inicia o scheduler para coleta diária de métricas
 * Roda às 00:05 todos os dias (5 minutos após meia-noite)
 */
export function startMetaMetricsScheduler() {
  const enabled = process.env.META_METRICS_SCHEDULER_ENABLED !== 'false'

  if (!enabled) {
    console.log('🟡 Meta metrics scheduler disabled (META_METRICS_SCHEDULER_ENABLED=false)')
    return
  }

  // Permitir configurar horário via env (padrão: 00:05)
  const hour = parseInt(process.env.META_METRICS_SCHEDULER_HOUR || '0', 10)
  const minutes = parseInt(process.env.META_METRICS_SCHEDULER_MINUTES || '5', 10)

  const safeHour = Number.isFinite(hour) ? Math.min(Math.max(hour, 0), 23) : 0
  const safeMinutes = Number.isFinite(minutes) ? Math.min(Math.max(minutes, 0), 59) : 5

  const scheduleNext = () => {
    const ms = getMsUntilNextRun(safeHour, safeMinutes)

    setTimeout(async () => {
      try {
        console.log('⏰ Running Meta metrics collection...')
        const result = await collectMetaMetrics()
        console.log(`✅ Meta metrics collected: ${result.success}/${result.total} clinics (${result.failed} failed)`)
      } catch (err) {
        console.error('❌ Meta metrics collection failed:', err)
      } finally {
        // Agendar próxima execução
        scheduleNext()
      }
    }, ms)

    const nextRun = new Date(Date.now() + ms)
    console.log(
      `🕒 Meta metrics scheduler armed (next run: ${nextRun.toLocaleString('pt-BR')} - ${safeHour.toString().padStart(2, '0')}:${safeMinutes.toString().padStart(2, '0')})`
    )
  }

  scheduleNext()
}
