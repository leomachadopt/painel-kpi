// Import xlsx-js-style que estende xlsx com suporte a estilos
import * as XLSXStatic from 'xlsx-js-style'
import type { DailyFinancialEntry, DailyAdvanceInvoiceEntry, Clinic } from '@/lib/types'

// Garantir que XLSX está disponível
let XLSX: typeof XLSXStatic = XLSXStatic

// Função helper para garantir que XLSX está carregado
function getXLSX() {
  if (!XLSX || !XLSX.utils || !XLSX.utils.book_new) {
    // Tentar usar a importação estática primeiro
    if (XLSXStatic && XLSXStatic.utils && XLSXStatic.utils.book_new) {
      XLSX = XLSXStatic
      return XLSX
    }
    throw new Error('Biblioteca XLSX não está disponível. Por favor, recarregue a página.')
  }
  return XLSX
}

interface ExportOptions {
  clinic: Clinic
  startDate: string
  endDate: string
  reportType: 'financial' | 'billing'
}

// Paleta de cores moderna
const COLORS = {
  primary: '2563EB',        // Azul moderno
  primaryDark: '1E4A8E',    // Azul escuro
  secondary: '10B981',     // Verde moderno
  accent: 'F59E0B',         // Laranja
  headerBg: '2563EB',      // Fundo do cabeçalho
  headerText: 'FFFFFF',    // Texto branco
  totalBg: 'E0E7FF',       // Fundo claro para totais
  totalText: '1E40AF',     // Texto azul escuro
  grandTotalBg: 'DBEAFE',  // Fundo mais claro para total geral
  grandTotalText: '1E3A8A', // Texto azul muito escuro
  border: 'E5E7EB',        // Cinza claro para bordas
  dataBg: 'FFFFFF',        // Branco para dados
  alternateBg: 'F9FAFB',   // Cinza muito claro para linhas alternadas
  infoText: '6B7280',      // Cinza para informações
  textDark: '1F2937',      // Texto escuro
}

// Função auxiliar para aplicar estilo a uma célula
function applyStyle(ws: any, cell: string, style: any) {
  if (!ws[cell]) {
    ws[cell] = { v: '', t: 's' }
  }
  ws[cell].s = style
}

// Função auxiliar para garantir que uma célula existe
function ensureCell(ws: any, cell: string, value: any = '') {
  if (!ws[cell]) {
    ws[cell] = { v: value, t: typeof value === 'number' ? 'n' : 's' }
  }
}

// Função para criar estilo de título
function getTitleStyle(): any {
  return {
    fill: {
      fgColor: { rgb: COLORS.headerBg }
    },
    font: {
      name: 'Calibri',
      sz: 16,
      bold: true,
      color: { rgb: COLORS.headerText }
    },
    alignment: {
      horizontal: 'left',
      vertical: 'middle'
    }
  }
}

// Função para criar estilo de informação
function getInfoStyle(): any {
  return {
    font: {
      name: 'Calibri',
      sz: 10,
      color: { rgb: COLORS.infoText }
    },
    alignment: {
      horizontal: 'left',
      vertical: 'middle'
    }
  }
}

// Função para criar estilo de cabeçalho de tabela
function getHeaderStyle(): any {
  return {
    fill: {
      fgColor: { rgb: COLORS.headerBg }
    },
    font: {
      name: 'Calibri',
      sz: 11,
      bold: true,
      color: { rgb: COLORS.headerText }
    },
    alignment: {
      horizontal: 'center',
      vertical: 'middle'
    },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.border } },
      bottom: { style: 'thin', color: { rgb: COLORS.border } },
      left: { style: 'thin', color: { rgb: COLORS.border } },
      right: { style: 'thin', color: { rgb: COLORS.border } }
    }
  }
}

