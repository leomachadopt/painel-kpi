import { useState, useEffect } from 'react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Loader2, Save, CheckCircle2, Edit2 } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ExtractedProcedure {
  code: string
  description: string
  value: number | null
  isPericiable?: boolean
  adultsOnly?: boolean
  savedToBase?: boolean
  baseId?: string
}

interface ExtractedProceduresViewProps {
  documentId: string
  onClose: () => void
}

export function ExtractedProceduresView({ documentId, onClose }: ExtractedProceduresViewProps) {
  const [procedures, setProcedures] = useState<ExtractedProcedure[]>([])
  const [loading, setLoading] = useState(true)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [savingIndex, setSavingIndex] = useState<number | null>(null)
  const [editedProcedures, setEditedProcedures] = useState<{ [key: number]: ExtractedProcedure }>({})

  useEffect(() => {
    loadExtractedProcedures()
  }, [documentId])

  const loadExtractedProcedures = async () => {
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      console.log('[ExtractedProceduresView] Loading document:', documentId)

      // Get extracted data from document
      const docResponse = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!docResponse.ok) throw new Error('Erro ao carregar dados extraídos')

      const docData = await docResponse.json()
      console.log('[ExtractedProceduresView] Document data:', docData)

      if (docData.extracted_data && docData.extracted_data.procedures) {
        setProcedures(docData.extracted_data.procedures)
      } else {
        setProcedures([])
      }
    } catch (err: any) {
      console.error('[ExtractedProceduresView] Error:', err)
      toast.error(err.message || 'Erro ao carregar procedimentos')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    if (!editedProcedures[index]) {
      setEditedProcedures({
        ...editedProcedures,
        [index]: { ...procedures[index] }
      })
    }
  }

  const handleCancelEdit = (index: number) => {
    setEditingIndex(null)
    const newEdited = { ...editedProcedures }
    delete newEdited[index]
    setEditedProcedures(newEdited)
  }

  const handleFieldChange = (index: number, field: keyof ExtractedProcedure, value: any) => {
    setEditedProcedures({
      ...editedProcedures,
      [index]: {
        ...editedProcedures[index] || procedures[index],
        [field]: value
      }
    })
  }

  const handleSaveToBase = async (index: number) => {
    const proc = editedProcedures[index] || procedures[index]
    
    if (!proc.code || !proc.description) {
      toast.error('Código e descrição são obrigatórios')
      return
    }

    setSavingIndex(index)
    
    try {
      const token = localStorage.getItem('kpi_token')
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

      const response = await fetch(`${API_BASE_URL}/insurance/documents/${documentId}/procedures/save-to-base`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          procedureIndex: index,
          code: proc.code.trim(),
          description: proc.description.trim(),
          value: proc.value || null,
          isPericiable: proc.isPericiable || false,
          adultsOnly: proc.adultsOnly || false,
          saveAsGlobal: false, // Por padrão salva na clínica, pode adicionar opção depois
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Erro ao salvar procedimento')
      }

      const result = await response.json()
      
      // Update local state
      const updatedProcedures = [...procedures]
      updatedProcedures[index] = {
        ...updatedProcedures[index],
        ...proc,
        savedToBase: true,
        baseId: result.baseProcedureId,
        isPericiable: proc.isPericiable || false,
        adultsOnly: proc.adultsOnly || false,
      }
      setProcedures(updatedProcedures)
      
      // Clear editing state
      setEditingIndex(null)
      const newEdited = { ...editedProcedures }
      delete newEdited[index]
      setEditedProcedures(newEdited)

      toast.success('Procedimento salvo na tabela base! Padrão aprendido registrado.')
    } catch (err: any) {
      console.error('[ExtractedProceduresView] Error saving:', err)
      toast.error(err.message || 'Erro ao salvar procedimento na tabela base')
    } finally {
      setSavingIndex(null)
    }
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

  const savedCount = procedures.filter(p => p.savedToBase).length

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Procedimentos Extraídos</DialogTitle>
          <DialogDescription>
            Visualize, edite e salve os procedimentos extraídos na tabela base. 
            Cada salvamento registra um padrão aprendido para classificação futura pela IA.
          </DialogDescription>
        </DialogHeader>

        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Estatísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div>
                <div className="text-2xl font-bold">{procedures.length}</div>
                <div className="text-xs text-muted-foreground">Total Extraído</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{savedCount}</div>
                <div className="text-xs text-muted-foreground">Salvos na Tabela Base</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{procedures.length - savedCount}</div>
                <div className="text-xs text-muted-foreground">Pendentes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {procedures.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum procedimento extraído</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-32">Código</TableHead>
                  <TableHead className="min-w-[300px]">Descrição</TableHead>
                  <TableHead className="w-24 text-right">Valor</TableHead>
                  <TableHead className="w-32 text-center">Periciável</TableHead>
                  <TableHead className="w-32 text-center">Apenas Adultos</TableHead>
                  <TableHead className="w-32 text-center">Status</TableHead>
                  <TableHead className="w-40 text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {procedures.map((proc, idx) => {
                  const isEditing = editingIndex === idx
                  const isSaving = savingIndex === idx
                  const editedProc = editedProcedures[idx] || proc
                  
                  return (
                    <TableRow key={idx} className={proc.savedToBase ? 'bg-green-50/50' : ''}>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editedProc.code}
                            onChange={(e) => handleFieldChange(idx, 'code', e.target.value)}
                            className="font-mono text-xs h-8"
                            placeholder="Código"
                          />
                        ) : (
                          <span className="font-mono text-xs">{proc.code}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={editedProc.description}
                            onChange={(e) => handleFieldChange(idx, 'description', e.target.value)}
                            className="h-8"
                            placeholder="Descrição"
                          />
                        ) : (
                          <span className="text-sm">{proc.description}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.01"
                            value={editedProc.value || ''}
                            onChange={(e) => handleFieldChange(idx, 'value', e.target.value ? parseFloat(e.target.value) : null)}
                            className="h-8 text-right"
                            placeholder="0.00"
                          />
                        ) : (
                          <span className="text-sm">
                            {proc.value ? `€ ${proc.value.toFixed(2)}` : '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <div className="flex justify-center">
                            <Checkbox
                              checked={editedProc.isPericiable || false}
                              onCheckedChange={(checked) => handleFieldChange(idx, 'isPericiable', checked === true)}
                            />
                          </div>
                        ) : (
                          <Badge variant={proc.isPericiable ? 'default' : 'outline'}>
                            {proc.isPericiable ? 'Sim' : 'Não'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {isEditing ? (
                          <div className="flex justify-center">
                            <Checkbox
                              checked={editedProc.adultsOnly || false}
                              onCheckedChange={(checked) => handleFieldChange(idx, 'adultsOnly', checked === true)}
                            />
                          </div>
                        ) : (
                          <Badge variant={proc.adultsOnly ? 'default' : 'outline'}>
                            {proc.adultsOnly ? 'Sim' : 'Não'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {proc.savedToBase ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Salvo
                          </Badge>
                        ) : (
                          <Badge variant="outline">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelEdit(idx)}
                                disabled={isSaving}
                                className="h-7 text-xs"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSaveToBase(idx)}
                                disabled={isSaving || !editedProc.code || !editedProc.description}
                                className="h-7 text-xs"
                              >
                                {isSaving ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <>
                                    <Save className="w-3 h-3 mr-1" />
                                    Salvar
                                  </>
                                )}
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(idx)}
                              disabled={isSaving || proc.savedToBase}
                              className="h-7 text-xs"
                            >
                              <Edit2 className="w-3 h-3 mr-1" />
                              {proc.savedToBase ? 'Salvo' : 'Editar'}
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
      </DialogContent>
    </Dialog>
  )
}
