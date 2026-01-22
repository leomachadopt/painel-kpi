import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil, Download } from 'lucide-react'
import { DailyFinancialEntry, Clinic } from '@/lib/types'
import { dailyEntriesApi } from '@/services/api'
import { toast } from 'sonner'
import { useState } from 'react'
import { EditFinancialDialog } from './EditFinancialDialog'
import { exportFinancialToExcel } from '@/lib/excelExport'
import { exportFinancialToPDF } from '@/lib/pdfExport'
import { useTranslation } from '@/hooks/useTranslation'

export function FinancialTable({
  data,
  clinic,
  onDelete,
  startDate,
  endDate,
}: {
  data: DailyFinancialEntry[]
  clinic: Clinic
  onDelete?: () => void
  startDate?: string
  endDate?: string
}) {
  const { formatCurrency, t } = useTranslation()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<DailyFinancialEntry | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Filter out billing entries (they should only appear in Billing report)
  const financialData = data.filter(entry => !entry.isBillingEntry)

  const getCategoryName = (id: string) =>
    clinic.configuration.categories.find((c) => c.id === id)?.name || id
  const getCabinetName = (id: string) =>
    clinic.configuration.cabinets.find((c) => c.id === id)?.name || id

  const handleDelete = async (entry: DailyFinancialEntry) => {
    if (!confirm(`Excluir lançamento de ${formatCurrency(entry.value)} de ${entry.patientName}?`)) {
      return
    }

    setDeleting(entry.id)
    try {
      await dailyEntriesApi.financial.delete(clinic.id, entry.id)
      toast.success('Lançamento excluído com sucesso!')
      onDelete?.()
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao excluir lançamento')
    } finally {
      setDeleting(null)
    }
  }

  const handleEdit = (entry: DailyFinancialEntry) => {
    setEditingEntry(entry)
    setIsEditDialogOpen(true)
  }

  const handleEditSuccess = () => {
    onDelete?.() // Recarregar dados
  }

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

  return (
    <>
      <div className="flex justify-end gap-2 mb-4">
        <Button
          variant="outline"
          onClick={handleExportExcel}
          disabled={financialData.length === 0 || !startDate || !endDate}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar para Excel
        </Button>
        <Button
          variant="outline"
          onClick={handleExportPDF}
          disabled={financialData.length === 0 || !startDate || !endDate}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar para PDF
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>{t('financial.cabinet')}</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {financialData.length > 0 ? (
              financialData.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{entry.date.split('T')[0]}</TableCell>
                  <TableCell>{entry.patientName}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {entry.code}
                  </TableCell>
                  <TableCell>{getCategoryName(entry.categoryId)}</TableCell>
                  <TableCell>{getCabinetName(entry.cabinetId)}</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(entry.value)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(entry)}
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry)}
                        disabled={deleting === entry.id}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Nenhum lançamento financeiro no período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <EditFinancialDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        entry={editingEntry}
        clinic={clinic}
        onSuccess={handleEditSuccess}
      />
    </>
  )
}
