import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Trash2, Plus, Edit2, Check, X, Loader2, Upload, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { advancesApi } from '@/services/api'
import { ProcedureBase } from '@/lib/types'

interface ImportItem {
  codigo: string
  descricao: string
  encargo_adse_eur?: string
  copagamento_beneficiario_eur?: string
}

export function ProcedureBaseEditorGlobal() {
  const [procedures, setProcedures] = useState<ProcedureBase[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importJson, setImportJson] = useState('')
  const [importPreview, setImportPreview] = useState<ImportItem[]>([])
  const [importConfig, setImportConfig] = useState({
    isPericiable: false,
    category: '',
    useEncargo: true,
  })
  const [importing, setImporting] = useState(false)

  const [newProcedure, setNewProcedure] = useState({
    code: '',
    description: '',
    isPericiable: false,
    adultsOnly: false,
    category: '',
    defaultValue: '',
  })

  const [editProcedure, setEditProcedure] = useState({
    code: '',
    description: '',
    isPericiable: false,
    adultsOnly: false,
    category: '',
    defaultValue: '',
    active: true,
  })

  useEffect(() => {
    loadProcedures()
  }, [])

  const loadProcedures = async () => {
    setLoading(true)
    try {
      const data = await advancesApi.proceduresBaseGlobal.getAll()
      setProcedures(data)
    } catch (err: any) {
      toast.error('Erro ao carregar procedimentos')
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async () => {
    if (!newProcedure.code || !newProcedure.description) {
      toast.error('Código e descrição são obrigatórios')
      return
    }

    // Validar defaultValue
    let validatedDefaultValue = null
    if (newProcedure.defaultValue && newProcedure.defaultValue.trim() !== '') {
      const numValue = parseFloat(newProcedure.defaultValue.replace(',', '.'))
      if (!isNaN(numValue) && isFinite(numValue)) {
        validatedDefaultValue = numValue
      }
    }

    setSaving(true)
    try {
      await advancesApi.proceduresBaseGlobal.create({
        code: newProcedure.code.trim(),
        description: newProcedure.description.trim(),
        isPericiable: newProcedure.isPericiable,
        adultsOnly: newProcedure.adultsOnly,
        category: newProcedure.category || null,
        defaultValue: validatedDefaultValue,
      })
      toast.success('Procedimento adicionado com sucesso')
      setNewProcedure({ code: '', description: '', isPericiable: false, adultsOnly: false, category: '', defaultValue: '' })
      loadProcedures()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar procedimento')
    } finally {
      setSaving(false)
    }
  }

  const handleStartEdit = (procedure: ProcedureBase) => {
    setEditingId(procedure.id)
    setEditProcedure({
      code: procedure.code,
      description: procedure.description,
      isPericiable: procedure.isPericiable,
      adultsOnly: procedure.adultsOnly || false,
      category: procedure.category || '',
      defaultValue: procedure.defaultValue?.toString() || '',
      active: procedure.active,
    })
  }

  const handleSaveEdit = async (id: string) => {
    if (!editProcedure.code || !editProcedure.description) {
      toast.error('Código e descrição são obrigatórios')
      return
    }

    // Validar defaultValue
    let validatedDefaultValue = null
    if (editProcedure.defaultValue && editProcedure.defaultValue.trim() !== '') {
      const numValue = parseFloat(editProcedure.defaultValue.replace(',', '.'))
      if (!isNaN(numValue) && isFinite(numValue)) {
        validatedDefaultValue = numValue
      }
    }

    setSaving(true)
    try {
      await advancesApi.proceduresBaseGlobal.update(id, {
        code: editProcedure.code.trim(),
        description: editProcedure.description.trim(),
        isPericiable: editProcedure.isPericiable,
        adultsOnly: editProcedure.adultsOnly,
        category: editProcedure.category || null,
        defaultValue: validatedDefaultValue,
        active: editProcedure.active,
      })
      toast.success('Procedimento atualizado com sucesso')
      setEditingId(null)
      loadProcedures()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar procedimento')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este procedimento?')) return

    setSaving(true)
    try {
      await advancesApi.proceduresBaseGlobal.delete(id)
      toast.success('Procedimento excluído com sucesso')
      loadProcedures()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir procedimento')
    } finally {
      setSaving(false)
    }
  }

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(importJson)
      if (!Array.isArray(parsed)) {
        toast.error('JSON deve ser um array de objetos')
        return
      }
      setImportPreview(parsed)
    } catch (err) {
      toast.error('JSON inválido')
    }
  }

  const handleExecuteImport = async () => {
    if (importPreview.length === 0) {
      toast.error('Nenhum item para importar')
      return
    }

    setImporting(true)
    let successCount = 0
    let errorCount = 0

    for (const item of importPreview) {
      try {
        const valueStr = importConfig.useEncargo
          ? item.encargo_adse_eur || item.copagamento_beneficiario_eur || ''
          : item.copagamento_beneficiario_eur || item.encargo_adse_eur || ''
        
        // Validar e converter o valor
        let defaultValue = null
        if (valueStr && valueStr.trim() !== '') {
          const numValue = parseFloat(valueStr.replace(',', '.'))
          if (!isNaN(numValue) && isFinite(numValue)) {
            defaultValue = numValue
          }
        }

        await advancesApi.proceduresBaseGlobal.create({
          code: item.codigo.trim(),
          description: item.descricao.trim(),
          isPericiable: importConfig.isPericiable,
          adultsOnly: false, // Por padrão, permite adultos e crianças na importação
          category: importConfig.category || null,
          defaultValue,
        })
        successCount++
      } catch (err: any) {
        errorCount++
        console.error('Error importing item:', item.codigo, err)
      }
    }

    setImporting(false)
    setShowImportDialog(false)
    setImportJson('')
    setImportPreview([])
    
    if (successCount > 0) {
      toast.success(`${successCount} procedimento(s) importado(s) com sucesso`)
    }
    if (errorCount > 0) {
      toast.warning(`${errorCount} procedimento(s) falharam (podem já existir)`)
    }
    
    loadProcedures()
  }

  const formatValue = (valueStr: string | undefined): string => {
    if (!valueStr) return '-'
    const num = parseFloat(valueStr.replace(',', '.'))
    return isNaN(num) ? '-' : `€${num.toFixed(2)}`
  }

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="flex items-center justify-end">
          <Button
            variant="outline"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar JSON
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-2 p-4 border rounded-lg bg-muted/50">
          <Input
            placeholder="Código *"
            value={newProcedure.code}
            onChange={(e) => setNewProcedure({ ...newProcedure, code: e.target.value })}
            className="col-span-1"
          />
          <Input
            placeholder="Descrição *"
            value={newProcedure.description}
            onChange={(e) => setNewProcedure({ ...newProcedure, description: e.target.value })}
            className="col-span-2"
          />
          <Input
            placeholder="Categoria"
            value={newProcedure.category}
            onChange={(e) => setNewProcedure({ ...newProcedure, category: e.target.value })}
            className="col-span-1"
          />
          <Input
            type="number"
            step="0.01"
            placeholder="Valor padrão"
            value={newProcedure.defaultValue}
            onChange={(e) => setNewProcedure({ ...newProcedure, defaultValue: e.target.value })}
            className="col-span-1"
          />
          <div className="flex items-center gap-2 col-span-1">
            <Checkbox
              checked={newProcedure.isPericiable}
              onCheckedChange={(checked) =>
                setNewProcedure({ ...newProcedure, isPericiable: checked === true })
              }
            />
            <Label className="text-sm">Periciável</Label>
          </div>
          <div className="flex items-center gap-2 col-span-1">
            <Checkbox
              checked={newProcedure.adultsOnly}
              onCheckedChange={(checked) =>
                setNewProcedure({ ...newProcedure, adultsOnly: checked === true })
              }
            />
            <Label className="text-sm">Adulto</Label>
            <Button onClick={handleAdd} size="icon" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {procedures.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum procedimento cadastrado
          </div>
        ) : (
          procedures.map((procedure) => (
            <div
              key={procedure.id}
              className="flex items-center gap-2 p-3 border rounded bg-background"
            >
              {editingId === procedure.id ? (
                <>
                  <Input
                    value={editProcedure.code}
                    onChange={(e) => setEditProcedure({ ...editProcedure, code: e.target.value })}
                    className="w-32"
                  />
                  <Input
                    value={editProcedure.description}
                    onChange={(e) =>
                      setEditProcedure({ ...editProcedure, description: e.target.value })
                    }
                    className="flex-1"
                  />
                  <Input
                    value={editProcedure.category}
                    onChange={(e) =>
                      setEditProcedure({ ...editProcedure, category: e.target.value })
                    }
                    placeholder="Categoria"
                    className="w-32"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={editProcedure.defaultValue}
                    onChange={(e) =>
                      setEditProcedure({ ...editProcedure, defaultValue: e.target.value })
                    }
                    placeholder="Valor"
                    className="w-24"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={editProcedure.isPericiable}
                      onCheckedChange={(checked) =>
                        setEditProcedure({ ...editProcedure, isPericiable: checked === true })
                      }
                    />
                    <Label className="text-sm">Periciável</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={editProcedure.adultsOnly}
                      onCheckedChange={(checked) =>
                        setEditProcedure({ ...editProcedure, adultsOnly: checked === true })
                      }
                    />
                    <Label className="text-sm">Adulto</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={editProcedure.active}
                      onCheckedChange={(checked) =>
                        setEditProcedure({ ...editProcedure, active: checked === true })
                      }
                    />
                    <Label className="text-sm">Ativo</Label>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleSaveEdit(procedure.id)}
                    disabled={saving}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-32 font-mono text-sm">{procedure.code}</div>
                  <div className="flex-1">{procedure.description}</div>
                  <div className="w-32 text-sm text-muted-foreground">
                    {procedure.category || '-'}
                  </div>
                  <div className="w-24 text-sm">
                    {procedure.defaultValue ? `€${procedure.defaultValue.toFixed(2)}` : '-'}
                  </div>
                  <div className="w-24">
                    {procedure.isPericiable ? (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Periciável
                      </span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        Não Periciável
                      </span>
                    )}
                  </div>
                  <div className="w-20">
                    {procedure.adultsOnly ? (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Só Adultos
                      </span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        Adultos + Crianças
                      </span>
                    )}
                  </div>
                  <div className="w-16">
                    {procedure.active ? (
                      <span className="text-xs text-green-600">Ativo</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Inativo</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleStartEdit(procedure)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(procedure.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importar Procedimentos via JSON</DialogTitle>
            <DialogDescription>
              Cole o JSON com os procedimentos. Formato esperado: array de objetos com campos
              codigo, descricao, encargo_adse_eur e/ou copagamento_beneficiario_eur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>JSON dos Procedimentos</Label>
              <Textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder='[{"codigo": "61500", "descricao": "PROT.REM.ACRÍLICO...", "encargo_adse_eur": "47,25"}]'
                rows={8}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleImportJson}
                className="mt-2"
                disabled={!importJson.trim()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Pré-visualizar
              </Button>
            </div>

            {importPreview.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-base font-semibold">
                      Preview: {importPreview.length} procedimento(s) encontrado(s)
                    </Label>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Label className="text-sm">Valor a usar:</Label>
                        <Select
                          value={importConfig.useEncargo ? 'encargo' : 'copagamento'}
                          onValueChange={(value) =>
                            setImportConfig({ ...importConfig, useEncargo: value === 'encargo' })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="encargo">Encargo ADSE</SelectItem>
                            <SelectItem value="copagamento">Copagamento</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={importConfig.isPericiable}
                          onCheckedChange={(checked) =>
                            setImportConfig({ ...importConfig, isPericiable: checked === true })
                          }
                        />
                        <Label className="text-sm">Todos Periciáveis</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Categoria padrão"
                          value={importConfig.category}
                          onChange={(e) =>
                            setImportConfig({ ...importConfig, category: e.target.value })
                          }
                          className="w-32"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto border rounded p-2 space-y-1">
                    {importPreview.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="text-sm p-2 bg-muted rounded flex gap-4">
                        <span className="font-mono w-20">{item.codigo}</span>
                        <span className="flex-1">{item.descricao}</span>
                        <span className="w-24 text-right">
                          {formatValue(
                            importConfig.useEncargo
                              ? item.encargo_adse_eur
                              : item.copagamento_beneficiario_eur
                          )}
                        </span>
                      </div>
                    ))}
                    {importPreview.length > 10 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                        ... e mais {importPreview.length - 10} procedimento(s)
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowImportDialog(false)
                setImportJson('')
                setImportPreview([])
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleExecuteImport}
              disabled={importPreview.length === 0 || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar {importPreview.length} procedimento(s)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

