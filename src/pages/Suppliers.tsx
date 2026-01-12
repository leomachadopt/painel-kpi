import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Supplier } from '@/lib/types'
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
import { Search, Plus, Loader2, Edit, Trash2, Building2 } from 'lucide-react'
import useAuthStore from '@/stores/useAuthStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from '@/hooks/useTranslation'
import useDataStore from '@/stores/useDataStore'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function Suppliers() {
  const { user } = useAuthStore()
  const { clinicId } = useParams<{ clinicId: string }>()
  const { canView, canEdit } = usePermissions()
  const { t, locale, currentClinic } = useTranslation()
  const { getClinic } = useDataStore()
  const canViewSuppliers = canView('canViewSuppliers') || canEdit('canEditOrders')
  const canEditSuppliers = canEdit('canEditOrders')
  const isBrazil = locale === 'PT-BR'
  const clinic = clinicId ? getClinic(clinicId) : currentClinic
  
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    nif: '',
    cpf: '',
    cnpj: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
    bankName: '',
    iban: '',
    nib: '',
    swiftBic: '',
    bankAgency: '',
    bankAccount: '',
    bankAccountType: '',
    bankCode: '',
    pixKey: '',
  })
  const [saving, setSaving] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    nif: '',
    cpf: '',
    cnpj: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
    bankName: '',
    iban: '',
    nib: '',
    swiftBic: '',
    bankAgency: '',
    bankAccount: '',
    bankAccountType: '',
    bankCode: '',
    pixKey: '',
  })

  useEffect(() => {
    if (clinicId) {
      loadSuppliers()
    }
  }, [clinicId])

  const loadSuppliers = async (search?: string) => {
    if (!clinicId) return

    setLoading(true)
    setError(null)
    try {
      const data = await dailyEntriesApi.supplier.getAll(clinicId, search)
      setSuppliers(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar fornecedores')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    if (value.length >= 2 || value.length === 0) {
      loadSuppliers(value || undefined)
    }
  }

  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier)
    setShowDeleteDialog(true)
  }

  const handleDeleteSupplier = async () => {
    if (!clinicId || !supplierToDelete) return

    setDeleting(true)
    try {
      await dailyEntriesApi.supplier.delete(clinicId, supplierToDelete.id)
      toast.success(t('supplier.deleteSuccess'))
      setShowDeleteDialog(false)
      setSupplierToDelete(null)
      await loadSuppliers(searchTerm || undefined)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir fornecedor')
    } finally {
      setDeleting(false)
    }
  }

  const handleEditClick = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setEditForm({
      name: supplier.name || '',
      nif: supplier.nif || '',
      cpf: supplier.cpf || '',
      cnpj: supplier.cnpj || '',
      address: supplier.address || '',
      postalCode: supplier.postalCode || '',
      city: supplier.city || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      website: supplier.website || '',
      notes: supplier.notes || '',
      bankName: supplier.bankName || '',
      iban: supplier.iban || '',
      nib: supplier.nib || '',
      swiftBic: supplier.swiftBic || '',
      bankAgency: supplier.bankAgency || '',
      bankAccount: supplier.bankAccount || '',
      bankAccountType: supplier.bankAccountType || '',
      bankCode: supplier.bankCode || '',
      pixKey: supplier.pixKey || '',
    })
    setShowEditDialog(true)
  }

  const handleSaveEdit = async () => {
    if (!clinicId || !editingSupplier) return

    if (!editForm.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setSaving(true)
    try {
      await dailyEntriesApi.supplier.update(clinicId, editingSupplier.id, editForm)
      toast.success(t('supplier.updateSuccess'))
      setShowEditDialog(false)
      setEditingSupplier(null)
      await loadSuppliers(searchTerm || undefined)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar fornecedor')
    } finally {
      setSaving(false)
    }
  }

  const handleCreateClick = () => {
    setCreateForm({
      name: '',
      nif: '',
      cpf: '',
      cnpj: '',
      address: '',
      postalCode: '',
      city: '',
      phone: '',
      email: '',
      website: '',
      notes: '',
      bankName: '',
      iban: '',
      nib: '',
      swiftBic: '',
      bankAgency: '',
      bankAccount: '',
      bankAccountType: '',
      bankCode: '',
      pixKey: '',
    })
    setShowCreateDialog(true)
  }

  const handleSaveCreate = async () => {
    if (!clinicId) return

    if (!createForm.name.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setSaving(true)
    try {
      await dailyEntriesApi.supplier.create(clinicId, createForm)
      toast.success(t('supplier.createSuccess'))
      setShowCreateDialog(false)
      await loadSuppliers(searchTerm || undefined)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar fornecedor')
    } finally {
      setSaving(false)
    }
  }

  if (!clinicId) {
    return <div className="p-8">Clínica não encontrada</div>
  }

  if (!canViewSuppliers) {
    return (
      <div className="flex flex-col gap-6 p-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('supplier.title')}</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para visualizar fornecedores
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
          <h1 className="text-3xl font-bold tracking-tight">{t('supplier.title')}</h1>
          <p className="text-muted-foreground">
            {t('supplier.manage')}
          </p>
        </div>
        {canEditSuppliers && (
          <Button onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            {t('supplier.new')}
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores</CardTitle>
          <CardDescription>
            {suppliers.length} fornecedor{suppliers.length !== 1 ? 'es' : ''} cadastrado{suppliers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isBrazil ? t('supplier.searchPlaceholder') : t('supplier.searchPlaceholderNif')}
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="text-destructive p-4">{error}</div>
          ) : suppliers.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('supplier.noSuppliers')}</p>
              <p className="text-sm mt-2">
                {searchTerm ? 'Tente uma busca diferente' : 'Comece criando um novo fornecedor'}
              </p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('supplier.name')}</TableHead>
                    <TableHead>{isBrazil ? (t('supplier.cpf') + ' / ' + t('supplier.cnpj')) : t('supplier.nif')}</TableHead>
                    <TableHead>{t('supplier.city')}</TableHead>
                    <TableHead>{t('supplier.phone')}</TableHead>
                    <TableHead>{t('supplier.email')}</TableHead>
                    <TableHead className="text-right">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>
                        {isBrazil 
                          ? (supplier.cpf || supplier.cnpj || '-')
                          : (supplier.nif || '-')
                        }
                      </TableCell>
                      <TableCell>{supplier.city || '-'}</TableCell>
                      <TableCell>{supplier.phone || '-'}</TableCell>
                      <TableCell>{supplier.email || '-'}</TableCell>
                      <TableCell className="text-right">
                        {canEditSuppliers && (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditClick(supplier)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(supplier)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {t('supplier.deleteConfirm')} "{supplierToDelete?.name}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSupplier}
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

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('supplier.edit')}</DialogTitle>
            <DialogDescription>
              Atualize os dados do fornecedor
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                {t('supplier.name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t('supplier.name')}
              />
            </div>
            {isBrazil ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-cpf">{t('supplier.cpf')}</Label>
                  <Input
                    id="edit-cpf"
                    value={editForm.cpf}
                    onChange={(e) => setEditForm({ ...editForm, cpf: e.target.value })}
                    placeholder={t('supplier.cpfPlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-cnpj">{t('supplier.cnpj')}</Label>
                  <Input
                    id="edit-cnpj"
                    value={editForm.cnpj}
                    onChange={(e) => setEditForm({ ...editForm, cnpj: e.target.value })}
                    placeholder={t('supplier.cnpjPlaceholder')}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-nif">{t('supplier.nif')}</Label>
                  <Input
                    id="edit-nif"
                    value={editForm.nif}
                    onChange={(e) => setEditForm({ ...editForm, nif: e.target.value })}
                    placeholder="123456789"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-postal-code">{t('supplier.postalCode')}</Label>
                  <Input
                    id="edit-postal-code"
                    value={editForm.postalCode}
                    onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                    placeholder={t('supplier.postalCodePlaceholder')}
                  />
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="edit-address">{t('supplier.address')}</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder={isBrazil ? 'Rua, número' : 'Rua, número'}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-city">{t('supplier.city')}</Label>
              <Input
                id="edit-city"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                placeholder={isBrazil ? 'Cidade' : 'Localidade'}
              />
            </div>
            {!isBrazil && (
              <div className="grid gap-2">
                <Label htmlFor="edit-postal-code">{t('supplier.postalCode')}</Label>
                <Input
                  id="edit-postal-code"
                  value={editForm.postalCode}
                  onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                  placeholder={t('supplier.postalCodePlaceholder')}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">{t('supplier.phone')}</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder={t('supplier.phonePlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">{t('supplier.email')}</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-website">{t('supplier.website')}</Label>
              <Input
                id="edit-website"
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                placeholder="https://www.exemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">{t('supplier.notes')}</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder={t('supplier.notes')}
                rows={3}
              />
            </div>
            <div className="grid gap-2 mt-4">
              <Label className="text-base font-semibold">{t('supplier.bankData')}</Label>
            </div>
            {isBrazil ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-bank-name">{t('supplier.bankName')}</Label>
                  <Input
                    id="edit-bank-name"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                    placeholder={t('supplier.bankName')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-bank-code">{t('supplier.bankCode')}</Label>
                    <Input
                      id="edit-bank-code"
                      value={editForm.bankCode}
                      onChange={(e) => setEditForm({ ...editForm, bankCode: e.target.value })}
                      placeholder={t('supplier.bankCodePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-bank-agency">{t('supplier.bankAgency')}</Label>
                    <Input
                      id="edit-bank-agency"
                      value={editForm.bankAgency}
                      onChange={(e) => setEditForm({ ...editForm, bankAgency: e.target.value })}
                      placeholder={t('supplier.bankAgencyPlaceholder')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-bank-account">{t('supplier.bankAccount')}</Label>
                    <Input
                      id="edit-bank-account"
                      value={editForm.bankAccount}
                      onChange={(e) => setEditForm({ ...editForm, bankAccount: e.target.value })}
                      placeholder={t('supplier.bankAccountPlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-bank-account-type">{t('supplier.bankAccountType')}</Label>
                    <Select
                      value={editForm.bankAccountType}
                      onValueChange={(value) => setEditForm({ ...editForm, bankAccountType: value })}
                    >
                      <SelectTrigger id="edit-bank-account-type">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">{t('supplier.accountTypeCurrent')}</SelectItem>
                        <SelectItem value="poupança">{t('supplier.accountTypeSavings')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-pix-key">{t('supplier.pixKey')}</Label>
                  <Input
                    id="edit-pix-key"
                    value={editForm.pixKey}
                    onChange={(e) => setEditForm({ ...editForm, pixKey: e.target.value })}
                    placeholder={t('supplier.pixKeyPlaceholder')}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="edit-bank-name">{t('supplier.bankName')}</Label>
                  <Input
                    id="edit-bank-name"
                    value={editForm.bankName}
                    onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })}
                    placeholder={t('supplier.bankName')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="edit-iban">{t('supplier.iban')}</Label>
                    <Input
                      id="edit-iban"
                      value={editForm.iban}
                      onChange={(e) => setEditForm({ ...editForm, iban: e.target.value })}
                      placeholder="PT50 0000 0000 0000 0000 0000 0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="edit-nib">{t('supplier.nib')}</Label>
                    <Input
                      id="edit-nib"
                      value={editForm.nib}
                      onChange={(e) => setEditForm({ ...editForm, nib: e.target.value })}
                      placeholder="0000 0000 0000 0000 0000 000"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-swift-bic">{t('supplier.swiftBic')}</Label>
                  <Input
                    id="edit-swift-bic"
                    value={editForm.swiftBic}
                    onChange={(e) => setEditForm({ ...editForm, swiftBic: e.target.value })}
                    placeholder="BCOMPTPL"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.saving')}
                </>
              ) : (
                t('common.save')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('supplier.new')}</DialogTitle>
            <DialogDescription>
              Adicione um novo fornecedor à clínica
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">
                {t('supplier.name')} <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder={t('supplier.name')}
              />
            </div>
            {isBrazil ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-cpf">{t('supplier.cpf')}</Label>
                  <Input
                    id="create-cpf"
                    value={createForm.cpf}
                    onChange={(e) => setCreateForm({ ...createForm, cpf: e.target.value })}
                    placeholder={t('supplier.cpfPlaceholder')}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-cnpj">{t('supplier.cnpj')}</Label>
                  <Input
                    id="create-cnpj"
                    value={createForm.cnpj}
                    onChange={(e) => setCreateForm({ ...createForm, cnpj: e.target.value })}
                    placeholder={t('supplier.cnpjPlaceholder')}
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="create-nif">{t('supplier.nif')}</Label>
                  <Input
                    id="create-nif"
                    value={createForm.nif}
                    onChange={(e) => setCreateForm({ ...createForm, nif: e.target.value })}
                    placeholder="123456789"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-postal-code">{t('supplier.postalCode')}</Label>
                  <Input
                    id="create-postal-code"
                    value={createForm.postalCode}
                    onChange={(e) => setCreateForm({ ...createForm, postalCode: e.target.value })}
                    placeholder={t('supplier.postalCodePlaceholder')}
                  />
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="create-address">{t('supplier.address')}</Label>
              <Input
                id="create-address"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                placeholder={isBrazil ? 'Rua, número' : 'Rua, número'}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-city">{t('supplier.city')}</Label>
              <Input
                id="create-city"
                value={createForm.city}
                onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                placeholder={isBrazil ? 'Cidade' : 'Localidade'}
              />
            </div>
            {!isBrazil && (
              <div className="grid gap-2">
                <Label htmlFor="create-postal-code">{t('supplier.postalCode')}</Label>
                <Input
                  id="create-postal-code"
                  value={createForm.postalCode}
                  onChange={(e) => setCreateForm({ ...createForm, postalCode: e.target.value })}
                  placeholder={t('supplier.postalCodePlaceholder')}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-phone">{t('supplier.phone')}</Label>
                <Input
                  id="create-phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder={t('supplier.phonePlaceholder')}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-email">{t('supplier.email')}</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-website">{t('supplier.website')}</Label>
              <Input
                id="create-website"
                value={createForm.website}
                onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
                placeholder="https://www.exemplo.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-notes">{t('supplier.notes')}</Label>
              <Textarea
                id="create-notes"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder={t('supplier.notes')}
                rows={3}
              />
            </div>
            <div className="grid gap-2 mt-4">
              <Label className="text-base font-semibold">{t('supplier.bankData')}</Label>
            </div>
            {isBrazil ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="create-bank-name">{t('supplier.bankName')}</Label>
                  <Input
                    id="create-bank-name"
                    value={createForm.bankName}
                    onChange={(e) => setCreateForm({ ...createForm, bankName: e.target.value })}
                    placeholder={t('supplier.bankName')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="create-bank-code">{t('supplier.bankCode')}</Label>
                    <Input
                      id="create-bank-code"
                      value={createForm.bankCode}
                      onChange={(e) => setCreateForm({ ...createForm, bankCode: e.target.value })}
                      placeholder={t('supplier.bankCodePlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="create-bank-agency">{t('supplier.bankAgency')}</Label>
                    <Input
                      id="create-bank-agency"
                      value={createForm.bankAgency}
                      onChange={(e) => setCreateForm({ ...createForm, bankAgency: e.target.value })}
                      placeholder={t('supplier.bankAgencyPlaceholder')}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="create-bank-account">{t('supplier.bankAccount')}</Label>
                    <Input
                      id="create-bank-account"
                      value={createForm.bankAccount}
                      onChange={(e) => setCreateForm({ ...createForm, bankAccount: e.target.value })}
                      placeholder={t('supplier.bankAccountPlaceholder')}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="create-bank-account-type">{t('supplier.bankAccountType')}</Label>
                    <Select
                      value={createForm.bankAccountType}
                      onValueChange={(value) => setCreateForm({ ...createForm, bankAccountType: value })}
                    >
                      <SelectTrigger id="create-bank-account-type">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corrente">{t('supplier.accountTypeCurrent')}</SelectItem>
                        <SelectItem value="poupança">{t('supplier.accountTypeSavings')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-pix-key">{t('supplier.pixKey')}</Label>
                  <Input
                    id="create-pix-key"
                    value={createForm.pixKey}
                    onChange={(e) => setCreateForm({ ...createForm, pixKey: e.target.value })}
                    placeholder={t('supplier.pixKeyPlaceholder')}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="create-bank-name">{t('supplier.bankName')}</Label>
                  <Input
                    id="create-bank-name"
                    value={createForm.bankName}
                    onChange={(e) => setCreateForm({ ...createForm, bankName: e.target.value })}
                    placeholder={t('supplier.bankName')}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="create-iban">{t('supplier.iban')}</Label>
                    <Input
                      id="create-iban"
                      value={createForm.iban}
                      onChange={(e) => setCreateForm({ ...createForm, iban: e.target.value })}
                      placeholder="PT50 0000 0000 0000 0000 0000 0"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="create-nib">{t('supplier.nib')}</Label>
                    <Input
                      id="create-nib"
                      value={createForm.nib}
                      onChange={(e) => setCreateForm({ ...createForm, nib: e.target.value })}
                      placeholder="0000 0000 0000 0000 0000 000"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="create-swift-bic">{t('supplier.swiftBic')}</Label>
                  <Input
                    id="create-swift-bic"
                    value={createForm.swiftBic}
                    onChange={(e) => setCreateForm({ ...createForm, swiftBic: e.target.value })}
                    placeholder="BCOMPTPL"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCreate} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

