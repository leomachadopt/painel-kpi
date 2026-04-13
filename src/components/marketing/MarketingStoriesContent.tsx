import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, TrendingUp, Eye, Users, MessageCircle, X } from 'lucide-react'
import { marketingApi } from '@/services/api'
import { format, subDays } from 'date-fns'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Story {
  id: number
  clinic_id: string
  provider: string
  story_id: string
  media_type: string | null
  media_url: string | null
  posted_at: string | null
  expires_at: string | null
  metric_date: string
  impressions: number
  reach: number
  replies: number
  exits: number
  taps_forward: number
  taps_back: number
  metadata: Record<string, any>
  created_at: string
}

export function MarketingStoriesContent({ clinicId }: { clinicId: string }) {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(false)
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const loadStories = async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const data = await marketingApi.stories.list(clinicId, startDate, endDate)
      setStories(data)
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar stories')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, startDate, endDate])

  const totalImpressions = stories.reduce((acc, s) => acc + s.impressions, 0)
  const totalReach = stories.reduce((acc, s) => acc + s.reach, 0)
  const totalReplies = stories.reduce((acc, s) => acc + s.replies, 0)
  const avgEngagement = stories.length > 0
    ? ((totalReplies / totalImpressions) * 100).toFixed(2)
    : '0.00'

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold tracking-tight">Stories do Instagram</h3>
        <p className="text-muted-foreground text-sm">
          Métricas de stories coletadas antes de expirarem (disponíveis apenas 24h)
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Stories</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stories.length}</div>
            <p className="text-xs text-muted-foreground">
              Últimos {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Impressões</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Média: {stories.length > 0 ? Math.round(totalImpressions / stories.length).toLocaleString() : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alcance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalReach.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Média: {stories.length > 0 ? Math.round(totalReach / stories.length).toLocaleString() : 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Interação</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgEngagement}%</div>
            <p className="text-xs text-muted-foreground">
              {totalReplies} respostas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4 items-end">
          <div className="flex-1">
            <Label>Data Início</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label>Data Fim</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={loadStories} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Atualizar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stories Recentes ({stories.length})</CardTitle>
          <CardDescription>
            Dados preservados após as 24h. Coletados automaticamente antes de expirar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : stories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Nenhum story encontrado neste período</p>
              <p className="text-sm mt-2">
                Stories são coletados automaticamente via integração Meta
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {stories.map((story) => (
                <Card key={story.id} className="overflow-hidden">
                  {story.media_url && (
                    <div className="relative aspect-[9/16] bg-gray-100 dark:bg-gray-800">
                      {story.media_type === 'VIDEO' ? (
                        <video
                          src={story.media_url}
                          className="w-full h-full object-cover"
                          controls
                        />
                      ) : (
                        <img
                          src={story.media_url}
                          alt="Story"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {story.posted_at
                          ? format(new Date(story.posted_at), 'dd/MM HH:mm')
                          : format(new Date(story.metric_date), 'dd/MM')}
                      </span>
                      <span className="bg-muted px-2 py-0.5 rounded text-xs">
                        {story.media_type || 'Unknown'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{story.impressions.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{story.reach.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{story.replies}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <X className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{story.exits}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
