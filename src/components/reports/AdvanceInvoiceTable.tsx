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
import { toast } from 'sonner'
import useDataStore from '@/stores/useDataStore'
import { EditAdvanceInvoiceDialog } from './EditAdvanceInvoiceDialog'

interface AdvanceInvoiceRow {
  entryId: string
  doctorId: string | null
  doctorName: string
  patientCode: string
  thirdPartyCode: string | null
  name: string // Nome do paciente ou do terceiro
  value: number
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
    }
  })

  // Group rows by doctor
  const rowsByDoctor = new Map<string, AdvanceInvoiceRow[]>()
  rows.forEach((row) => {
    const doctorKey = row.doctorId || 'no-doctor'
    if (!rowsByDoctor.has(doctorKey)) {
      rowsByDoctor.set(doctorKey, [])
    }
    rowsByDoctor.get(doctorKey)!.push(row)
  })

  // Calculate totals per doctor
  const doctorTotals = new Map<string, number>()
  rowsByDoctor.forEach((doctorRows, doctorId) => {
    const total = doctorRows.reduce((sum, row) => sum + row.value, 0)
    doctorTotals.set(doctorId, total)
  })

  // Calculate grand total
  const grandTotal = Array.from(doctorTotals.values()).reduce(
    (sum, doctorTotal) => sum + doctorTotal,
    0
  )

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  const handleExport = () => {
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
      toast.success('Relatório exportado com sucesso!')
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
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={rows.length === 0 || !startDate || !endDate}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar para Excel
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
            {Array.from(rowsByDoctor.entries()).map(([doctorId, doctorRows]) => {
              const doctorName = doctorRows[0]?.doctorName || 'Não especificado'
              const total = doctorTotals.get(doctorId)!

              return (
                <React.Fragment key={doctorId}>
                  {doctorRows.map((row, idx) => (
                    <TableRow key={`${row.entryId}-${idx}`} className="h-10">
                      {idx === 0 && (
                        <TableCell
                          rowSpan={doctorRows.length + 1}
                          className="font-medium align-middle"
                        >
                          {doctorName}
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-xs">{row.patientCode}</TableCell>
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
                  ))}
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
