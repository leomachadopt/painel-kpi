import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import useAuthStore from '@/stores/useAuthStore'
import { toast } from 'sonner'
import { Loader2, TrendingUp, Users, Eye, Heart, Calendar, AlertCircle, BarChart3, Target, MessageSquare, FileText, Video } from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { MarketingLeadsContent } from '@/components/marketing/MarketingLeadsContent'
import { MarketingStoriesContent } from '@/components/marketing/MarketingStoriesContent'
import { MarketingReportsContent } from '@/components/marketing/MarketingReportsContent'

interface MetaInsights {
  impressions: number
  reach: number
  engagement: number
  followers_count: number
}

interface MetricData {
  date: string
  impressions: number
  reach: number
  engagement: number
  followers: number
}

interface InstagramPost {
  id: string
  caption: string
  media_type: string
  media_url: string
  thumbnail_url?: string
  permalink: string
  timestamp: string
  like_count: number
  comments_count: number
  reach: number
  engagement: number
  impressions: number
  saved: number
  engagement_rate: string
}

export default function MarketingDashboard() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [metaConnected, setMetaConnected] = useState(false)
  const [pageName, setPageName] = useState<string | null>(null)
  const [instagramUsername, setInstagramUsername] = useState<string | null>(null)
  const [currentMetrics, setCurrentMetrics] = useState<MetaInsights | null>(null)
  const [historicalData, setHistoricalData] = useState<MetricData[]>([])
  const [period, setPeriod] = useState<'7' | '30' | '90'>('30')
  const [posts, setPosts] = useState<InstagramPost[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [audienceData, setAudienceData] = useState<any>(null)
  const [loadingAudience, setLoadingAudience] = useState(false)
  const [conversionsData, setConversionsData] = useState<any>(null)
  const [loadingConversions, setLoadingConversions] = useState(false)

  // Estado para gerenciar abas ativas e cache
  const [activeTab, setActiveTab] = useState('overview')
  const [postsLoaded, setPostsLoaded] = useState(false)
  const [audienceLoaded, setAudienceLoaded] = useState(false)
  const [conversionsLoaded, setConversionsLoaded] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<{
    posts?: Date
    audience?: Date
    conversions?: Date
  }>({})

  const API_URL = import.meta.env.VITE_API_URL || '/api'

  useEffect(() => {
    if (user?.clinicId) {
      checkMetaConnection()
    }
  }, [user?.clinicId])

  useEffect(() => {
    if (metaConnected && user?.clinicId) {
      fetchMetrics()
    }
  }, [metaConnected, period, user?.clinicId])

  // Auto-fetch quando mudar de aba (apenas se não tiver cache)
  useEffect(() => {
    if (!metaConnected || !user?.clinicId) return

    if (activeTab === 'posts' && !postsLoaded) {
      fetchPostsFromDatabase()
    } else if (activeTab === 'audience' && !audienceLoaded) {
      fetchAudience()
    } else if (activeTab === 'conversions' && !conversionsLoaded) {
      fetchConversions()
    }
  }, [activeTab, metaConnected, user?.clinicId])

  const checkMetaConnection = async () => {
    try {
      const token = localStorage.getItem('kpi_token')
      const response = await fetch(
        `${API_URL}/marketing/meta/status?clinic_id=${user?.clinicId}`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setMetaConnected(data.connected)
        setPageName(data.page_name)
        setInstagramUsername(data.instagram_username)
      }
    } catch (error) {
      console.error('Error checking Meta connection:', error)
    }
  }

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('kpi_token')
      const daysAgo = parseInt(period)
      const since = format(subDays(new Date(), daysAgo), 'yyyy-MM-dd')
      const until = format(new Date(), 'yyyy-MM-dd')

      // Buscar dados históricos do banco
      const url = `${API_URL}/marketing/meta/history?clinic_id=${user?.clinicId}&since=${since}&until=${until}`
      console.log('Fetching Meta history:', { url, since, until, daysAgo })

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      console.log('Meta history response:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('Meta history data:', data)

        // Usar totais agregados para os cards
        setCurrentMetrics(data.totals)

        // Converter dados diários para formato do gráfico
        const dailyData: MetricData[] = data.daily.map((item: any) => {
          // Parse date string (YYYY-MM-DD) to Date object
          const dateStr = typeof item.date === 'string' ? item.date : item.date.toString()
          const [year, month, day] = dateStr.split('T')[0].split('-')
          const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

          return {
            date: format(dateObj, 'dd/MM'),
            impressions: item.impressions,
            reach: item.reach,
            engagement: item.engagement,
            followers: item.followers_count,
          }
        })

        setHistoricalData(dailyData)
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao buscar métricas')
      }
    } catch (error) {
      console.error('Error fetching metrics:', error)
      toast.error('Erro ao buscar métricas')
    } finally {
      setLoading(false)
    }
  }

  // Buscar posts salvos no banco (rápido, sempre disponível)
  const fetchPostsFromDatabase = async () => {
    try {
      setLoadingPosts(true)
      const token = localStorage.getItem('kpi_token')
      const url = `${API_URL}/marketing/posts/${user?.clinicId}?limit=25`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        // Mapear dados do banco para formato esperado
        const formattedPosts = data.map((post: any) => ({
          id: post.post_id,
          caption: post.caption || '',
          media_type: post.post_type,
          media_url: '',
          permalink: post.permalink,
          timestamp: post.posted_at,
          like_count: post.like_count || 0,
          comments_count: post.comments_count || 0,
          reach: post.reach || 0,
          engagement: post.engagement || 0,
          impressions: post.impressions || 0,
          saved: post.saved || 0,
          engagement_rate: post.engagement && post.reach
            ? ((post.engagement / post.reach) * 100).toFixed(2) + '%'
            : '0%',
        }))
        setPosts(formattedPosts)
        setPostsLoaded(true)
        setLastUpdated(prev => ({ ...prev, posts: new Date() }))
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao buscar posts')
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Erro ao buscar posts')
    } finally {
      setLoadingPosts(false)
    }
  }

  // Forçar atualização manual (busca da API do Meta)
  const fetchPosts = async () => {
    try {
      setLoadingPosts(true)
      const token = localStorage.getItem('kpi_token')
      const url = `${API_URL}/marketing/meta/posts?clinic_id=${user?.clinicId}&limit=25`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setPosts(data.posts || [])
        setPostsLoaded(true)
        setLastUpdated(prev => ({ ...prev, posts: new Date() }))
        toast.success('Posts atualizados com sucesso')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao buscar posts')
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Erro ao buscar posts')
    } finally {
      setLoadingPosts(false)
    }
  }

  const fetchAudience = async () => {
    try {
      setLoadingAudience(true)
      const token = localStorage.getItem('kpi_token')
      const url = `${API_URL}/marketing/meta/audience?clinic_id=${user?.clinicId}`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setAudienceData(data)
        setAudienceLoaded(true)
        setLastUpdated(prev => ({ ...prev, audience: new Date() }))
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao buscar dados de audiência')
      }
    } catch (error) {
      console.error('Error fetching audience:', error)
      toast.error('Erro ao buscar dados de audiência')
    } finally {
      setLoadingAudience(false)
    }
  }

  const fetchConversions = async () => {
    try {
      setLoadingConversions(true)
      const token = localStorage.getItem('kpi_token')
      const daysAgo = parseInt(period)
      const since = format(subDays(new Date(), daysAgo), 'yyyy-MM-dd')
      const until = format(new Date(), 'yyyy-MM-dd')
      const url = `${API_URL}/marketing/conversions?clinic_id=${user?.clinicId}&since=${since}&until=${until}`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      })

      if (response.ok) {
        const data = await response.json()
        setConversionsData(data)
        setConversionsLoaded(true)
        setLastUpdated(prev => ({ ...prev, conversions: new Date() }))
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao buscar dados de conversão')
      }
    } catch (error) {
      console.error('Error fetching conversions:', error)
      toast.error('Erro ao buscar dados de conversão')
    } finally {
      setLoadingConversions(false)
    }
  }

  // Função helper para formatar tempo relativo
  const getTimeAgo = (date?: Date) => {
    if (!date) return null
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'agora mesmo'
    if (diffMins < 60) return `há ${diffMins} min`
    if (diffHours < 24) return `há ${diffHours}h`
    return `há ${diffDays} dia${diffDays > 1 ? 's' : ''}`
  }

  if (!metaConnected) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Meta não conectada
            </CardTitle>
            <CardDescription>
              Conecte sua conta do Facebook/Instagram para visualizar métricas de marketing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/configuracoes'}>
              Ir para Configurações
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!instagramUsername) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Instagram não configurado
            </CardTitle>
            <CardDescription>
              Sua Página do Facebook está conectada ({pageName}), mas não há um Instagram Business Account vinculado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Para visualizar métricas do Instagram, você precisa:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Ter uma conta Instagram Business (não pessoal)</li>
              <li>Conectar essa conta à sua Página do Facebook</li>
              <li>Reconectar aqui nas Configurações</li>
            </ol>
            <div className="flex gap-2">
              <Button onClick={() => window.location.href = '/configuracoes'}>
                Ir para Configurações
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open('https://www.facebook.com/business/help/898752960195806', '_blank')}
              >
                Como conectar Instagram à Página
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Marketing Hub</h1>
        <p className="text-muted-foreground">
          {instagramUsername ? `@${instagramUsername}` : pageName || 'Redes Sociais'}
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-7 lg:w-auto">
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="posts" className="gap-2">
            <Eye className="h-4 w-4" />
            <span className="hidden sm:inline">Posts</span>
          </TabsTrigger>
          <TabsTrigger value="audience" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Audiência</span>
          </TabsTrigger>
          <TabsTrigger value="conversions" className="gap-2">
            <Target className="h-4 w-4" />
            <span className="hidden sm:inline">Conversões</span>
          </TabsTrigger>
          <TabsTrigger value="leads" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Leads</span>
          </TabsTrigger>
          <TabsTrigger value="stories" className="gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Stories</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios</span>
          </TabsTrigger>
        </TabsList>

        {/* VISÃO GERAL */}
        <TabsContent value="overview" className="space-y-6">
          {/* Period Selector */}
          <div className="flex gap-2">
            <Button
              variant={period === '7' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('7')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              7 dias
            </Button>
            <Button
              variant={period === '30' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('30')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              30 dias
            </Button>
            <Button
              variant={period === '90' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod('90')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              90 dias
            </Button>
          </div>

          {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressões</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.impressions?.toLocaleString('pt-PT') || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos {period} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alcance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.reach?.toLocaleString('pt-PT') || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Contas únicas alcançadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engajamento</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.engagement?.toLocaleString('pt-PT') || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Interações totais
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seguidores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentMetrics?.followers_count?.toLocaleString('pt-PT') || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de seguidores
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="impressions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="impressions">Impressões</TabsTrigger>
          <TabsTrigger value="reach">Alcance</TabsTrigger>
          <TabsTrigger value="engagement">Engajamento</TabsTrigger>
          <TabsTrigger value="followers">Seguidores</TabsTrigger>
        </TabsList>

        <TabsContent value="impressions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Impressões</CardTitle>
              <CardDescription>
                Número de vezes que suas publicações foram visualizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="colorImpressions" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="impressions" stroke="#3b82f6" fillOpacity={1} fill="url(#colorImpressions)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reach" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Alcance</CardTitle>
              <CardDescription>
                Número de contas únicas que viram suas publicações
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="colorReach" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="reach" stroke="#10b981" fillOpacity={1} fill="url(#colorReach)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Engajamento</CardTitle>
              <CardDescription>
                Curtidas, comentários e compartilhamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={historicalData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="engagement" stroke="#f59e0b" strokeWidth={2} name="Engajamento" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="followers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Seguidores</CardTitle>
              <CardDescription>
                Crescimento da base de seguidores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="colorFollowers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="followers" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorFollowers)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
        </TabsContent>

        {/* POSTS */}
        <TabsContent value="posts" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Análise de Posts</h3>
                {lastUpdated.posts && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Atualizado {getTimeAgo(lastUpdated.posts)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Performance individual dos últimos 25 posts</p>
            </div>
            <Button onClick={fetchPosts} disabled={loadingPosts}>
              {loadingPosts && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atualizar
            </Button>
          </div>

          {/* Info Alert */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">ℹ️ Sobre as métricas de posts</p>
                <p className="text-blue-800">
                  A API do Instagram fornece métricas detalhadas (Alcance, Impressões, Engajamento) apenas para <strong>posts recentes</strong> (últimas 24-48h).
                  Para posts mais antigos, são exibidas apenas <strong>Curtidas e Comentários</strong>, que estão sempre disponíveis.
                </p>
              </div>
            </div>
          </div>

          {posts.length === 0 && !loadingPosts && (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-center">
                  Nenhum post encontrado. Clique em "Atualizar" para buscar seus posts do Instagram.
                </p>
              </CardContent>
            </Card>
          )}

          {loadingPosts && (
            <Card>
              <CardContent className="py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          )}

          {posts.length > 0 && !loadingPosts && (
            <div className="grid gap-4">
              {/* Top Performers */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 3 Posts com Melhor Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {posts
                      .slice()
                      .sort((a, b) => b.engagement - a.engagement)
                      .slice(0, 3)
                      .map((post, idx) => (
                        <Card key={post.id}>
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                                #{idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{post.caption.substring(0, 50)}...</p>
                                <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
                                  <span>👁️ {post.reach.toLocaleString()}</span>
                                  <span>❤️ {post.like_count.toLocaleString()}</span>
                                  <span>💬 {post.comments_count}</span>
                                </div>
                                <p className="text-xs text-green-600 font-semibold mt-1">
                                  Taxa: {post.engagement_rate}%
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </CardContent>
              </Card>

              {/* All Posts Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Todos os Posts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Post</th>
                          <th className="text-right p-2">Alcance</th>
                          <th className="text-right p-2">Impressões</th>
                          <th className="text-right p-2">Engajamento</th>
                          <th className="text-right p-2">Curtidas</th>
                          <th className="text-right p-2">Comentários</th>
                          <th className="text-right p-2">Salvos</th>
                          <th className="text-right p-2">Taxa</th>
                          <th className="text-left p-2">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {posts.map((post) => (
                          <tr key={post.id} className="border-b hover:bg-muted/50">
                            <td className="p-2">
                              <div className="flex items-center gap-2 max-w-xs">
                                {post.media_type === 'VIDEO' && <Video className="h-4 w-4 flex-shrink-0" />}
                                {post.media_type === 'IMAGE' && <Eye className="h-4 w-4 flex-shrink-0" />}
                                <a
                                  href={post.permalink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm truncate hover:underline"
                                >
                                  {post.caption.substring(0, 40) || 'Sem legenda'}...
                                </a>
                              </div>
                            </td>
                            <td className="text-right p-2 text-sm">{post.reach.toLocaleString()}</td>
                            <td className="text-right p-2 text-sm">{post.impressions.toLocaleString()}</td>
                            <td className="text-right p-2 text-sm font-semibold">{post.engagement.toLocaleString()}</td>
                            <td className="text-right p-2 text-sm">{post.like_count.toLocaleString()}</td>
                            <td className="text-right p-2 text-sm">{post.comments_count}</td>
                            <td className="text-right p-2 text-sm">{post.saved}</td>
                            <td className="text-right p-2 text-sm">
                              <span className={`font-semibold ${parseFloat(post.engagement_rate) > 5 ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {post.engagement_rate}%
                              </span>
                            </td>
                            <td className="text-left p-2 text-xs text-muted-foreground">
                              {format(new Date(post.timestamp), 'dd/MM/yyyy', { locale: ptBR })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* AUDIÊNCIA */}
        <TabsContent value="audience" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Demografia da Audiência</h3>
                {lastUpdated.audience && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Atualizado {getTimeAgo(lastUpdated.audience)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Perfil completo dos seus seguidores</p>
            </div>
            <Button onClick={fetchAudience} disabled={loadingAudience}>
              {loadingAudience && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atualizar
            </Button>
          </div>

          {!audienceData && !loadingAudience && (
            <Card>
              <CardContent className="py-8">
                <p className="text-muted-foreground text-center">
                  Clique em "Atualizar" para carregar dados demográficos da sua audiência.
                </p>
              </CardContent>
            </Card>
          )}

          {loadingAudience && (
            <Card>
              <CardContent className="py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          )}

          {audienceData && !loadingAudience && (
            <div className="grid gap-4">
              {/* Gender Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Gênero</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Masculino', value: audienceData.gender.M, fill: '#3b82f6' },
                            { name: 'Feminino', value: audienceData.gender.F, fill: '#ec4899' },
                            { name: 'Não especificado', value: audienceData.gender.U, fill: '#6b7280' },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          dataKey="value"
                        >
                          {[{ fill: '#3b82f6' }, { fill: '#ec4899' }, { fill: '#6b7280' }].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Age Ranges */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Idade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={Object.entries(audienceData.age_ranges).map(([range, count]) => ({ range, count }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" name="Seguidores" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Top Cities */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Cidades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {audienceData.top_cities.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded">
                        <span className="text-sm">{idx + 1}. {item.city}</span>
                        <span className="text-sm font-semibold">{item.count.toLocaleString()} seguidores</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Top Countries */}
              <Card>
                <CardHeader>
                  <CardTitle>Top 10 Países</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {audienceData.top_countries.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded">
                        <span className="text-sm">{idx + 1}. {item.country}</span>
                        <span className="text-sm font-semibold">{item.count.toLocaleString()} seguidores</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* CONVERSÕES */}
        <TabsContent value="conversions" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Conversões de Marketing</h3>
                {lastUpdated.conversions && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    Atualizado {getTimeAgo(lastUpdated.conversions)}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Rastreamento de origem de pacientes e agendamentos</p>
            </div>
            <Button onClick={fetchConversions} disabled={loadingConversions}>
              {loadingConversions && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Atualizar
            </Button>
          </div>

          {!conversionsData && !loadingConversions && (
            <Card>
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Clique em "Atualizar" para visualizar dados de conversão.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
                    <h4 className="font-semibold text-sm mb-2">💡 Como funciona o tracking de origem?</h4>
                    <p className="text-xs text-muted-foreground">
                      Para rastrear de onde vêm seus pacientes, adicione o campo "source" ao cadastrar novos pacientes ou agendamentos.
                      Valores comuns: INSTAGRAM, FACEBOOK, GOOGLE, REFERRAL, DIRECT, WEBSITE
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {loadingConversions && (
            <Card>
              <CardContent className="py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </CardContent>
            </Card>
          )}

          {conversionsData && !loadingConversions && (
            <div className="grid gap-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{conversionsData.total_patients}</div>
                    <p className="text-xs text-muted-foreground">Com origem rastreada</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{conversionsData.total_appointments}</div>
                    <p className="text-xs text-muted-foreground">Com origem rastreada</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{conversionsData.conversion_rate}%</div>
                    <p className="text-xs text-muted-foreground">Agendamentos → Pacientes</p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Pacientes por Origem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conversionsData.patients_by_source.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={conversionsData.patients_by_source}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="source" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" name="Pacientes" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum paciente com origem rastreada no período
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Agendamentos por Origem</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conversionsData.appointments_by_source.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={conversionsData.appointments_by_source}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="source" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#10b981" name="Agendamentos" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum agendamento com origem rastreada no período
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Tables */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Ranking de Origens - Pacientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conversionsData.patients_by_source.length > 0 ? (
                      <div className="space-y-2">
                        {conversionsData.patients_by_source.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded">
                            <span className="text-sm font-medium">{idx + 1}. {item.source}</span>
                            <span className="text-sm">{item.count} pacientes</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground">Sem dados</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ranking de Origens - Agendamentos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {conversionsData.appointments_by_source.length > 0 ? (
                      <div className="space-y-2">
                        {conversionsData.appointments_by_source.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between items-center p-2 hover:bg-muted/50 rounded">
                            <span className="text-sm font-medium">{idx + 1}. {item.source}</span>
                            <span className="text-sm">{item.count} agendamentos</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground">Sem dados</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* LEADS */}
        <TabsContent value="leads" className="space-y-6">
          {user?.clinicId && <MarketingLeadsContent clinicId={user.clinicId} />}
        </TabsContent>

        {/* STORIES */}
        <TabsContent value="stories" className="space-y-6">
          {user?.clinicId && <MarketingStoriesContent clinicId={user.clinicId} />}
        </TabsContent>

        {/* RELATÓRIOS */}
        <TabsContent value="reports" className="space-y-6">
          {user?.clinicId && <MarketingReportsContent clinicId={user.clinicId} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
