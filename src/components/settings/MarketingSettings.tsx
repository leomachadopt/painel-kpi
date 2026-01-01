import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Loader2, Plus, Trash2, Link2, Unlink, ChevronRight } from 'lucide-react'
import { marketingApi } from '@/services/api'
import type { ClinicIntegration, ClinicKeyword } from '@/lib/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function getIntegration(integrations: ClinicIntegration[], provider: ClinicIntegration['provider']) {
  return integrations.find((i) => i.provider === provider)
}

type MetaPageAsset = { pageId: string; name: string; igBusinessId?: string | null }
type GbpLocation = {
  accountId: string
  locationId: string
  title?: string
  storeCode?: string
  address?: string
}

export function MarketingSettings({
  clinicId,
  canManage,
}: {
  clinicId: string
  canManage: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [integrations, setIntegrations] = useState<ClinicIntegration[]>([])
  const [keywords, setKeywords] = useState<ClinicKeyword[]>([])
  const [metaAssets, setMetaAssets] = useState<MetaPageAsset[]>([])
  const [gbpLocations, setGbpLocations] = useState<GbpLocation[]>([])
  const [metaSelectedKey, setMetaSelectedKey] = useState<string>('')
  const [gbpSelectedKey, setGbpSelectedKey] = useState<string>('')

  const [metaForm, setMetaForm] = useState({
    igBusinessId: '',
    facebookPageId: '',
    accessToken: '',
  })
  const [gbpForm, setGbpForm] = useState({
    locationId: '',
    refreshToken: '',
  })
  const [rankTrackerEnabled, setRankTrackerEnabled] = useState(false)

  const [newKeyword, setNewKeyword] = useState({ keyword: '', city: '', district: '' })

  const activeKeywordCount = useMemo(
    () => keywords.filter((k) => k.active).length,
    [keywords],
  )
  const metaStatus = useMemo(
    () => getIntegration(integrations, 'META')?.status || 'DISCONNECTED',
    [integrations],
  )
  const gbpStatus = useMemo(
    () => getIntegration(integrations, 'GBP')?.status || 'DISCONNECTED',
    [integrations],
  )
  const rankStatus = useMemo(
    () => getIntegration(integrations, 'RANK_TRACKER')?.status || 'DISCONNECTED',
    [integrations],
  )

  const requireManage = () => {
    if (canManage) return true
    toast.error('Apenas o gestor da clínica pode gerir integrações e keywords.')
    return false
  }

  const load = async () => {
    setLoading(true)
    try {
      const [ints, kws] = await Promise.all([
        marketingApi.integrations.getAll(clinicId),
        marketingApi.keywords.list(clinicId),
      ])
      setIntegrations(ints)
      setKeywords(kws)

      const meta = getIntegration(ints, 'META')
      const gbp = getIntegration(ints, 'GBP')
      const rt = getIntegration(ints, 'RANK_TRACKER')

      setMetaForm({
        igBusinessId: meta?.metadata?.igBusinessId || '',
        facebookPageId: meta?.metadata?.facebookPageId || '',
        accessToken: '',
      })
      setGbpForm({
        locationId: gbp?.externalLocationId || '',
        refreshToken: '',
      })
      setRankTrackerEnabled(rt?.status === 'CONNECTED')

       // Load assets if connected (best-effort)
      if (meta?.status === 'CONNECTED') {
        try {
          const assets = await marketingApi.meta.assets(clinicId)
          setMetaAssets(assets.pages || [])
          const selectedKey =
            meta?.metadata?.facebookPageId && meta?.metadata?.igBusinessId
              ? `${meta.metadata.facebookPageId}::${meta.metadata.igBusinessId}`
              : ''
          setMetaSelectedKey(selectedKey)
        } catch {
          // ignore
        }
      } else {
        setMetaAssets([])
        setMetaSelectedKey('')
      }

      if (gbp?.status === 'CONNECTED') {
        try {
          const locs = await marketingApi.gbp.locations(clinicId)
          setGbpLocations(locs.locations || [])
          const selected =
            gbp?.externalLocationId && gbp?.metadata?.accountId
              ? `${gbp.metadata.accountId}::${gbp.externalLocationId}`
              : ''
          setGbpSelectedKey(selected)
        } catch {
          // ignore
        }
      } else {
        setGbpLocations([])
        setGbpSelectedKey('')
      }
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao carregar integrações')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId])

  // Handle oauth result messages from callback redirects
  useEffect(() => {
    const url = new URL(window.location.href)
    const oauth = url.searchParams.get('oauth')
    const result = url.searchParams.get('result')
    if (!oauth || !result) return

    const msg = url.searchParams.get('message')
    const needsSelection = url.searchParams.get('needsSelection')

    if (result === 'success') {
      toast.success(
        oauth === 'meta'
          ? `Meta conectado${needsSelection === '1' ? ' — selecione a Página/Instagram abaixo' : ''}`
          : 'Google conectado — selecione a Location abaixo',
      )
      load()
    } else {
      toast.error(msg || 'Falha na integração')
    }

    url.searchParams.delete('oauth')
    url.searchParams.delete('result')
    url.searchParams.delete('message')
    url.searchParams.delete('needsSelection')
    window.history.replaceState({}, '', url.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectMeta = () => {
    if (!requireManage()) return
    const returnTo = `${window.location.origin}/configuracoes`
    marketingApi.oauth
      .metaUrl(clinicId, returnTo)
      .then(({ url }) => {
        window.location.href = url
      })
      .catch((e: any) => {
        toast.error(e?.message || 'Erro ao iniciar OAuth da Meta')
      })
  }

  const connectGoogle = () => {
    if (!requireManage()) return
    const returnTo = `${window.location.origin}/configuracoes`
    marketingApi.oauth
      .googleUrl(clinicId, returnTo)
      .then(({ url }) => {
        window.location.href = url
      })
      .catch((e: any) => {
        toast.error(e?.message || 'Erro ao iniciar OAuth do Google')
      })
  }

  const disconnect = async (provider: string) => {
    if (!requireManage()) return
    setLoading(true)
    try {
      await marketingApi.integrations.disconnect(clinicId, provider)
      toast.success('Integração desconectada')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao desconectar')
    } finally {
      setLoading(false)
    }
  }

  const saveMetaSelection = async () => {
    if (!requireManage()) return
    if (!metaSelectedKey) return
    const [facebookPageId, igBusinessId] = metaSelectedKey.split('::')
    setLoading(true)
    try {
      await marketingApi.meta.select(clinicId, { facebookPageId, igBusinessId })
      toast.success('Página/Instagram selecionados')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar seleção Meta')
    } finally {
      setLoading(false)
    }
  }

  const saveGbpSelection = async () => {
    if (!requireManage()) return
    if (!gbpSelectedKey) return
    const [accountId, locationId] = gbpSelectedKey.split('::')
    setLoading(true)
    try {
      await marketingApi.gbp.selectLocation(clinicId, { accountId, locationId })
      toast.success('Location selecionada')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar Location')
    } finally {
      setLoading(false)
    }
  }

  const saveMeta = async () => {
    if (!requireManage()) return
    setLoading(true)
    try {
      await marketingApi.integrations.updateMeta(clinicId, {
        igBusinessId: metaForm.igBusinessId || null,
        facebookPageId: metaForm.facebookPageId || null,
        accessToken: metaForm.accessToken || null,
        status: 'CONNECTED',
      })
      toast.success('Integração Meta guardada')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao guardar integração Meta')
    } finally {
      setLoading(false)
    }
  }

  const saveGbp = async () => {
    if (!requireManage()) return
    setLoading(true)
    try {
      await marketingApi.integrations.updateGbp(clinicId, {
        locationId: gbpForm.locationId || null,
        refreshToken: gbpForm.refreshToken || null,
        status: 'CONNECTED',
      })
      toast.success('Integração Google Business Profile guardada')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao guardar integração GBP')
    } finally {
      setLoading(false)
    }
  }

  const saveRankTracker = async () => {
    if (!requireManage()) return
    setLoading(true)
    try {
      await marketingApi.integrations.updateRankTracker(clinicId, {
        status: rankTrackerEnabled ? 'CONNECTED' : 'DISCONNECTED',
        provider: 'DATAFORSEO',
      })
      toast.success('Configuração de Rank Tracker guardada')
      await load()
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao guardar Rank Tracker')
    } finally {
      setLoading(false)
    }
  }

  const addKeyword = async () => {
    if (!requireManage()) return
    if (!newKeyword.keyword || !newKeyword.city) return
    setLoading(true)
    try {
      const created = await marketingApi.keywords.create(clinicId, newKeyword)
      setKeywords((prev) => [created, ...prev])
      setNewKeyword({ keyword: '', city: '', district: '' })
      toast.success('Keyword adicionada')
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao adicionar keyword')
    } finally {
      setLoading(false)
    }
  }

  const toggleKeyword = async (k: ClinicKeyword) => {
    if (!requireManage()) return
    setLoading(true)
    try {
      const updated = await marketingApi.keywords.update(clinicId, k.id, { active: !k.active })
      setKeywords((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao atualizar keyword')
    } finally {
      setLoading(false)
    }
  }

  const deleteKeyword = async (k: ClinicKeyword) => {
    if (!requireManage()) return
    setLoading(true)
    try {
      await marketingApi.keywords.delete(clinicId, k.id)
      setKeywords((prev) => prev.filter((x) => x.id !== k.id))
      toast.success('Keyword removida')
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao remover keyword')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {!canManage && (
        <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          Esta área é <span className="font-medium text-foreground">somente leitura</span>. Apenas o gestor da clínica
          pode conectar/desconectar contas e editar keywords.
        </div>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Instagram / Facebook (Meta)</CardTitle>
          <CardDescription>
            Requer conta Business/Creator vinculada a uma Página. Aqui você pode guardar os IDs e tokens
            (em produção, o ideal é via OAuth).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">Status: {metaStatus}</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Conecte via Meta para listar automaticamente as Páginas e o Instagram Business.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={connectMeta} disabled={loading || !canManage} className="gap-2">
                <Link2 className="h-4 w-4" />
                Conectar
              </Button>
              <Button
                variant="outline"
                onClick={() => disconnect('META')}
                disabled={loading || metaStatus === 'DISCONNECTED' || !canManage}
                className="gap-2"
              >
                <Unlink className="h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </div>

          {metaAssets.length > 0 && (
            <div className="space-y-2">
              <Label>Selecionar Página + Instagram</Label>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Select value={metaSelectedKey} onValueChange={setMetaSelectedKey}>
                  <SelectTrigger className="md:flex-1">
                    <SelectValue placeholder="Escolha uma Página com Instagram Business" />
                  </SelectTrigger>
                  <SelectContent>
                    {metaAssets
                      .filter((p) => p.igBusinessId)
                      .map((p) => (
                        <SelectItem key={`${p.pageId}::${p.igBusinessId}`} value={`${p.pageId}::${p.igBusinessId}`}>
                          {p.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button onClick={saveMetaSelection} disabled={loading || !metaSelectedKey || !canManage} className="gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Guardar seleção
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Se a sua Página não aparecer, verifique se o Instagram está vinculado e se concedeu as permissões no login.
              </div>
            </div>
          )}

          <details className="rounded-md border p-3" open={false}>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Modo avançado (IDs/tokens manual)
            </summary>
            <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Instagram Business ID</Label>
              <Input value={metaForm.igBusinessId} onChange={(e) => setMetaForm({ ...metaForm, igBusinessId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Facebook Page ID</Label>
              <Input value={metaForm.facebookPageId} onChange={(e) => setMetaForm({ ...metaForm, facebookPageId: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Access Token (opcional no MVP)</Label>
            <Input
              type="password"
              placeholder="cole aqui um token de longa duração"
              value={metaForm.accessToken}
              onChange={(e) => setMetaForm({ ...metaForm, accessToken: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveMeta} disabled={loading || !canManage} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Meta
            </Button>
          </div>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Business Profile</CardTitle>
          <CardDescription>1 location por clínica. Em produção, use OAuth + refresh token.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">Status: {gbpStatus}</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-muted-foreground">
              Conecte via Google para listar automaticamente as locations disponíveis.
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={connectGoogle} disabled={loading || !canManage} className="gap-2">
                <Link2 className="h-4 w-4" />
                Conectar
              </Button>
              <Button
                variant="outline"
                onClick={() => disconnect('GBP')}
                disabled={loading || gbpStatus === 'DISCONNECTED' || !canManage}
                className="gap-2"
              >
                <Unlink className="h-4 w-4" />
                Desconectar
              </Button>
            </div>
          </div>

          {gbpLocations.length > 0 && (
            <div className="space-y-2">
              <Label>Selecionar Location</Label>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Select value={gbpSelectedKey} onValueChange={setGbpSelectedKey}>
                  <SelectTrigger className="md:flex-1">
                    <SelectValue placeholder="Escolha uma location" />
                  </SelectTrigger>
                  <SelectContent>
                    {gbpLocations.map((l) => (
                      <SelectItem key={`${l.accountId}::${l.locationId}`} value={`${l.accountId}::${l.locationId}`}>
                        {(l.title || l.storeCode || l.locationId) + (l.address ? ` — ${l.address}` : '')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={saveGbpSelection} disabled={loading || !gbpSelectedKey || !canManage} className="gap-2">
                  <ChevronRight className="h-4 w-4" />
                  Guardar seleção
                </Button>
              </div>
            </div>
          )}

          <details className="rounded-md border p-3" open={false}>
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Modo avançado (Location/refresh token manual)
            </summary>
            <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Location ID</Label>
              <Input value={gbpForm.locationId} onChange={(e) => setGbpForm({ ...gbpForm, locationId: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Refresh Token (opcional no MVP)</Label>
              <Input
                type="password"
                value={gbpForm.refreshToken}
                onChange={(e) => setGbpForm({ ...gbpForm, refreshToken: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveGbp} disabled={loading || !canManage} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar GBP
            </Button>
          </div>
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rank tracking (Google Maps)</CardTitle>
          <CardDescription>
            Rastreamento por keyword e cidade/distrito via provedor externo (ex.: DataForSEO). As credenciais ficam no backend via env.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">Status: {rankStatus}</div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <div className="font-medium">Ativar rank tracking</div>
              <div className="text-sm text-muted-foreground">Recomendado para até 10 keywords por clínica.</div>
            </div>
            <Switch checked={rankTrackerEnabled} onCheckedChange={setRankTrackerEnabled} disabled={!canManage} />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveRankTracker} disabled={loading || !canManage} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Rank Tracker
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Keywords (máx. 10 ativas)</CardTitle>
          <CardDescription>
            Configure até 10 keywords por clínica, por cidade e (opcionalmente) distrito.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">Ativas: {activeKeywordCount}/10</div>

          <div className="grid gap-2 md:grid-cols-4">
            <Input placeholder="Keyword" value={newKeyword.keyword} onChange={(e) => setNewKeyword({ ...newKeyword, keyword: e.target.value })} disabled={!canManage} />
            <Input placeholder="Cidade" value={newKeyword.city} onChange={(e) => setNewKeyword({ ...newKeyword, city: e.target.value })} disabled={!canManage} />
            <Input placeholder="Distrito (opcional)" value={newKeyword.district} onChange={(e) => setNewKeyword({ ...newKeyword, district: e.target.value })} disabled={!canManage} />
            <Button onClick={addKeyword} disabled={loading || !newKeyword.keyword || !newKeyword.city || !canManage} className="gap-2">
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>

          <div className="space-y-2">
            {keywords.map((k) => (
              <div key={k.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{k.keyword}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {k.city}
                    {k.district ? ` • ${k.district}` : ''}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Ativa</span>
                    <Switch checked={k.active} onCheckedChange={() => toggleKeyword(k)} disabled={!canManage} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteKeyword(k)} disabled={loading || !canManage}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            {keywords.length === 0 && (
              <div className="text-sm text-muted-foreground">Nenhuma keyword configurada.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


