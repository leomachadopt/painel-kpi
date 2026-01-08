import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { AccountsPayableEntry } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Loader2, CreditCard, Edit2, Trash2, CheckCircle2, XCircle, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import useAuthStore from '@/stores/useAuthStore'
import useDataStore from '@/stores/useDataStore'
import { Checkbox } from '@/components/ui/checkbox'
import { ViewAccountsPayableDialog } from '@/components/accounts-payable/ViewAccountsPayableDialog'

export default function AccountsPayable() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { user } = useAuthStore()
  const { canView, canEdit } = usePermissions()
  const { accountsPayableEntries, updateAccountsPayableEntry, deleteAccountsPayableEntry } = useDataStore()
  const canViewAccountsPayable = canView('canViewAccountsPayable') || canEdit('canEditAccountsPayable')
  const canEditAccountsPayable = canEdit('canEditAccountsPayable')
  const [entries, setEntries] = useState<AccountsPayableEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [viewEntryId, setViewEntryId] = useState<string | null>(null)

  useEffect(() => {
    if (clinicId) {
      loadEntries()
    }
  }, [clinicId])

  const loadEntries = async () => {
    if (!clinicId) return

    setLoading(true)
    try {
      const data = await dailyEntriesApi.accountsPayable.getAll(clinicId)
      setEntries(data)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar contas a pagar')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (entry: AccountsPayableEntry) => {
    if (entry.paid) {
      return { label: 'Paga', variant: 'default' as const, color: 'bg-green-500' }
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueDate = new Date(entry.dueDate)
    dueDate.setHours(0, 0, 0, 0)
    const diffDays = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { label: 'Vencida', variant: 'destructive' as const, color: 'bg-purple-500' }
    } else if (diffDays === 0) {
      return { label: 'Vence Hoje', variant: 'destructive' as const, color: 'bg-red-500' }
    } else if (diffDays <= 7) {
      return { label: 'Vence em ' + diffDays + ' dias', variant: 'secondary' as const, color: 'bg-yellow-500' }
    } else {
      return { label: 'Pendente', variant: 'outline' as const, color: 'bg-gray-500' }
    }
  }

  const filteredEntries = entries.filter((entry) => {
    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        entry.description?.toLowerCase().includes(term) ||
        entry.supplierName?.toLowerCase().includes(term) ||
        entry.category?.toLowerCase().includes(term)
      if (!matchesSearch) return false
    }

    // Filter by status
    if (statusFilter === 'paid') {
      if (!entry.paid) return false
    } else if (statusFilter === 'overdue') {
      if (entry.paid) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(entry.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      if (dueDate >= today) return false
    } else if (statusFilter === 'today') {
      if (entry.paid) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const dueDate = new Date(entry.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      if (dueDate.getTime() !== today.getTime()) return false
    } else if (statusFilter === 'week') {
      if (entry.paid) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      const dueDate = new Date(entry.dueDate)
      dueDate.setHours(0, 0, 0, 0)
      if (dueDate < today || dueDate > nextWeek) return false
    } else if (statusFilter === 'pending') {
      if (entry.paid) return false
    }

    return true
  })

  const handleDelete = async () => {
    if (!deleteEntryId || !clinicId) return

    setDeleting(true)
    try {
      await deleteAccountsPayableEntry(clinicId, deleteEntryId)
      setDeleteEntryId(null)
      loadEntries()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir conta a pagar')
    } finally {
      setDeleting(false)
    }
  }

  const handleMarkAsPaid = async (entry: AccountsPayableEntry) => {
    if (!clinicId) return

    setMarkingPaidId(entry.id)
    try {
      await updateAccountsPayableEntry(clinicId, entry.id, {
        ...entry,
        paid: true,
        paidDate: new Date().toISOString().split('T')[0],
      })
      loadEntries()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao marcar como paga')
    } finally {
      setMarkingPaidId(null)
    }
  }

  const handleMarkAsUnpaid = async (entry: AccountsPayableEntry) => {
    if (!clinicId) return

    setMarkingPaidId(entry.id)
    try {
      await updateAccountsPayableEntry(clinicId, entry.id, {
        ...entry,
        paid: false,
        paidDate: null,
      })
      loadEntries()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao marcar como não paga')
    } finally {
      setMarkingPaidId(null)
    }
  }

  if (!clinicId) {
    return <div className="p-8">Clínica não encontrada</div>
  }

  if (!canViewAccountsPayable) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para visualizar contas a pagar
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contas a Pagar</h1>
          <p className="text-muted-foreground">
            Gerencie as contas a pagar da clínica
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Contas a Pagar</CardTitle>
          <CardDescription>
            {filteredEntries.length} conta{filteredEntries.length !== 1 ? 's' : ''} encontrada{filteredEntries.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por descrição, fornecedor ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="overdue">Vencidas</SelectItem>
                  <SelectItem value="today">Vence Hoje</SelectItem>
                  <SelectItem value="week">Próximos 7 dias</SelectItem>
                  <SelectItem value="paid">Pagas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma conta a pagar encontrada</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => {
                    const status = getStatusBadge(entry)
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {entry.description}
                        </TableCell>
                        <TableCell>{entry.supplierName || '-'}</TableCell>
                        <TableCell>{entry.category || '-'}</TableCell>
                        <TableCell className="font-medium">
                          {new Intl.NumberFormat('pt-PT', {
                            style: 'currency',
                            currency: 'EUR',
                          }).format(entry.amount)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(entry.dueDate), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className={status.color + ' text-white'}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewEntryId(entry.id)}
                              title="Visualizar Detalhes"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEditAccountsPayable && (
                              <>
                                {!entry.paid ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkAsPaid(entry)}
                                    disabled={markingPaidId === entry.id}
                                    className="text-green-600"
                                  >
                                    {markingPaidId === entry.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Marcar como Paga
                                      </>
                                    )}
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleMarkAsUnpaid(entry)}
                                    disabled={markingPaidId === entry.id}
                                    className="text-orange-600"
                                  >
                                    {markingPaidId === entry.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Marcar como Não Paga
                                      </>
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteEntryId(entry.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteEntryId !== null} onOpenChange={(open) => !open && setDeleteEntryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta conta a pagar? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ViewAccountsPayableDialog
        open={viewEntryId !== null}
        onOpenChange={(open) => !open && setViewEntryId(null)}
        entryId={viewEntryId}
        clinicId={clinicId || ''}
      />
    </div>
  )
}