// Função para criar estilo de dados
function getDataStyle(isAlternate = false): any {
  return {
    fill: {
      fgColor: { rgb: isAlternate ? COLORS.alternateBg : COLORS.dataBg }
    },
    font: {
      name: 'Calibri',
      sz: 10,
      color: { rgb: COLORS.textDark }
    },
    alignment: {
      horizontal: 'left',
      vertical: 'middle'
    },
    border: {
      left: { style: 'thin', color: { rgb: COLORS.border } },
      right: { style: 'thin', color: { rgb: COLORS.border } },
      bottom: { style: 'thin', color: { rgb: COLORS.border } }
    }
  }
}

// Função para criar estilo de valor numérico
function getNumberStyle(isAlternate = false): any {
  return {
    ...getDataStyle(isAlternate),
    alignment: {
      horizontal: 'right',
      vertical: 'middle'
    },
    numFmt: '#,##0.00" €"'
  }
}

// Função para criar estilo de total de profissional
function getDoctorTotalStyle(): any {
  return {
    fill: {
      fgColor: { rgb: COLORS.totalBg }
    },
    font: {
      name: 'Calibri',
      sz: 10,
      bold: true,
      color: { rgb: COLORS.totalText }
    },
    alignment: {
      horizontal: 'right',
      vertical: 'middle'
    },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.border } },
      bottom: { style: 'thin', color: { rgb: COLORS.border } },
      left: { style: 'thin', color: { rgb: COLORS.border } },
      right: { style: 'thin', color: { rgb: COLORS.border } }
    }
  }
}

// Função para criar estilo de total geral
function getGrandTotalStyle(): any {
  return {
    fill: {
      fgColor: { rgb: COLORS.grandTotalBg }
    },
    font: {
      name: 'Calibri',
      sz: 12,
      bold: true,
      color: { rgb: COLORS.grandTotalText }
    },
    alignment: {
      horizontal: 'right',
      vertical: 'middle'
    },
    border: {
      top: { style: 'medium', color: { rgb: COLORS.primary } },
      bottom: { style: 'medium', color: { rgb: COLORS.primary } },
      left: { style: 'thin', color: { rgb: COLORS.border } },
      right: { style: 'thin', color: { rgb: COLORS.border } }
    }
  }
}

// Função para converter número de coluna para letra (0 -> A, 1 -> B, etc.)
function colToLetter(col: number): string {
  let temp = ''
  let letter = ''
  while (col >= 0) {
    temp = col % 26
    letter = String.fromCharCode(temp + 65) + letter
    col = (col - temp - 1) / 26
  }
  return letter
}

