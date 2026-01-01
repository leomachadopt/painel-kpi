import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCcw } from 'lucide-react'
import { marketingApi } from '@/services/api'
import type { GbpSearchTerm, KeywordRankingDaily, SocialDailyMetric } from '@/lib/types'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export function MarketingReport({
  clinicId,
  startDate,
  endDate,
}: {
  clinicId: string
  startDate: string
  endDate: string
}) {
  const [loading, setLoading] = useState(false)
  const [metrics, setMetrics] = useState<SocialDailyMetric[]>([])
  const [rankings, setRankings] = useState<KeywordRankingDaily[]>([])
  const [searchTerms, setSearchTerms] = useState<GbpSearchTerm[]>([])

  const monthCtx = useMemo(() => {
    const d = new Date(`${startDate}T00:00:00`)
    return { year: d.getFullYear(), month: d.getMonth() + 1 }
  }, [startDate])

  const load = async () => {
    setLoading(true)
    try {
      const [m, r, st] = await Promise.all([
        marketingApi.metrics.list(clinicId, startDate, endDate),
        marketingApi.rankings.list(clinicId, startDate, endDate),
        marketingApi.gbp.searchTerms(clinicId, monthCtx.year, monthCtx.month),
      ])
      setMetrics(m)
      setRankings(r)
      setSearchTerms(st)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, startDate, endDate])

  const latestByProvider = useMemo(() => {
    const by: Record<string, SocialDailyMetric | undefined> = {}
    for (const row of metrics) {
      const key = row.provider
      const current = by[key]
      if (!current || row.date > current.date) by[key] = row
    }
    return by
  }, [metrics])

  const rankingSummary = useMemo(() => {
    const lastDate = rankings.reduce((acc, r) => (r.date > acc ? r.date : acc), '')
    const todays = rankings.filter((r) => r.date === lastDate)
    const positions = todays.map((r) => r.position).filter((p): p is number => typeof p === 'number')
    const avg = positions.length ? positions.reduce((a, b) => a + b, 0) / positions.length : null
    return { lastDate, count: todays.length, avgPosition: avg }
  }, [rankings])

  const handleRun = async () => {
    setLoading(true)
    try {
      await marketingApi.run.runClinic(clinicId)
      await load()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            Dados de {startDate} até {endDate}
          </div>
        </div>
        <Button variant="outline" onClick={handleRun} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
          Atualizar agora
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Instagram</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-sm text-muted-foreground">Seguidores (último dia)</div>
            <div className="text-2xl font-semibold">
              {latestByProvider.INSTAGRAM?.followersTotal ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Facebook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-sm text-muted-foreground">Seguidores/Fãs (último dia)</div>
            <div className="text-2xl font-semibold">
              {latestByProvider.FACEBOOK?.followersTotal ?? '—'}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Google Business Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-sm text-muted-foreground">Novas avaliações (último dia)</div>
            <div className="text-2xl font-semibold">
              {latestByProvider.GOOGLE_BUSINESS?.reviewsNew ?? '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ranking no Maps (keywords da clínica)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Último snapshot: {rankingSummary.lastDate || '—'} • Keywords: {rankingSummary.count} • Posição média:{' '}
            {rankingSummary.avgPosition ? rankingSummary.avgPosition.toFixed(1) : '—'}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Cidade</TableHead>
                  <TableHead>Distrito</TableHead>
                  <TableHead className="text-right">Posição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.slice(-50).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.keyword}</TableCell>
                    <TableCell>{r.city}</TableCell>
                    <TableCell>{r.district || '—'}</TableCell>
                    <TableCell className="text-right">{r.position ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {rankings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Sem dados ainda. Configure keywords e clique em “Atualizar agora”.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Termos de busca (GBP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            Mês de referência: {monthCtx.month}/{monthCtx.year}
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Termo</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchTerms.slice(0, 20).map((t) => (
                  <TableRow key={t.term}>
                    <TableCell>{t.term}</TableCell>
                    <TableCell className="text-right">{t.impressions}</TableCell>
                  </TableRow>
                ))}
                {searchTerms.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground">
                      Sem termos disponíveis ainda (dependente da integração GBP).
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


