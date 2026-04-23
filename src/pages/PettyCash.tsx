import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { toast } from 'sonner'
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Download,
  Search,
  Paperclip,
  XCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
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
} from '@/components/ui/dialog'
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
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { usePermissions } from '@/hooks/usePermissions'
import { useTranslation } from '@/hooks/useTranslation'
import { pettyCashApi } from '@/services/api'
import {
  PettyCashCategory,
  PettyCashEntry,
  PettyCashPaymentMethod,
} from '@/lib/types'

const PAYMENT_METHODS: PettyCashPaymentMethod[] = [
  'cash',
  'pix',
  'card',
  'transfer',
  'other',
]

type EntryFormState = {
  date: string
  amount: string
  categoryId: string
  description: string
  paymentMethod: PettyCashPaymentMethod
  receipt: File | null
  removeExistingReceipt: boolean
}

const emptyEntryForm = (): EntryFormState => ({
  date: format(new Date(), 'yyyy-MM-dd'),
  amount: '',
  categoryId: '',
  description: '',
  paymentMethod: 'cash',
  receipt: null,
  removeExistingReceipt: false,
})

export default function PettyCash() {
  const { clinicId } = useParams<{ clinicId: string }>()
  const { canView, canEdit } = usePermissions()
  const { formatCurrency, t } = useTranslation()

  const canViewPage = canView('canViewPettyCash') || canEdit('canEditPettyCash')
  const canEditPage = canEdit('canEditPettyCash')

  const [activeTab, setActiveTab] = useState<'entries' | 'categories'>('entries')

  // Filters
  const today = new Date()
  const [startDate, setStartDate] = useState(format(startOfMonth(today), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(endOfMonth(today), 'yyyy-MM-dd'))
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [entries, setEntries] = useState<PettyCashEntry[]>([])
  const [categories, setCategories] = useState<PettyCashCategory[]>([])
  const [loading, setLoading] = useState(true)

  // Entry modal
  const [showEntryDialog, setShowEntryDialog] = useState(false)
  const [editingEntry, setEditingEntry] = useState<PettyCashEntry | null>(null)
  const [entryForm, setEntryForm] = useState<EntryFormState>(emptyEntryForm())
  const [savingEntry, setSavingEntry] = useState(false)

  // Delete dialog
  const [entryToDelete, setEntryToDelete] = useState<PettyCashEntry | null>(null)
  const [deletingEntry, setDeletingEntry] = useState(false)

  // Category management
  const [newCategoryName, setNewCategoryName] = useState('')
  const [editingCategory, setEditingCategory] = useState<PettyCashCategory | null>(null)
  const [savingCategory, setSavingCategory] = useState(false)
  const [categoryToDelete, setCategoryToDelete] = useState<PettyCashCategory | null>(null)

  useEffect(() => {
    if (clinicId && canViewPage) {
      loadAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, startDate, endDate, categoryFilter, paymentFilter])

  const loadAll = async () => {
    if (!clinicId) return
    setLoading(true)
    try {
      const [cats, list] = await Promise.all([
        pettyCashApi.categories.getAll(clinicId),
        pettyCashApi.entries.list(clinicId, {
          startDate,
          endDate,
          categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
          paymentMethod: paymentFilter !== 'all' ? paymentFilter : undefined,
        }),
      ])
      setCategories(cats)
      setEntries(list)
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const activeCategories = useMemo(
    () => categories.filter((c) => c.active),
    [categories]
  )

  const filteredEntries = useMemo(() => {
    if (!searchTerm.trim()) return entries
    const term = searchTerm.toLowerCase()
    return entries.filter(
      (e) =>
        e.description?.toLowerCase().includes(term) ||
        e.categoryName?.toLowerCase().includes(term)
    )
  }, [entries, searchTerm])

  const totals = useMemo(() => {
    const total = filteredEntries.reduce((s, e) => s + Number(e.amount || 0), 0)
    const byCategory = new Map<string, number>()
    const byMethod = new Map<string, number>()
    for (const e of filteredEntries) {
      const catKey = e.categoryName || t('pettyCash.noCategory')
      byCategory.set(catKey, (byCategory.get(catKey) || 0) + Number(e.amount || 0))
      byMethod.set(e.paymentMethod, (byMethod.get(e.paymentMethod) || 0) + Number(e.amount || 0))
    }
    return {
      total,
      count: filteredEntries.length,
      byCategory: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]),
      byMethod: Array.from(byMethod.entries()).sort((a, b) => b[1] - a[1]),
    }
  }, [filteredEntries, t])

  const openCreateEntry = () => {
    setEditingEntry(null)
    setEntryForm(emptyEntryForm())
    setShowEntryDialog(true)
  }

  const openEditEntry = (entry: PettyCashEntry) => {
    setEditingEntry(entry)
    setEntryForm({
      date: entry.date.slice(0, 10),
      amount: String(entry.amount),
      categoryId: entry.categoryId || '',
      description: entry.description || '',
      paymentMethod: entry.paymentMethod,
      receipt: null,
      removeExistingReceipt: false,
    })
    setShowEntryDialog(true)
  }

  const handleSaveEntry = async () => {
    if (!clinicId) return
    const amountNum = Number(entryForm.amount.replace(',', '.'))
    if (!entryForm.date) {
      toast.error(t('pettyCash.validation.dateRequired'))
      return
    }
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      toast.error(t('pettyCash.validation.invalidAmount'))
      return
    }
    setSavingEntry(true)
    try {
      if (editingEntry) {
        await pettyCashApi.entries.update(clinicId, editingEntry.id, {
          date: entryForm.date,
          amount: amountNum,
          categoryId: entryForm.categoryId || null,
          description: entryForm.description.trim(),
          paymentMethod: entryForm.paymentMethod,
          receipt: entryForm.receipt,
          removeReceipt: entryForm.removeExistingReceipt && !entryForm.receipt,
        })
        toast.success(t('pettyCash.toast.updated'))
      } else {
        await pettyCashApi.entries.create(clinicId, {
          date: entryForm.date,
          amount: amountNum,
          categoryId: entryForm.categoryId || null,
          description: entryForm.description.trim(),
          paymentMethod: entryForm.paymentMethod,
          receipt: entryForm.receipt,
        })
        toast.success(t('pettyCash.toast.created'))
      }
      setShowEntryDialog(false)
      loadAll()
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    } finally {
      setSavingEntry(false)
    }
  }

  const handleDeleteEntry = async () => {
    if (!clinicId || !entryToDelete) return
    setDeletingEntry(true)
    try {
      await pettyCashApi.entries.delete(clinicId, entryToDelete.id)
      toast.success(t('pettyCash.toast.deleted'))
      setEntryToDelete(null)
      loadAll()
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    } finally {
      setDeletingEntry(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!clinicId || !newCategoryName.trim()) return
    setSavingCategory(true)
    try {
      await pettyCashApi.categories.create(clinicId, { name: newCategoryName.trim() })
      setNewCategoryName('')
      toast.success(t('pettyCash.toast.categoryCreated'))
      loadAll()
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    } finally {
      setSavingCategory(false)
    }
  }

  const handleUpdateCategory = async (
    cat: PettyCashCategory,
    patch: { name?: string; active?: boolean }
  ) => {
    if (!clinicId) return
    try {
      await pettyCashApi.categories.update(clinicId, cat.id, patch)
      loadAll()
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    }
  }

  const handleDeleteCategory = async () => {
    if (!clinicId || !categoryToDelete) return
    try {
      await pettyCashApi.categories.delete(clinicId, categoryToDelete.id)
      toast.success(t('pettyCash.toast.categoryDeleted'))
      setCategoryToDelete(null)
      loadAll()
    } catch (err: any) {
      toast.error(err.message || t('common.error'))
    }
  }

  const downloadReceipt = (entry: PettyCashEntry) => {
    if (!clinicId || !entry.receipt) return
    const url = pettyCashApi.entries.getReceiptUrl(clinicId, entry.id)
    const token = localStorage.getItem('kpi_token')
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.target = '_blank'
        a.rel = 'noopener noreferrer'
        a.click()
        setTimeout(() => URL.revokeObjectURL(blobUrl), 4000)
      })
      .catch(() => toast.error(t('pettyCash.toast.receiptError')))
  }

  if (!canViewPage) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('pettyCash.accessDeniedTitle')}</CardTitle>
            <CardDescription>{t('pettyCash.accessDenied')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const paymentMethodLabel = (m: string) => t(`pettyCash.paymentMethods.${m}`)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('pettyCash.title')}</h1>
          <p className="text-muted-foreground text-sm">{t('pettyCash.description')}</p>
        </div>
        {canEditPage && activeTab === 'entries' && (
          <Button onClick={openCreateEntry}>
            <Plus className="mr-2 h-4 w-4" />
            {t('pettyCash.newEntry')}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'entries' | 'categories')}>
        <TabsList>
          <TabsTrigger value="entries">{t('pettyCash.tabs.entries')}</TabsTrigger>
          <TabsTrigger value="categories">{t('pettyCash.tabs.categories')}</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('pettyCash.filters.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div>
                  <Label>{t('pettyCash.filters.from')}</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('pettyCash.filters.to')}</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>{t('pettyCash.filters.category')}</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('pettyCash.filters.allCategories')}</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('pettyCash.filters.paymentMethod')}</Label>
                  <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('pettyCash.filters.allMethods')}</SelectItem>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {paymentMethodLabel(m)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{t('pettyCash.filters.search')}</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={t('pettyCash.filters.searchPlaceholder')}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('pettyCash.summary.total')}</CardDescription>
                <CardTitle className="text-2xl">{formatCurrency(totals.total)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {totals.count} {t('pettyCash.summary.entries')}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('pettyCash.summary.byCategory')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {totals.byCategory.length === 0 && (
                  <p className="text-muted-foreground">{t('pettyCash.summary.empty')}</p>
                )}
                {totals.byCategory.slice(0, 5).map(([name, value]) => (
                  <div key={name} className="flex justify-between">
                    <span className="truncate mr-2">{name}</span>
                    <span className="font-medium">{formatCurrency(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t('pettyCash.summary.byMethod')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {totals.byMethod.length === 0 && (
                  <p className="text-muted-foreground">{t('pettyCash.summary.empty')}</p>
                )}
                {totals.byMethod.map(([method, value]) => (
                  <div key={method} className="flex justify-between">
                    <span>{paymentMethodLabel(method)}</span>
                    <span className="font-medium">{formatCurrency(value)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('pettyCash.table.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEntries.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">
                  {t('pettyCash.table.empty')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('pettyCash.table.date')}</TableHead>
                      <TableHead>{t('pettyCash.table.category')}</TableHead>
                      <TableHead>{t('pettyCash.table.description')}</TableHead>
                      <TableHead>{t('pettyCash.table.paymentMethod')}</TableHead>
                      <TableHead className="text-right">{t('pettyCash.table.amount')}</TableHead>
                      <TableHead className="text-center">{t('pettyCash.table.receipt')}</TableHead>
                      <TableHead className="text-right">{t('pettyCash.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{format(new Date(entry.date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          {entry.categoryName ? (
                            <Badge variant="secondary">{entry.categoryName}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {t('pettyCash.noCategory')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {entry.description || '-'}
                        </TableCell>
                        <TableCell>{paymentMethodLabel(entry.paymentMethod)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(entry.amount))}
                        </TableCell>
                        <TableCell className="text-center">
                          {entry.receipt ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadReceipt(entry)}
                              title={t('pettyCash.table.viewReceipt')}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {canEditPage && (
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditEntry(entry)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setEntryToDelete(entry)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={4} className="font-semibold">
                        {t('pettyCash.table.total')}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(totals.total)}
                      </TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('pettyCash.categories.title')}</CardTitle>
              <CardDescription>{t('pettyCash.categories.description')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {canEditPage && (
                <div className="flex gap-2">
                  <Input
                    placeholder={t('pettyCash.categories.namePlaceholder')}
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleCreateCategory()
                      }
                    }}
                  />
                  <Button
                    onClick={handleCreateCategory}
                    disabled={!newCategoryName.trim() || savingCategory}
                  >
                    {savingCategory ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    <span className="ml-2">{t('pettyCash.categories.add')}</span>
                  </Button>
                </div>
              )}
              {categories.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">
                  {t('pettyCash.categories.empty')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('pettyCash.categories.name')}</TableHead>
                      <TableHead>{t('pettyCash.categories.active')}</TableHead>
                      <TableHead className="text-right">{t('pettyCash.table.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((cat) => (
                      <TableRow key={cat.id}>
                        <TableCell>
                          {editingCategory?.id === cat.id ? (
                            <Input
                              value={editingCategory.name}
                              onChange={(e) =>
                                setEditingCategory({ ...editingCategory, name: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  handleUpdateCategory(cat, { name: editingCategory.name })
                                  setEditingCategory(null)
                                }
                              }}
                            />
                          ) : (
                            cat.name
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={cat.active}
                            disabled={!canEditPage}
                            onCheckedChange={(v) => handleUpdateCategory(cat, { active: v })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {canEditPage && (
                            <div className="flex justify-end gap-1">
                              {editingCategory?.id === cat.id ? (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      handleUpdateCategory(cat, { name: editingCategory.name })
                                      setEditingCategory(null)
                                    }}
                                  >
                                    {t('common.save')}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setEditingCategory(null)}
                                  >
                                    {t('common.cancel')}
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setEditingCategory(cat)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setCategoryToDelete(cat)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </>
                              )}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entry dialog */}
      <Dialog open={showEntryDialog} onOpenChange={setShowEntryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? t('pettyCash.dialog.editTitle') : t('pettyCash.dialog.newTitle')}
            </DialogTitle>
            <DialogDescription>{t('pettyCash.dialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('pettyCash.form.date')}</Label>
                <Input
                  type="date"
                  value={entryForm.date}
                  onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                />
              </div>
              <div>
                <Label>{t('pettyCash.form.amount')}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryForm.amount}
                  onChange={(e) => setEntryForm({ ...entryForm, amount: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>{t('pettyCash.form.category')}</Label>
              <Select
                value={entryForm.categoryId || 'none'}
                onValueChange={(v) =>
                  setEntryForm({ ...entryForm, categoryId: v === 'none' ? '' : v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('pettyCash.noCategory')}</SelectItem>
                  {activeCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('pettyCash.form.paymentMethod')}</Label>
              <Select
                value={entryForm.paymentMethod}
                onValueChange={(v) =>
                  setEntryForm({ ...entryForm, paymentMethod: v as PettyCashPaymentMethod })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {paymentMethodLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('pettyCash.form.description')}</Label>
              <Textarea
                rows={3}
                value={entryForm.description}
                onChange={(e) => setEntryForm({ ...entryForm, description: e.target.value })}
                placeholder={t('pettyCash.form.descriptionPlaceholder')}
              />
            </div>
            <div>
              <Label>{t('pettyCash.form.receipt')}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) =>
                    setEntryForm({
                      ...entryForm,
                      receipt: e.target.files?.[0] || null,
                      removeExistingReceipt: false,
                    })
                  }
                />
                {editingEntry?.receipt && !entryForm.receipt && !entryForm.removeExistingReceipt && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setEntryForm({ ...entryForm, removeExistingReceipt: true })
                    }
                    title={t('pettyCash.form.removeReceipt')}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    {t('pettyCash.form.removeReceipt')}
                  </Button>
                )}
              </div>
              {editingEntry?.receipt && !entryForm.receipt && !entryForm.removeExistingReceipt && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Paperclip className="h-3 w-3" />
                  {editingEntry.receipt.originalFilename || editingEntry.receipt.filename}
                </p>
              )}
              {entryForm.removeExistingReceipt && (
                <p className="text-xs text-destructive mt-1">
                  {t('pettyCash.form.receiptWillBeRemoved')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEntryDialog(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSaveEntry} disabled={savingEntry}>
              {savingEntry && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete entry confirmation */}
      <AlertDialog
        open={!!entryToDelete}
        onOpenChange={(open) => !open && setEntryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pettyCash.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pettyCash.delete.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntry} disabled={deletingEntry}>
              {deletingEntry && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete category confirmation */}
      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pettyCash.categories.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('pettyCash.categories.deleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
