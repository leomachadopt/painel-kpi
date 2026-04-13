import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, Edit, Instagram, MessageCircle } from 'lucide-react'
import { marketingApi } from '@/services/api'

type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST'
type LeadSource = 'INSTAGRAM_DM' | 'FACEBOOK_DM' | 'WHATSAPP' | 'MANUAL'

interface Lead {
  id: string
  clinic_id: string
  source: LeadSource
  name?: string
  phone?: string
  email?: string
  message?: string
  instagram_user_id?: string
  instagram_username?: string
  conversation_id?: string
  status: LeadStatus
  assigned_to?: string
  notes?: string
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

const STATUS_COLORS: Record<LeadStatus, string> = {
  NEW: 'bg-blue-500',
  CONTACTED: 'bg-yellow-500',
  QUALIFIED: 'bg-purple-500',
  CONVERTED: 'bg-green-500',
  LOST: 'bg-gray-500',
}

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: 'Novo',
  CONTACTED: 'Contactado',
  QUALIFIED: 'Qualificado',
  CONVERTED: 'Convertido',
  LOST: 'Perdido',
}

const SOURCE_LABELS: Record<LeadSource, string> = {
  INSTAGRAM_DM: 'Instagram DM',
  FACEBOOK_DM: 'Facebook DM',
  WHATSAPP: 'WhatsApp',
  MANUAL: 'Manual',
}

export function MarketingLeadsContent({ clinicId }: { clinicId: string }) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterSource, setFilterSource] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)

  const [formData, setFormData] = useState({
    source: 'MANUAL' as LeadSource,
    name: '',
    phone: '',
    email: '',
    message: '',
    status: 'NEW' as LeadStatus,
    notes: '',
  })

  const loadLeads = async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const filters: any = {}
      if (filterStatus) filters.status = filterStatus
      if (filterSource) filters.source = filterSource
      const data = await marketingApi.leads.list(clinicId, filters)
      setLeads(data)
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao carregar leads')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLeads()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, filterStatus, filterSource])

  const handleCreateLead = async () => {
    if (!clinicId) return
    if (!formData.source) {
      toast.error('Selecione a fonte do lead')
      return
    }

    setLoading(true)
    try {
      await marketingApi.leads.create(clinicId, formData)
      toast.success('Lead criado com sucesso')
      setDialogOpen(false)
      resetForm()
      loadLeads()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar lead')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateLead = async () => {
    if (!clinicId || !editingLead) return

    setLoading(true)
    try {
      await marketingApi.leads.update(clinicId, editingLead.id, formData)
      toast.success('Lead atualizado com sucesso')
      setDialogOpen(false)
      setEditingLead(null)
      resetForm()
      loadLeads()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar lead')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!clinicId) return
    if (!confirm('Tem certeza que deseja excluir este lead?')) return

    setLoading(true)
    try {
      await marketingApi.leads.delete(clinicId, leadId)
      toast.success('Lead excluído com sucesso')
      loadLeads()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir lead')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      source: 'MANUAL',
      name: '',
      phone: '',
      email: '',
      message: '',
      status: 'NEW',
      notes: '',
    })
  }

  const openEditDialog = (lead: Lead) => {
    setEditingLead(lead)
    setFormData({
      source: lead.source,
      name: lead.name || '',
      phone: lead.phone || '',
      email: lead.email || '',
      message: lead.message || '',
      status: lead.status,
      notes: lead.notes || '',
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingLead(null)
    resetForm()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold tracking-tight">Leads de Marketing</h3>
          <p className="text-muted-foreground text-sm">
            Gerencie leads vindos do Instagram, Facebook e WhatsApp
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingLead(null); }} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingLead ? 'Editar Lead' : 'Novo Lead'}</DialogTitle>
              <DialogDescription>
                {editingLead ? 'Atualize as informações do lead' : 'Adicione um novo lead manualmente'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fonte</Label>
                  <Select
                    value={formData.source}
                    onValueChange={(value) => setFormData({ ...formData, source: value as LeadSource })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INSTAGRAM_DM">Instagram DM</SelectItem>
                      <SelectItem value="FACEBOOK_DM">Facebook DM</SelectItem>
                      <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                      <SelectItem value="MANUAL">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as LeadStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEW">Novo</SelectItem>
                      <SelectItem value="CONTACTED">Contactado</SelectItem>
                      <SelectItem value="QUALIFIED">Qualificado</SelectItem>
                      <SelectItem value="CONVERTED">Convertido</SelectItem>
                      <SelectItem value="LOST">Perdido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do lead"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+351 xxx xxx xxx"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Mensagem inicial do lead..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Notas</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas internas sobre o lead..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>
                Cancelar
              </Button>
              <Button
                onClick={editingLead ? handleUpdateLead : handleCreateLead}
                disabled={loading}
                className="gap-2"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingLead ? 'Atualizar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label>Status</Label>
            <Select value={filterStatus || undefined} onValueChange={(value) => setFilterStatus(value === 'ALL' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos</SelectItem>
                <SelectItem value="NEW">Novo</SelectItem>
                <SelectItem value="CONTACTED">Contactado</SelectItem>
                <SelectItem value="QUALIFIED">Qualificado</SelectItem>
                <SelectItem value="CONVERTED">Convertido</SelectItem>
                <SelectItem value="LOST">Perdido</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Fonte</Label>
            <Select value={filterSource || undefined} onValueChange={(value) => setFilterSource(value === 'ALL' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as fontes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                <SelectItem value="INSTAGRAM_DM">Instagram DM</SelectItem>
                <SelectItem value="FACEBOOK_DM">Facebook DM</SelectItem>
                <SelectItem value="WHATSAPP">WhatsApp</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista de Leads ({leads.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lead encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lead.source === 'INSTAGRAM_DM' && <Instagram className="h-4 w-4 text-pink-500" />}
                        {lead.source === 'WHATSAPP' && <MessageCircle className="h-4 w-4 text-green-500" />}
                        <span className="text-sm">{SOURCE_LABELS[lead.source]}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{lead.name || '—'}</TableCell>
                    <TableCell className="text-sm">
                      {lead.phone && <div>{lead.phone}</div>}
                      {lead.email && <div className="text-muted-foreground">{lead.email}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[lead.status]}>
                        {STATUS_LABELS[lead.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(lead.created_at).toLocaleDateString('pt-PT')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(lead)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
