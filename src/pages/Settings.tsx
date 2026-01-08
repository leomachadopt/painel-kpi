import { useState, useEffect, useMemo, useRef } from 'react'
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
import { Trash2, Plus, Save, Edit2, Check, X, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { configApi, clinicsApi } from '@/services/api'
import { MarketingSettings } from '@/components/settings/MarketingSettings'
import { ProcedureBaseEditor } from '@/components/settings/ProcedureBaseEditor'
import { MONTHS } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { OrderItem } from '@/lib/types'

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
    const item = items.find((i) => i.id === id)
    // Protect hard-coded "Referência" source from deletion
    if (item?.name === 'Referência' && title === 'Fonte') {
      toast.error('A fonte "Referência" não pode ser excluída')
      return
    }
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

  const moveUp = (index: number) => {
    if (index === 0) return
    const newItems = [...items]
    const temp = newItems[index]
    newItems[index] = newItems[index - 1]
    newItems[index - 1] = temp
    onUpdate(newItems)
  }

  const moveDown = (index: number) => {
    if (index === items.length - 1) return
    const newItems = [...items]
    const temp = newItems[index]
    newItems[index] = newItems[index + 1]
    newItems[index + 1] = temp
    onUpdate(newItems)
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
        {items.map((item, index) => (
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
                      onClick={() => moveUp(index)}
                      disabled={index === 0 || (item.name === 'Referência' && title === 'Fonte')}
                      title="Mover para cima"
                    >
                      <ArrowUp className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveDown(index)}
                      disabled={index === items.length - 1 || (item.name === 'Referência' && title === 'Fonte')}
                      title="Mover para baixo"
                    >
                      <ArrowDown className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(item)}
                      disabled={item.name === 'Referência' && title === 'Fonte'}
                      title={item.name === 'Referência' && title === 'Fonte' ? 'Fonte protegida' : 'Editar'}
                    >
                      <Edit2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(item.id)}
                      disabled={item.name === 'Referência' && title === 'Fonte'}
                      title={item.name === 'Referência' && title === 'Fonte' ? 'Fonte protegida' : 'Excluir'}
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

// Componente específico para gerenciar Order Items via API
const OrderItemsEditor = ({
  clinicId,
  items,
  onUpdate,
  readOnly = false,
}: {
  clinicId: string
  items: OrderItem[]
  onUpdate: (items: OrderItem[]) => void
  readOnly?: boolean
}) => {
  const [newItem, setNewItem] = useState('')
  const [newUnit, setNewUnit] = useState('unidade')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editUnit, setEditUnit] = useState('unidade')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const add = async () => {
    if (!newItem.trim() || !clinicId) return

    setSaving(true)
    try {
      const newOrderItem = await dailyEntriesApi.orderItem.create(clinicId, {
        name: newItem.trim(),
        unit: newUnit.trim() || 'unidade',
      })
      onUpdate([...items, newOrderItem])
      setNewItem('')
      setNewUnit('unidade')
      toast.success('Item criado com sucesso!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar item')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!clinicId) return

    setDeleting(id)
    try {
      await dailyEntriesApi.orderItem.delete(clinicId, id)
      onUpdate(items.filter((i) => i.id !== id))
      toast.success('Item excluído com sucesso!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir item')
    } finally {
      setDeleting(null)
    }
  }

  const startEdit = (item: OrderItem) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditUnit(item.unit || 'unidade')
    setEditDescription(item.description || '')
  }

  const saveEdit = async (id: string) => {
    if (!clinicId) return

    setSaving(true)
    try {
      const updated = await dailyEntriesApi.orderItem.update(clinicId, id, {
        name: editName.trim(),
        unit: editUnit.trim() || 'unidade',
        description: editDescription.trim() || null,
      })
      onUpdate(items.map((item) => (item.id === id ? updated : item)))
      setEditingId(null)
      setEditName('')
      setEditUnit('unidade')
      setEditDescription('')
      toast.success('Item atualizado com sucesso!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar item')
    } finally {
      setSaving(false)
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditUnit('unidade')
    setEditDescription('')
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <div className="flex gap-2">
          <Input
            placeholder="Nome do item"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            className="flex-1"
          />
          <Input
            placeholder="Unidade (ex: unidade, caixa, kg)"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            className="w-40"
          />
          <Button onClick={add} size="icon" disabled={saving || !newItem.trim()}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-4">
            Nenhum item cadastrado. Adicione um novo item acima.
          </p>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 border rounded bg-background"
            >
              {editingId === item.id ? (
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nome do item"
                      className="flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit(item.id)
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      autoFocus
                    />
                    <Input
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      placeholder="Unidade"
                      className="w-32"
                    />
                  </div>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Descrição (opcional)"
                  />
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => saveEdit(item.id)}
                      disabled={saving}
                    >
                      <Check className="h-4 w-4 text-green-600 mr-1" />
                      Guardar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEdit}
                      disabled={saving}
                    >
                      <X className="h-4 w-4 text-muted-foreground mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex flex-col">
                    <span className="font-medium">{item.name}</span>
                    {item.unit && (
                      <span className="text-sm text-muted-foreground">
                        Unidade: {item.unit}
                      </span>
                    )}
                    {item.description && (
                      <span className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </span>
                    )}
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => startEdit(item)}
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(item.id)}
                        disabled={deleting === item.id}
                        title="Excluir"
                      >
                        {deleting === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-destructive" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const { user } = useAuthStore()
  const { clinics, updateClinicConfig, getMonthlyTargets, loadMonthlyTargets, updateMonthlyTargets } = useDataStore()

  // Helper to auto-select input content on focus for better UX
  const handleNumberFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select()
  }

  const [selectedClinicId, setSelectedClinicId] = useState<string>('')

  const [selectedMonth, setSelectedMonth] = useState<string>(
    (new Date().getMonth() + 1).toString()
  )
  const [selectedYear, setSelectedYear] = useState<string>(
    new Date().getFullYear().toString()
  )

  // Auto-select clinic when user or clinics become available
  useEffect(() => {
    // Only update if not already set and we have data
    if ((!selectedClinicId || selectedClinicId === '') && clinics.length > 0) {
      const targetClinicId = user?.clinicId || clinics[0]?.id
      if (targetClinicId) {
        setSelectedClinicId(targetClinicId)
      }
    }
  }, [user?.clinicId, clinics.length])

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

  // Permission control: MENTOR can manage all clinics, GESTOR can only manage their own
  const canManageConfig = user?.role === 'MENTOR' || (user?.role === 'GESTOR_CLINICA' && user.clinicId === clinic?.id)
  // Both MENTOR and GESTOR can edit targets
  const canEditTargets = user?.role === 'MENTOR' || (user?.role === 'GESTOR_CLINICA' && user.clinicId === clinic?.id)

  const [config, setConfig] = useState<any>(null)
  const [npsQuestion, setNpsQuestion] = useState('')
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
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)

  // Track the last synced targets to detect when API data arrives
  const lastSyncedTargetsRef = useRef<any>(null)

  // Sync config state when clinic changes
  useEffect(() => {
    if (!clinic) return

    if (clinic.configuration) {
      // Ensure paymentSources and alignerBrands exist
      const config = {
        ...clinic.configuration,
        paymentSources: clinic.configuration.paymentSources || [],
        alignerBrands: clinic.configuration.alignerBrands || [],
      }
      setConfig(config)
    }
    if (clinic.npsQuestion !== undefined) {
      setNpsQuestion(clinic.npsQuestion)
    } else {
      setNpsQuestion('Gostaríamos de saber o quanto você recomendaria nossa clínica para um amigo ou familiar?')
    }
  }, [clinic?.id])

  // Load order items when clinic changes
  useEffect(() => {
    if (clinic?.id) {
      loadOrderItems()
    }
  }, [clinic?.id])

  const loadOrderItems = async () => {
    if (!clinic?.id) return
    setLoadingItems(true)
    try {
      const data = await dailyEntriesApi.orderItem.getAll(clinic.id)
      setOrderItems(data)
    } catch (error) {
      console.error('Failed to load order items:', error)
    } finally {
      setLoadingItems(false)
    }
  }

  const handleSaveOrderItems = async () => {
    if (!clinic?.id) return
    // Os itens são salvos individualmente via API quando editados
    // Esta função pode ser usada para validação ou outras ações
    await loadOrderItems()
  }

  // Load targets from database when clinic/month/year changes
  useEffect(() => {
    if (clinic?.id) {
      loadMonthlyTargets(clinic.id, parseInt(selectedMonth), parseInt(selectedYear))
    }
  }, [clinic?.id, selectedMonth, selectedYear, loadMonthlyTargets])

  // Sync targets when monthlyTargets changes from the store
  // This happens after loadMonthlyTargets completes or when switching month/year/clinic
  useEffect(() => {
    if (monthlyTargets) {
      // Check if this is actually new data (different from last synced)
      const isDifferent = JSON.stringify(lastSyncedTargetsRef.current) !== JSON.stringify(monthlyTargets)

      if (isDifferent) {
        setTargets(monthlyTargets)
        lastSyncedTargetsRef.current = monthlyTargets
      }
    }
  }, [monthlyTargets])

  if (!clinic || !config) return <div className="p-8">Carregando...</div>

  const handleSaveConfig = async () => {
    setSaving(true)
    try {
      await configApi.update(clinic.id, config)
      // Recarregar a clínica completa do banco para garantir dados atualizados
      const updatedClinic = await clinicsApi.getById(clinic.id)
      await updateClinicConfig(clinic.id, updatedClinic.configuration)
      // Atualizar o estado local também
      setConfig(updatedClinic.configuration)
      toast.success('Configurações guardadas com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao guardar configurações')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveNPSQuestion = async () => {
    if (!clinic) return
    setSaving(true)
    try {
      await clinicsApi.update(clinic.id, { npsQuestion })
      toast.success('Pergunta de NPS atualizada com sucesso!')
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar pergunta de NPS')
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
          <TabsTrigger value="paymentSources">Fontes de Recebimento</TabsTrigger>
          <TabsTrigger value="alignerBrands">Marcas de Alinhadores</TabsTrigger>
          <TabsTrigger value="orderItems">Itens</TabsTrigger>
          <TabsTrigger value="cabinets">Gabinetes</TabsTrigger>
          <TabsTrigger value="doctors">Médicos</TabsTrigger>
          <TabsTrigger value="targets">Metas</TabsTrigger>
          <TabsTrigger value="nps">NPS</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
          <TabsTrigger value="procedureBase">Tabela Base de Procedimentos</TabsTrigger>
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

        <TabsContent value="paymentSources">
          <Card>
            <CardHeader>
              <CardTitle>Fontes de Recebimento</CardTitle>
              <CardDescription>
                Defina os métodos de pagamento (CGD, Santander, Cartões BPI, Numerário, etc.).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Fonte de Recebimento"
                items={config.paymentSources || []}
                onUpdate={(items) =>
                  setConfig({ ...config, paymentSources: items })
                }
                readOnly={!canManageConfig}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alignerBrands">
          <Card>
            <CardHeader>
              <CardTitle>Marcas de Alinhadores</CardTitle>
              <CardDescription>
                Defina as marcas de alinhadores disponíveis (Invisalign, ClearCorrect, Spark, etc.).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title="Marca de Alinhador"
                items={config.alignerBrands || []}
                onUpdate={(items) =>
                  setConfig({ ...config, alignerBrands: items })
                }
                readOnly={!canManageConfig}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orderItems">
          <Card>
            <CardHeader>
              <CardTitle>Itens de Pedido</CardTitle>
              <CardDescription>
                Gerir os itens que podem ser solicitados nos pedidos aos fornecedores.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingItems ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <OrderItemsEditor
                  clinicId={clinic.id}
                  items={orderItems}
                  onUpdate={setOrderItems}
                  readOnly={!canManageConfig}
                />
              )}
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

        <TabsContent value="nps" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pergunta de NPS</CardTitle>
              <CardDescription>
                Personalize a pergunta que os pacientes verão ao avaliar sua clínica.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="npsQuestion">Pergunta personalizada</Label>
                <Input
                  id="npsQuestion"
                  value={npsQuestion}
                  onChange={(e) => setNpsQuestion(e.target.value)}
                  placeholder="Gostaríamos de saber o quanto você recomendaria nossa clínica..."
                  disabled={!canManageConfig}
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground">
                  {npsQuestion.length}/200 caracteres
                </p>
                <p className="text-sm text-muted-foreground">
                  Esta pergunta aparecerá no topo da página de avaliação NPS enviada aos pacientes.
                </p>
              </div>

              {canManageConfig && (
                <Button onClick={handleSaveNPSQuestion} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar Pergunta
                </Button>
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

        <TabsContent value="procedureBase" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tabela Base de Procedimentos</CardTitle>
              <CardDescription>
                Tabela padrão global de procedimentos. Define quais procedimentos são Periciáveis ou Não Periciáveis.
                Apenas mentores podem gerenciar esta tabela.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {user?.role === 'MENTOR' && clinic ? (
                <ProcedureBaseEditor clinicId={clinic.id} readOnly={false} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Apenas mentores podem gerenciar a tabela base de procedimentos.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
