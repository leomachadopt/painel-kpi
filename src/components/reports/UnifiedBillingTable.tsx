import React, { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Download, Pencil, Trash2 } from 'lucide-react'
import { DailyAdvanceInvoiceEntry, DailyFinancialEntry, Clinic } from '@/lib/types'
import { exportAdvanceInvoiceToExcel } from '@/lib/excelExport'
import { exportAdvanceInvoiceToPDF } from '@/lib/pdfExport'
import { toast } from 'sonner'
import useDataStore from '@/stores/useDataStore'
import { EditAdvanceInvoiceDialog } from './EditAdvanceInvoiceDialog'
import { EditBillingDialog } from './EditBillingDialog'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/hooks/useTranslation'
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

// Unified row type that can represent both advance invoices and billing entries
interface UnifiedRow {
  entryId: string
  doctorId: string | null
  doctorName: string
  patientCode: string
  thirdPartyCode: string | null
  name: string // Nome do paciente ou do terceiro
  value: number
  type: 'batch' | 'standalone' // Lote ou Fora do Lote
  batchNumber?: string | null
  batchId?: string | null
  sourceType: 'advance' | 'billing' // Para saber qual dialog/delete usar
}

export function UnifiedBillingTable({
  advanceData,
  billingData,
  clinic,
  startDate,
  endDate,
  onDelete,
}: {
  advanceData: DailyAdvanceInvoiceEntry[]
  billingData: DailyFinancialEntry[]
  clinic: Clinic
  startDate?: string
  endDate?: string
  onDelete?: () => void
}) {
  const { deleteAdvanceInvoiceEntry, deleteFinancialEntry } = useDataStore()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<{ id: string; type: 'advance' | 'billing' } | null>(null)
  const [editingAdvanceEntry, setEditingAdvanceEntry] = useState<DailyAdvanceInvoiceEntry | null>(null)
  const [editingBillingEntry, setEditingBillingEntry] = useState<DailyFinancialEntry | null>(null)
  const [isAdvanceEditDialogOpen, setIsAdvanceEditDialogOpen] = useState(false)
  const [isBillingEditDialogOpen, setIsBillingEditDialogOpen] = useState(false)

  const getDoctorName = (id: string | null | undefined) => {
    if (!id) return 'Não especificado'
    return clinic.configuration.doctors.find((d) => d.id === id)?.name || 'Desconhecido'
  }

  // Maps to store original entries for edit/delete
  const advanceEntryMap = new Map<string, DailyAdvanceInvoiceEntry>()
  const billingEntryMap = new Map<string, DailyFinancialEntry>()

  // Convert advance invoices to unified rows
  const advanceRows: UnifiedRow[] = advanceData.map((entry) => {
    advanceEntryMap.set(entry.id, entry)
    const name = entry.billedToThirdParty && entry.thirdPartyName
      ? entry.thirdPartyName
      : entry.patientName

    return {
      entryId: entry.id,
      doctorId: entry.doctorId || null,
      doctorName: getDoctorName(entry.doctorId),
      patientCode: entry.code,
      thirdPartyCode: entry.billedToThirdParty ? entry.thirdPartyCode || null : null,
      name,
      value: entry.value,
      type: entry.batchId ? 'batch' : 'standalone',
      batchNumber: entry.batchNumber || null,
      batchId: entry.batchId || null,
      sourceType: 'advance',
    }
  })

  // Convert billing entries (isBillingEntry=true) to unified rows
  const billingRows: UnifiedRow[] = billingData
    .filter(entry => entry.isBillingEntry)
    .map((entry) => {
      billingEntryMap.set(entry.id, entry)
      return {
        entryId: entry.id,
        doctorId: entry.doctorId || null,
        doctorName: getDoctorName(entry.doctorId),
        patientCode: entry.code,
        thirdPartyCode: null,
        name: entry.patientName,
        value: entry.value,
        type: 'standalone' as const,
        batchNumber: null,
        batchId: null,
        sourceType: 'billing' as const,
      }
    })

  // Combine and sort rows
  const allRows = [...advanceRows, ...billingRows].sort((a, b) => {
    // Sort by doctor first, then by type (batch first), then by batch number
    if (a.doctorName !== b.doctorName) {
      return a.doctorName.localeCompare(b.doctorName)
    }
    if (a.type !== b.type) {
      return a.type === 'batch' ? -1 : 1
    }
    if (a.batchNumber && b.batchNumber) {
      return a.batchNumber.localeCompare(b.batchNumber)
    }
    return 0
  })

  // Group rows by doctor, then by batch
  const rowsByDoctor = new Map<string, Map<string | null, UnifiedRow[]>>()
  allRows.forEach((row) => {
    const doctorKey = row.doctorId || 'no-doctor'
    if (!rowsByDoctor.has(doctorKey)) {
      rowsByDoctor.set(doctorKey, new Map())
    }
    const doctorBatches = rowsByDoctor.get(doctorKey)!
    const batchKey = row.batchId || (row.type === 'standalone' ? 'standalone' : 'no-batch')
    if (!doctorBatches.has(batchKey)) {
      doctorBatches.set(batchKey, [])
    }
    doctorBatches.get(batchKey)!.push(row)
  })

  // Calculate totals per doctor and per batch
  const doctorTotals = new Map<string, number>()
  const batchTotals = new Map<string, Map<string | null, number>>()
  rowsByDoctor.forEach((doctorBatches, doctorId) => {
    let doctorTotal = 0
    const batchTotalsForDoctor = new Map<string | null, number>()

    doctorBatches.forEach((batchRows, batchId) => {
      const batchTotal = batchRows.reduce((sum, row) => sum + row.value, 0)
      batchTotalsForDoctor.set(batchId, batchTotal)
      doctorTotal += batchTotal
    })

    doctorTotals.set(doctorId, doctorTotal)
    batchTotals.set(doctorId, batchTotalsForDoctor)
  })

  // Calculate grand total
  const grandTotal = Array.from(doctorTotals.values()).reduce(
    (sum, doctorTotal) => sum + doctorTotal,
    0
  )

  const { formatCurrency } = useTranslation()

  // Função auxiliar para combinar dados de advance e billing para exportação
  const getAllDataForExport = (): DailyAdvanceInvoiceEntry[] => {
    // Converter faturas standalone de billingData para o formato DailyAdvanceInvoiceEntry
    const standaloneBillingEntries: DailyAdvanceInvoiceEntry[] = billingData
      .filter(entry => entry.isBillingEntry)
      .map((entry) => ({
        id: entry.id,
        date: entry.date,
        patientName: entry.patientName,
        code: entry.code,
        doctorId: entry.doctorId || null,
        billedToThirdParty: false,
        thirdPartyCode: null,
        thirdPartyName: null,
        value: entry.value,
        batchNumber: null,
        batchId: null,
      }))

    // Combinar com advanceData
    return [...advanceData, ...standaloneBillingEntries]
  }

  const handleExportExcel = () => {
    if (!startDate || !endDate) {
      toast.error('Período não definido para exportação')
      return
    }
    try {
      const allData = getAllDataForExport()
      exportAdvanceInvoiceToExcel(allData, {
        clinic,
        startDate,
        endDate,
      })
      toast.success('Relatório exportado para Excel com sucesso!')
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao exportar relatório')
    }
  }

  const handleExportPDF = () => {
    if (!startDate || !endDate) {
      toast.error('Período não definido para exportação')
      return
    }
    try {
      const allData = getAllDataForExport()
      exportAdvanceInvoiceToPDF(allData, {
        clinic,
        startDate,
        endDate,
      })
      toast.success('Relatório exportado para PDF com sucesso!')
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao exportar relatório')
    }
  }

  const handleEdit = (row: UnifiedRow) => {
    if (row.sourceType === 'advance') {
      // Check if it's a batch entry
      if (row.entryId.startsWith('batch-') || row.batchId) {
        toast.error('Não é possível editar faturas geradas por lotes. Para editar, acesse o lote de faturamento no módulo de Adiantamentos.')
        return
      }
      const entry = advanceEntryMap.get(row.entryId)
      if (entry) {
        setEditingAdvanceEntry(entry)
        setIsAdvanceEditDialogOpen(true)
      }
    } else {
      const entry = billingEntryMap.get(row.entryId)
      if (entry) {
        setEditingBillingEntry(entry)
        setIsBillingEditDialogOpen(true)
      }
    }
  }

  const handleDeleteClick = (row: UnifiedRow) => {
    // Check if it's a batch entry
    if (row.sourceType === 'advance' && (row.entryId.startsWith('batch-') || row.batchId)) {
      toast.error('Não é possível excluir faturas geradas por lotes. Para excluir, acesse o lote de faturamento no módulo de Adiantamentos.')
      return
    }

    setEntryToDelete({ id: row.entryId, type: row.sourceType })
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return

    try {
      if (entryToDelete.type === 'advance') {
        await deleteAdvanceInvoiceEntry(clinic.id, entryToDelete.id)
        toast.success('Fatura de adiantamento excluída com sucesso!')
      } else {
        await deleteFinancialEntry(clinic.id, entryToDelete.id)
        toast.success('Fatura excluída com sucesso!')
      }
      setDeleteDialogOpen(false)
      setEntryToDelete(null)
      if (onDelete) onDelete()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir fatura')
    }
  }

  const handleEditSuccess = () => {
    if (onDelete) onDelete() // Recarregar dados
  }

  if (allRows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Nenhuma fatura no período.
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="outline"
          onClick={handleExportExcel}
          disabled={allRows.length === 0 || !startDate || !endDate}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar para Excel
        </Button>
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={allRows.length === 0 || !startDate || !endDate}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar para PDF
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Médico</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Código Paciente</TableHead>
              <TableHead>Código Terceiros</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from(rowsByDoctor.entries()).map(([doctorId, doctorBatches]) => {
              const doctorName = Array.from(doctorBatches.values())[0]?.[0]?.doctorName || 'Não especificado'
              const total = doctorTotals.get(doctorId)!
              const batchesForDoctor = Array.from(doctorBatches.entries())
              const hasBatches = batchesForDoctor.some(([batchId]) => batchId !== 'standalone' && batchId !== 'no-batch')
              const batchTotalsForDoctor = batchTotals.get(doctorId)!

              // Calculate total rows for rowSpan
              let totalRowsForDoctor = 0
              batchesForDoctor.forEach(([batchId, batchRows]) => {
                totalRowsForDoctor += batchRows.length
                const batchNumber = batchRows[0]?.batchNumber
                if (hasBatches && batchNumber && batchRows.length > 1) {
                  totalRowsForDoctor += 1 // Batch total row
                }
              })
              if (hasBatches) {
                totalRowsForDoctor += batchesForDoctor.filter(([batchId, rows]) => rows[0]?.batchNumber).length // Batch header rows
              }
              totalRowsForDoctor += 1 // Doctor total row

              let isFirstRow = true

              return (
                <React.Fragment key={doctorId}>
                  {batchesForDoctor.map(([batchId, batchRows]) => {
                    const batchNumber = batchRows[0]?.batchNumber
                    const batchTotal = batchTotalsForDoctor.get(batchId) || 0
                    const showBatchHeader = hasBatches && batchNumber
                    const showBatchTotal = hasBatches && batchNumber && batchRows.length > 1

                    return (
                      <React.Fragment key={`${doctorId}-${batchId || 'no-batch'}`}>
                        {/* Batch header row */}
                        {showBatchHeader && (
                          <TableRow className="bg-blue-50/50 border-t border-blue-200/30 h-9">
                            {isFirstRow && (
                              <TableCell
                                rowSpan={totalRowsForDoctor}
                                className="font-medium align-top pt-3"
                              >
                                {doctorName}
                              </TableCell>
                            )}
                            <TableCell colSpan={5} className="text-sm font-medium text-blue-700 pl-4">
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                Lote: {batchNumber}
                              </Badge>
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        )}
                        {/* Batch rows */}
                        {batchRows.map((row, idx) => {
                          const isFirstInGroup = isFirstRow && !showBatchHeader
                          isFirstRow = false
                          const isDisabled = row.type === 'batch'

                          return (
                            <TableRow
                              key={`${row.entryId}-${idx}`}
                              className={`h-10 ${showBatchHeader ? 'bg-blue-50/30' : ''}`}
                            >
                              {isFirstInGroup && (
                                <TableCell
                                  rowSpan={totalRowsForDoctor}
                                  className="font-medium align-top pt-3"
                                >
                                  {doctorName}
                                </TableCell>
                              )}
                              <TableCell className={showBatchHeader ? 'pl-6' : ''}>
                                {row.type === 'batch' ? (
                                  <Badge variant="secondary" className="text-xs">Lote</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">Fora do Lote</Badge>
                                )}
                              </TableCell>
                              <TableCell className={`font-mono text-xs ${showBatchHeader ? 'pl-6' : ''}`}>
                                {row.patientCode}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {row.thirdPartyCode || '-'}
                              </TableCell>
                              <TableCell>{row.name}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(row.value)}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {isDisabled ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled
                                        className="h-8 w-8 text-muted-foreground cursor-not-allowed opacity-40"
                                        title="Fatura gerada por lote - não editável"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        disabled
                                        className="h-8 w-8 text-muted-foreground cursor-not-allowed opacity-40"
                                        title="Fatura gerada por lote - não deletável"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEdit(row)}
                                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                        title="Editar"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteClick(row)}
                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                        title="Excluir"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {/* Batch total row */}
                        {showBatchTotal && (
                          <TableRow className="bg-blue-100/50 font-medium border-t border-blue-200/30 h-9">
                            <TableCell className="text-right text-sm text-blue-700 pl-6" colSpan={4}>
                              Total {batchNumber}:
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right text-sm text-blue-700 font-semibold">
                              {formatCurrency(batchTotal)}
                            </TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    )
                  })}
                  {/* Total row for doctor */}
                  <TableRow className="bg-muted/50 font-semibold border-t border-muted-foreground/20 h-10">
                    <TableCell className="text-right">
                      Total {doctorName}:
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(total)}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </React.Fragment>
              )
            })}
            {/* Grand total row */}
            <TableRow className="bg-primary/10 font-bold border-t-2 border-primary/20 h-12">
              <TableCell className="text-right text-base"></TableCell>
              <TableCell className="text-right text-base">
                Total Geral:
              </TableCell>
              <TableCell className="text-right text-base"></TableCell>
              <TableCell className="text-right text-base"></TableCell>
              <TableCell className="text-right text-base"></TableCell>
              <TableCell className="text-right text-base">
                {formatCurrency(grandTotal)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <EditAdvanceInvoiceDialog
        open={isAdvanceEditDialogOpen}
        onOpenChange={setIsAdvanceEditDialogOpen}
        entry={editingAdvanceEntry}
        clinic={clinic}
        onSuccess={handleEditSuccess}
      />

      <EditBillingDialog
        open={isBillingEditDialogOpen}
        onOpenChange={setIsBillingEditDialogOpen}
        entry={editingBillingEntry}
        clinic={clinic}
        onSuccess={handleEditSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fatura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta fatura? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
