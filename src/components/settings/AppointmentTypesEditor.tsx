import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, Edit2, Check, X } from 'lucide-react'
import { toast } from 'sonner'

interface AppointmentType {
  id: string
  name: string
  durationMinutes: number
  color: string
  isActive: boolean
}

interface AppointmentTypesEditorProps {
  clinicId: string
  readOnly?: boolean
}

export function AppointmentTypesEditor({ clinicId, readOnly = false }: AppointmentTypesEditorProps) {
  const [types, setTypes] = useState<AppointmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', durationMinutes: 30, color: '#3B82F6' })
  const [newForm, setNewForm] = useState({ name: '', durationMinutes: 30, color: '#3B82F6' })
  const [showNewForm, setShowNewForm] = useState(false)

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

  const createType = async () => {
    if (!newForm.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    try {
      const response = await fetch(`/api/appointments/${clinicId}/types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
        body: JSON.stringify({
          name: newForm.name,
          durationMinutes: newForm.durationMinutes,
          color: newForm.color,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao criar tipo de consulta')
      }

      toast.success('Tipo de consulta criado')
      setNewForm({ name: '', durationMinutes: 30, color: '#3B82F6' })
      setShowNewForm(false)
      loadTypes()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const updateType = async (id: string) => {
    if (!editForm.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    try {
      const response = await fetch(`/api/appointments/${clinicId}/types/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
        body: JSON.stringify({
          name: editForm.name,
          durationMinutes: editForm.durationMinutes,
          color: editForm.color,
        }),
      })

      if (!response.ok) {
        throw new Error('Erro ao atualizar tipo de consulta')
      }

      toast.success('Tipo de consulta atualizado')
      setEditingId(null)
      loadTypes()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const deleteType = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este tipo de consulta?')) {
      return
    }

    try {
      const response = await fetch(`/api/appointments/${clinicId}/types/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('kpi_token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir tipo de consulta')
      }

      toast.success('Tipo de consulta excluído')
      loadTypes()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  const startEdit = (type: AppointmentType) => {
    setEditingId(type.id)
    setEditForm({
      name: type.name,
      durationMinutes: type.durationMinutes,
      color: type.color,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ name: '', durationMinutes: 30, color: '#3B82F6' })
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-4">
      {/* List of existing types */}
      <div className="space-y-2">
        {types.map((type) => (
          <div key={type.id} className="flex items-center gap-2 p-3 border rounded-lg">
            {editingId === type.id ? (
              // Edit mode
              <>
                <input
                  type="color"
                  value={editForm.color}
                  onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                  disabled={readOnly}
                />
                <div className="flex-1 space-y-2">
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nome do tipo"
                    disabled={readOnly}
                  />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Duração:</Label>
                    <Input
                      type="number"
                      value={editForm.durationMinutes}
                      onChange={(e) => setEditForm({ ...editForm, durationMinutes: parseInt(e.target.value) || 30 })}
                      className="w-20"
                      min="5"
                      step="5"
                      disabled={readOnly}
                    />
                    <span className="text-xs text-muted-foreground">minutos</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => updateType(type.id)}
                    disabled={readOnly}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              // View mode
              <>
                <div
                  className="w-10 h-10 rounded flex-shrink-0"
                  style={{ backgroundColor: type.color }}
                />
                <div className="flex-1">
                  <div className="font-medium">{type.name}</div>
                  <div className="text-sm text-muted-foreground">{type.durationMinutes} minutos</div>
                </div>
                {!readOnly && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => startEdit(type)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteType(type.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {types.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Nenhum tipo de consulta configurado
          </div>
        )}
      </div>

      {/* Add new type */}
      {!readOnly && (
        <div>
          {showNewForm ? (
            <div className="border rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newForm.color}
                  onChange={(e) => setNewForm({ ...newForm, color: e.target.value })}
                  className="w-10 h-10 rounded cursor-pointer"
                />
                <div className="flex-1">
                  <Input
                    value={newForm.name}
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    placeholder="Nome do tipo (ex: Avaliação)"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">Duração:</Label>
                <Input
                  type="number"
                  value={newForm.durationMinutes}
                  onChange={(e) => setNewForm({ ...newForm, durationMinutes: parseInt(e.target.value) || 30 })}
                  className="w-24"
                  min="5"
                  step="5"
                />
                <span className="text-sm text-muted-foreground">minutos</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={createType} size="sm">
                  <Check className="h-4 w-4 mr-1" />
                  Criar
                </Button>
                <Button onClick={() => setShowNewForm(false)} size="sm" variant="outline">
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setShowNewForm(true)} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Tipo de Consulta
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
