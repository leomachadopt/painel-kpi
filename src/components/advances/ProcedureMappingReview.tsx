import { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

interface ProcedureMapping {
  id: string
  extracted_procedure_code: string
  extracted_description: string
  extracted_is_periciable: boolean
  extracted_adults_only?: boolean
  extracted_value: number | null
  mapped_procedure_base_id: string | null
  confidence_score: number
  ai_periciable_confidence?: number
  ai_adults_only_confidence?: number
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL' | 'UNPAIRED'
  is_unpaired?: boolean // Flag for virtual unparied mappings
  base_code?: string
  base_description?: string
  base_is_periciable?: boolean
  base_adults_only?: boolean
  notes?: string
}

interface ProcedureBase {
  id: string
  code: string
  description: string
  is_periciable: boolean
  adults_only: boolean
}

interface ProcedureMappingReviewProps {
  documentId: string
  providerId: string
  clinicId: string
  onClose: () => void
}

export function ProcedureMappingReview({ documentId, providerId, clinicId, onClose }: ProcedureMappingReviewProps) {
  const [mappings, setMappings] = useState<ProcedureMapping[]>([])
  const [procedureBase, setProcedureBase] = useState<ProcedureBase[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedMapping, setSelectedMapping] = useState<ProcedureMapping | null>(null)
  
  // Estado para rastrear mudanças locais em cada linha
  const [localChanges, setLocalChanges] = useState<Record<string, {
    isPericiable?: boolean
    adultsOnly?: boolean
    code?: string
    description?: string
    value?: number | null
  }>>({})
  
  // Estado para edição inline
  const [editingField, setEditingField] = useState<{mappingId: string, field: 'code' | 'description' | 'value'} | null>(null)
  
  // Estado para seleção múltipla e edição em bloco
  const [selectedMappings, setSelectedMappings] = useState<Set<string>>(new Set())
  const [bulkEditing, setBulkEditing] = useState<{
    isPericiable?: boolean
    adultsOnly?: boolean
  } | null>(null)
  
  // Estado para filtros
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending'>('all')

  useEffect(() => {
    loadMappings()
    loadProcedureBase()
  }, [documentId])

  const loadMappings = async () => {
    try {
      setLoading(true) // Garantir que o loading seja ativado para forçar re-render
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      console.log('[ProcedureMappingReview] Loading mappings for documentId:', documentId)
      console.log('[ProcedureMappingReview] API URL:', `${API_BASE_URL}/insurance/documents/${documentId}/mappings`)

      const response = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/mappings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      console.log('[ProcedureMappingReview] Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[ProcedureMappingReview] Error response:', errorText)
        throw new Error('Erro ao carregar mapeamentos')
      }

      const data = await response.json()
      console.log('[ProcedureMappingReview] Loaded mappings:', data.length, 'items')
      console.log('[ProcedureMappingReview] First mapping:', data[0])
      
      // Log contagens para debug
      const unparied = data.filter((m: any) => m.status === 'UNPAIRED' || m.is_unpaired).length
      const pending = data.filter((m: any) => (m.status === 'PENDING' || m.status === 'MANUAL') && !m.is_unpaired).length
      const approved = data.filter((m: any) => m.status === 'APPROVED').length
      console.log('[ProcedureMappingReview] Contagens:', { unparied, pending, approved, total: data.length })
      
      // Atualizar estado de forma que force re-render
      setMappings([...data]) // Criar novo array para garantir re-render
    } catch (err: any) {
      console.error('[ProcedureMappingReview] Error:', err)
      toast.error(err.message || 'Erro ao carregar mapeamentos')
    } finally {
      setLoading(false)
    }
  }

  const loadProcedureBase = async () => {
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      // Try global first, then clinic-specific
      let response = await fetch(`${API_BASE_URL}/advances/procedures/base/global`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      // If global fails (not mentor), try clinic-specific
      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/advances/procedures/base/${clinicId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
      }

      if (!response.ok) throw new Error('Erro ao carregar tabela base')

      const data = await response.json()
      setProcedureBase(data)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao carregar tabela base')
    }
  }

  const handleCreateMapping = async (mapping: ProcedureMapping) => {
    // For unparied procedures, create mapping first
    if (mapping.is_unpaired || mapping.status === 'UNPAIRED') {
      setProcessing(mapping.id)
      try {
        const token = localStorage.getItem('kpi_token')
        const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

        const response = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/mappings/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            code: mapping.extracted_procedure_code,
            description: mapping.extracted_description,
            value: mapping.extracted_value,
            isPericiable: mapping.extracted_is_periciable,
            adultsOnly: mapping.extracted_adults_only,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao criar mapeamento')
        }

        toast.success('Mapeamento criado. Agora você pode revisar e aprovar.')
        await loadMappings()
      } catch (err: any) {
        toast.error(err.message || 'Erro ao criar mapeamento')
      } finally {
        setProcessing(null)
      }
      return
    }

    // For existing mappings, proceed with approval
    handleApprove(mapping)
  }

  const handleApprove = async (mapping: ProcedureMapping) => {
    setProcessing(mapping.id)
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const response = await fetch(`${API_BASE_URL}/insurance/mappings/${mapping.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ providerId }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao aprovar mapeamento')
      }

      toast.success('Procedimento aprovado e adicionado à operadora')
      await loadMappings()
      // Pequeno delay para garantir que o estado seja atualizado antes de recalcular contagens
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar mapeamento')
    } finally {
      setProcessing(null)
    }
  }

  const handleUpdateMapping = async (
    mappingId: string,
    procedureBaseId: string | null,
    notes?: string,
    extractedIsPericiable?: boolean,
    extractedAdultsOnly?: boolean
  ) => {
    setProcessing(mappingId)
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const response = await fetch(`${API_BASE_URL}/insurance/mappings/${mappingId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mappedProcedureBaseId: procedureBaseId,
          status: 'PENDING',
          notes,
          extractedIsPericiable,
          extractedAdultsOnly,
        }),
      })

      if (!response.ok) throw new Error('Erro ao atualizar mapeamento')

      toast.success('Mapeamento atualizado')
      await loadMappings()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar mapeamento')
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (mappingId: string, notes: string) => {
    setProcessing(mappingId)
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const response = await fetch(`${API_BASE_URL}/insurance/mappings/${mappingId}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mappedProcedureBaseId: null,
          status: 'REJECTED',
          notes,
        }),
      })

      if (!response.ok) throw new Error('Erro ao rejeitar mapeamento')

      toast.success('Procedimento rejeitado')
      await loadMappings()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao rejeitar mapeamento')
    } finally {
      setProcessing(null)
      setSelectedMapping(null)
    }
  }

  // Função para aprovar procedimentos não pareados (cria mapping + aprova de uma vez)
  const handleApproveUnpaired = async (mapping: ProcedureMapping) => {
    setProcessing(mapping.id)
    try {
      // Criar mapping primeiro
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const createResponse = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/mappings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          code: mapping.extracted_procedure_code,
          description: mapping.extracted_description,
          value: mapping.extracted_value,
          isPericiable: mapping.extracted_is_periciable,
          adultsOnly: mapping.extracted_adults_only,
        }),
      })

      if (!createResponse.ok) {
        const errorData = await createResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao criar mapeamento')
      }

      // Aguardar um pouco e recarregar para obter o mapping real
      await new Promise(resolve => setTimeout(resolve, 300))
      await loadMappings()
      
      // Buscar o mapping recém-criado
      const allMappingsResponse = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/mappings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })
      const allMappings = await allMappingsResponse.json()
      const newMapping = allMappings.find((m: ProcedureMapping) => 
        m.extracted_procedure_code === mapping.extracted_procedure_code && 
        !m.is_unpaired &&
        m.status !== 'APPROVED'
      )
      
      if (newMapping) {
        // Aprovar o mapping recém-criado
        await handleApprove(newMapping)
      } else {
        toast.success('Procedimento já foi processado')
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar procedimento não pareado')
    } finally {
      setProcessing(null)
    }
  }

  const getStatusBadge = (status: string, isUnpaired?: boolean) => {
    if (isUnpaired || status === 'UNPAIRED') {
      return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">Não Pareado</Badge>
    }
    
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-500">Aprovado</Badge>
      case 'REJECTED':
        return <Badge variant="destructive">Rejeitado</Badge>
      case 'MANUAL':
        return <Badge variant="secondary">Manual</Badge>
      case 'PENDING':
      default:
        return <Badge variant="outline">Pendente</Badge>
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600'
    if (confidence >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  // Função para verificar se há mudanças nas classificações
  const hasClassificationChanges = (mappingId: string): boolean => {
    const changes = localChanges[mappingId]
    if (!changes) return false
    
    const mapping = mappings.find(m => m.id === mappingId)
    if (!mapping) return false
    
    const hasPericiableChange = changes.isPericiable !== undefined && changes.isPericiable !== mapping.extracted_is_periciable
    const hasAdultsOnlyChange = changes.adultsOnly !== undefined && changes.adultsOnly !== (mapping.extracted_adults_only ?? false)
    
    const result = hasPericiableChange || hasAdultsOnlyChange
    
    // Debug log
    if (result) {
      console.log('[hasClassificationChanges]', {
        mappingId,
        changes,
        original: {
          isPericiable: mapping.extracted_is_periciable,
          adultsOnly: mapping.extracted_adults_only
        },
        hasPericiableChange,
        hasAdultsOnlyChange,
        result
      })
    }
    
    return result
  }

  // Função para lidar com mudanças nas classificações
  const handleClassificationChange = (mappingId: string, field: 'isPericiable' | 'adultsOnly', value: boolean) => {
    console.log('[handleClassificationChange]', { mappingId, field, value })
    setLocalChanges(prev => {
      const newChanges = {
        ...prev,
        [mappingId]: {
          ...prev[mappingId],
          [field]: value
        }
      }
      console.log('[handleClassificationChange] New localChanges:', newChanges)
      return newChanges
    })
  }

  // Função para lidar com edição de campos
  const handleFieldEdit = (mappingId: string, field: 'code' | 'description' | 'value', value: string | number | null) => {
    setLocalChanges(prev => ({
      ...prev,
      [mappingId]: {
        ...prev[mappingId],
        [field]: value
      }
    }))
  }

  // Funções para seleção múltipla
  const toggleSelection = (mappingId: string) => {
    setSelectedMappings(prev => {
      const newSet = new Set(prev)
      if (newSet.has(mappingId)) {
        newSet.delete(mappingId)
      } else {
        newSet.add(mappingId)
      }
      return newSet
    })
  }

  const selectAll = () => {
    const selectableMappings = mappings.filter(m => 
      m.status !== 'APPROVED' && m.status !== 'REJECTED'
    )
    setSelectedMappings(new Set(selectableMappings.map(m => m.id)))
  }

  const deselectAll = () => {
    setSelectedMappings(new Set())
  }

  // Função para aprovar em bloco
  const handleBulkApprove = async () => {
    if (selectedMappings.size === 0) {
      toast.error('Selecione pelo menos um procedimento')
      return
    }
    
    setProcessing('bulk')
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'
      
      // Preparar mudanças: considerar primeiro localChanges, depois bulkEditing
      const changes: Record<string, any> = {}
      
      selectedMappings.forEach(mappingId => {
        const mapping = mappings.find(m => m.id === mappingId)
        if (!mapping) return
        
        // PRIMEIRO: Verificar se há mudanças individuais
        const individualChanges = localChanges[mappingId]
        
        // Usar mudanças individuais como base, se existirem
        const baseIsPericiable = individualChanges?.isPericiable ?? mapping.extracted_is_periciable
        const baseAdultsOnly = individualChanges?.adultsOnly ?? (mapping.extracted_adults_only ?? false)
        
        // APLICAR edição em bloco apenas se o usuário explicitamente escolheu no select
        // Se não houver escolha em bloco, preservar mudanças individuais
        changes[mappingId] = {
          isPericiable: bulkEditing?.isPericiable !== undefined 
            ? bulkEditing.isPericiable  // Select em bloco tem prioridade
            : baseIsPericiable,  // Senão, usa mudança individual ou valor original
          adultsOnly: bulkEditing?.adultsOnly !== undefined 
            ? bulkEditing.adultsOnly  // Select em bloco tem prioridade
            : baseAdultsOnly  // Senão, usa mudança individual ou valor original
        }
      })
      
      const response = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/mappings/bulk-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mappingIds: Array.from(selectedMappings),
          providerId,
          changes: Object.keys(changes).length > 0 ? changes : undefined
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Erro ao aprovar em bloco')
      }
      
      const result = await response.json()
      toast.success(`${result.approvedCount} procedimento(s) aprovado(s) com sucesso`)
      
      // Limpar seleção e mudanças locais
      setSelectedMappings(new Set())
      setLocalChanges({})
      setBulkEditing(null)
      await loadMappings()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar em bloco')
    } finally {
      setProcessing(null)
    }
  }

  // Função para salvar e aprovar com mudanças
  const handleSaveAndApprove = async (mappingId: string) => {
    let mapping = mappings.find(m => m.id === mappingId)
    const changes = localChanges[mappingId]
    
    if (!mapping) return
    
    setProcessing(mappingId)
    
    try {
      // Se for não pareado, criar mapping primeiro
      if (mapping.is_unpaired || mapping.status === 'UNPAIRED') {
        const token = localStorage.getItem('kpi_token')
        const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

        const createResponse = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/mappings/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            code: changes?.code ?? mapping.extracted_procedure_code,
            description: changes?.description ?? mapping.extracted_description,
            value: changes?.value ?? mapping.extracted_value,
            isPericiable: changes?.isPericiable ?? mapping.extracted_is_periciable,
            adultsOnly: changes?.adultsOnly ?? mapping.extracted_adults_only,
          }),
        })

        if (!createResponse.ok) {
          const errorData = await createResponse.json().catch(() => ({}))
          throw new Error(errorData.error || 'Erro ao criar mapeamento')
        }

        const createData = await createResponse.json()
        // Aguardar um pouco para garantir que o mapping foi criado
        await new Promise(resolve => setTimeout(resolve, 300))
        await loadMappings() // Recarregar para obter o mapping real
        
        // Buscar o mapping recém-criado
        const token2 = localStorage.getItem('kpi_token')
        const API_BASE_URL2 = import.meta.env.VITE_API_URL || '/api'
        const allMappingsResponse = await fetch(`${API_BASE_URL2}/insurance/documents/${documentId}/mappings`, {
          headers: {
            'Authorization': `Bearer ${token2}`,
          },
        })
        const allMappings = await allMappingsResponse.json()
        const newMapping = allMappings.find((m: ProcedureMapping) => 
          m.extracted_procedure_code === mapping.extracted_procedure_code && 
          !m.is_unpaired && 
          m.id !== mappingId
        )
        if (newMapping) {
          mapping = newMapping
          mappingId = newMapping.id
        }
      }

      // Atualizar com as mudanças (se houver mudanças nas classificações)
      if (changes && (changes.isPericiable !== undefined || changes.adultsOnly !== undefined)) {
        await handleUpdateMapping(
          mappingId,
          mapping.mapped_procedure_base_id,
          mapping.notes,
          changes.isPericiable ?? mapping.extracted_is_periciable,
          changes.adultsOnly ?? mapping.extracted_adults_only
        )
        // Aguardar um pouco e recarregar
        await new Promise(resolve => setTimeout(resolve, 300))
        await loadMappings()
        
        // Buscar o mapping atualizado
        const token3 = localStorage.getItem('kpi_token')
        const API_BASE_URL3 = import.meta.env.VITE_API_URL || '/api'
        const updatedMappingsResponse = await fetch(`${API_BASE_URL3}/insurance/documents/${documentId}/mappings`, {
          headers: {
            'Authorization': `Bearer ${token3}`,
          },
        })
        const updatedMappings = await updatedMappingsResponse.json()
        const updatedMapping = updatedMappings.find((m: ProcedureMapping) => m.id === mappingId)
        if (updatedMapping) {
          mapping = updatedMapping
        }
      }

      // Aprovar
      await handleApprove(mapping)
      
      // Limpar mudanças locais
      setLocalChanges(prev => {
        const newChanges = { ...prev }
        delete newChanges[mappingId]
        return newChanges
      })
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar e aprovar')
    } finally {
      setProcessing(null)
    }
  }

  // Calcular quantos procedimentos selecionados têm mudanças individuais
  const selectedWithIndividualChanges = useMemo(() => {
    let count = 0
    selectedMappings.forEach(mappingId => {
      const individualChanges = localChanges[mappingId]
      if (individualChanges && (
        individualChanges.isPericiable !== undefined || 
        individualChanges.adultsOnly !== undefined
      )) {
        count++
      }
    })
    return count
  }, [selectedMappings, localChanges])

  // Usar useMemo para recalcular contagens sempre que mappings mudar
  // IMPORTANTE: Hooks devem ser chamados antes de qualquer return condicional
  const { unpariedCount, pendingCount, approvedCount, filteredMappings } = useMemo(() => {
    const unparied = mappings.filter(m => m.status === 'UNPAIRED' || m.is_unpaired).length
    const pending = mappings.filter(m => (m.status === 'PENDING' || m.status === 'MANUAL') && !m.is_unpaired).length
    const approved = mappings.filter(m => m.status === 'APPROVED').length
    
    // Filtrar mappings baseado no filtro de status
    let filtered = mappings
    if (statusFilter === 'approved') {
      filtered = mappings.filter(m => m.status === 'APPROVED')
    } else if (statusFilter === 'pending') {
      filtered = mappings.filter(m => m.status !== 'APPROVED' && m.status !== 'REJECTED')
    }
    
    console.log('[ProcedureMappingReview] Recalculando contagens:', { 
      unparied, 
      pending, 
      approved, 
      total: mappings.length,
      filtered: filtered.length,
      filter: statusFilter,
      sampleStatuses: mappings.slice(0, 5).map(m => ({ code: m.extracted_procedure_code, status: m.status, is_unpaired: m.is_unpaired }))
    })
    
    return { 
      unpariedCount: unparied, 
      pendingCount: pending, 
      approvedCount: approved,
      filteredMappings: filtered
    }
  }, [mappings, statusFilter])

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisão de Procedimentos Extraídos</DialogTitle>
          <DialogDescription>
            Revise e pareie os procedimentos extraídos. Procedimentos não pareados podem ser pareados manualmente ou pela IA.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mappings.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Não Pareados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{unpariedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros de status */}
        <div className="mb-4 flex items-center gap-4">
          <Label className="text-sm font-medium">Filtrar por status:</Label>
          <div className="flex items-center gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="h-8"
            >
              Todos ({mappings.length})
            </Button>
            <Button
              variant={statusFilter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('pending')}
              className="h-8"
            >
              Pendentes ({unpariedCount + pendingCount})
            </Button>
            <Button
              variant={statusFilter === 'approved' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('approved')}
              className="h-8"
            >
              Aprovados ({approvedCount})
            </Button>
          </div>
        </div>

        {/* Barra de ações em bloco - fixa durante scroll */}
        {selectedMappings.size > 0 && (
          <div className="sticky top-0 z-10 mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {selectedMappings.size} procedimento(s) selecionado(s)
                </span>
                {selectedWithIndividualChanges > 0 && (
                  <span className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                    {selectedWithIndividualChanges} com mudanças individuais
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deselectAll}
                  className="h-7 text-xs"
                >
                  Desmarcar todos
                </Button>
              </div>
            </div>
            
            {selectedWithIndividualChanges > 0 && !bulkEditing && (
              <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs text-yellow-800 dark:text-yellow-200">
                ℹ️ {selectedWithIndividualChanges} procedimento(s) têm mudanças individuais que serão preservadas. Use os selects acima para aplicar mudanças em bloco (sobrescreverá as individuais).
              </div>
            )}
            
            {bulkEditing && selectedWithIndividualChanges > 0 && (
              <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded text-xs text-orange-800 dark:text-orange-200">
                ⚠️ As mudanças em bloco sobrescreverão as mudanças individuais dos {selectedWithIndividualChanges} procedimento(s) modificados.
              </div>
            )}
            
            <div className="flex items-center gap-4 flex-wrap">
              {/* Edição em bloco - Periciável */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Periciável:</Label>
                <Select
                  value={bulkEditing?.isPericiable === undefined ? 'none' : bulkEditing.isPericiable ? 'true' : 'false'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setBulkEditing(prev => {
                        if (!prev) return null
                        const newEdit = { ...prev }
                        delete newEdit.isPericiable
                        return Object.keys(newEdit).length > 0 ? newEdit : null
                      })
                    } else {
                      setBulkEditing(prev => ({
                        ...prev,
                        isPericiable: value === 'true'
                      }))
                    }
                  }}
                >
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue placeholder="Manter atual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Manter atual</SelectItem>
                    <SelectItem value="true">Periciável</SelectItem>
                    <SelectItem value="false">Não Periciável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Edição em bloco - Adultos */}
              <div className="flex items-center gap-2">
                <Label className="text-sm">Idade:</Label>
                <Select
                  value={bulkEditing?.adultsOnly === undefined ? 'none' : bulkEditing.adultsOnly ? 'true' : 'false'}
                  onValueChange={(value) => {
                    if (value === 'none') {
                      setBulkEditing(prev => {
                        if (!prev) return null
                        const newEdit = { ...prev }
                        delete newEdit.adultsOnly
                        return Object.keys(newEdit).length > 0 ? newEdit : null
                      })
                    } else {
                      setBulkEditing(prev => ({
                        ...prev,
                        adultsOnly: value === 'true'
                      }))
                    }
                  }}
                >
                  <SelectTrigger className="w-40 h-8">
                    <SelectValue placeholder="Manter atual" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Manter atual</SelectItem>
                    <SelectItem value="true">Apenas Adultos</SelectItem>
                    <SelectItem value="false">Todas Idades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Botão Aprovar em Bloco */}
              <Button
                variant="default"
                size="sm"
                onClick={handleBulkApprove}
                disabled={processing === 'bulk'}
                className="bg-green-600 hover:bg-green-700"
              >
                {processing === 'bulk' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Aprovando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Aprovar {selectedMappings.size} selecionado(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      filteredMappings.filter(m => m.status !== 'APPROVED' && m.status !== 'REJECTED').length > 0 &&
                      filteredMappings.filter(m => m.status !== 'APPROVED' && m.status !== 'REJECTED').every(m => selectedMappings.has(m.id))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        // Selecionar apenas os filtrados que podem ser selecionados
                        const selectableFiltered = filteredMappings.filter(m => 
                          m.status !== 'APPROVED' && m.status !== 'REJECTED'
                        )
                        setSelectedMappings(prev => {
                          const newSet = new Set(prev)
                          selectableFiltered.forEach(m => newSet.add(m.id))
                          return newSet
                        })
                      } else {
                        // Desmarcar apenas os filtrados
                        setSelectedMappings(prev => {
                          const newSet = new Set(prev)
                          filteredMappings.forEach(m => newSet.delete(m.id))
                          return newSet
                        })
                      }
                    }}
                  />
                </TableHead>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-32">Código</TableHead>
                <TableHead className="min-w-[300px] max-w-[500px]">Descrição</TableHead>
                <TableHead className="w-24">Valor</TableHead>
                <TableHead className="w-48">Classificação</TableHead>
                <TableHead className="w-40 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {mappings.length === 0 
                      ? 'Nenhum procedimento encontrado'
                      : `Nenhum procedimento encontrado com o filtro "${statusFilter === 'approved' ? 'Aprovados' : statusFilter === 'pending' ? 'Pendentes' : 'Todos'}"`
                    }
                  </TableCell>
                </TableRow>
              ) : (
                filteredMappings.map((mapping) => {
                  const changes = localChanges[mapping.id]
                  const currentIsPericiable = changes?.isPericiable ?? mapping.extracted_is_periciable
                  const currentAdultsOnly = changes?.adultsOnly ?? (mapping.extracted_adults_only ?? false)
                  const currentCode = changes?.code ?? mapping.extracted_procedure_code
                  const currentDescription = changes?.description ?? mapping.extracted_description
                  const currentValue = changes?.value ?? mapping.extracted_value
                  const hasChanges = hasClassificationChanges(mapping.id)
                  
                  return (
                    <TableRow 
                      key={mapping.id} 
                      className={`${mapping.is_unpaired ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''} ${selectedMappings.has(mapping.id) ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}
                    >
                      <TableCell className="w-12">
                        <Checkbox
                          checked={selectedMappings.has(mapping.id)}
                          onCheckedChange={() => toggleSelection(mapping.id)}
                          disabled={mapping.status === 'APPROVED' || mapping.status === 'REJECTED'}
                        />
                      </TableCell>
                      <TableCell className="w-20">{getStatusBadge(mapping.status, mapping.is_unpaired)}</TableCell>
                      
                      {/* Código com edição inline */}
                      <TableCell className="w-32">
                        <div className="flex items-center gap-1">
                          {editingField?.mappingId === mapping.id && editingField.field === 'code' ? (
                            <Input 
                              value={currentCode}
                              onChange={(e) => handleFieldEdit(mapping.id, 'code', e.target.value)}
                              onBlur={() => setEditingField(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingField(null)
                                }
                              }}
                              className="h-7 text-xs font-mono"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="font-mono text-xs">{currentCode}</span>
                              <Edit2 
                                className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-primary flex-shrink-0"
                                onClick={() => setEditingField({mappingId: mapping.id, field: 'code'})}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Descrição com edição inline */}
                      <TableCell className="min-w-[300px] max-w-[500px]">
                        <div className="flex items-center gap-1">
                          {editingField?.mappingId === mapping.id && editingField.field === 'description' ? (
                            <Input 
                              value={currentDescription}
                              onChange={(e) => handleFieldEdit(mapping.id, 'description', e.target.value)}
                              onBlur={() => setEditingField(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingField(null)
                                }
                              }}
                              className="h-7 text-xs"
                              autoFocus
                            />
                          ) : (
                            <>
                              <div className="truncate flex-1" title={currentDescription}>
                                {currentDescription}
                              </div>
                              <Edit2 
                                className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-primary flex-shrink-0"
                                onClick={() => setEditingField({mappingId: mapping.id, field: 'description'})}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Valor com edição inline */}
                      <TableCell className="w-24">
                        <div className="flex items-center gap-1">
                          {editingField?.mappingId === mapping.id && editingField.field === 'value' ? (
                            <Input 
                              type="number"
                              step="0.01"
                              value={currentValue ?? ''}
                              onChange={(e) => handleFieldEdit(mapping.id, 'value', e.target.value ? parseFloat(e.target.value) : null)}
                              onBlur={() => setEditingField(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  setEditingField(null)
                                }
                              }}
                              className="h-7 text-xs w-20"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="text-sm">
                                {currentValue != null ? `€ ${Number(currentValue).toFixed(2)}` : '-'}
                              </span>
                              <Edit2 
                                className="h-3 w-3 text-muted-foreground cursor-pointer hover:text-primary flex-shrink-0"
                                onClick={() => setEditingField({mappingId: mapping.id, field: 'value'})}
                              />
                            </>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Classificações com botões toggle */}
                      <TableCell className="w-48">
                        <div className="space-y-2">
                          {/* Toggle Periciável */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant={currentIsPericiable ? "default" : "outline"}
                              size="sm"
                              className={`h-7 text-xs px-3 ${currentIsPericiable ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}`}
                              onClick={() => handleClassificationChange(mapping.id, 'isPericiable', !currentIsPericiable)}
                              disabled={processing === mapping.id}
                            >
                              {currentIsPericiable ? "Periciável" : "Não Periciável"}
                            </Button>
                            {(mapping.ai_periciable_confidence ?? 0) > 0 && (
                              <span className={`text-xs font-semibold ${getConfidenceColor(mapping.ai_periciable_confidence ?? 0)}`}>
                                ({((mapping.ai_periciable_confidence ?? 0) * 100).toFixed(0)}%)
                              </span>
                            )}
                          </div>
                          
                          {/* Toggle Adultos */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              variant={currentAdultsOnly ? "default" : "outline"}
                              size="sm"
                              className={`h-7 text-xs px-3 ${currentAdultsOnly ? 'bg-orange-600 hover:bg-orange-700 text-white' : ''}`}
                              onClick={() => handleClassificationChange(mapping.id, 'adultsOnly', !currentAdultsOnly)}
                              disabled={processing === mapping.id}
                            >
                              {currentAdultsOnly ? "Apenas Adultos" : "Todas Idades"}
                            </Button>
                            {(mapping.ai_adults_only_confidence ?? 0) > 0 && (
                              <span className={`text-xs font-semibold ${getConfidenceColor(mapping.ai_adults_only_confidence ?? 0)}`}>
                                ({((mapping.ai_adults_only_confidence ?? 0) * 100).toFixed(0)}%)
                              </span>
                            )}
                          </div>
                          
                          {mapping.is_unpaired && !hasChanges && (
                            <span className="text-xs text-orange-600 italic">Não classificado</span>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Ações - Botão condicional */}
                      <TableCell className="w-40">
                        {(() => {
                          // Recalcular hasChanges aqui para garantir que está atualizado
                          const currentChanges = localChanges[mapping.id]
                          const hasChangesNow = currentChanges && (
                            (currentChanges.isPericiable !== undefined && currentChanges.isPericiable !== mapping.extracted_is_periciable) ||
                            (currentChanges.adultsOnly !== undefined && currentChanges.adultsOnly !== (mapping.extracted_adults_only ?? false))
                          )
                          return hasChangesNow
                        })() ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSaveAndApprove(mapping.id)}
                            disabled={processing === mapping.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processing === mapping.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Salvar e Aprovar
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            {mapping.status === 'APPROVED' ? (
                              <CheckCircle className="h-5 w-5 text-green-600" title="Aprovado" />
                            ) : mapping.status === 'REJECTED' ? (
                              <XCircle className="h-5 w-5 text-red-600" title="Rejeitado" />
                            ) : mapping.is_unpaired || mapping.status === 'UNPAIRED' ? (
                              // Para não pareados, mostrar "Aprovar" que cria mapping + aprova de uma vez
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApproveUnpaired(mapping)}
                                disabled={processing === mapping.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {processing === mapping.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Aprovar
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApprove(mapping)}
                                disabled={processing === mapping.id}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                {processing === mapping.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Aprovar
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Review Dialog */}
        {selectedMapping && (
          <Dialog open={!!selectedMapping} onOpenChange={() => setSelectedMapping(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Revisar Mapeamento</DialogTitle>
                <DialogDescription>
                  Código: {selectedMapping.extracted_procedure_code}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label>Descrição Extraída</Label>
                  <p className="text-sm mt-1">{selectedMapping.extracted_description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Valor Extraído</Label>
                    <p className="text-sm mt-1">
                      {selectedMapping.extracted_value != null
                        ? `€ ${Number(selectedMapping.extracted_value).toFixed(2)}`
                        : 'Não informado'}
                    </p>
                  </div>
                </div>

                {/* AI Confidence Warning */}
                {((selectedMapping.ai_periciable_confidence ?? 0) < 0.7 || (selectedMapping.ai_adults_only_confidence ?? 0) < 0.7) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-800">Baixa confiança da IA</p>
                        <p className="text-xs text-yellow-700 mt-1">
                          A IA não teve certeza na classificação. Por favor, revise manualmente os campos abaixo:
                        </p>
                        <ul className="text-xs text-yellow-700 mt-1 ml-4 list-disc">
                          {(selectedMapping.ai_periciable_confidence ?? 0) < 0.7 && (
                            <li>Periciável: {((selectedMapping.ai_periciable_confidence ?? 0) * 100).toFixed(0)}% de confiança</li>
                          )}
                          {(selectedMapping.ai_adults_only_confidence ?? 0) < 0.7 && (
                            <li>Exclusivo adultos: {((selectedMapping.ai_adults_only_confidence ?? 0) * 100).toFixed(0)}% de confiança</li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="flex items-center gap-2">
                      Periciável *
                      {(selectedMapping.ai_periciable_confidence ?? 0) > 0 && (
                        <span className={`text-xs font-semibold ${getConfidenceColor(selectedMapping.ai_periciable_confidence ?? 0)}`}>
                          (IA: {((selectedMapping.ai_periciable_confidence ?? 0) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </Label>
                    <Select
                      value={selectedMapping.extracted_is_periciable ? 'true' : 'false'}
                      onValueChange={(value) => {
                        setSelectedMapping({
                          ...selectedMapping,
                          extracted_is_periciable: value === 'true',
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Não</SelectItem>
                        <SelectItem value="true">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="flex items-center gap-2">
                      Exclusivo para Adultos *
                      {(selectedMapping.ai_adults_only_confidence ?? 0) > 0 && (
                        <span className={`text-xs font-semibold ${getConfidenceColor(selectedMapping.ai_adults_only_confidence ?? 0)}`}>
                          (IA: {((selectedMapping.ai_adults_only_confidence ?? 0) * 100).toFixed(0)}%)
                        </span>
                      )}
                    </Label>
                    <Select
                      value={(selectedMapping.extracted_adults_only ?? false) ? 'true' : 'false'}
                      onValueChange={(value) => {
                        setSelectedMapping({
                          ...selectedMapping,
                          extracted_adults_only: value === 'true',
                        })
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Crianças e Adultos</SelectItem>
                        <SelectItem value="true">Apenas Adultos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Mapear para Procedimento Base (Opcional)</Label>
                  <Select
                    value={selectedMapping.mapped_procedure_base_id || undefined}
                    onValueChange={(value) => {
                      setSelectedMapping({
                        ...selectedMapping,
                        mapped_procedure_base_id: value,
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um procedimento (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {procedureBase.map((proc) => (
                        <SelectItem key={proc.id} value={proc.id}>
                          {proc.code} - {proc.description}
                          {proc.is_periciable && ' (Periciável)'}
                          {proc.adults_only && ' (Apenas adultos)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    O pareamento é opcional. Você pode aprovar o procedimento mesmo sem pareamento.
                  </p>
                </div>

                <div>
                  <Label>Observações</Label>
                  <Textarea
                    value={selectedMapping.notes || ''}
                    onChange={(e) =>
                      setSelectedMapping({
                        ...selectedMapping,
                        notes: e.target.value,
                      })
                    }
                    placeholder="Adicione observações sobre este mapeamento"
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedMapping(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleReject(selectedMapping.id, selectedMapping.notes || '')}
                    disabled={processing === selectedMapping.id}
                  >
                    Rejeitar
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setProcessing(selectedMapping.id)
                      try {
                        const token = localStorage.getItem('kpi_token')
                        const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

                        // Se for procedimento não pareado, criar mapping primeiro
                        let mappingId = selectedMapping.id
                        if (selectedMapping.is_unpaired || selectedMapping.status === 'UNPAIRED') {
                          const createResponse = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/mappings/create`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              code: selectedMapping.extracted_procedure_code,
                              description: selectedMapping.extracted_description,
                              value: selectedMapping.extracted_value,
                              isPericiable: selectedMapping.extracted_is_periciable,
                              adultsOnly: selectedMapping.extracted_adults_only,
                            }),
                          })

                          if (!createResponse.ok) {
                            const errorData = await createResponse.json().catch(() => ({}))
                            throw new Error(errorData.error || 'Erro ao criar mapeamento')
                          }

                          const createData = await createResponse.json()
                          mappingId = createData.mappingId
                        }

                        // Atualizar o mapping
                        await handleUpdateMapping(
                          mappingId,
                          selectedMapping.mapped_procedure_base_id || null,
                          selectedMapping.notes,
                          selectedMapping.extracted_is_periciable,
                          selectedMapping.extracted_adults_only
                        )
                        // Recarregar mappings para atualizar contagens
                        await loadMappings()
                        setSelectedMapping(null)
                      } catch (err: any) {
                        toast.error(err.message || 'Erro ao salvar')
                        setProcessing(null)
                      }
                    }}
                    disabled={processing === selectedMapping.id}
                  >
                    {processing === selectedMapping.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar'
                    )}
                  </Button>
                  <Button
                    onClick={async () => {
                      setProcessing(selectedMapping.id)
                      try {
                        const token = localStorage.getItem('kpi_token')
                        const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

                        // Se for procedimento não pareado, criar mapping primeiro
                        let mappingId = selectedMapping.id
                        if (selectedMapping.is_unpaired || selectedMapping.status === 'UNPAIRED') {
                          const createResponse = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/mappings/create`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              code: selectedMapping.extracted_procedure_code,
                              description: selectedMapping.extracted_description,
                              value: selectedMapping.extracted_value,
                              isPericiable: selectedMapping.extracted_is_periciable,
                              adultsOnly: selectedMapping.extracted_adults_only,
                            }),
                          })

                          if (!createResponse.ok) {
                            const errorData = await createResponse.json().catch(() => ({}))
                            throw new Error(errorData.error || 'Erro ao criar mapeamento')
                          }

                          const createData = await createResponse.json()
                          mappingId = createData.mappingId
                          
                          // Recarregar mappings para obter o novo ID real
                          await loadMappings()
                          
                          // Buscar o mapping recém-criado
                          const updatedMappings = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/mappings`, {
                            headers: { 'Authorization': `Bearer ${token}` },
                          }).then(r => r.json())
                          
                          const newMapping = updatedMappings.find((m: any) => 
                            m.extracted_procedure_code === selectedMapping.extracted_procedure_code && 
                            !m.is_unpaired &&
                            m.id === mappingId
                          )
                          
                          if (!newMapping) {
                            throw new Error('Erro ao encontrar mapeamento criado')
                          }
                          
                          mappingId = newMapping.id
                        }

                        // Atualizar o mapping com os valores editados
                        await fetch(`${API_BASE_URL}/insurance/mappings/${mappingId}/update`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`,
                          },
                          body: JSON.stringify({
                            mappedProcedureBaseId: selectedMapping.mapped_procedure_base_id || null,
                            status: 'PENDING',
                            notes: selectedMapping.notes,
                            extractedIsPericiable: selectedMapping.extracted_is_periciable,
                            extractedAdultsOnly: selectedMapping.extracted_adults_only,
                          }),
                        })

                        // Depois aprovar (handleApprove já chama loadMappings internamente)
                        await handleApprove({ ...selectedMapping, id: mappingId })
                        setSelectedMapping(null)
                      } catch (err: any) {
                        toast.error(err.message || 'Erro ao salvar e aprovar')
                        setProcessing(null)
                      }
                    }}
                    disabled={processing === selectedMapping.id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {processing === selectedMapping.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Aprovando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Salvar e Aprovar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
