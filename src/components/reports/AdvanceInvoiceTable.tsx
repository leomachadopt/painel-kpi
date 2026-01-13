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
import { DailyAdvanceInvoiceEntry, Clinic } from '@/lib/types'
import { exportAdvanceInvoiceToExcel } from '@/lib/excelExport'
import { exportAdvanceInvoiceToPDF } from '@/lib/pdfExport'
import { toast } from 'sonner'
import useDataStore from '@/stores/useDataStore'
import { EditAdvanceInvoiceDialog } from './EditAdvanceInvoiceDialog'
import { Badge } from '@/components/ui/badge'
import { useTranslation } from '@/hooks/useTranslation'

interface AdvanceInvoiceRow {
  entryId: string
  doctorId: string | null
  doctorName: string
  patientCode: string
  thirdPartyCode: string | null
  name: string // Nome do paciente ou do terceiro
  value: number
  batchNumber?: string | null
  batchId?: string | null
}

export function AdvanceInvoiceTable({
  data,
  clinic,
  startDate,
  endDate,
  onDelete,
}: {
  data: DailyAdvanceInvoiceEntry[]
  clinic: Clinic
  startDate?: string
  endDate?: string
  onDelete?: () => void
}) {
  const { deleteAdvanceInvoiceEntry } = useDataStore()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<DailyAdvanceInvoiceEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  const getDoctorName = (id: string | null | undefined) => {
    if (!id) return 'Não especificado'
    return clinic.configuration.doctors.find((d) => d.id === id)?.name || 'Desconhecido'
  }

  // Convert entries to rows, mantendo referência ao entry original
  const entryMap = new Map<string, DailyAdvanceInvoiceEntry>()
  const rows: AdvanceInvoiceRow[] = data.map((entry) => {
    entryMap.set(entry.id, entry)
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
      batchNumber: entry.batchNumber || null,
      batchId: entry.batchId || null,
    }
  })

  // Group rows by doctor, then by batch
  const rowsByDoctor = new Map<string, Map<string | null, AdvanceInvoiceRow[]>>()
  rows.forEach((row) => {
    const doctorKey = row.doctorId || 'no-doctor'
    if (!rowsByDoctor.has(doctorKey)) {
      rowsByDoctor.set(doctorKey, new Map())
    }
    const doctorBatches = rowsByDoctor.get(doctorKey)!
    const batchKey = row.batchId || 'no-batch'
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

  const handleExportExcel = () => {
    if (!startDate || !endDate) {
      toast.error('Período não definido para exportação')
      return
    }
    try {
      exportAdvanceInvoiceToExcel(data, {
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
      exportAdvanceInvoiceToPDF(data, {
        clinic,
        startDate,
        endDate,
      })
      toast.success('Relatório exportado para PDF com sucesso!')
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao exportar relatório')
    }
  }

  const handleEdit = (entryId: string) => {
    const entry = entryMap.get(entryId)
    if (entry) {
      setEditingEntry(entry)
      setIsEditDialogOpen(true)
    }
  }

  const handleDelete = async (entryId: string) => {
    const entry = entryMap.get(entryId)
    if (!entry) return

    if (!confirm(`Excluir fatura de adiantamento de ${formatCurrency(entry.value)} de ${entry.billedToThirdParty && entry.thirdPartyName ? entry.thirdPartyName : entry.patientName}?`)) {
      return
    }

    setDeleting(entryId)
    try {
      await deleteAdvanceInvoiceEntry(clinic.id, entryId)
      toast.success('Fatura de adiantamento excluída com sucesso!')
      onDelete?.()
    } catch (error: any) {
      // Error já é tratado na store
    } finally {
      setDeleting(null)
    }
  }

  const handleEditSuccess = () => {
    onDelete?.() // Recarregar dados
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Nenhuma fatura de adiantamento no período.
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="outline"
          onClick={handleExportExcel}
          disabled={rows.length === 0 || !startDate || !endDate}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar para Excel
        </Button>
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={rows.length === 0 || !startDate || !endDate}
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
              const hasMultipleBatches = batchesForDoctor.some(([batchId]) => batchId !== 'no-batch') && batchesForDoctor.length > 1
              const batchTotalsForDoctor = batchTotals.get(doctorId)!

              // Calculate total rows for rowSpan (including batch headers and totals)
              let totalRowsForDoctor = 0
              batchesForDoctor.forEach(([, batchRows]) => {
                totalRowsForDoctor += batchRows.length
                const batchNumber = batchRows[0]?.batchNumber
                if (hasMultipleBatches && batchNumber && batchRows.length > 1) {
                  totalRowsForDoctor += 1 // Batch total row
                }
              })
              if (hasMultipleBatches) {
                totalRowsForDoctor += batchesForDoctor.filter(([, rows]) => rows[0]?.batchNumber).length // Batch header rows
              }
              totalRowsForDoctor += 1 // Doctor total row

              let isFirstRow = true

              return (
                <React.Fragment key={doctorId}>
                  {batchesForDoctor.map(([batchId, batchRows], batchIdx) => {
                    const batchNumber = batchRows[0]?.batchNumber
                    const batchTotal = batchTotalsForDoctor.get(batchId) || 0
                    const showBatchHeader = hasMultipleBatches && batchNumber
                    const showBatchTotal = hasMultipleBatches && batchNumber && batchRows.length > 1

                    return (
                      <React.Fragment key={`${doctorId}-${batchId || 'no-batch'}`}>
                        {/* Batch header row (only if multiple batches) */}
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
                            <TableCell colSpan={4} className="text-sm font-medium text-blue-700 pl-4">
                              <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                                Lote: {batchNumber}
                              </Badge>
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        )}
                        {/* Batch rows */}
                        {batchRows.map((row, idx) => {
                          const isFirstInGroup = isFirstRow && !showBatchHeader
                          isFirstRow = false
                          
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
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(row.entryId)}
                                    className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                    title="Editar"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(row.entryId)}
                                    disabled={deleting === row.entryId}
                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    title="Excluir"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {/* Batch total row (only if multiple rows in batch) */}
                        {showBatchTotal && (
                          <TableRow className="bg-blue-100/50 font-medium border-t border-blue-200/30 h-9">
                            <TableCell className="text-right text-sm text-blue-700 pl-6" colSpan={3}>
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
              <TableCell className="text-right text-base">
                {formatCurrency(grandTotal)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <EditAdvanceInvoiceDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        entry={editingEntry}
        clinic={clinic}
        onSuccess={handleEditSuccess}
      />
    </>
  )
}