export function exportFinancialToExcel(
  data: DailyFinancialEntry[],
  options: ExportOptions
) {
  const { clinic, startDate, endDate, reportType } = options

  // Formatar datas para exibição
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT')
  }

  // Preparar dados para o relatório financeiro
  if (reportType === 'financial') {
    const worksheetData = [
      // Cabeçalho
      ['Relatório Financeiro', '', '', '', '', '', ''],
      [`Clínica: ${clinic.name}`, '', '', '', '', '', ''],
      [`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, '', '', '', '', '', ''],
      ['', '', '', '', '', '', ''],
      // Cabeçalhos da tabela
      ['Data', 'Paciente', 'Código', 'Categoria', 'Gabinete', 'Valor', ''],
    ]

    // Adicionar linhas de dados
    data.forEach((entry) => {
      const categoryName =
        clinic.configuration.categories.find((c) => c.id === entry.categoryId)?.name || entry.categoryId
      const cabinetName =
        clinic.configuration.cabinets.find((c) => c.id === entry.cabinetId)?.name || entry.cabinetId

      worksheetData.push([
        entry.date.split('T')[0],
        entry.patientName,
        entry.code,
        categoryName,
        cabinetName,
        entry.value,
        '',
      ])
    })

    // Adicionar linha de total
    const total = data.reduce((sum, entry) => sum + entry.value, 0)
    worksheetData.push(['', '', '', '', '', '', ''])
    worksheetData.push(['', '', '', '', 'Total:', total, ''])

    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(worksheetData)

    // Aplicar estilos
    // Título (linha 1)
    applyStyle(ws, 'A1', getTitleStyle())
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }]

    // Informações da clínica e período (linhas 2 e 3)
    applyStyle(ws, 'A2', getInfoStyle())
    applyStyle(ws, 'A3', getInfoStyle())

    // Cabeçalhos da tabela (linha 5)
    const headerRow = 4
    ;['A', 'B', 'C', 'D', 'E', 'F'].forEach((col) => {
      applyStyle(ws, `${col}${headerRow + 1}`, getHeaderStyle())
    })

    // Dados (começando na linha 6)
    data.forEach((_, index) => {
      const row = headerRow + 2 + index
      const isAlternate = index % 2 === 1
      ;['A', 'B', 'C', 'D', 'E'].forEach((col) => {
        applyStyle(ws, `${col}${row}`, getDataStyle(isAlternate))
      })
      // Coluna de valor com formatação numérica
      applyStyle(ws, `F${row}`, getNumberStyle(isAlternate))
    })

    // Linha de total
    const totalRow = headerRow + 2 + data.length + 1
    applyStyle(ws, `E${totalRow}`, getGrandTotalStyle())
    applyStyle(ws, `F${totalRow}`, {
      ...getGrandTotalStyle(),
      numFmt: '#,##0.00" €"'
    })

    // Ajustar larguras das colunas
    ws['!cols'] = [
      { wch: 12 }, // Data
      { wch: 25 }, // Paciente
      { wch: 10 }, // Código
      { wch: 20 }, // Categoria
      { wch: 15 }, // Gabinete
      { wch: 15 }, // Valor
      { wch: 5 },  // Vazio
    ]

    XLSX.utils.book_append_sheet(wb, ws, 'Financeiro')

    // Gerar nome do arquivo
    const fileName = `Relatorio_Financeiro_${clinic.name.replace(/\s+/g, '_')}_${startDate}_${endDate}.xlsx`
    XLSX.writeFile(wb, fileName)
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

    // Preparar dados da planilha
    const worksheetData = [
      // Cabeçalho
      ['Relatório de Faturação', '', '', '', ...paymentSourceNames.map(() => '')],
      [`Clínica: ${clinic.name}`, '', '', '', ...paymentSourceNames.map(() => '')],
      [`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, '', '', '', ...paymentSourceNames.map(() => '')],
      ['', '', '', '', ...paymentSourceNames.map(() => '')],
      // Cabeçalhos da tabela
      ['Médico', 'Nº', 'Paciente', 'Valor', ...paymentSourceNames],
    ]

    let currentRow = 4 // Começa após os cabeçalhos
    const headerRow = 4
    const totalRowNumbers: number[] = [] // Rastrear linhas de totais

    // Adicionar dados agrupados por médico
    rowsByDoctor.forEach((doctorRows, doctorId) => {
      const doctorName = getDoctorName(doctorId === 'no-doctor' ? null : doctorId)
      const totals = doctorTotals.get(doctorId)!

      doctorRows.forEach((row, idx) => {
        const paymentSourceName = getPaymentSourceName(row.paymentSourceId)
        const rowData: (string | number)[] = [
          doctorName,
          row.code,
          row.patientName,
          row.value,
        ]

        paymentSourceNames.forEach((source) => {
          rowData.push(paymentSourceName === source ? row.value : '')
        })

        worksheetData.push(rowData)
        currentRow++
      })

      // Linha de total do médico
      const totalRow: (string | number)[] = [
        '',
        `Total ${doctorName}:`,
        '',
        totals.total,
      ]
      paymentSourceNames.forEach((source) => {
        totalRow.push(totals.bySource[source] || '')
      })
      worksheetData.push(totalRow)
      totalRowNumbers.push(currentRow)
      currentRow++

      // Linha vazia
      worksheetData.push(['', '', '', '', ...paymentSourceNames.map(() => '')])
      currentRow++
    })

    // Linha de total geral
    const grandTotalRow: (string | number)[] = [
      '',
      'Total Geral:',
      '',
      grandTotal,
    ]
    paymentSourceNames.forEach((source) => {
      grandTotalRow.push(grandTotalBySource[source] || '')
    })
    worksheetData.push(grandTotalRow)
    totalRowNumbers.push(currentRow)

    // Criar workbook e worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(worksheetData)

    const totalCols = 4 + paymentSourceNames.length

    // Aplicar estilos
    // Título (linha 1)
    applyStyle(ws, 'A1', getTitleStyle())
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }]

    // Informações da clínica e período (linhas 2 e 3)
    applyStyle(ws, 'A2', getInfoStyle())
    applyStyle(ws, 'A3', getInfoStyle())

    // Cabeçalhos da tabela (linha 5)
    for (let col = 0; col < totalCols; col++) {
      const colLetter = colToLetter(col)
      applyStyle(ws, `${colLetter}${headerRow + 1}`, getHeaderStyle())
    }

    // Aplicar estilos aos dados
    let dataRowIndex = 0
    rowsByDoctor.forEach((doctorRows, doctorId) => {
      doctorRows.forEach((_, idx) => {
        const row = headerRow + 2 + dataRowIndex
        const isAlternate = dataRowIndex % 2 === 1

        // Coluna Médico (A)
        applyStyle(ws, `A${row}`, getDataStyle(isAlternate))
        // Coluna Nº (B)
        applyStyle(ws, `B${row}`, getDataStyle(isAlternate))
        // Coluna Paciente (C)
        applyStyle(ws, `C${row}`, getDataStyle(isAlternate))
        // Coluna Valor (D)
        applyStyle(ws, `D${row}`, getNumberStyle(isAlternate))
        // Colunas de fontes de pagamento
        for (let i = 0; i < paymentSourceNames.length; i++) {
          const colLetter = colToLetter(4 + i)
          applyStyle(ws, `${colLetter}${row}`, getNumberStyle(isAlternate))
        }

        dataRowIndex++
      })

      // Linha de total do médico
      const totalRowNum = headerRow + 2 + dataRowIndex
      // Aplicar estilo em TODAS as colunas da linha de total
      for (let col = 0; col < totalCols; col++) {
        const colLetter = colToLetter(col)
        // Garantir que a célula existe
        ensureCell(ws, `${colLetter}${totalRowNum}`)
        
        // Se for coluna de valor ou fonte de pagamento, aplicar formatação numérica
        if (col === 3 || col >= 4) {
          applyStyle(ws, `${colLetter}${totalRowNum}`, {
            ...getDoctorTotalStyle(),
            numFmt: '#,##0.00" €"'
          })
        } else {
          // Colunas de texto (Médico, Nº, Paciente)
          applyStyle(ws, `${colLetter}${totalRowNum}`, getDoctorTotalStyle())
        }
      }

      dataRowIndex += 2 // Pula linha de total e linha vazia
    })

    // Linha de total geral
    const grandTotalRowNum = headerRow + 2 + dataRowIndex
    // Aplicar estilo em TODAS as colunas da linha de total geral
    for (let col = 0; col < totalCols; col++) {
      const colLetter = colToLetter(col)
      // Garantir que a célula existe
      ensureCell(ws, `${colLetter}${grandTotalRowNum}`)
      
      // Se for coluna de valor ou fonte de pagamento, aplicar formatação numérica
      if (col === 3 || col >= 4) {
        applyStyle(ws, `${colLetter}${grandTotalRowNum}`, {
          ...getGrandTotalStyle(),
          numFmt: '#,##0.00" €"'
        })
      } else {
        // Colunas de texto (Médico, Nº, Paciente)
        applyStyle(ws, `${colLetter}${grandTotalRowNum}`, getGrandTotalStyle())
      }
    }

    // Ajustar larguras das colunas
    const colWidths = [
      { wch: 20 }, // Médico
      { wch: 10 }, // Nº
      { wch: 25 }, // Paciente
      { wch: 15 }, // Valor
      ...paymentSourceNames.map(() => ({ wch: 15 })), // Fontes de pagamento
    ]
    ws['!cols'] = colWidths

    // Definir altura uniforme para todas as linhas de dados
    const defaultRowHeight = 20
    const totalRows = worksheetData.length
    ws['!rows'] = []
    for (let r = 0; r < totalRows; r++) {
      // Altura maior para título (linha 0)
      if (r === 0) {
        ws['!rows'][r] = { hpt: 30 }
      }
      // Altura maior para cabeçalho da tabela
      else if (r === headerRow) {
        ws['!rows'][r] = { hpt: 25 }
      }
      // Altura maior para linhas de totais
      else if (totalRowNumbers.includes(r)) {
        ws['!rows'][r] = { hpt: 22 }
      }
      // Altura padrão para todas as outras linhas
      else {
        ws['!rows'][r] = { hpt: defaultRowHeight }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Faturação')

    // Gerar nome do arquivo
    const fileName = `Relatorio_Faturacao_${clinic.name.replace(/\s+/g, '_')}_${startDate}_${endDate}.xlsx`
    XLSX.writeFile(wb, fileName)
  }
}

