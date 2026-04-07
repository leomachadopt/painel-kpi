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
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from '@/hooks/useTranslation'
import { Trash2, Plus, Save, Edit2, Check, X, Loader2, ArrowUp, ArrowDown, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { configApi, clinicsApi } from '@/services/api'
import { MarketingSettings } from '@/components/settings/MarketingSettings'
import { FirstConsultationTypesSettings } from '@/components/settings/FirstConsultationTypesSettings'
import { LanguageSettings } from '@/components/settings/LanguageSettings'
import { AppointmentTypesEditor } from '@/components/settings/AppointmentTypesEditor'
import { ClinicScheduleEditor } from '@/components/settings/ClinicScheduleEditor'
import { MONTHS } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { OrderItem } from '@/lib/types'

const DoctorsListEditor = ({
  items,
  onUpdate,
  readOnly = false,
}: {
  items: { id: string; name: string; email?: string; whatsapp?: string }[]
  onUpdate: (items: any[]) => void
  readOnly?: boolean
}) => {
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newWhatsapp, setNewWhatsapp] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editWhatsapp, setEditWhatsapp] = useState('')

  const add = () => {
    if (!newName) return
    const entry: any = {
      id: Math.random().toString(36),
      name: newName,
      email: newEmail || null,
      whatsapp: newWhatsapp || null,
    }
    onUpdate([...items, entry])
    setNewName('')
    setNewEmail('')
    setNewWhatsapp('')
  }

  const remove = (id: string) => {
    onUpdate(items.filter((i) => i.id !== id))
  }

  const startEdit = (item: any) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditEmail(item.email || '')
    setEditWhatsapp(item.whatsapp || '')
  }

  const saveEdit = (id: string) => {
    const updated = items.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          name: editName,
          email: editEmail || null,
          whatsapp: editWhatsapp || null,
        }
      }
      return item
    })
    onUpdate(updated)
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditEmail('')
    setEditWhatsapp('')
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
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              placeholder="Nome do médico *"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <Input
              placeholder="Email (opcional)"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
            />
            <div className="flex gap-2">
              <Input
                placeholder="WhatsApp (ex: +351 912 345 678)"
                value={newWhatsapp}
                onChange={(e) => setNewWhatsapp(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && add()}
              />
              <Button onClick={add} size="icon">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="flex items-center gap-2 p-3 border rounded bg-background"
          >
            {editingId === item.id ? (
              <>
                <div className="flex flex-col md:flex-row gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit(item.id)
                      if (e.key === 'Escape') cancelEdit()
                    }}
                    placeholder="Nome"
                    autoFocus
                  />
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="Email"
                  />
                  <Input
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(e.target.value)}
                    placeholder="WhatsApp"
                  />
                </div>
                <div className="flex gap-1 flex-shrink-0">
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
                <div className="flex flex-col flex-1 min-w-0">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    {item.email && <div>📧 {item.email}</div>}
                    {item.whatsapp && <div>📱 {item.whatsapp}</div>}
                  </div>
                </div>
                {!readOnly && (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => moveDown(index)}
                      disabled={index === items.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => startEdit(item)}
                    >
                      <Edit2 className="h-4 w-4" />
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
  const { t } = useTranslation()
  const [newItem, setNewItem] = useState('')
  const [newHours, setNewHours] = useState('8')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editHours, setEditHours] = useState('')

  const add = () => {
    if (!newItem) return
    const entry: any = { id: Math.random().toString(36), name: newItem }
    if (title === t('cabinet.title')) entry.standardHours = parseFloat(newHours)
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
        if (title === t('cabinet.title')) {
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

const AppointmentTypesEditor = ({
  clinicId,
  readOnly = false,
}: {
  clinicId: string
  readOnly?: boolean
}) => {
  const [types, setTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newDuration, setNewDuration] = useState('30')
  const [newColor, setNewColor] = useState('#1D9E75')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDuration, setEditDuration] = useState('')
  const [editColor, setEditColor] = useState('')

  const colors = [
    '#1D9E75', // Verde (padrão)
    '#3B82F6', // Azul
    '#EF4444', // Vermelho
    '#F59E0B', // Laranja
    '#8B5CF6', // Roxo
    '#EC4899', // Rosa
  ]

  useEffect(() => {
    loadTypes()
  }, [clinicId])

  const loadTypes = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/appointments/${clinicId}/types`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })
      const data = await response.json()
      setTypes(data.types || [])
    } catch (error) {
      console.error('Error loading appointment types:', error)
      toast.error('Erro ao carregar tipos de consulta')
    } finally {
      setLoading(false)
    }
  }

  const add = async () => {
    if (!newName || !newDuration) return

    try {
      const response = await fetch(`/api/appointments/${clinicId}/types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
        body: JSON.stringify({
          name: newName,
          durationMinutes: parseInt(newDuration),
          color: newColor,
        }),
      })

      if (!response.ok) throw new Error('Failed to create type')

      toast.success('Tipo de consulta criado')
      setNewName('')
      setNewDuration('30')
      setNewColor('#1D9E75')
      loadTypes()
    } catch (error) {
      console.error('Error creating type:', error)
      toast.error('Erro ao criar tipo de consulta')
    }
  }

  const remove = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${clinicId}/types/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })

      if (!response.ok) throw new Error('Failed to delete type')

      toast.success('Tipo de consulta removido')
      loadTypes()
    } catch (error) {
      console.error('Error deleting type:', error)
      toast.error('Erro ao remover tipo de consulta')
    }
  }

  const startEdit = (item: any) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditDuration(item.durationMinutes.toString())
    setEditColor(item.color)
  }

  const saveEdit = async (id: string) => {
    try {
      const response = await fetch(`/api/appointments/${clinicId}/types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
        body: JSON.stringify({
          name: editName,
          durationMinutes: parseInt(editDuration),
          color: editColor,
        }),
      })

      if (!response.ok) throw new Error('Failed to update type')

      toast.success('Tipo de consulta atualizado')
      setEditingId(null)
      loadTypes()
    } catch (error) {
      console.error('Error updating type:', error)
      toast.error('Erro ao atualizar tipo de consulta')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditName('')
    setEditDuration('')
    setEditColor('')
  }

  if (loading) {
    return <div className="text-center py-4">Carregando...</div>
  }

  return (
    <div className="space-y-4">
      {/* Add new type */}
      {!readOnly && (
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label>Nome</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ex: 1ª Consulta"
            />
          </div>
          <div className="w-32">
            <Label>Duração (min)</Label>
            <Input
              type="number"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              placeholder="30"
            />
          </div>
          <div className="w-24">
            <Label>Cor</Label>
            <div className="flex gap-1">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setNewColor(color)}
                  className={`w-6 h-6 rounded border-2 ${
                    newColor === color ? 'border-gray-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <Button onClick={add} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
      )}

      {/* List of types */}
      <div className="space-y-2">
        {types.map((type) => (
          <div
            key={type.id}
            className="flex items-center gap-2 p-2 border rounded"
          >
            {editingId === type.id ? (
              <>
                <div className="flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    value={editDuration}
                    onChange={(e) => setEditDuration(e.target.value)}
                  />
                </div>
                <div className="w-24 flex gap-1">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditColor(color)}
                      className={`w-6 h-6 rounded border-2 ${
                        editColor === color ? 'border-gray-900' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <Button
                  onClick={() => saveEdit(type.id)}
                  size="sm"
                  variant="ghost"
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button onClick={cancelEdit} size="sm" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: type.color }}
                />
                <div className="flex-1 font-medium">{type.name}</div>
                <div className="text-sm text-muted-foreground">
                  {type.durationMinutes} min
                </div>
                {!readOnly && (
                  <>
                    <Button
                      onClick={() => startEdit(type)}
                      size="sm"
                      variant="ghost"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => remove(type.id)}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        ))}

        {types.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum tipo de consulta configurado
          </p>
        )}
      </div>
    </div>
  )
}

export default function Settings() {
  const { t, locale } = useTranslation()
  const { user } = useAuthStore()
  const { canEdit } = usePermissions()
  const { clinics, reloadClinics, updateClinicConfig, getMonthlyTargets, loadMonthlyTargets, updateMonthlyTargets } = useDataStore()

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

  // Estados locais para campos Kommo (necessário para controle de inputs)
  const [kommoSubdomain, setKommoSubdomain] = useState('')
  const [kommoToken, setKommoToken] = useState('')
  const [showKommoToken, setShowKommoToken] = useState(false)
  const [kommoContactId, setKommoContactId] = useState('')
  const [ownerWhatsapp, setOwnerWhatsapp] = useState('')
  const [n8nReportTime, setN8nReportTime] = useState('08:30')
  const [n8nReportsEnabled, setN8nReportsEnabled] = useState(false)

  // Sincronizar estados locais com dados da clínica quando mudar
  useEffect(() => {
    if (clinic) {
      setKommoSubdomain(clinic.kommoSubdomain || '')
      setKommoToken('') // Nunca pré-preencher token por segurança
      setShowKommoToken(false)
      setKommoContactId(clinic.kommoContactId || '')
      setOwnerWhatsapp(clinic.ownerWhatsapp || '')
      setN8nReportTime(clinic.n8nReportTime || '08:30')
      setN8nReportsEnabled(clinic.n8nReportsEnabled || false)
    }
  }, [clinic?.id])

  // Memoize monthlyTargets to prevent infinite loops
  const monthlyTargets = useMemo(() => {
    if (!clinic) return null
    return getMonthlyTargets(
      clinic.id,
      parseInt(selectedMonth),
      parseInt(selectedYear)
    )
  }, [clinic?.id, selectedMonth, selectedYear, getMonthlyTargets])

  // Permission control: MENTOR can manage all clinics, GESTOR can only manage their own, or collaborator with permission
  const canManageConfig = user?.role === 'MENTOR' || 
    (user?.role === 'GESTOR_CLINICA' && user.clinicId === clinic?.id) ||
    canEdit('canEditClinicConfig')
  // Both MENTOR and GESTOR can edit targets, or collaborator with permission
  const canEditTargets = user?.role === 'MENTOR' || 
    (user?.role === 'GESTOR_CLINICA' && user.clinicId === clinic?.id) ||
    canEdit('canEditTargets')

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
      // Ensure paymentSources, alignerBrands, and agendaEnabled exist
      const config = {
        ...clinic.configuration,
        paymentSources: clinic.configuration.paymentSources || [],
        alignerBrands: clinic.configuration.alignerBrands || [],
        agendaEnabled: clinic.agendaEnabled || false,
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
    <div className="flex flex-col gap-8 p-8 min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div className="min-w-0 flex-1">
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
          <Button onClick={handleSaveConfig} disabled={saving} className="shrink-0">
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Guardar Configurações
          </Button>
        )}
      </div>

      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="w-full h-auto flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="sources" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Fontes & Campanhas</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Categorias</TabsTrigger>
          <TabsTrigger value="paymentSources" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Fontes de Recebimento</TabsTrigger>
          <TabsTrigger value="alignerBrands" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Marcas de Alinhadores</TabsTrigger>
          <TabsTrigger value="orderItems" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Itens</TabsTrigger>
          <TabsTrigger value="consultationTypes" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Tipos de 1ª Consulta</TabsTrigger>
          <TabsTrigger value="cabinets" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">{t('sidebar.cabinets')}</TabsTrigger>
          <TabsTrigger value="doctors" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Médicos</TabsTrigger>
          <TabsTrigger value="targets" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Metas</TabsTrigger>
          <TabsTrigger value="nps" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">NPS</TabsTrigger>
          <TabsTrigger value="marketing" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Marketing</TabsTrigger>
          <TabsTrigger value="language" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Idioma</TabsTrigger>
          <TabsTrigger value="agenda" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Agenda</TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Relatórios Automáticos</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle>Categoria de Contas</CardTitle>
              <CardDescription>
                Gerencie as categorias utilizadas em contas a pagar. As categorias são criadas automaticamente ao serem utilizadas e podem ser editadas ou excluídas aqui.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* TODO: Implementar gestão de categorias de contas a pagar */}
              <p className="text-sm text-muted-foreground">
                A gestão de categorias de contas a pagar será implementada em breve. 
                Por enquanto, as categorias são criadas automaticamente ao serem utilizadas.
              </p>
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
              <CardTitle>{t('cabinet.title')}</CardTitle>
              <CardDescription>
                {t('cabinet.manage')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ListEditor
                title={t('cabinet.title')}
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
                Lista de médicos com contactos para alertas automáticos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DoctorsListEditor
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
                  Você não tem permissão para editar as metas.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('financial.monthlyBilling')} ({locale === 'PT-BR' ? 'R$' : '€'})</Label>
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
                  <Label>{t('financial.billingPerCabinet')} ({locale === 'PT-BR' ? 'R$' : '€'})</Label>
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

        <TabsContent value="consultationTypes" className="space-y-6">
          <FirstConsultationTypesSettings clinicId={clinic.id} />
        </TabsContent>

        <TabsContent value="language" className="space-y-6">
          <LanguageSettings clinicId={clinic.id} />
        </TabsContent>

        <TabsContent value="agenda" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📅 Agenda Clínica</CardTitle>
              <CardDescription>
                Quando ativada, a agenda preenche automaticamente os módulos de Tempos, Consultórios e Controlo.
                Estes módulos desaparecerão do menu quando a agenda estiver ativa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canManageConfig ? (
                <p className="text-sm text-muted-foreground">
                  Apenas o gestor da clínica pode ativar/desativar a agenda.
                </p>
              ) : (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="agenda-enabled"
                    checked={config?.agendaEnabled || false}
                    onChange={(e) => setConfig({ ...config, agendaEnabled: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="agenda-enabled" className="font-normal">
                    Ativar Agenda Clínica
                  </Label>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tipos de Consulta</CardTitle>
              <CardDescription>
                Configure os tipos de consulta disponíveis na agenda (ex: 1ª Consulta, Tratamento, Urgência).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AppointmentTypesEditor
                clinicId={clinic.id}
                readOnly={!canManageConfig}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Horários de Funcionamento</CardTitle>
              <CardDescription>
                Configure os horários de funcionamento da clínica por dia da semana. A agenda exibirá apenas estes horários.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ClinicScheduleEditor
                clinicId={clinic.id}
                readOnly={!canManageConfig}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>📤 Relatórios Automáticos (WhatsApp via Kommo)</CardTitle>
              <CardDescription>
                Configure o envio automático de relatórios financeiros por WhatsApp ao dono da clínica.
                O n8n envia relatórios diários através do Kommo CRM.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canManageConfig ? (
                <p className="text-sm text-muted-foreground">
                  Apenas o gestor da clínica pode configurar os relatórios automáticos.
                </p>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="kommo-subdomain">Subdomínio Kommo</Label>
                    <Input
                      id="kommo-subdomain"
                      value={kommoSubdomain}
                      onChange={(e) => setKommoSubdomain(e.target.value)}
                      placeholder="ex: clinicalisboa"
                      className="max-w-md"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se acede em <strong>clinicalisboa.kommo.com</strong>, coloque <strong>clinicalisboa</strong>
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kommo-token">Long-term Token Kommo</Label>
                    <div className="flex gap-2 max-w-md">
                      <Input
                        id="kommo-token"
                        type={showKommoToken ? 'text' : 'password'}
                        value={kommoToken}
                        onChange={(e) => setKommoToken(e.target.value)}
                        placeholder={clinic.kommoTokenConfigured ? '••••••••••••••••' : 'Cole o token aqui'}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowKommoToken(!showKommoToken)}
                      >
                        {showKommoToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Kommo → Settings → Integrations → Criar integração → deixar URL/webhook vazios, preencher apenas nome (ex: "Painel KPI") e marcar "Permitir acesso: Todos" → Guardar → Keys and Scopes → copiar "Long-term token"
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kommo-contact-id">
                      Kommo Contact ID do dono
                    </Label>
                    <Input
                      id="kommo-contact-id"
                      value={kommoContactId}
                      onChange={(e) => setKommoContactId(e.target.value)}
                      placeholder="12345678"
                      className="max-w-md"
                    />
                    <p className="text-xs text-muted-foreground">
                      Encontre em: Kommo → Contacto → URL → /ID (número no final do URL)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="owner-whatsapp">
                      WhatsApp do dono (backup)
                    </Label>
                    <Input
                      id="owner-whatsapp"
                      value={ownerWhatsapp}
                      onChange={(e) => setOwnerWhatsapp(e.target.value)}
                      placeholder="+351 9XX XXX XXX"
                      className="max-w-md"
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato internacional com código de país (ex: +351 912345678)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="report-time">
                      Hora do relatório diário (Lisboa)
                    </Label>
                    <Input
                      id="report-time"
                      type="time"
                      value={n8nReportTime}
                      onChange={(e) => setN8nReportTime(e.target.value)}
                      className="max-w-md"
                    />
                    <p className="text-xs text-muted-foreground">
                      Hora em que o relatório será enviado todos os dias
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="n8n-reports-enabled"
                      checked={n8nReportsEnabled}
                      onChange={(e) => setN8nReportsEnabled(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="n8n-reports-enabled" className="cursor-pointer">
                      Activar relatórios automáticos
                    </Label>
                  </div>

                  <div className="pt-4">
                    <Button
                      onClick={async () => {
                        try {
                          await clinicsApi.update(clinic.id, {
                            ...(kommoSubdomain && { kommoSubdomain }),
                            ...(kommoToken && { kommoToken }),
                            kommoContactId,
                            ownerWhatsapp,
                            n8nReportsEnabled,
                            n8nReportTime,
                          })
                          toast.success('Configurações de notificação guardadas com sucesso')
                          // Recarregar clínicas para atualizar dados
                          await reloadClinics()
                          // Limpar token local por segurança
                          setKommoToken('')
                        } catch (error: any) {
                          toast.error(error.message || 'Erro ao guardar configurações')
                        }
                      }}
                    >
                      💾 Guardar configuração
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
