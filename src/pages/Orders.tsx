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
import { Search, Loader2, Package, Calendar } from 'lucide-react'
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

export default function Orders() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const [orders, setOrders] = useState<DailyOrderEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

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

  if (!clinicId) {
    return <div className="p-8">Clínica não encontrada</div>
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
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

