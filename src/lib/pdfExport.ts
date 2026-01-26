import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { DailyFinancialEntry, DailyAdvanceInvoiceEntry, Clinic } from '@/lib/types'

interface ExportOptions {
  clinic: Clinic
  startDate: string
  endDate: string
  reportType: 'financial' | 'billing'
}

// Paleta de cores (em RGB para jsPDF)
const COLORS = {
  primary: [37, 99, 235] as [number, number, number], // Azul moderno
  headerBg: [37, 99, 235] as [number, number, number], // Fundo do cabeçalho
  headerText: [255, 255, 255] as [number, number, number], // Texto branco
  totalBg: [224, 231, 255] as [number, number, number], // Fundo claro para totais
  totalText: [30, 64, 175] as [number, number, number], // Texto azul escuro
  grandTotalBg: [219, 234, 254] as [number, number, number], // Fundo mais claro para total geral
  grandTotalText: [30, 58, 138] as [number, number, number], // Texto azul muito escuro
  border: [229, 231, 235] as [number, number, number], // Cinza claro para bordas
  alternateBg: [249, 250, 251] as [number, number, number], // Cinza muito claro para linhas alternadas
}

// Formatar moeda
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Formatar data
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('pt-PT')
}

export function exportFinancialToPDF(
  data: DailyFinancialEntry[],
  options: ExportOptions
) {
  const { clinic, startDate, endDate, reportType } = options

  const doc = new jsPDF('landscape', 'mm', 'a4')

  if (reportType === 'financial') {
    // Preparar dados para o relatório financeiro (agrupado por médico com fontes de pagamento)
    const getDoctorName = (id: string | null | undefined) => {
      if (!id) return 'Não especificado'
      return clinic.configuration.doctors.find((d) => d.id === id)?.name || 'Desconhecido'
    }

    const getPaymentSourceName = (id: string | null | undefined) => {
      if (!id) return null
      return clinic.configuration.paymentSources?.find((ps) => ps.id === id)?.name || null
    }

    // Obter todas as fontes de pagamento
    const paymentSourceNames = (clinic.configuration.paymentSources || [])
      .map((ps) => ps.name)
      .sort()

    // Agrupar por médico
    const rowsByDoctor = new Map<string, DailyFinancialEntry[]>()
    data.forEach((entry) => {
      const doctorKey = entry.doctorId || 'no-doctor'
      if (!rowsByDoctor.has(doctorKey)) {
        rowsByDoctor.set(doctorKey, [])
      }
      rowsByDoctor.get(doctorKey)!.push(entry)
    })

    // Calcular totais
    const doctorTotals = new Map<string, { total: number; bySource: Record<string, number> }>()
    rowsByDoctor.forEach((doctorRows, doctorId) => {
      const total = doctorRows.reduce((sum, row) => sum + row.value, 0)
      const bySource: Record<string, number> = {}
      doctorRows.forEach((row) => {
        const paymentSourceName = getPaymentSourceName(row.paymentSourceId)
        if (paymentSourceName) {
          bySource[paymentSourceName] = (bySource[paymentSourceName] || 0) + row.value
        }
      })
      doctorTotals.set(doctorId, { total, bySource })
    })

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

    // Título
    doc.setFontSize(18)
    doc.setTextColor(COLORS.headerText[0], COLORS.headerText[1], COLORS.headerText[2])
    doc.setFillColor(COLORS.headerBg[0], COLORS.headerBg[1], COLORS.headerBg[2])
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 15, 'F')
    doc.text('Relatório Financeiro', 14, 10)

    // Informações da clínica e período
    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128)
    doc.setFillColor(255, 255, 255)
    doc.text(`Clínica: ${clinic.name}`, 14, 22)
    doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 28)

    // Preparar dados da tabela
    const tableData: (string | number)[][] = []

    rowsByDoctor.forEach((doctorRows, doctorId) => {
      const doctorName = getDoctorName(doctorId === 'no-doctor' ? null : doctorId)
      const totals = doctorTotals.get(doctorId)!

      doctorRows.forEach((row) => {
        const paymentSourceName = getPaymentSourceName(row.paymentSourceId)
        const rowData: (string | number)[] = [
          doctorName,
          row.code,
          row.patientName,
          formatCurrency(row.value),
        ]

        paymentSourceNames.forEach((source) => {
          rowData.push(paymentSourceName === source ? formatCurrency(row.value) : '-')
        })

        tableData.push(rowData)
      })

      // Linha de total do médico
      const totalRow: (string | number)[] = [
        '',
        `Total ${doctorName}:`,
        '',
        formatCurrency(totals.total),
      ]
      paymentSourceNames.forEach((source) => {
        totalRow.push(totals.bySource[source] ? formatCurrency(totals.bySource[source]) : '-')
      })
      tableData.push(totalRow)

      // Linha vazia
      tableData.push(['', '', '', '', ...paymentSourceNames.map(() => '')])
    })

    // Linha de total geral
    const grandTotalRow: (string | number)[] = [
      '',
      'Total Geral:',
      '',
      formatCurrency(grandTotal),
    ]
    paymentSourceNames.forEach((source) => {
      grandTotalRow.push(grandTotalBySource[source] ? formatCurrency(grandTotalBySource[source]) : '-')
    })
    tableData.push(grandTotalRow)

    // Criar cabeçalhos
    const headers = ['Médico', 'Nº', 'Paciente', 'Valor', ...paymentSourceNames]

    // Calcular larguras das colunas dinamicamente
    const columnStyles: Record<number, any> = {
      0: { cellWidth: 35 }, // Médico
      1: { cellWidth: 20 }, // Nº
      2: { cellWidth: 50 }, // Paciente
      3: { cellWidth: 30, halign: 'right' }, // Valor
    }

    // Adicionar colunas de fontes de pagamento
    const paymentSourceWidth = Math.max(25, (270 - 135) / paymentSourceNames.length) // Distribuir espaço restante
    paymentSourceNames.forEach((_, index) => {
      columnStyles[4 + index] = { cellWidth: paymentSourceWidth, halign: 'right' }
    })

    // Criar tabela
    autoTable(doc, {
      startY: 35,
      head: [headers],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.headerBg,
        textColor: COLORS.headerText,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [31, 41, 55],
      },
      alternateRowStyles: {
        fillColor: COLORS.alternateBg,
      },
      columnStyles,
      didParseCell: (data) => {
        // Estilizar linhas de totais
        const rowText = String(data.cell.text[0] || '')
        if (rowText.includes('Total')) {
          if (rowText.includes('Total Geral')) {
            data.cell.styles.fillColor = COLORS.grandTotalBg
            data.cell.styles.textColor = COLORS.grandTotalText
            data.cell.styles.fontSize = 10
          } else {
            data.cell.styles.fillColor = COLORS.totalBg
            data.cell.styles.textColor = COLORS.totalText
          }
          data.cell.styles.fontStyle = 'bold'
        }
      },
      margin: { top: 35, right: 14, bottom: 14, left: 14 },
    })

    // Gerar nome do arquivo
    const fileName = `Relatorio_Financeiro_${clinic.name.replace(/\s+/g, '_')}_${startDate}_${endDate}.pdf`
    doc.save(fileName)
  } else if (reportType === 'billing') {
    // Preparar dados para o relatório de faturação
    const getDoctorName = (id: string | null | undefined) => {
      if (!id) return 'Não especificado'
      return clinic.configuration.doctors.find((d) => d.id === id)?.name || 'Desconhecido'
    }

    const getPaymentSourceName = (id: string | null | undefined) => {
      if (!id) return null
      return clinic.configuration.paymentSources?.find((ps) => ps.id === id)?.name || null
    }

    // Obter todas as fontes de pagamento
    const paymentSourceNames = (clinic.configuration.paymentSources || [])
      .map((ps) => ps.name)
      .sort()

    // Agrupar por médico
    const rowsByDoctor = new Map<string, DailyFinancialEntry[]>()
    data.forEach((entry) => {
      const doctorKey = entry.doctorId || 'no-doctor'
      if (!rowsByDoctor.has(doctorKey)) {
        rowsByDoctor.set(doctorKey, [])
      }
      rowsByDoctor.get(doctorKey)!.push(entry)
    })

    // Calcular totais
    const doctorTotals = new Map<string, { total: number; bySource: Record<string, number> }>()
    rowsByDoctor.forEach((doctorRows, doctorId) => {
      const total = doctorRows.reduce((sum, row) => sum + row.value, 0)
      const bySource: Record<string, number> = {}
      doctorRows.forEach((row) => {
        const paymentSourceName = getPaymentSourceName(row.paymentSourceId)
        if (paymentSourceName) {
          bySource[paymentSourceName] = (bySource[paymentSourceName] || 0) + row.value
        }
      })
      doctorTotals.set(doctorId, { total, bySource })
    })

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

    // Título
    doc.setFontSize(18)
    doc.setTextColor(COLORS.headerText[0], COLORS.headerText[1], COLORS.headerText[2])
    doc.setFillColor(COLORS.headerBg[0], COLORS.headerBg[1], COLORS.headerBg[2])
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 15, 'F')
    doc.text('Relatório de Faturação', 14, 10)

    // Informações da clínica e período
    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128)
    doc.setFillColor(255, 255, 255)
    doc.text(`Clínica: ${clinic.name}`, 14, 22)
    doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 28)

    // Preparar dados da tabela
    const tableData: (string | number)[][] = []

    rowsByDoctor.forEach((doctorRows, doctorId) => {
      const doctorName = getDoctorName(doctorId === 'no-doctor' ? null : doctorId)
      const totals = doctorTotals.get(doctorId)!

      doctorRows.forEach((row) => {
        const paymentSourceName = getPaymentSourceName(row.paymentSourceId)
        const rowData: (string | number)[] = [
          doctorName,
          row.code,
          row.patientName,
          formatCurrency(row.value),
        ]

        paymentSourceNames.forEach((source) => {
          rowData.push(paymentSourceName === source ? formatCurrency(row.value) : '-')
        })

        tableData.push(rowData)
      })

      // Linha de total do médico
      const totalRow: (string | number)[] = [
        '',
        `Total ${doctorName}:`,
        '',
        formatCurrency(totals.total),
      ]
      paymentSourceNames.forEach((source) => {
        totalRow.push(totals.bySource[source] ? formatCurrency(totals.bySource[source]) : '-')
      })
      tableData.push(totalRow)

      // Linha vazia
      tableData.push(['', '', '', '', ...paymentSourceNames.map(() => '')])
    })

    // Linha de total geral
    const grandTotalRow: (string | number)[] = [
      '',
      'Total Geral:',
      '',
      formatCurrency(grandTotal),
    ]
    paymentSourceNames.forEach((source) => {
      grandTotalRow.push(grandTotalBySource[source] ? formatCurrency(grandTotalBySource[source]) : '-')
    })
    tableData.push(grandTotalRow)

    // Criar cabeçalhos
    const headers = ['Médico', 'Nº', 'Paciente', 'Valor', ...paymentSourceNames]

    // Calcular larguras das colunas dinamicamente
    const columnStyles: Record<number, any> = {
      0: { cellWidth: 35 }, // Médico
      1: { cellWidth: 20 }, // Nº
      2: { cellWidth: 50 }, // Paciente
      3: { cellWidth: 30, halign: 'right' }, // Valor
    }

    // Adicionar colunas de fontes de pagamento
    const paymentSourceWidth = Math.max(25, (270 - 135) / paymentSourceNames.length) // Distribuir espaço restante
    paymentSourceNames.forEach((_, index) => {
      columnStyles[4 + index] = { cellWidth: paymentSourceWidth, halign: 'right' }
    })

    // Criar tabela
    autoTable(doc, {
      startY: 35,
      head: [headers],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: COLORS.headerBg,
        textColor: COLORS.headerText,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [31, 41, 55],
      },
      alternateRowStyles: {
        fillColor: COLORS.alternateBg,
      },
      columnStyles,
      didParseCell: (data) => {
        // Estilizar linhas de totais
        const rowText = String(data.cell.text[0] || '')
        if (rowText.includes('Total')) {
          if (rowText.includes('Total Geral')) {
            data.cell.styles.fillColor = COLORS.grandTotalBg
            data.cell.styles.textColor = COLORS.grandTotalText
            data.cell.styles.fontSize = 10
          } else {
            data.cell.styles.fillColor = COLORS.totalBg
            data.cell.styles.textColor = COLORS.totalText
          }
          data.cell.styles.fontStyle = 'bold'
        }
      },
      margin: { top: 35, right: 14, bottom: 14, left: 14 },
    })

    // Gerar nome do arquivo
    const fileName = `Relatorio_Faturacao_${clinic.name.replace(/\s+/g, '_')}_${startDate}_${endDate}.pdf`
    doc.save(fileName)
  }
}

