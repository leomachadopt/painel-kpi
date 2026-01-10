import { useState, useEffect } from 'react'
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
import { Loader2, CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react'
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
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MANUAL'
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

  useEffect(() => {
    loadMappings()
    loadProcedureBase()
  }, [documentId])

  const loadMappings = async () => {
    try {
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
      setMappings(data)
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

  const getStatusBadge = (status: string) => {
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

  const pendingCount = mappings.filter(m => m.status === 'PENDING' || m.status === 'MANUAL').length
  const approvedCount = mappings.filter(m => m.status === 'APPROVED').length

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Revisão de Procedimentos Extraídos</DialogTitle>
          <DialogDescription>
            Revise e aprove os procedimentos extraídos do PDF pela IA
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-4 mb-4">
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

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Status</TableHead>
                <TableHead className="w-32">Código</TableHead>
                <TableHead className="min-w-[200px] max-w-[300px]">Descrição</TableHead>
                <TableHead className="w-24">Valor</TableHead>
                <TableHead className="w-36">Classificação IA</TableHead>
                <TableHead className="w-32">Match Base</TableHead>
                <TableHead className="w-32 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhum procedimento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                mappings.map((mapping) => (
                  <TableRow key={mapping.id}>
                    <TableCell className="w-20">{getStatusBadge(mapping.status)}</TableCell>
                    <TableCell className="w-32 font-mono text-xs">{mapping.extracted_procedure_code}</TableCell>
                    <TableCell className="min-w-[200px] max-w-[300px]">
                      <div className="truncate" title={mapping.extracted_description}>
                        {mapping.extracted_description}
                      </div>
                    </TableCell>
                    <TableCell className="w-24 text-sm">
                      {mapping.extracted_value != null ? `€ ${Number(mapping.extracted_value).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell className="w-36">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          {mapping.extracted_is_periciable ? (
                            <Badge variant="secondary" className="text-xs">Periciável</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Não periciável</span>
                          )}
                          {(mapping.ai_periciable_confidence ?? 0) > 0 && (
                            <span className={`text-xs font-semibold ${getConfidenceColor(mapping.ai_periciable_confidence ?? 0)}`}>
                              ({((mapping.ai_periciable_confidence ?? 0) * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {mapping.extracted_adults_only ? (
                            <Badge variant="secondary" className="text-xs">Apenas adultos</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Todas idades</span>
                          )}
                          {(mapping.ai_adults_only_confidence ?? 0) > 0 && (
                            <span className={`text-xs font-semibold ${getConfidenceColor(mapping.ai_adults_only_confidence ?? 0)}`}>
                              ({((mapping.ai_adults_only_confidence ?? 0) * 100).toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="w-32">
                      {mapping.mapped_procedure_base_id ? (
                        <div className="space-y-1">
                          <div className="font-mono text-xs">{mapping.base_code}</div>
                          <div className="text-xs text-muted-foreground truncate" title={mapping.base_description}>
                            {mapping.base_description}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="w-32">
                      <div className="flex items-center justify-end gap-2">
                        {mapping.status === 'APPROVED' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : mapping.status === 'REJECTED' ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMapping(mapping)}
                              disabled={processing === mapping.id}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Revisar
                            </Button>
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
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
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
                      await handleUpdateMapping(
                        selectedMapping.id,
                        selectedMapping.mapped_procedure_base_id || null,
                        selectedMapping.notes,
                        selectedMapping.extracted_is_periciable,
                        selectedMapping.extracted_adults_only
                      )
                      setSelectedMapping(null)
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
                        // First save the edited values
                        const token = localStorage.getItem('kpi_token')
                        const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

                        await fetch(`${API_BASE_URL}/insurance/mappings/${selectedMapping.id}/update`, {
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

                        // Then approve
                        await handleApprove(selectedMapping)
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
