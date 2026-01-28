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
import { DailyFinancialEntry, Clinic } from '@/lib/types'
import { exportFinancialToExcel } from '@/lib/excelExport'
import { exportFinancialToPDF } from '@/lib/pdfExport'
import { toast } from 'sonner'
import { useTranslation } from '@/hooks/useTranslation'
import useDataStore from '@/stores/useDataStore'
import { EditFinancialDialog } from './EditFinancialDialog'
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

interface FinancialRow {
  id: string
  doctorId: string | null
  doctorName: string
  code: string
  patientName: string
  value: number
  date: string
  paymentSources: Record<string, number>
}

export function FinancialGroupedTable({
  data,
  clinic,
  startDate,
  endDate,
  onDelete,
}: {
  data: DailyFinancialEntry[]
  clinic: Clinic
  startDate?: string
  endDate?: string
  onDelete?: () => void
}) {
  const { deleteFinancialEntry } = useDataStore()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [entryToEdit, setEntryToEdit] = useState<DailyFinancialEntry | null>(null)

  const getDoctorName = (id: string | null | undefined) => {
    if (!id) return 'Não especificado'
    return clinic.configuration.doctors.find((d) => d.id === id)?.name || 'Desconhecido'
  }

  const handleEditClick = (entryId: string) => {
    const entry = data.find(e => e.id === entryId)
    if (entry) {
      setEntryToEdit(entry)
      setEditDialogOpen(true)
    }
  }

  const handleEditSuccess = () => {
    if (onDelete) onDelete() // Recarregar dados
  }

  const handleDeleteClick = (entryId: string) => {
    setEntryToDelete(entryId)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!entryToDelete) return

    try {
      await deleteFinancialEntry(clinic.id, entryToDelete)
      toast.success('Lançamento excluído com sucesso!')
      setDeleteDialogOpen(false)
      setEntryToDelete(null)
      if (onDelete) onDelete()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir lançamento')
    }
  }

  const getPaymentSourceName = (id: string | null | undefined) => {
    if (!id) return null
    return clinic.configuration.paymentSources?.find((ps) => ps.id === id)?.name || null
  }

  // Get all payment source names from configuration
  const paymentSourceNames = (clinic.configuration.paymentSources || [])
    .map((ps) => ps.name)
    .sort()

  // Filter only financial entries (not billing entries)
  const financialData = data.filter(entry => !entry.isBillingEntry)

  // Convert entries to rows
  const rows: FinancialRow[] = financialData.map((entry) => {
    const paymentSourceName = getPaymentSourceName(entry.paymentSourceId)
    const paymentSources: Record<string, number> = {}

    // Each entry has only one payment source, so set it in the record
    if (paymentSourceName) {
      paymentSources[paymentSourceName] = entry.value
    }

    return {
      id: entry.id,
      doctorId: entry.doctorId || null,
      doctorName: getDoctorName(entry.doctorId),
      code: entry.code,
      patientName: entry.patientName,
      value: entry.value,
      date: entry.date,
      paymentSources,
    }
  })

  // Group rows by doctor
  const rowsByDoctor = new Map<string, FinancialRow[]>()
  rows.forEach((row) => {
    const doctorKey = row.doctorId || 'no-doctor'
    if (!rowsByDoctor.has(doctorKey)) {
      rowsByDoctor.set(doctorKey, [])
    }
    rowsByDoctor.get(doctorKey)!.push(row)
  })

  // Calculate totals per doctor
  const doctorTotals = new Map<string, { total: number; bySource: Record<string, number> }>()
  rowsByDoctor.forEach((doctorRows, doctorId) => {
    const total = doctorRows.reduce((sum, row) => sum + row.value, 0)
    const bySource: Record<string, number> = {}
    doctorRows.forEach((row) => {
      Object.entries(row.paymentSources).forEach(([source, value]) => {
        bySource[source] = (bySource[source] || 0) + value
      })
    })
    doctorTotals.set(doctorId, { total, bySource })
  })

  // Calculate grand total
  const grandTotal = Array.from(doctorTotals.values()).reduce(
    (sum, doctorTotal) => sum + doctorTotal.total,
    0
  )
  const grandTotalBySource: Record<string, number> = {}
  doctorTotals.forEach((doctorTotal) => {
    Object.entries(doctorTotal.bySource).forEach(([source, value]) => {
      grandTotalBySource[source] = (grandTotalBySource[source] || 0) + value
    })
  })

  const { formatCurrency } = useTranslation()

  const handleExportExcel = () => {
    if (!startDate || !endDate) {
      toast.error('Período não definido para exportação')
      return
    }
    try {
      exportFinancialToExcel(financialData, {
        clinic,
        startDate,
        endDate,
        reportType: 'financial',
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
      exportFinancialToPDF(financialData, {
        clinic,
        startDate,
        endDate,
        reportType: 'financial',
      })
      toast.success('Relatório exportado para PDF com sucesso!')
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao exportar relatório')
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Nenhum lançamento financeiro no período.
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
            <TableHead>Nº</TableHead>
            <TableHead>Paciente</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            {paymentSourceNames.map((source) => (
              <TableHead key={source} className="text-right">
                {source}
              </TableHead>
            ))}
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(rowsByDoctor.entries()).map(([doctorId, doctorRows]) => {
            const doctorName = doctorRows[0]?.doctorName || 'Não especificado'
            const totals = doctorTotals.get(doctorId)!

            return (
              <React.Fragment key={doctorId}>
                {doctorRows.map((row, idx) => (
                  <TableRow key={`${row.id}`} className="h-10">
                    {idx === 0 && (
                      <TableCell
                        rowSpan={doctorRows.length + 1}
                        className="font-medium align-middle"
                      >
                        {doctorName}
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell>{row.patientName}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(row.value)}
                    </TableCell>
                    {paymentSourceNames.map((source) => (
                      <TableCell key={source} className="text-right">
                        {row.paymentSources[source]
                          ? formatCurrency(row.paymentSources[source])
                          : '-'}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(row.id)}
                          className="h-7 w-7 p-0"
                          title="Editar lançamento"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(row.id)}
                          className="h-7 w-7 p-0"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total row for doctor */}
                <TableRow className="bg-muted font-semibold border-t border-muted-foreground/20 h-10">
                  {/* Médico column is already occupied by rowSpan, so we skip it */}
                  <TableCell className="text-right">
                    Total {doctorName}:
                  </TableCell>
                  <TableCell className="text-right"></TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(totals.total)}
                  </TableCell>
                  {paymentSourceNames.map((source) => (
                    <TableCell key={source} className="text-right">
                      {totals.bySource[source]
                        ? formatCurrency(totals.bySource[source])
                        : '-'}
                    </TableCell>
                  ))}
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
            <TableCell className="text-right text-base">
              {formatCurrency(grandTotal)}
            </TableCell>
            {paymentSourceNames.map((source) => (
              <TableCell key={source} className="text-right text-base">
                {grandTotalBySource[source]
                  ? formatCurrency(grandTotalBySource[source])
                  : '-'}
              </TableCell>
            ))}
            <TableCell></TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <EditFinancialDialog
      entry={entryToEdit}
      clinic={clinic}
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      onSuccess={handleEditSuccess}
    />

    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
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