interface AdvanceInvoiceExportOptions {
  clinic: Clinic
  startDate: string
  endDate: string
}

export function exportAdvanceInvoiceToPDF(
  data: DailyAdvanceInvoiceEntry[],
  options: AdvanceInvoiceExportOptions
) {
  const { clinic, startDate, endDate } = options

  const doc = new jsPDF('landscape', 'mm', 'a4')

  const getDoctorName = (id: string | null | undefined) => {
    if (!id) return 'Não especificado'
    return clinic.configuration.doctors.find((d) => d.id === id)?.name || 'Desconhecido'
  }

  // Agrupar por médico
  const rowsByDoctor = new Map<string, DailyAdvanceInvoiceEntry[]>()
  data.forEach((entry) => {
    const doctorKey = entry.doctorId || 'no-doctor'
    if (!rowsByDoctor.has(doctorKey)) {
      rowsByDoctor.set(doctorKey, [])
    }
    rowsByDoctor.get(doctorKey)!.push(entry)
  })

  // Calcular totais
  const doctorTotals = new Map<string, number>()
  rowsByDoctor.forEach((doctorRows, doctorId) => {
    const total = doctorRows.reduce((sum, row) => sum + row.value, 0)
    doctorTotals.set(doctorId, total)
  })

  const grandTotal = Array.from(doctorTotals.values()).reduce(
    (sum, doctorTotal) => sum + doctorTotal,
    0
  )

  // Título
  doc.setFontSize(18)
  doc.setTextColor(COLORS.headerText[0], COLORS.headerText[1], COLORS.headerText[2])
  doc.setFillColor(COLORS.headerBg[0], COLORS.headerBg[1], COLORS.headerBg[2])
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 15, 'F')
  doc.text('Relatório de Fatura de Adiantamento', 14, 10)

  // Informações da clínica e período
  doc.setFontSize(10)
  doc.setTextColor(107, 114, 128)
  doc.setFillColor(255, 255, 255)
  doc.text(`Clínica: ${clinic.name}`, 14, 22)
  doc.text(`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, 14, 28)

  // Preparar dados da tabela
  const tableData: (string | number)[][] = []

  rowsByDoctor.forEach((doctorRows, doctorId) => {
    const doctorName = getDoctorName(doctorId === 'no-doctor' ? null : doctorId)
    const total = doctorTotals.get(doctorId)!

    doctorRows.forEach((row) => {
      const name = row.billedToThirdParty && row.thirdPartyName
        ? row.thirdPartyName
        : row.patientName
      const thirdPartyCode = row.billedToThirdParty ? (row.thirdPartyCode || '') : ''

      tableData.push([
        doctorName,
        row.code,
        thirdPartyCode,
        name,
        formatCurrency(row.value),
      ])
    })

    // Linha de total do médico
    tableData.push([
      '',
      `Total ${doctorName}:`,
      '',
      '',
      formatCurrency(total),
    ])

    // Linha vazia
    tableData.push(['', '', '', '', ''])
  })

  // Linha de total geral
  tableData.push([
    '',
    'Total Geral:',
    '',
    '',
    formatCurrency(grandTotal),
  ])

  // Criar tabela
  autoTable(doc, {
    startY: 35,
    head: [['Médico', 'Código Paciente', 'Código Terceiros', 'Nome', 'Valor']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: COLORS.headerBg,
      textColor: COLORS.headerText,
      fontStyle: 'bold',
      fontSize: 10,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [31, 41, 55],
    },
    alternateRowStyles: {
      fillColor: COLORS.alternateBg,
    },
    columnStyles: {
      0: { cellWidth: 40 }, // Médico
      1: { cellWidth: 30 }, // Código Paciente
      2: { cellWidth: 30 }, // Código Terceiros
      3: { cellWidth: 80 }, // Nome
      4: { cellWidth: 35, halign: 'right' }, // Valor
    },
    didParseCell: (data) => {
      // Estilizar linhas de totais
      const rowText = String(data.cell.text[0] || '')
      if (rowText.includes('Total')) {
        if (rowText.includes('Total Geral')) {
          data.cell.styles.fillColor = COLORS.grandTotalBg
          data.cell.styles.textColor = COLORS.grandTotalText
          data.cell.styles.fontSize = 10
        } else {
          data.cell.styles.fillColor = COLORS.totalBg
          data.cell.styles.textColor = COLORS.totalText
        }
        data.cell.styles.fontStyle = 'bold'
      }
    },
    margin: { top: 35, right: 14, bottom: 14, left: 14 },
  })

  // Gerar nome do arquivo
  const fileName = `Relatorio_Fatura_Adiantamento_${clinic.name.replace(/\s+/g, '_')}_${startDate}_${endDate}.pdf`
  doc.save(fileName)
}

