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
  extracted_value: number | null
  mapped_procedure_base_id: string | null
  confidence_score: number
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

      const response = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/mappings`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) throw new Error('Erro ao carregar mapeamentos')

      const data = await response.json()
      setMappings(data)
    } catch (err: any) {
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
    if (!mapping.mapped_procedure_base_id) {
      toast.error('Selecione um procedimento da tabela base primeiro')
      return
    }

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

      if (!response.ok) throw new Error('Erro ao aprovar mapeamento')

      toast.success('Procedimento aprovado e adicionado à operadora')
      await loadMappings()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao aprovar mapeamento')
    } finally {
      setProcessing(null)
    }
  }

  const handleUpdateMapping = async (mappingId: string, procedureBaseId: string, notes?: string) => {
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
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
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

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Descrição Extraída</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Periciável</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Confiança</TableHead>
                <TableHead className="text-right">Ações</TableHead>
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
                    <TableCell>{getStatusBadge(mapping.status)}</TableCell>
                    <TableCell className="font-mono text-sm">{mapping.extracted_procedure_code}</TableCell>
                    <TableCell className="max-w-xs truncate">{mapping.extracted_description}</TableCell>
                    <TableCell>
                      {mapping.extracted_value ? `R$ ${mapping.extracted_value.toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {mapping.extracted_is_periciable ? (
                        <Badge variant="secondary">Sim</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {mapping.mapped_procedure_base_id ? (
                        <div className="space-y-1">
                          <div className="font-mono text-xs">{mapping.base_code}</div>
                          <div className="text-xs text-muted-foreground truncate max-w-xs">
                            {mapping.base_description}
                          </div>
                        </div>
                      ) : (
                        <Badge variant="outline">Sem match</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`font-semibold ${getConfidenceColor(mapping.confidence_score)}`}>
                        {(mapping.confidence_score * 100).toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell>
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
                            {mapping.mapped_procedure_base_id && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApprove(mapping)}
                                disabled={processing === mapping.id}
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
                      {selectedMapping.extracted_value
                        ? `R$ ${selectedMapping.extracted_value.toFixed(2)}`
                        : 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <Label>Periciável</Label>
                    <p className="text-sm mt-1">
                      {selectedMapping.extracted_is_periciable ? 'Sim' : 'Não'}
                    </p>
                  </div>
                </div>

                <div>
                  <Label>Mapear para Procedimento Base</Label>
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
                      <SelectValue placeholder="Selecione um procedimento" />
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
                  {selectedMapping.mapped_procedure_base_id && (
                    <Button
                      onClick={() =>
                        handleUpdateMapping(
                          selectedMapping.id,
                          selectedMapping.mapped_procedure_base_id!,
                          selectedMapping.notes
                        )
                      }
                      disabled={processing === selectedMapping.id}
                    >
                      {processing === selectedMapping.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar e Continuar'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}
