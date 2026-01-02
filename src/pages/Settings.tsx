import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import useDataStore from '@/stores/useDataStore'
import useAuthStore from '@/stores/useAuthStore'
import { Trash2, Plus, Save, Edit2, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { configApi, clinicsApi } from '@/services/api'
import { MarketingSettings } from '@/components/settings/MarketingSettings'
import { MONTHS } from '@/lib/types'

export default function Settings() {
  const { user } = useAuthStore()
  const { clinics, updateClinicConfig, getMonthlyTargets, updateMonthlyTargets } = useDataStore()

  // Helper to auto-select input content on focus for better UX
  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  const [selectedClinicId, setSelectedClinicId] = useState(
    user?.clinicId || clinics[0]?.id || '',
  )

  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString()
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  )

  const clinic = clinics.find((c) => c.id === selectedClinicId)
  
  // Memoize monthlyTargets to prevent infinite loops
  const monthlyTargets = useMemo(() => {
    if (!clinic) return null
    return getMonthlyTargets(
      clinic.id,
      parseInt(selectedMonth),
      parseInt(selectedYear)
    )
  }, [clinic?.id, selectedMonth, selectedYear, getMonthlyTargets])

  // Permission control: Only GESTOR can manage operational configs
  const canManageConfig = user?.role === 'GESTOR_CLINICA' && user.clinicId === clinic?.id
  // Both MENTOR and GESTOR can edit targets
  const canEditTargets = user?.role === 'MENTOR' || (user?.role === 'GESTOR_CLINICA' && user.clinicId === clinic?.id)

  const [config, setConfig] = useState(clinic?.configuration)
  const [targets, setTargets] = useState(() => monthlyTargets || {
    targetRevenue: 0,
    targetAlignersRange: { min: 0, max: 0 },
    targetAvgTicket: 0,
    targetAcceptanceRate: 0,
    targetOccupancyRate: 0,
    targetNPS: 0,
    targetIntegrationRate: 0,
    targetAttendanceRate: 0,
    targetFollowUpRate: 0,
    targetWaitTime: 0,
    targetComplaints: 0,
    targetLeadsRange: { min: 0, max: 0 },
    targetRevenuePerCabinet: 0,
    targetPlansPresented: { adults: 0, kids: 0 },
    targetAgendaDistribution: {
      operational: 0,
      planning: 0,
      sales: 0,
      leadership: 0,
    },
  })
  const [saving, setSaving] = useState(false)

  // Sync config state when clinic changes
  useEffect(() => {
    if (clinic?.configuration) {
      setConfig(clinic.configuration)
    }
  }, [clinic])

  // Sync targets when month/year/clinic changes
  useEffect(() => {
    if (monthlyTargets) {
      // Only update if the id changed (different month/year/clinic) to prevent infinite loops
      setTargets((prev) => {
        // If prev doesn't have an id or ids are different, update
        if (!prev.id || prev.id !== monthlyTargets.id) {
          return monthlyTargets
        }
        return prev
      })
    }
  }, [monthlyTargets])

  if (!clinic || !config) return <div className="p-8">Carregando...</div>

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      await configApi.update(clinic.id, config)
      await updateClinicConfig(clinic.id, config)
      toast.success('Configurações guardadas com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao guardar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveTargets = async () => {
    if (!clinic) return
    setSaving(true)
    try {
      await updateMonthlyTargets({
        id: `${clinic.id}-${selectedYear}-${selectedMonth}`,
        clinicId: clinic.id,
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        ...targets,
      })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao guardar metas')
    } finally {
      setSaving(false)
    }
  }

  const ListEditor = ({
    title,
    items,
    onUpdate,
    readOnly = false,
  }: {
    title: string
    items: { id: string; name: string; standardHours?: number }[]
    onUpdate: (items: any[]) => void
    readOnly?: boolean
  }) => {
    const [newItem, setNewItem] = useState('')
    const [newHours, setNewHours] = useState('8')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editName, setEditName] = useState('')
    const [editHours, setEditHours] = useState('')

    const add = () => {
      if (!newItem) return
      const entry: any = { id: Math.random().toString(36), name: newItem }
      if (title === 'Gabinetes') entry.standardHours = parseFloat(newHours)
      onUpdate([...items, entry])
      setNewItem('')
      setNewHours('8')
    }

    const remove = (id: string) => {
      onUpdate(items.filter((i) => i.id !== id))
    }

    const startEdit = (item: any) => {
      setEditingId(item.id)
      setEditName(item.name)
      setEditHours(item.standardHours?.toString() || '8')
    }

    const saveEdit = (id: string) => {
      const updated = items.map((item) => {
        if (item.id === id) {
          const updatedItem: any = { ...item, name: editName }
          if (title === 'Gabinetes') {
            updatedItem.standardHours = parseFloat(editHours)
          }
          return updatedItem
        }
        return item
      })
      onUpdate(updated)
      setEditingId(null)
    }

    const cancelEdit = () => {
      setEditingId(null)
      setEditName('')
      setEditHours('')
    }

    return (
      <div className="space-y-4">
        {!readOnly && (
          <div className="flex gap-2">
            <Input
              placeholder={`Novo ${title}`}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            {title === 'Gabinetes' && (
              <Input
                type="number"
                placeholder="Horas"
                className="w-24"
                value={newHours}
                onChange={(e) => setNewHours(e.target.value)}
              />
            )}
            <Button onClick={add} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2 border rounded bg-background"
            >
              {editingId === item.id ? (
                <>
                  <div className="flex gap-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(item.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                    {title === 'Gabinetes' && (
                      <Input
                        type="number"
                        className="w-24"
                        value={editHours}
                        onChange={(e) => setEditHours(e.target.value)}
                      />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => saveEdit(item.id)}
                    >
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={cancelEdit}
                    >
                      <X className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex gap-2">
                    <span>{item.name}</span>
                    {item.standardHours && (
                      <span className="text-muted-foreground text-sm">
                        ({item.standardHours}h)
                      </span>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(item)}
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 p-8 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
          <p className="text-muted-foreground">
            Gerir as listas, campanhas e parâmetros da clínica.
          </p>
          {user?.role === 'MENTOR' && clinics.length > 0 && (
            <div className="mt-3 max-w-xs">
              <Select value={selectedClinicId} onValueChange={setSelectedClinicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar clínica" />
                </SelectTrigger>
                <SelectContent>
                  {clinics.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {canManageConfig && (
          <Button onClick={handleSaveConfig} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Configurações
          </Button>
        )}
      </div>

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Fontes & Campanhas</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="cabinets">Gabinetes</TabsTrigger>
          <TabsTrigger value="doctors">Médicos</TabsTrigger>
          <TabsTrigger value="targets">Metas</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fontes de Aquisição</CardTitle>
              <CardDescription>
                Canais por onde os pacientes chegam.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Fonte"
                items={config.sources}
                onUpdate={(items) => setConfig({ ...config, sources: items })}
                readOnly={!canManageConfig}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Campanhas de Marketing</CardTitle>
              <CardDescription>
                Campanhas ativas no Google/Meta Ads.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Campanha"
                items={config.campaigns || []}
                onUpdate={(items) => setConfig({ ...config, campaigns: items })}
                readOnly={!canManageConfig}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Categorias Financeiras</CardTitle>
              <CardDescription>
                Defina as categorias de receita.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Categoria"
                items={config.categories}
                onUpdate={(items) =>
                  setConfig({ ...config, categories: items })
                }
                readOnly={!canManageConfig}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cabinets">
          <Card>
            <CardHeader>
              <CardTitle>Gabinetes</CardTitle>
              <CardDescription>
                Gerir os gabinetes e horas disponíveis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Gabinetes"
                items={config.cabinets}
                onUpdate={(items) => setConfig({ ...config, cabinets: items })}
                readOnly={!canManageConfig}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="doctors">
          <Card>
            <CardHeader>
              <CardTitle>Corpo Clínico</CardTitle>
              <CardDescription>
                Lista de médicos para registo de tempo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Médico"
                items={config.doctors}
                onUpdate={(items) => setConfig({ ...config, doctors: items })}
                readOnly={!canManageConfig}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="targets" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Metas Mensais</CardTitle>
                  <CardDescription>
                    Defina as metas mensais da clínica
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select
                    value={selectedMonth}
                    onValueChange={setSelectedMonth}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedYear}
                    onValueChange={setSelectedYear}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Ano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!canEditTargets && (
                <p className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  Apenas o mentor ou gestor da clínica podem editar as metas.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Faturação Mensal (€)</Label>
                  <Input
                    type="number"
                    value={targets.targetRevenue || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetRevenue: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>NPS</Label>
                  <Input
                    type="number"
                    value={targets.targetNPS || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetNPS: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Alinhadores (Min)</Label>
                  <Input
                    type="number"
                    value={targets.targetAlignersRange.min || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetAlignersRange: {
                          ...targets.targetAlignersRange,
                          min: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Alinhadores (Max)</Label>
                  <Input
                    type="number"
                    value={targets.targetAlignersRange.max || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetAlignersRange: {
                          ...targets.targetAlignersRange,
                          max: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Ticket Médio (€)</Label>
                  <Input
                    type="number"
                    value={targets.targetAvgTicket || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetAvgTicket: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Taxa de Aceitação (%)</Label>
                  <Input
                    type="number"
                    value={targets.targetAcceptanceRate || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetAcceptanceRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Taxa de Ocupação (%)</Label>
                  <Input
                    type="number"
                    value={targets.targetOccupancyRate || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetOccupancyRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Faturação por Gabinete (€)</Label>
                  <Input
                    type="number"
                    value={targets.targetRevenuePerCabinet || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetRevenuePerCabinet: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Leads (Min)</Label>
                  <Input
                    type="number"
                    value={targets.targetLeadsRange.min || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetLeadsRange: {
                          ...targets.targetLeadsRange,
                          min: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Leads (Max)</Label>
                  <Input
                    type="number"
                    value={targets.targetLeadsRange.max || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetLeadsRange: {
                          ...targets.targetLeadsRange,
                          max: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Planos Adultos</Label>
                  <Input
                    type="number"
                    value={targets.targetPlansPresented.adults || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetPlansPresented: {
                          ...targets.targetPlansPresented,
                          adults: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Planos Crianças</Label>
                  <Input
                    type="number"
                    value={targets.targetPlansPresented.kids || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetPlansPresented: {
                          ...targets.targetPlansPresented,
                          kids: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tempo de Espera (min)</Label>
                  <Input
                    type="number"
                    value={targets.targetWaitTime || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetWaitTime: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reclamações (max)</Label>
                  <Input
                    type="number"
                    value={targets.targetComplaints || ''}
                    onFocus={handleNumberFocus}
                    onChange={(e) =>
                      setTargets({
                        ...targets,
                        targetComplaints: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                    disabled={!canEditTargets}
                  />
                </div>
              </div>

              {canEditTargets && (
                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSaveTargets} disabled={saving}>
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Guardar Metas
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Integrações e SEO</CardTitle>
              <CardDescription>
                Configure Instagram/Facebook, Google Business Profile e keywords (cidade/distrito).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarketingSettings
                clinicId={clinic.id}
                canManage={user?.role === 'GESTOR_CLINICA' && user.clinicId === clinic.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
