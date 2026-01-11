import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { AdvanceContract } from '@/lib/types'
import { advancesApi } from '@/services/api'
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
import { Search, Plus, Edit, Trash2, FileText, Loader2, Receipt, Eye } from 'lucide-react'
import useAuthStore from '@/stores/useAuthStore'
import { format } from 'date-fns'
import { toast } from 'sonner'
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
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/hooks/usePermissions'
import { AdvanceContractForm } from '@/components/advances/AdvanceContractForm'
import { BillingWizard } from '@/components/advances/BillingWizard'
import useDataStore from '@/stores/useDataStore'

export default function Advances() {
  const { user } = useAuthStore()
  const { clinicId } = useParams<{ clinicId: string }>()
  const { canView, canEdit } = usePermissions()
  const { reloadAdvanceInvoiceEntries } = useDataStore()
  const [contracts, setContracts] = useState<AdvanceContract[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [contractToDelete, setContractToDelete] = useState<AdvanceContract | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showContractForm, setShowContractForm] = useState(false)
  const [editingContract, setEditingContract] = useState<AdvanceContract | null>(null)
  const [showBillingWizard, setShowBillingWizard] = useState(false)
  const [billingContractId, setBillingContractId] = useState<string | null>(null)
  const [showBatchesDialog, setShowBatchesDialog] = useState(false)
  const [selectedContractBatches, setSelectedContractBatches] = useState<any[]>([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [batchesContractName, setBatchesContractName] = useState('')
  const [showBatchDetailsDialog, setShowBatchDetailsDialog] = useState(false)
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<any>(null)
  const [loadingBatchDetails, setLoadingBatchDetails] = useState(false)
  const [showDeleteBatchDialog, setShowDeleteBatchDialog] = useState(false)
  const [batchToDelete, setBatchToDelete] = useState<any>(null)
  const [deletingBatch, setDeletingBatch] = useState(false)

  const canViewAdvances = canView('canViewAdvances')
  const canEditAdvances = canEdit('canEditAdvances')
  const canBillAdvances = canEdit('canBillAdvances')

  useEffect(() => {
    if (clinicId && canViewAdvances) {
      loadContracts()
    }
  }, [clinicId, canViewAdvances])

  const loadContracts = async () => {
    if (!clinicId) return

    setLoading(true)
    setError(null)
    try {
      const data = await advancesApi.contracts.getAll(clinicId)
      setContracts(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar contratos')
      toast.error('Erro ao carregar contratos')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    // Filter locally for now
  }

  const filteredContracts = contracts.filter((contract) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      contract.patientName?.toLowerCase().includes(search) ||
      contract.patientCode?.includes(search) ||
      contract.insuranceProviderName?.toLowerCase().includes(search) ||
      contract.contractNumber?.toLowerCase().includes(search)
    )
  })

  const handleDeleteClick = (contract: AdvanceContract) => {
    setContractToDelete(contract)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!contractToDelete || !clinicId) return

    setDeleting(true)
    try {
      await advancesApi.contracts.delete(clinicId, contractToDelete.id)
      toast.success('Contrato excluído com sucesso')
      setShowDeleteDialog(false)
      setContractToDelete(null)
      loadContracts()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir contrato')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (contract: AdvanceContract) => {
    setEditingContract(contract)
    setShowContractForm(true)
  }

  const handleBilling = (contract: AdvanceContract) => {
    setBillingContractId(contract.id)
    setShowBillingWizard(true)
  }

  const handleFormClose = () => {
    setShowContractForm(false)
    setEditingContract(null)
    loadContracts()
  }

  const handleBillingClose = async () => {
    setShowBillingWizard(false)
    setBillingContractId(null)
    loadContracts()
    // Recarregar dados do relatório de fatura de adiantamento
    if (clinicId) {
      await reloadAdvanceInvoiceEntries(clinicId)
    }
  }

  const handleViewBatches = async (contract: AdvanceContract) => {
    if (!clinicId) return

    setLoadingBatches(true)
    setBatchesContractName(contract.patientName || '')
    setShowBatchesDialog(true)
    try {
      const response = await advancesApi.contracts.getBatches(clinicId, contract.id)
      setSelectedContractBatches(response)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar lotes')
      setSelectedContractBatches([])
    } finally {
      setLoadingBatches(false)
    }
  }

  const handleViewBatchDetails = async (batch: any) => {
    if (!clinicId) return

    setLoadingBatchDetails(true)
    setShowBatchDetailsDialog(true)
    try {
      const response = await advancesApi.contracts.getBatchDetails(clinicId, batch.id)
      setSelectedBatchDetails(response)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar detalhes do lote')
      setSelectedBatchDetails(null)
    } finally {
      setLoadingBatchDetails(false)
    }
  }

  const handleDeleteBatchClick = (batch: any) => {
    setBatchToDelete(batch)
    setShowDeleteBatchDialog(true)
  }

  const handleDeleteBatch = async () => {
    if (!clinicId || !batchToDelete) return

    setDeletingBatch(true)
    try {
      await advancesApi.contracts.deleteBatch(clinicId, batchToDelete.id)
      toast.success('Lote excluído com sucesso')
      setShowDeleteBatchDialog(false)
      setBatchToDelete(null)
      // Refresh batches list
      const currentContract = contracts.find(c =>
        selectedContractBatches.length > 0 &&
        c.id === selectedContractBatches[0]?.contractId
      )
      if (currentContract) {
        const response = await advancesApi.contracts.getBatches(clinicId, currentContract.id)
        setSelectedContractBatches(response)
      }
      // Refresh contracts to update billed amounts
      loadContracts()
      // Recarregar dados do relatório de fatura de adiantamento
      await reloadAdvanceInvoiceEntries(clinicId)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir lote')
    } finally {
      setDeletingBatch(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  if (!canViewAdvances) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Você não tem permissão para visualizar adiantamentos.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Banco de Adiantamentos</h1>
          <p className="text-muted-foreground">
            Gerencie contratos de adiantamento e faturação
          </p>
        </div>
        {canEditAdvances && (
          <Button onClick={() => setShowContractForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Contrato
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contratos de Adiantamento</CardTitle>
              <CardDescription>
                Lista de todos os contratos com saldo disponível para faturação
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente, código ou operadora..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredContracts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhum contrato encontrado' : 'Nenhum contrato cadastrado'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código do Paciente</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Fatura de Adiantamento</TableHead>
                    <TableHead className="text-right">Já Faturado</TableHead>
                    <TableHead className="text-right">Restante</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div className="font-medium">{contract.patientCode || '-'}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{contract.patientName || '-'}</div>
                        {contract.insuranceProviderName && (
                          <div className="text-sm text-muted-foreground">
                            {contract.insuranceProviderName}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(contract.totalAdvanced || 0)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(contract.totalBilled || 0)}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        <span
                          className={
                            (contract.balanceToBill || 0) > 0
                              ? 'text-green-600'
                              : 'text-muted-foreground'
                          }
                        >
                          {formatCurrency(contract.balanceToBill || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewBatches(contract)}
                            title="Ver lotes emitidos"
                          >
                            <Receipt className="h-4 w-4" />
                          </Button>
                          {canEditAdvances && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(contract)}
                              title="Editar contrato"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                          {canEditAdvances && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(contract)}
                              title="Excluir contrato"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                          {canBillAdvances && (contract.balanceToBill || 0) > 0 && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleBilling(contract)}
                              title="Lançar fatura"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Lançar Fatura
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contract Form Dialog */}
      {showContractForm && clinicId && (
        <AdvanceContractForm
          clinicId={clinicId}
          contract={editingContract || undefined}
          onClose={handleFormClose}
        />
      )}

      {/* Billing Wizard Dialog */}
      {showBillingWizard && clinicId && billingContractId && (
        <BillingWizard
          clinicId={clinicId}
          contractId={billingContractId}
          onClose={handleBillingClose}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Contrato</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o contrato de{' '}
              <strong>{contractToDelete?.patientName}</strong>? Esta ação não pode ser desfeita.
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

      {/* Batches Dialog */}
      <Dialog open={showBatchesDialog} onOpenChange={setShowBatchesDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Lotes Emitidos</DialogTitle>
            <DialogDescription>
              Lotes de faturação para {batchesContractName}
            </DialogDescription>
          </DialogHeader>
          {loadingBatches ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedContractBatches.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum lote emitido ainda</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número do Lote</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead className="text-right">Itens</TableHead>
                    <TableHead>Data de Emissão</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedContractBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            batch.status === 'PAID'
                              ? 'default'
                              : batch.status === 'PARTIALLY_PAID'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {batch.status === 'ISSUED' && 'Emitido'}
                          {batch.status === 'PAID' && 'Pago'}
                          {batch.status === 'PARTIALLY_PAID' && 'Parcialmente Pago'}
                          {batch.status === 'CANCELLED' && 'Cancelado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(batch.totalAmount || 0)}
                      </TableCell>
                      <TableCell className="text-right">{batch.itemsCount}</TableCell>
                      <TableCell>
                        {batch.issuedAt ? format(new Date(batch.issuedAt), 'dd/MM/yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewBatchDetails(batch)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canBillAdvances && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBatchClick(batch)}
                              title="Excluir lote"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Batch Details Dialog */}
      <Dialog open={showBatchDetailsDialog} onOpenChange={setShowBatchDetailsDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detalhes do Lote</DialogTitle>
            <DialogDescription>
              Informações completas e itens do lote
            </DialogDescription>
          </DialogHeader>
          {loadingBatchDetails ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedBatchDetails ? (
            <div className="space-y-6 overflow-y-auto pr-2">
              {/* Batch Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Número do Lote</p>
                  <p className="font-semibold">{selectedBatchDetails.batchNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      selectedBatchDetails.status === 'PAID'
                        ? 'default'
                        : selectedBatchDetails.status === 'PARTIALLY_PAID'
                        ? 'secondary'
                        : 'outline'
                    }
                  >
                    {selectedBatchDetails.status === 'ISSUED' && 'Emitido'}
                    {selectedBatchDetails.status === 'PAID' && 'Pago'}
                    {selectedBatchDetails.status === 'PARTIALLY_PAID' && 'Parcialmente Pago'}
                    {selectedBatchDetails.status === 'CANCELLED' && 'Cancelado'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paciente</p>
                  <p className="font-semibold truncate">{selectedBatchDetails.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seguradora</p>
                  <p className="font-semibold truncate">{selectedBatchDetails.insuranceProviderName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-semibold text-lg">
                    {formatCurrency(selectedBatchDetails.totalAmount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Data de Emissão</p>
                  <p className="font-semibold">
                    {selectedBatchDetails.issuedAt
                      ? format(new Date(selectedBatchDetails.issuedAt), 'dd/MM/yyyy HH:mm')
                      : '-'}
                  </p>
                </div>
              </div>

              {/* Batch Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3">
                  Itens do Lote ({selectedBatchDetails.items?.length || 0})
                </h3>
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Código</TableHead>
                          <TableHead className="min-w-[200px]">Descrição</TableHead>
                          <TableHead className="w-[120px]">Beneficiário</TableHead>
                          <TableHead className="text-right w-[90px]">Valor Un.</TableHead>
                          <TableHead className="text-right w-[60px]">Qtd</TableHead>
                          <TableHead className="text-right w-[90px]">Total</TableHead>
                          <TableHead className="w-[100px]">Data</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBatchDetails.items?.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-mono text-xs">{item.procedureCode}</TableCell>
                            <TableCell className="text-sm">
                              <div className="max-w-[200px] truncate" title={item.procedureDescription}>
                                {item.procedureDescription}
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{item.dependentName}</TableCell>
                            <TableCell className="text-right text-sm">
                              {formatCurrency(item.unitValue || 0)}
                            </TableCell>
                            <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right font-medium text-sm">
                              {formatCurrency(item.totalValue || 0)}
                            </TableCell>
                            <TableCell className="text-sm">
                              {item.serviceDate
                                ? format(new Date(item.serviceDate), 'dd/MM/yyyy')
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Erro ao carregar detalhes do lote</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Batch Confirmation Dialog */}
      <AlertDialog open={showDeleteBatchDialog} onOpenChange={setShowDeleteBatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lote{' '}
              <strong>{batchToDelete?.batchNumber}</strong>? Esta ação não pode ser desfeita e
              todos os itens deste lote serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBatch}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBatch}
              disabled={deletingBatch}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingBatch ? (
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

