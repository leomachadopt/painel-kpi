import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Plus, Filter, MessageSquare, Lock, LockOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ticketsApi } from '@/services/api'
import { toast } from 'sonner'
import useAuthStore from '@/stores/useAuthStore'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'

export default function Tickets() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [tickets, setTickets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'all',
    assignedTo: 'all',
  })
  const [openCreateDialog, setOpenCreateDialog] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [collaborators, setCollaborators] = useState<any[]>([])

  // Form state for creating ticket
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    assignedTo: 'none',
    assignedToMultiple: [] as string[],
  })

  useEffect(() => {
    if (clinicId) {
      loadTickets()
      loadCollaborators()
    }
  }, [clinicId, filters])

  const loadCollaborators = async () => {
    if (!clinicId) return
    try {
      // Usar a nova API que retorna todos os usuários da clínica (incluindo gestores)
      const result = await ticketsApi.getUsers(clinicId)
      setCollaborators(result.users)
    } catch (error) {
      console.error('Error loading users:', error)
      // Fallback: incluir apenas o próprio usuário
      if (user) {
        setCollaborators([{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }])
      }
    }
  }

  const loadTickets = async () => {
    if (!clinicId) return
    try {
      setLoading(true)
      // Converter "all" para string vazia para a API
      const filtersToSend = {
        status: filters.status === 'all' ? '' : filters.status,
        assignedTo: filters.assignedTo === 'all' ? '' : filters.assignedTo,
      }
      const result = await ticketsApi.list(clinicId, filtersToSend)
      setTickets(result.tickets)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar tickets')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTicket = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!clinicId) return

    setSubmitting(true)
    try {
      await ticketsApi.create(clinicId, {
        title: createForm.title,
        description: createForm.description || undefined,
        assignedToMultiple: createForm.assignedToMultiple.length > 0 ? createForm.assignedToMultiple : undefined,
      })

      toast.success('Ticket criado com sucesso')
      setOpenCreateDialog(false)
      setCreateForm({
        title: '',
        description: '',
        assignedTo: 'none',
        assignedToMultiple: [],
      })
      loadTickets()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar ticket')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleAssignee = (collabId: string) => {
    setCreateForm((prev) => {
      const isSelected = prev.assignedToMultiple.includes(collabId)
      return {
        ...prev,
        assignedToMultiple: isSelected
          ? prev.assignedToMultiple.filter((id) => id !== collabId)
          : [...prev.assignedToMultiple, collabId],
      }
    })
  }

  const handleTicketClick = (ticket: any) => {
    navigate(`/tickets/${clinicId}/${ticket.id}`)
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Fechado'
      case 'IN_PROGRESS':
        return 'Em Andamento'
      case 'CANCELLED':
        return 'Cancelado'
      default:
        return 'Aberto'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-gray-500 text-white'
      case 'IN_PROGRESS':
        return 'bg-blue-500 text-white'
      case 'CANCELLED':
        return 'bg-red-500 text-white'
      default:
        return 'bg-green-500 text-white'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tickets Internos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie tarefas e solicitações entre colaboradores e gestores
          </p>
        </div>
        <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Novo Ticket</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={createForm.title}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder="Ex: Atualizar sistema de agendamento"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Descreva a tarefa ou solicitação..."
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label>Atribuir a (pode selecionar múltiplos)</Label>
                <div className="border rounded-lg p-4 max-h-60 overflow-y-auto space-y-2">
                  {collaborators.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum colaborador disponível</p>
                  ) : (
                    collaborators.map((collab) => (
                      <div key={collab.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`assignee-${collab.id}`}
                          checked={createForm.assignedToMultiple.includes(collab.id)}
                          onCheckedChange={() => handleToggleAssignee(collab.id)}
                        />
                        <Label
                          htmlFor={`assignee-${collab.id}`}
                          className="text-sm font-normal cursor-pointer flex items-center gap-2 flex-1"
                        >
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={collab.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {collab.name?.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {collab.name}
                          {collab.role === 'GESTOR_CLINICA' && (
                            <Badge variant="outline" className="text-xs">Gestor</Badge>
                          )}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
                {createForm.assignedToMultiple.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {createForm.assignedToMultiple.length} colaborador{createForm.assignedToMultiple.length > 1 ? 'es' : ''} selecionado{createForm.assignedToMultiple.length > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Criando...' : 'Criar Ticket'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="PENDING">Aberto</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                  <SelectItem value="COMPLETED">Fechado</SelectItem>
                  <SelectItem value="CANCELLED">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Atribuído a</Label>
              <Select value={filters.assignedTo} onValueChange={(value) => setFilters({ ...filters, assignedTo: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {collaborators.map((collab) => (
                    <SelectItem key={collab.id} value={collab.id}>
                      {collab.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => setFilters({ status: 'all', assignedTo: 'all' })}
                className="w-full"
              >
                <Filter className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Tickets */}
      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Carregando...
            </CardContent>
          </Card>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum ticket encontrado
            </CardContent>
          </Card>
        ) : (
          tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleTicketClick(ticket)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {ticket.status === 'COMPLETED' ? (
                      <Lock className="h-5 w-5 text-gray-500 mt-1" />
                    ) : (
                      <LockOpen className="h-5 w-5 text-green-500 mt-1" />
                    )}
                    <div className="flex-1">
                      <CardTitle className="text-lg">{ticket.title}</CardTitle>
                      {ticket.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {ticket.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(ticket.status)}>
                    {getStatusLabel(ticket.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={ticket.created_by_avatar} />
                        <AvatarFallback className="text-xs">
                          {ticket.created_by_name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        <span className="font-medium">De:</span> {ticket.created_by_name}
                      </span>
                    </div>
                    {ticket.assignees && Array.isArray(ticket.assignees) && ticket.assignees.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">Para:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {ticket.assignees.map((assignee: any) => (
                            <div key={assignee.id} className="flex items-center gap-1">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={assignee.avatar_url} />
                                <AvatarFallback className="text-xs">
                                  {assignee.name?.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span>{assignee.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : ticket.assigned_to_name ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={ticket.assigned_to_avatar} />
                          <AvatarFallback className="text-xs">
                            {ticket.assigned_to_name?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          <span className="font-medium">Para:</span> {ticket.assigned_to_name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground italic">Sem atribuição</span>
                    )}
                    {ticket.comments_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {ticket.comments_count} comentário{ticket.comments_count > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <span>
                    {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
