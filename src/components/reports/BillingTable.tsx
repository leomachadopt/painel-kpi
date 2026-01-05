import React from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DailyFinancialEntry, Clinic } from '@/lib/types'

interface BillingRow {
  doctorId: string | null
  doctorName: string
  code: string
  patientName: string
  value: number
  paymentSources: Record<string, number>
}

export function BillingTable({
  data,
  clinic,
}: {
  data: DailyFinancialEntry[]
  clinic: Clinic
}) {
  const getDoctorName = (id: string | null | undefined) => {
    if (!id) return 'Não especificado'
    return clinic.configuration.doctors.find((d) => d.id === id)?.name || 'Desconhecido'
  }

  const getPaymentSourceName = (id: string | null | undefined) => {
    if (!id) return null
    return clinic.configuration.paymentSources?.find((ps) => ps.id === id)?.name || null
  }

  // Get all payment source names from configuration
  const paymentSourceNames = (clinic.configuration.paymentSources || [])
    .map((ps) => ps.name)
    .sort()

  // Convert entries to rows
  const rows: BillingRow[] = data.map((entry) => {
    const paymentSourceName = getPaymentSourceName(entry.paymentSourceId)
    const paymentSources: Record<string, number> = {}
    
    // Each entry has only one payment source, so set it in the record
    if (paymentSourceName) {
      paymentSources[paymentSourceName] = entry.value
    }

    return {
      doctorId: entry.doctorId || null,
      doctorName: getDoctorName(entry.doctorId),
      code: entry.code,
      patientName: entry.patientName,
      value: entry.value,
      paymentSources,
    }
  })

  // Group rows by doctor
  const rowsByDoctor = new Map<string, BillingRow[]>()
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-PT', {
      style: 'currency',
      currency: 'EUR',
    }).format(value)
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        Nenhum lançamento financeiro no período.
      </div>
    )
  }

  return (
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
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(rowsByDoctor.entries()).map(([doctorId, doctorRows]) => {
            const doctorName = doctorRows[0]?.doctorName || 'Não especificado'
            const totals = doctorTotals.get(doctorId)!

            return (
              <React.Fragment key={doctorId}>
                {doctorRows.map((row, idx) => (
                  <TableRow key={`${row.doctorId}-${row.code}-${idx}`}>
                    {idx === 0 && (
                      <TableCell
                        rowSpan={doctorRows.length + 1}
                        className="font-medium align-top"
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
                  </TableRow>
                ))}
                {/* Total row for doctor */}
                <TableRow className="bg-muted/50 font-medium">
                  <TableCell colSpan={3} className="text-right">
                    Total {doctorName}:
                  </TableCell>
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
                </TableRow>
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

