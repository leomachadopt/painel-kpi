import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Lock, LockOpen, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ticketsApi } from '@/services/api'
import { toast } from 'sonner'
import useAuthStore from '@/stores/useAuthStore'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export default function TicketDetail() {
  const { clinicId, ticketId } = useParams<{ clinicId: string; ticketId: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [ticket, setTicket] = useState<any>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTicketId, setDeleteTicketId] = useState<string | null>(null)

  useEffect(() => {
    if (ticketId && clinicId) {
      loadTicket()
      loadComments()
    }
  }, [ticketId, clinicId])

  const loadTicket = async () => {
    if (!ticketId) return
    try {
      setLoading(true)
      const result = await ticketsApi.getById(ticketId)
      setTicket(result.ticket)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao carregar ticket')
      if (clinicId) {
        navigate(`/tickets/${clinicId}`)
      }
    } finally {
      setLoading(false)
    }
  }

  const loadComments = async () => {
    if (!ticketId) return
    try {
      const result = await ticketsApi.getComments(ticketId)
      setComments(result.comments)
    } catch (error: any) {
      console.error('Erro ao carregar comentários:', error)
    }
  }

  const handleAddComment = async () => {
    if (!ticketId || !newComment.trim()) return

    setSubmitting(true)
    try {
      await ticketsApi.addComment(ticketId, newComment)
      toast.success('Comentário adicionado')
      setNewComment('')
      loadComments()
      loadTicket() // Atualizar ticket para pegar contagem de comentários
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar comentário')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!ticketId) return
    try {
      await ticketsApi.update(ticketId, { status: newStatus })
      const statusLabels: Record<string, string> = {
        'PENDING': 'Ticket reaberto',
        'IN_PROGRESS': 'Ticket marcado como em andamento',
        'COMPLETED': 'Ticket fechado',
        'CANCELLED': 'Ticket cancelado',
      }
      toast.success(statusLabels[newStatus] || 'Status atualizado')
      loadTicket()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status')
    }
  }

  const handleDeleteTicket = async () => {
    if (!deleteTicketId || !clinicId) return

    setSubmitting(true)
    try {
      await ticketsApi.delete(deleteTicketId)
      toast.success('Ticket deletado com sucesso')
      navigate(`/tickets/${clinicId}`)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao deletar ticket')
    } finally {
      setSubmitting(false)
      setDeleteTicketId(null)
    }
  }

  const canDeleteTicket = () => {
    if (!user || !ticket) return false
    if (user.role === 'GESTOR_CLINICA' || user.role === 'MENTOR') return true
    return ticket.created_by === user.id
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">Ticket não encontrado</div>
      </div>
    )
  }

  const isClosed = ticket.status === 'COMPLETED'
  const allMessages = [
    {
      id: ticket.id,
      type: 'ticket',
      user: {
        id: ticket.created_by,
        name: ticket.created_by_name,
        avatar: ticket.created_by_avatar,
      },
      content: ticket.description || ticket.title,
      createdAt: ticket.created_at,
    },
    ...comments.map((comment) => ({
      id: comment.id,
      type: 'comment',
      user: {
        id: comment.user_id,
        name: comment.user_name,
        avatar: comment.user_avatar,
      },
      content: comment.comment,
      createdAt: comment.created_at,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/tickets/${clinicId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{ticket.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={isClosed ? 'secondary' : 'default'}>
                {getStatusLabel(ticket.status)}
              </Badge>
              {ticket.assignees && Array.isArray(ticket.assignees) && ticket.assignees.length > 0 ? (
                ticket.assignees.map((assignee: any) => (
                  <Badge key={assignee.id} variant="outline">
                    <User className="h-3 w-3 mr-1" />
                    {assignee.name}
                  </Badge>
                ))
              ) : ticket.assigned_to_name ? (
                <Badge variant="outline">
                  <User className="h-3 w-3 mr-1" />
                  {ticket.assigned_to_name}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium">De:</span>
                <Avatar className="h-5 w-5">
                  <AvatarImage src={ticket.created_by_avatar} />
                  <AvatarFallback className="text-xs">
                    {ticket.created_by_name?.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{ticket.created_by_name}</span>
              </div>
              {ticket.assignees && Array.isArray(ticket.assignees) && ticket.assignees.length > 0 ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">Para:</span>
                  {ticket.assignees.map((assignee: any) => (
                    <div key={assignee.id} className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={assignee.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {assignee.name?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span>{assignee.name}</span>
                    </div>
                  ))}
                </div>
              ) : ticket.assigned_to_name ? (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Para:</span>
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={ticket.assigned_to_avatar} />
                    <AvatarFallback className="text-xs">
                      {ticket.assigned_to_name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span>{ticket.assigned_to_name}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="status-select" className="text-sm text-muted-foreground">
              Status:
            </Label>
            <Select
              value={ticket.status}
              onValueChange={handleStatusChange}
              disabled={submitting}
            >
              <SelectTrigger id="status-select" className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Aberto</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                <SelectItem value="COMPLETED">Fechado</SelectItem>
                <SelectItem value="CANCELLED">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {canDeleteTicket() && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteTicketId(ticket.id)}
              className="text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Conversa */}
      <Card className="mb-4">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-300px)] p-6">
            <div className="space-y-4">
              {allMessages.map((message) => {
                const isCurrentUser = message.user.id === user?.id
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={message.user.avatar} />
                      <AvatarFallback>
                        {message.user.name?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`flex-1 ${isCurrentUser ? 'flex flex-col items-end' : ''}`}>
                      <div
                        className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">{message.user.name}</div>
                        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                      </div>
                      <div className={`text-xs text-muted-foreground mt-1 ${isCurrentUser ? 'text-right' : ''}`}>
                        {format(new Date(message.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Input de comentário */}
      {ticket.status !== 'CANCELLED' && ticket.status !== 'COMPLETED' && (
        <div className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleAddComment()
              }
            }}
          />
          <Button onClick={handleAddComment} disabled={!newComment.trim() || submitting}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteTicketId} onOpenChange={(open) => !open && setDeleteTicketId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este ticket? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTicket} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

