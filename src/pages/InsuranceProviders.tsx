import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { InsuranceProvider } from '@/lib/types'
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
import { Search, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
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
import { usePermissions } from '@/hooks/usePermissions'
import { InsuranceProviderForm } from '@/components/advances/InsuranceProviderForm'
import { ExtractedProceduresView } from '@/components/advances/ExtractedProceduresView'
import { UploadPDFDialog } from '@/components/advances/UploadPDFDialog'
import { FileText, Upload } from 'lucide-react'

export default function InsuranceProviders() {
  const { user } = useAuthStore()
  const { clinicId } = useParams<{ clinicId: string }>()
  const { canEdit } = usePermissions()
  const [providers, setProviders] = useState<InsuranceProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [providerToDelete, setProviderToDelete] = useState<InsuranceProvider | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<InsuranceProvider | null>(null)
  const [showExtractedProcedures, setShowExtractedProcedures] = useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [providerDocuments, setProviderDocuments] = useState<Record<string, any[]>>({})
  const [showUploadPDF, setShowUploadPDF] = useState(false)
  const [uploadPDFProvider, setUploadPDFProvider] = useState<InsuranceProvider | null>(null)

  const canManageProviders = canEdit('canManageInsuranceProviders')

  useEffect(() => {
    if (clinicId) {
      loadProviders()
    }
  }, [clinicId])

  const loadProviders = async () => {
    if (!clinicId) return

    setLoading(true)
    setError(null)
    try {
      const data = await advancesApi.insuranceProviders.getAll(clinicId)
      setProviders(data)
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar operadoras')
      toast.error('Erro ao carregar operadoras')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
  }

  const filteredProviders = providers.filter((provider) => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      provider.name.toLowerCase().includes(search) ||
      provider.code?.toLowerCase().includes(search) ||
      provider.contactName?.toLowerCase().includes(search) ||
      provider.contactEmail?.toLowerCase().includes(search)
    )
  })

  const handleDeleteClick = (provider: InsuranceProvider) => {
    setProviderToDelete(provider)
    setShowDeleteDialog(true)
  }

  const handleDelete = async () => {
    if (!providerToDelete || !clinicId) return

    setDeleting(true)
    try {
      await advancesApi.insuranceProviders.delete(clinicId, providerToDelete.id)
      toast.success('Operadora excluída com sucesso')
      setShowDeleteDialog(false)
      setProviderToDelete(null)
      loadProviders()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir operadora')
    } finally {
      setDeleting(false)
    }
  }

  const handleEdit = (provider: InsuranceProvider) => {
    setEditingProvider(provider)
    setShowProviderForm(true)
  }

  const handleFormClose = () => {
    setShowProviderForm(false)
    setEditingProvider(null)
    loadProviders()
  }

  const handleUploadPDF = (provider: InsuranceProvider) => {
    setUploadPDFProvider(provider)
    setShowUploadPDF(true)
  }

  const handleUploadPDFClose = () => {
    setShowUploadPDF(false)
    setUploadPDFProvider(null)
  }

  const handleViewDocuments = async (provider: InsuranceProvider) => {
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const response = await fetch(`${API_BASE_URL}/insurance/${provider.id}/documents?clinicId=${clinicId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Erro ao carregar documentos')

      const docs = await response.json()

      if (docs.length === 0) {
        toast.info('Nenhum documento encontrado para esta operadora')
        return
      }

      // Get the most recent completed document
      const completedDoc = docs.find((d: any) => d.processing_status === 'COMPLETED')

      if (!completedDoc) {
        toast.info('Nenhum documento processado encontrado')
        return
      }

      setSelectedDocumentId(completedDoc.id)
      setShowExtractedProcedures(true)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar documentos')
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operadoras e Seguros</h1>
          <p className="text-muted-foreground">
            Gerencie as operadoras de saúde e seguros cadastrados
          </p>
        </div>
        {canManageProviders && (
          <Button onClick={() => setShowProviderForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Operadora
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Operadoras Cadastradas</CardTitle>
              <CardDescription>
                Lista de todas as operadoras de saúde e seguros
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, código ou contato..."
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
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma operadora encontrada' : 'Nenhuma operadora cadastrada'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Documentos</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProviders.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>{provider.code || '-'}</TableCell>
                      <TableCell>{provider.contactName || '-'}</TableCell>
                      <TableCell>{provider.contactEmail || '-'}</TableCell>
                      <TableCell>{provider.contactPhone || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUploadPDF(provider)}
                            title="Enviar novo PDF para extrair procedimentos"
                          >
                            <Upload className="h-4 w-4 mr-1" />
                            Enviar PDF
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocuments(provider)}
                            title="Ver procedimentos extraídos"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Ver Procedimentos
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {canManageProviders && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(provider)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteClick(provider)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
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

      {/* Provider Form Dialog */}
      {showProviderForm && clinicId && (
        <InsuranceProviderForm
          clinicId={clinicId}
          provider={editingProvider || undefined}
          onClose={handleFormClose}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Operadora</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a operadora{' '}
              <strong>{providerToDelete?.name}</strong>? Esta ação não pode ser desfeita.
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

      {/* Upload PDF Dialog */}
      {showUploadPDF && uploadPDFProvider && clinicId && (
        <UploadPDFDialog
          providerId={uploadPDFProvider.id}
          providerName={uploadPDFProvider.name}
          clinicId={clinicId}
          open={showUploadPDF}
          onClose={handleUploadPDFClose}
        />
      )}

      {/* Extracted Procedures View Dialog */}
      {showExtractedProcedures && selectedDocumentId && (
        <ExtractedProceduresView
          documentId={selectedDocumentId}
          onClose={() => {
            setShowExtractedProcedures(false)
            setSelectedDocumentId(null)
          }}
        />
      )}
    </div>
  )
}



