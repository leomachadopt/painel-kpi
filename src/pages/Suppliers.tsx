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

export default function Suppliers() {
  const { user } = useAuthStore()
  const { clinicId } = useParams<{ clinicId: string }>()
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
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    nif: '',
    address: '',
    postalCode: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    notes: '',
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
      toast.success('Fornecedor excluído com sucesso')
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
      address: supplier.address || '',
      postalCode: supplier.postalCode || '',
      city: supplier.city || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      website: supplier.website || '',
      notes: supplier.notes || '',
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
      toast.success('Fornecedor atualizado com sucesso')
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
      address: '',
      postalCode: '',
      city: '',
      phone: '',
      email: '',
      website: '',
      notes: '',
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
      toast.success('Fornecedor criado com sucesso')
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

  return (
    <div className="flex flex-col gap-6 p-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerir os fornecedores da clínica
          </p>
        </div>
        <Button onClick={handleCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Fornecedor
        </Button>
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
                placeholder="Buscar por nome ou NIF..."
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
              <p>Nenhum fornecedor encontrado</p>
              <p className="text-sm mt-2">
                {searchTerm ? 'Tente uma busca diferente' : 'Comece criando um novo fornecedor'}
              </p>
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>NIF</TableHead>
                    <TableHead>Localidade</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.nif || '-'}</TableCell>
                      <TableCell>{supplier.city || '-'}</TableCell>
                      <TableCell>{supplier.phone || '-'}</TableCell>
                      <TableCell>{supplier.email || '-'}</TableCell>
                      <TableCell className="text-right">
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
              Tem certeza que deseja excluir o fornecedor "{supplierToDelete?.name}"?
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
            <DialogTitle>Editar Fornecedor</DialogTitle>
            <DialogDescription>
              Atualize os dados do fornecedor
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-nif">NIF</Label>
                <Input
                  id="edit-nif"
                  value={editForm.nif}
                  onChange={(e) => setEditForm({ ...editForm, nif: e.target.value })}
                  placeholder="123456789"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-postal-code">Código Postal</Label>
                <Input
                  id="edit-postal-code"
                  value={editForm.postalCode}
                  onChange={(e) => setEditForm({ ...editForm, postalCode: e.target.value })}
                  placeholder="1234-567"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Morada</Label>
              <Input
                id="edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                placeholder="Rua, número"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-city">Localidade</Label>
              <Input
                id="edit-city"
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                placeholder="Cidade"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-phone">Telefone</Label>
                <Input
                  id="edit-phone"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+351 123 456 789"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="email@exemplo.pt"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-website">Website</Label>
              <Input
                id="edit-website"
                value={editForm.website}
                onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                placeholder="https://www.exemplo.pt"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Observações</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Notas adicionais sobre o fornecedor"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
            <DialogDescription>
              Adicione um novo fornecedor à clínica
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">
                Nome <span className="text-destructive">*</span>
              </Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                placeholder="Nome do fornecedor"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-nif">NIF</Label>
                <Input
                  id="create-nif"
                  value={createForm.nif}
                  onChange={(e) => setCreateForm({ ...createForm, nif: e.target.value })}
                  placeholder="123456789"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-postal-code">Código Postal</Label>
                <Input
                  id="create-postal-code"
                  value={createForm.postalCode}
                  onChange={(e) => setCreateForm({ ...createForm, postalCode: e.target.value })}
                  placeholder="1234-567"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-address">Morada</Label>
              <Input
                id="create-address"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                placeholder="Rua, número"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-city">Localidade</Label>
              <Input
                id="create-city"
                value={createForm.city}
                onChange={(e) => setCreateForm({ ...createForm, city: e.target.value })}
                placeholder="Cidade"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="create-phone">Telefone</Label>
                <Input
                  id="create-phone"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+351 123 456 789"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="email@exemplo.pt"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-website">Website</Label>
              <Input
                id="create-website"
                value={createForm.website}
                onChange={(e) => setCreateForm({ ...createForm, website: e.target.value })}
                placeholder="https://www.exemplo.pt"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-notes">Observações</Label>
              <Textarea
                id="create-notes"
                value={createForm.notes}
                onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                placeholder="Notas adicionais sobre o fornecedor"
                rows={3}
              />
            </div>
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

