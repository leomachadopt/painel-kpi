import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, TrendingUp, CheckCircle, DollarSign, Search, RotateCcw, Check, FileText, Pencil, Trash2, Download } from 'lucide-react'
import ExcelJS from 'exceljs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import api from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { useTranslation } from '@/hooks/useTranslation'
import useDataStore from '@/stores/useDataStore'

interface MonthlyCashFlowSectionProps {
  clinicId: string
  refreshTrigger: number
}

interface Installment {
  id: string
  planId: string
  planDescription: string
  patientCode: string
  patientName: string
  installmentNumber: number
  totalInstallments: number
  dueDate: string
  value: number
  status: 'A_RECEBER' | 'RECEBIDO' | 'ATRASADO'
  receivedDate: string | null
  categoryName: string | null
}

export function MonthlyCashFlowSection({ clinicId, refreshTrigger }: MonthlyCashFlowSectionProps) {
  const { toast } = useToast()
  const { formatCurrency } = useTranslation()
  const { getClinic } = useDataStore()
  const clinic = getClinic(clinicId)

  const [loading, setLoading] = useState(true)
  const [installments, setInstallments] = useState<Installment[]>([])
  const [filteredInstallments, setFilteredInstallments] = useState<Installment[]>([])

  // Período selecionado
  const today = new Date()
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())

  // Filtros
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Dialogs
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [detailsInstallment, setDetailsInstallment] = useState<Installment | null>(null)
  const [editInstallment, setEditInstallment] = useState<Installment | null>(null)
  const [editFormData, setEditFormData] = useState({
    dueDate: '',
    value: '',
    status: '',
  })

  useEffect(() => {
    loadMonthInstallments()
  }, [clinicId, selectedMonth, selectedYear, refreshTrigger])

  useEffect(() => {
    applyFilters()
  }, [installments, searchQuery, statusFilter, categoryFilter])

  const loadMonthInstallments = async () => {
    setLoading(true)
    try {
      const data = await api.revenueForecast.getMonthInstallments(clinicId, selectedYear, selectedMonth)
      setInstallments(data)
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar parcelas do mês',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...installments]

    // Filtro de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (inst) =>
          inst.patientName.toLowerCase().includes(query) ||
          inst.planDescription.toLowerCase().includes(query) ||
          inst.patientCode.includes(query)
      )
    }

    // Filtro de status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((inst) => inst.status === statusFilter)
    }

    // Filtro de categoria
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((inst) => inst.categoryName === categoryFilter)
    }

    setFilteredInstallments(filtered)
  }

  const handleMarkAsReceived = async (installmentId: string) => {
    try {
      await api.revenueForecast.updateInstallment(clinicId, installmentId, {
        status: 'RECEBIDO',
        receivedDate: new Date().toISOString().split('T')[0],
      })
      toast({
        title: 'Sucesso',
        description: 'Parcela marcada como recebida',
      })
      loadMonthInstallments()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar parcela',
        variant: 'destructive',
      })
    }
  }

  const handleRevertReceived = async (installmentId: string) => {
    try {
      await api.revenueForecast.updateInstallment(clinicId, installmentId, {
        status: 'A_RECEBER',
        receivedDate: null,
      })
      toast({
        title: 'Sucesso',
        description: 'Recebimento revertido',
      })
      loadMonthInstallments()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao reverter recebimento',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return

    try {
      await api.revenueForecast.deleteInstallment(clinicId, deleteConfirm)
      toast({
        title: 'Sucesso',
        description: 'Parcela excluída',
      })
      setDeleteConfirm(null)
      loadMonthInstallments()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir parcela',
        variant: 'destructive',
      })
    }
  }

  const handleOpenEdit = (inst: Installment) => {
    setEditInstallment(inst)
    // Garantir que a data está no formato correto YYYY-MM-DD
    const dateStr = inst.dueDate.includes('T')
      ? inst.dueDate.split('T')[0]
      : inst.dueDate.split(' ')[0]
    setEditFormData({
      dueDate: dateStr,
      value: inst.value.toString(),
      status: inst.status,
    })
  }

  const handleSaveEdit = async () => {
    if (!editInstallment) return

    // Validação
    if (!editFormData.dueDate || !editFormData.value) {
      toast({
        title: 'Erro',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }

    const value = parseFloat(editFormData.value)
    if (isNaN(value) || value <= 0) {
      toast({
        title: 'Erro',
        description: 'Valor inválido',
        variant: 'destructive',
      })
      return
    }

    try {
      await api.revenueForecast.updateInstallment(clinicId, editInstallment.id, {
        dueDate: editFormData.dueDate,
        value: value,
        status: editFormData.status as any,
        receivedDate: editFormData.status === 'RECEBIDO' ? new Date().toISOString().split('T')[0] : null,
      })
      toast({
        title: 'Sucesso',
        description: 'Parcela atualizada',
      })
      setEditInstallment(null)
      loadMonthInstallments()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar parcela',
        variant: 'destructive',
      })
    }
  }

  const navigatePeriod = (direction: 'prev-year' | 'prev-month' | 'next-month' | 'next-year') => {
    let newMonth = selectedMonth
    let newYear = selectedYear

    switch (direction) {
      case 'prev-year':
        newYear -= 1
        break
      case 'prev-month':
        newMonth -= 1
        if (newMonth < 1) {
          newMonth = 12
          newYear -= 1
        }
        break
      case 'next-month':
        newMonth += 1
        if (newMonth > 12) {
          newMonth = 1
          newYear += 1
        }
        break
      case 'next-year':
        newYear += 1
        break
    }

    setSelectedMonth(newMonth)
    setSelectedYear(newYear)
  }

  const formatMonthYear = () => {
    const date = new Date(selectedYear, selectedMonth - 1)
    return date.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const handleExportToExcel = async () => {
    try {
      // Determinar símbolo da moeda
      const currencySymbol = clinic?.country === 'BR' ? 'R$' : '€'
      const currencyFormat = clinic?.country === 'BR' ? 'R$ #,##0.00' : '€ #,##0.00'

      // Criar workbook e worksheet
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Fluxo de Caixa')

      // Configurar larguras das colunas
      worksheet.columns = [
        { width: 12 },  // Tipo
        { width: 14 },  // Data Prevista
        { width: 14 },  // Código
        { width: 25 },  // Nome Paciente
        { width: 45 },  // Descrição
        { width: 10 },  // Parcela
        { width: 20 },  // Categoria
        { width: 14 },  // Status
        { width: 16 },  // Data Realizada
        { width: 16 },  // Valor
        { width: 16 },  // Saldo Previsto
      ]

      // === CABEÇALHO PRINCIPAL ===
      const titleRow = worksheet.addRow([`FLUXO DE CAIXA MENSAL - ${formatMonthYear().toUpperCase()}`])
      worksheet.mergeCells('A1:K1')
      titleRow.font = { bold: true, size: 16, color: { argb: 'FFFFFFFF' } }
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' }
      titleRow.height = 30

      // Informações da clínica
      const clinicRow = worksheet.addRow([`Clínica: ${clinic?.name || 'N/A'}`])
      worksheet.mergeCells('A2:K2')
      clinicRow.font = { size: 11 }
      clinicRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      clinicRow.alignment = { horizontal: 'center', vertical: 'middle' }
      clinicRow.height = 20

      const periodRow = worksheet.addRow([`Período: ${formatMonthYear()}`])
      worksheet.mergeCells('A3:K3')
      periodRow.font = { size: 11 }
      periodRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      periodRow.alignment = { horizontal: 'center', vertical: 'middle' }
      periodRow.height = 20

      const dateRow = worksheet.addRow([`Gerado em: ${new Date().toLocaleString('pt-PT')}`])
      worksheet.mergeCells('A4:K4')
      dateRow.font = { size: 11 }
      dateRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }
      dateRow.alignment = { horizontal: 'center', vertical: 'middle' }
      dateRow.height = 20

      // Linha vazia
      worksheet.addRow([])

      // === RESUMO DO PERÍODO ===
      const summaryTitleRow = worksheet.addRow(['RESUMO DO PERÍODO'])
      worksheet.mergeCells('A6:K6')
      summaryTitleRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
      summaryTitleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF10B981' } }
      summaryTitleRow.alignment = { horizontal: 'center', vertical: 'middle' }
      summaryTitleRow.height = 25

      // Cards de resumo - linha 1
      const summaryRow1 = worksheet.addRow(['Receita a Receber', summary.toReceive, 'Receita Realizada', summary.received])
      summaryRow1.height = 25

      // Estilizar células do resumo linha 1
      summaryRow1.getCell(1).font = { bold: true, size: 11 }
      summaryRow1.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
      summaryRow1.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
      summaryRow1.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

      summaryRow1.getCell(2).numFmt = currencyFormat
      summaryRow1.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } }
      summaryRow1.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
      summaryRow1.getCell(2).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

      summaryRow1.getCell(3).font = { bold: true, size: 11 }
      summaryRow1.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA7F3D0' } }
      summaryRow1.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' }
      summaryRow1.getCell(3).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

      summaryRow1.getCell(4).numFmt = currencyFormat
      summaryRow1.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA7F3D0' } }
      summaryRow1.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
      summaryRow1.getCell(4).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

      // Cards de resumo - linha 2
      const summaryRow2 = worksheet.addRow(['Saldo Projetado', projectedBalance, 'Saldo Real', realBalance])
      summaryRow2.height = 25

      summaryRow2.getCell(1).font = { bold: true, size: 11 }
      summaryRow2.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      summaryRow2.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' }
      summaryRow2.getCell(1).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

      summaryRow2.getCell(2).numFmt = currencyFormat
      summaryRow2.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
      summaryRow2.getCell(2).alignment = { horizontal: 'right', vertical: 'middle' }
      summaryRow2.getCell(2).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

      summaryRow2.getCell(3).font = { bold: true, size: 11 }
      summaryRow2.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7D2FE' } }
      summaryRow2.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' }
      summaryRow2.getCell(3).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

      summaryRow2.getCell(4).numFmt = currencyFormat
      summaryRow2.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC7D2FE' } }
      summaryRow2.getCell(4).alignment = { horizontal: 'right', vertical: 'middle' }
      summaryRow2.getCell(4).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }

      // Linha vazia
      worksheet.addRow([])

      // === CABEÇALHO DA TABELA ===
      const headerRow = worksheet.addRow([
        'Tipo', 'Data Prevista', 'Código', 'Nome Paciente', 'Descrição',
        'Parcela', 'Categoria', 'Status', 'Data Realizada', 'Valor', 'Saldo Previsto'
      ])
      headerRow.height = 25
      headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } }
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' }
      headerRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'medium' },
          bottom: { style: 'medium' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }
      })

      // === LINHAS DE DADOS ===
      installmentsWithBalance.forEach((inst) => {
        const status = inst.status === 'A_RECEBER' ? 'A Receber' : inst.status === 'RECEBIDO' ? 'Recebido' : 'Atrasado'

        // Cor de fundo baseada no status
        let bgColor = 'FFFFFFFF'
        if (status === 'Recebido') bgColor = 'FFD1FAE5'
        else if (status === 'Atrasado') bgColor = 'FFFEE2E2'
        else if (status === 'A Receber') bgColor = 'FFFEF3C7'

        const dataRow = worksheet.addRow([
          'Receita',
          formatDate(inst.dueDate),
          inst.patientCode,
          inst.patientName,
          inst.planDescription,
          `${inst.installmentNumber}/${inst.totalInstallments}`,
          inst.categoryName || '-',
          status,
          inst.receivedDate ? formatDate(inst.receivedDate) : '-',
          inst.value,
          inst.cumulativeBalance
        ])

        dataRow.height = 20
        dataRow.eachCell((cell, colNumber) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
          cell.alignment = {
            horizontal: colNumber >= 10 ? 'right' : 'left',
            vertical: 'middle'
          }
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
            right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
          }

          // Formatar valores monetários
          if (colNumber === 10 || colNumber === 11) {
            cell.numFmt = currencyFormat
          }
        })
      })

      // === LINHA DE TOTAL ===
      const totalRow = worksheet.addRow([
        '', '', '', '', '', '', 'TOTAL', '', '',
        summary.toReceive + summary.received,
        cumulativeBalance
      ])
      totalRow.height = 25
      totalRow.font = { bold: true, size: 11 }
      totalRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF59E0B' } }
      totalRow.eachCell((cell, colNumber) => {
        cell.alignment = {
          horizontal: colNumber >= 10 ? 'right' : colNumber === 7 ? 'center' : 'left',
          vertical: 'middle'
        }
        cell.border = {
          top: { style: 'medium' },
          bottom: { style: 'medium' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        }

        // Formatar valores monetários
        if (colNumber === 10 || colNumber === 11) {
          cell.numFmt = currencyFormat
        }
      })

      // Gerar e baixar arquivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Fluxo_Caixa_${formatMonthYear().replace(/ /g, '_')}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Sucesso',
        description: 'Relatório exportado com sucesso',
      })
    } catch (error: any) {
      console.error('Export error:', error)
      toast({
        title: 'Erro',
        description: 'Falha ao exportar relatório',
        variant: 'destructive',
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      A_RECEBER: { label: 'A Receber', className: 'bg-green-100 text-green-800' },
      RECEBIDO: { label: 'Recebido', className: 'bg-blue-100 text-blue-800' },
      ATRASADO: { label: 'Atrasado', className: 'bg-red-100 text-red-800' },
    }

    const config = variants[status as keyof typeof variants] || variants.A_RECEBER

    return (
      <Badge className={config.className}>
        {config.label}
        {status === 'ATRASADO' && ' ⚠️'}
      </Badge>
    )
  }

  // Calcular resumos
  const summary = filteredInstallments.reduce(
    (acc, inst) => {
      if (inst.status === 'A_RECEBER' || inst.status === 'ATRASADO') {
        acc.toReceive += inst.value
        acc.toReceiveCount += 1
      }
      if (inst.status === 'RECEBIDO') {
        acc.received += inst.value
        acc.receivedCount += 1
      }
      return acc
    },
    { toReceive: 0, toReceiveCount: 0, received: 0, receivedCount: 0 }
  )

  const projectedBalance = summary.toReceive
  const realBalance = summary.received

  // Obter categorias únicas
  const uniqueCategories = Array.from(new Set(installments.map((inst) => inst.categoryName).filter(Boolean)))

  // Calcular saldo previsto cumulativo
  let cumulativeBalance = 0
  const installmentsWithBalance = filteredInstallments.map((inst) => {
    cumulativeBalance += inst.value
    return { ...inst, cumulativeBalance }
  })

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa Mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="text-2xl font-semibold capitalize">{formatMonthYear()}</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigatePeriod('prev-year')}>
              <Calendar className="w-4 h-4 mr-2" />
              Ano Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigatePeriod('prev-month')}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Mês Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigatePeriod('next-month')}>
              Próximo Mês
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigatePeriod('next-year')}>
              Próximo Ano
              <Calendar className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">RECEITA A RECEBER</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.toReceive)}</p>
                  <p className="text-xs text-muted-foreground">Total previsto</p>
                </div>
                <TrendingUp className="w-10 h-10 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">RECEITA REALIZADA</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.received)}</p>
                  <p className="text-xs text-muted-foreground">Receitas confirmadas</p>
                </div>
                <CheckCircle className="w-10 h-10 text-emerald-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">SALDO PROJETADO</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(projectedBalance)}</p>
                  <p className="text-xs text-muted-foreground">Previsão de saldo</p>
                </div>
                <DollarSign className="w-10 h-10 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">SALDO REAL</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(realBalance)}</p>
                  <p className="text-xs text-muted-foreground">Saldo atual</p>
                </div>
                <DollarSign className="w-10 h-10 text-indigo-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Todas as Movimentações</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Lista unificada de receitas para o período selecionado
                </p>
              </div>
              <Button onClick={handleExportToExcel} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Ex: Nome do paciente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="A_RECEBER">A Receber</SelectItem>
                  <SelectItem value="RECEBIDO">Recebido</SelectItem>
                  <SelectItem value="ATRASADO">Atrasado</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as Categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {uniqueCategories.map((cat) => (
                    <SelectItem key={cat} value={cat || 'sem-categoria'}>
                      {cat || 'Sem categoria'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {installmentsWithBalance.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                Nenhuma movimentação encontrada para este período
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-sm text-muted-foreground">
                      <th className="text-left p-3">Tipo</th>
                      <th className="text-left p-3">Data Prevista</th>
                      <th className="text-left p-3">Descrição/Nome</th>
                      <th className="text-left p-3">Categoria</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Data Realizada</th>
                      <th className="text-right p-3">Valor</th>
                      <th className="text-right p-3">Saldo Previsto ⬆</th>
                      <th className="text-center p-3">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentsWithBalance.map((inst) => (
                      <tr key={inst.id} className="border-t hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        </td>
                        <td className="p-3 text-sm">{formatDate(inst.dueDate)}</td>
                        <td className="p-3">
                          <div className="text-sm font-medium">
                            {inst.patientName} • {inst.planDescription}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            #{inst.patientCode} • Parcela {inst.installmentNumber}/{inst.totalInstallments}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-brown-500" />
                            <span className="text-sm">{inst.categoryName || 'Sem categoria'}</span>
                          </div>
                        </td>
                        <td className="p-3">{getStatusBadge(inst.status)}</td>
                        <td className="p-3 text-sm text-muted-foreground">
                          {inst.receivedDate ? formatDate(inst.receivedDate) : '— Pendente'}
                        </td>
                        <td className="p-3 text-right font-semibold text-green-600">
                          {formatCurrency(inst.value)}
                        </td>
                        <td className="p-3 text-right font-semibold">{formatCurrency(inst.cumulativeBalance)}</td>
                        <td className="p-3">
                          <div className="flex justify-center gap-1">
                            {inst.status === 'RECEBIDO' ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevertReceived(inst.id)}
                                title="Reverter recebimento"
                              >
                                <RotateCcw className="w-4 h-4 text-orange-600" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleMarkAsReceived(inst.id)}
                                title="Confirmar recebimento"
                              >
                                <Check className="w-4 h-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDetailsInstallment(inst)}
                              title="Ver detalhes"
                            >
                              <FileText className="w-4 h-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(inst)}
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4 text-gray-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteConfirm(inst.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Details Dialog */}
      <Dialog open={!!detailsInstallment} onOpenChange={() => setDetailsInstallment(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Parcela</DialogTitle>
            <DialogDescription>Informações completas sobre esta parcela</DialogDescription>
          </DialogHeader>
          {detailsInstallment && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paciente</p>
                  <p className="text-lg font-semibold">
                    {detailsInstallment.patientName}
                    <span className="text-sm text-muted-foreground ml-2">
                      (#{detailsInstallment.patientCode})
                    </span>
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                  <p className="text-lg">{detailsInstallment.planDescription}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Parcela</p>
                  <p className="text-lg font-semibold">
                    {detailsInstallment.installmentNumber} / {detailsInstallment.totalInstallments}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data de Vencimento</p>
                  <p className="text-lg">{formatDate(detailsInstallment.dueDate)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Valor</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(detailsInstallment.value)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(detailsInstallment.status)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data Realizada</p>
                  <p className="text-lg">
                    {detailsInstallment.receivedDate
                      ? formatDate(detailsInstallment.receivedDate)
                      : '— Pendente'}
                  </p>
                </div>
              </div>

              {detailsInstallment.categoryName && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Categoria</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-2 h-2 rounded-full bg-brown-500" />
                    <span className="text-lg">{detailsInstallment.categoryName}</span>
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsInstallment(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editInstallment} onOpenChange={() => setEditInstallment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Parcela</DialogTitle>
            <DialogDescription>
              {editInstallment && `${editInstallment.patientName} - Parcela ${editInstallment.installmentNumber}/${editInstallment.totalInstallments}`}
            </DialogDescription>
          </DialogHeader>
          {editInstallment && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>
                  Data de Vencimento <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={editFormData.dueDate}
                  onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Valor (€) <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editFormData.value}
                  onChange={(e) => setEditFormData({ ...editFormData, value: e.target.value })}
                  placeholder="150.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A_RECEBER">A Receber</SelectItem>
                    <SelectItem value="RECEBIDO">Recebido</SelectItem>
                    <SelectItem value="ATRASADO">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editFormData.status === 'RECEBIDO' && (
                <div className="p-3 bg-blue-50 rounded-md">
                  <p className="text-sm text-blue-800">
                    Ao marcar como recebido, a data de recebimento será definida como hoje.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInstallment(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta parcela?
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
