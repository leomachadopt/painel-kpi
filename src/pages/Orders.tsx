import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { DailyOrderEntry } from '@/lib/types'
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
import { Search, Loader2, Package, Eye, Edit2, Trash2, CheckCircle2 } from 'lucide-react'
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
import { ViewOrderDialog } from '@/components/orders/ViewOrderDialog'
import { EditOrderDialog } from '@/components/orders/EditOrderDialog'
import { toast } from 'sonner'
import { usePermissions } from '@/hooks/usePermissions'
import useAuthStore from '@/stores/useAuthStore'

export default function Orders() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { user } = useAuthStore()
  const { canView, canEdit } = usePermissions()
  const canViewOrders = canView('canViewOrders') || canEdit('canEditOrders')
  const canEditOrders = canEdit('canEditOrders')
  const isGestor = user?.role === 'GESTOR_CLINICA'
  const [orders, setOrders] = useState<DailyOrderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [viewOrderId, setViewOrderId] = useState<string | null>(null)
  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (clinicId) {
      loadSuppliers()
      loadOrders()
    }
  }, [clinicId, selectedSupplier, startDate, endDate])

  const loadSuppliers = async () => {
    if (!clinicId) return
    try {
      const data = await dailyEntriesApi.supplier.getAll(clinicId)
      setSuppliers(data)
    } catch (err) {
      console.error('Error loading suppliers:', err)
    }
  }

  const loadOrders = async () => {
    if (!clinicId) return

    setLoading(true)
    setError(null)
    try {
      const params: any = {}
      if (selectedSupplier !== 'all') {
        params.supplierId = selectedSupplier
      }
      if (startDate) {
        params.startDate = startDate
      }
      if (endDate) {
        params.endDate = endDate
      }
      const data = await dailyEntriesApi.order.getAll(clinicId, params)
      
      // Filter by search term if provided
      let filtered = data
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        filtered = data.filter(
          (order) =>
            order.supplierName?.toLowerCase().includes(term) ||
            order.orderNumber?.toLowerCase().includes(term)
        )
      }
      
      setOrders(filtered)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }

  const getOrderStatus = (order: DailyOrderEntry) => {
    if (order.cancelled) return { label: 'Cancelado', variant: 'destructive' as const }
    if (order.delivered) return { label: 'Entregue', variant: 'default' as const }
    if (order.ready) return { label: 'Pronto', variant: 'default' as const }
    if (order.inProduction) return { label: 'Em Produção', variant: 'secondary' as const }
    if (order.confirmed) return { label: 'Confirmado', variant: 'secondary' as const }
    if (order.requested) return { label: 'Solicitado', variant: 'outline' as const }
    return { label: 'Novo', variant: 'outline' as const }
  }

  const handleDelete = async () => {
    if (!deleteOrderId || !clinicId) return

    setDeleting(true)
    try {
      await dailyEntriesApi.order.delete(clinicId, deleteOrderId)
      toast.success('Pedido excluído com sucesso!')
      setDeleteOrderId(null)
      loadOrders()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir pedido')
    } finally {
      setDeleting(false)
    }
  }

  const handleApprove = async (orderId: string) => {
    if (!clinicId) return

    setApprovingOrderId(orderId)
    try {
      await dailyEntriesApi.order.approve(clinicId, orderId)
      toast.success('Pedido aprovado com sucesso!')
      loadOrders()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao aprovar pedido')
    } finally {
      setApprovingOrderId(null)
    }
  }

  if (!clinicId) {
    return <div className="p-8">Clínica não encontrada</div>
  }

  if (!canViewOrders) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para visualizar pedidos
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
          <h1 className="text-3xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie os pedidos da clínica
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Pedidos</CardTitle>
          <CardDescription>
            {orders.length} pedido{orders.length !== 1 ? 's' : ''} encontrado{orders.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por fornecedor ou número do pedido..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    loadOrders()
                  }}
                  className="pl-8"
                />
              </div>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Todos os fornecedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="start-date">Data Inicial</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="end-date">Data Final</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-destructive p-4">{error}</div>
          ) : orders.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum pedido encontrado</p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Número do Pedido</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => {
                    const status = getOrderStatus(order)
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          {order.date
                            ? format(new Date(order.date), 'dd/MM/yyyy', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {order.supplierName || '-'}
                        </TableCell>
                        <TableCell>{order.orderNumber || '-'}</TableCell>
                        <TableCell className="font-medium">
                          {order.total && order.total > 0
                            ? new Intl.NumberFormat('pt-PT', {
                                style: 'currency',
                                currency: 'EUR',
                              }).format(order.total)
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {order.updatedAt
                            ? format(new Date(order.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setViewOrderId(order.id)}
                              title="Visualizar"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEditOrders && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditOrderId(order.id)}
                                  title="Editar"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setDeleteOrderId(order.id)}
                                  title="Excluir"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                            {isGestor && !order.approved && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(order.id)}
                                title="Autorizar Pedido"
                                disabled={approvingOrderId === order.id}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                {approvingOrderId === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4" />
                                )}
                              </Button>
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

      {/* Dialogs */}
      <ViewOrderDialog
        open={viewOrderId !== null}
        onOpenChange={(open) => !open && setViewOrderId(null)}
        orderId={viewOrderId}
        clinicId={clinicId || ''}
      />

      <EditOrderDialog
        open={editOrderId !== null}
        onOpenChange={(open) => !open && setEditOrderId(null)}
        orderId={editOrderId}
        clinicId={clinicId || ''}
        onSuccess={() => {
          loadOrders()
        }}
      />

      <AlertDialog open={deleteOrderId !== null} onOpenChange={(open) => !open && setDeleteOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.
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
    </div>
  )
}