interface AdvanceInvoiceExportOptions {
  clinic: Clinic
  startDate: string
  endDate: string
}

export function exportAdvanceInvoiceToExcel(
  data: DailyAdvanceInvoiceEntry[],
  options: AdvanceInvoiceExportOptions
) {
  const { clinic, startDate, endDate } = options

  // Garantir que XLSX está disponível
  const XLSXLib = getXLSX()

  // Formatar datas para exibição
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('pt-PT')
  }

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

  // Preparar dados da planilha
  const worksheetData = [
    // Cabeçalho
    ['Relatório de Fatura de Adiantamento', '', '', '', ''],
    [`Clínica: ${clinic.name}`, '', '', '', ''],
    [`Período: ${formatDate(startDate)} a ${formatDate(endDate)}`, '', '', '', ''],
    ['', '', '', '', ''],
    // Cabeçalhos da tabela
    ['Médico', 'Código Paciente', 'Código Terceiros', 'Nome', 'Valor'],
  ]

  let currentRow = 4 // Começa após os cabeçalhos
  const headerRow = 4
  const totalRowNumbers: number[] = []

  // Adicionar dados agrupados por médico
  rowsByDoctor.forEach((doctorRows, doctorId) => {
    const doctorName = getDoctorName(doctorId === 'no-doctor' ? null : doctorId)
    const total = doctorTotals.get(doctorId)!

    doctorRows.forEach((row) => {
      const name = row.billedToThirdParty && row.thirdPartyName
        ? row.thirdPartyName
        : row.patientName
      const thirdPartyCode = row.billedToThirdParty ? (row.thirdPartyCode || '') : ''

      worksheetData.push([
        doctorName,
        row.code,
        thirdPartyCode,
        name,
        row.value,
      ])
      currentRow++
    })

    // Linha de total do médico
    worksheetData.push([
      '',
      `Total ${doctorName}:`,
      '',
      '',
      total,
    ])
    totalRowNumbers.push(currentRow)
    currentRow++

    // Linha vazia
    worksheetData.push(['', '', '', '', ''])
    currentRow++
  })

  // Linha de total geral
  worksheetData.push([
    '',
    'Total Geral:',
    '',
    '',
    grandTotal,
  ])
  totalRowNumbers.push(currentRow)

  // Criar workbook e worksheet
  const wb = XLSXLib.utils.book_new()
  const ws = XLSXLib.utils.aoa_to_sheet(worksheetData)

  const totalCols = 5

  // Aplicar estilos
  // Título (linha 1)
  applyStyle(ws, 'A1', getTitleStyle())
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }]

  // Informações da clínica e período (linhas 2 e 3)
  applyStyle(ws, 'A2', getInfoStyle())
  applyStyle(ws, 'A3', getInfoStyle())

  // Cabeçalhos da tabela (linha 5)
  for (let col = 0; col < totalCols; col++) {
    const colLetter = colToLetter(col)
    applyStyle(ws, `${colLetter}${headerRow + 1}`, getHeaderStyle())
  }

  // Aplicar estilos aos dados
  let dataRowIndex = 0
  rowsByDoctor.forEach((doctorRows) => {
    doctorRows.forEach(() => {
      const row = headerRow + 2 + dataRowIndex
      const isAlternate = dataRowIndex % 2 === 1

      // Coluna Médico (A)
      applyStyle(ws, `A${row}`, getDataStyle(isAlternate))
      // Coluna Código Paciente (B)
      applyStyle(ws, `B${row}`, getDataStyle(isAlternate))
      // Coluna Código Terceiros (C)
      applyStyle(ws, `C${row}`, getDataStyle(isAlternate))
      // Coluna Nome (D)
      applyStyle(ws, `D${row}`, getDataStyle(isAlternate))
      // Coluna Valor (E)
      applyStyle(ws, `E${row}`, getNumberStyle(isAlternate))

      dataRowIndex++
    })

    // Linha de total do médico
    const totalRowNum = headerRow + 2 + dataRowIndex
    for (let col = 0; col < totalCols; col++) {
      const colLetter = colToLetter(col)
      ensureCell(ws, `${colLetter}${totalRowNum}`)
      
      if (col === 4) {
        // Coluna de valor
        applyStyle(ws, `${colLetter}${totalRowNum}`, {
          ...getDoctorTotalStyle(),
          numFmt: '#,##0.00" €"'
        })
      } else {
        applyStyle(ws, `${colLetter}${totalRowNum}`, getDoctorTotalStyle())
      }
    }

    dataRowIndex += 2 // Pula linha de total e linha vazia
  })

  // Linha de total geral
  const grandTotalRowNum = headerRow + 2 + dataRowIndex
  for (let col = 0; col < totalCols; col++) {
    const colLetter = colToLetter(col)
    ensureCell(ws, `${colLetter}${grandTotalRowNum}`)
    
    if (col === 4) {
      // Coluna de valor
      applyStyle(ws, `${colLetter}${grandTotalRowNum}`, {
        ...getGrandTotalStyle(),
        numFmt: '#,##0.00" €"'
      })
    } else {
      applyStyle(ws, `${colLetter}${grandTotalRowNum}`, getGrandTotalStyle())
    }
  }

  // Ajustar larguras das colunas
  const colWidths = [
    { wch: 20 }, // Médico
    { wch: 15 }, // Código Paciente
    { wch: 15 }, // Código Terceiros
    { wch: 30 }, // Nome
    { wch: 15 }, // Valor
  ]
  ws['!cols'] = colWidths

  // Definir altura uniforme para todas as linhas de dados
  const defaultRowHeight = 20
  const totalRows = worksheetData.length
  ws['!rows'] = []
  for (let r = 0; r < totalRows; r++) {
    if (r === 0) {
      ws['!rows'][r] = { hpt: 30 }
    } else if (r === headerRow) {
      ws['!rows'][r] = { hpt: 25 }
    } else if (totalRowNumbers.includes(r)) {
      ws['!rows'][r] = { hpt: 22 }
    } else {
      ws['!rows'][r] = { hpt: defaultRowHeight }
    }
  }

  XLSXLib.utils.book_append_sheet(wb, ws, 'Fatura de Adiantamento')

  // Gerar nome do arquivo
  const fileName = `Relatorio_Fatura_Adiantamento_${clinic.name.replace(/\s+/g, '_')}_${startDate}_${endDate}.xlsx`
  XLSXLib.writeFile(wb, fileName)
}
