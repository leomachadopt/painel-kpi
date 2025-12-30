import React, { createContext, useContext, useState } from 'react'
import { Clinic, MonthlyData, KPI } from '@/lib/types'

// Mock Data
const MOCK_CLINICS: Clinic[] = [
  {
    id: 'clinic-1',
    name: 'Clínica Sorriso Radiante',
    ownerName: 'Dr. Pedro Santos',
    active: true,
    lastUpdate: 'Outubro 2023',
    logoUrl: 'https://img.usecurling.com/i?q=tooth&color=azure',
  },
  {
    id: 'clinic-2',
    name: 'Centro Médico Vida',
    ownerName: 'Dra. Maria Oliveira',
    active: true,
    lastUpdate: 'Setembro 2023',
    logoUrl: 'https://img.usecurling.com/i?q=heart&color=rose',
  },
  {
    id: 'clinic-3',
    name: 'Ortopedia Avançada',
    ownerName: 'Dr. Carlos Silva',
    active: true,
    lastUpdate: 'Outubro 2023',
    logoUrl: 'https://img.usecurling.com/i?q=bone&color=blue',
  },
]

// Helper to generate random data
const generateMockData = (clinicId: string, year: number): MonthlyData[] => {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `${clinicId}-${year}-${i + 1}`,
    clinicId,
    month: i + 1,
    year,
    revenue: Math.floor(Math.random() * 100000) + 50000,
    expenses: Math.floor(Math.random() * 40000) + 20000,
    marketingCost: Math.floor(Math.random() * 5000) + 1000,
    consultations: Math.floor(Math.random() * 300) + 100,
    newPatients: Math.floor(Math.random() * 50) + 10,
    leads: Math.floor(Math.random() * 150) + 30,
    nps: Math.floor(Math.random() * 30) + 70,
    cancellations: Math.floor(Math.random() * 20),
    capacity: 400,
  }))
}

const MOCK_DATA: Record<string, MonthlyData[]> = {
  'clinic-1': generateMockData('clinic-1', 2023),
  'clinic-2': generateMockData('clinic-2', 2023),
  'clinic-3': generateMockData('clinic-3', 2023),
}

interface DataState {
  clinics: Clinic[]
  getClinic: (id: string) => Clinic | undefined
  getMonthlyData: (
    clinicId: string,
    month: number,
    year: number,
  ) => MonthlyData | undefined
  addMonthlyData: (data: MonthlyData) => void
  calculateKPIs: (clinicId: string, month: number, year: number) => KPI[]
}

const DataContext = createContext<DataState | null>(null)

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  const [clinics] = useState<Clinic[]>(MOCK_CLINICS)
  const [monthlyData, setMonthlyData] =
    useState<Record<string, MonthlyData[]>>(MOCK_DATA)

  const getClinic = (id: string) => clinics.find((c) => c.id === id)

  const getMonthlyData = (clinicId: string, month: number, year: number) => {
    return monthlyData[clinicId]?.find(
      (d) => d.month === month && d.year === year,
    )
  }

  const addMonthlyData = (data: MonthlyData) => {
    setMonthlyData((prev) => {
      const clinicData = prev[data.clinicId] || []
      const existingIndex = clinicData.findIndex(
        (d) => d.month === data.month && d.year === data.year,
      )

      let newData = [...clinicData]
      if (existingIndex >= 0) {
        newData[existingIndex] = data
      } else {
        newData.push(data)
      }
      return { ...prev, [data.clinicId]: newData }
    })
  }

  const calculateKPIs = (
    clinicId: string,
    month: number,
    year: number,
  ): KPI[] => {
    const current = getMonthlyData(clinicId, month, year)
    const previous = getMonthlyData(
      clinicId,
      month === 1 ? 12 : month - 1,
      month === 1 ? year - 1 : year,
    )

    if (!current) return []

    const kpis: KPI[] = []

    // Helpers
    const calcChange = (curr: number, prev: number | undefined) => {
      if (!prev) return 0
      return ((curr - prev) / prev) * 100
    }

    // 1. Faturamento Bruto
    kpis.push({
      id: 'revenue',
      name: 'Faturamento Bruto',
      value: current.revenue,
      unit: 'currency',
      change: calcChange(current.revenue, previous?.revenue),
      status:
        current.revenue > (previous?.revenue || 0) ? 'success' : 'warning',
      description: 'Receita total gerada no mês.',
    })

    // 2. Lucratividade (Profit Margin)
    const profit = current.revenue - current.expenses
    const margin = (profit / current.revenue) * 100
    const prevMargin = previous
      ? ((previous.revenue - previous.expenses) / previous.revenue) * 100
      : 0
    kpis.push({
      id: 'profitability',
      name: 'Lucratividade',
      value: margin,
      unit: 'percent',
      change: margin - prevMargin, // Percentage points change
      status: margin > 20 ? 'success' : margin > 10 ? 'warning' : 'danger',
      description: 'Margem de lucro após custos fixos.',
    })

    // 3. Ticket Médio
    const ticket = current.revenue / current.consultations
    const prevTicket = previous ? previous.revenue / previous.consultations : 0
    kpis.push({
      id: 'avg_ticket',
      name: 'Ticket Médio',
      value: ticket,
      unit: 'currency',
      change: calcChange(ticket, prevTicket),
      status: ticket > 200 ? 'success' : 'warning',
      description: 'Valor médio gasto por consulta.',
    })

    // 4. CAC (Customer Acquisition Cost)
    const cac =
      current.newPatients > 0 ? current.marketingCost / current.newPatients : 0
    const prevCac =
      previous && previous.newPatients > 0
        ? previous.marketingCost / previous.newPatients
        : 0
    kpis.push({
      id: 'cac',
      name: 'CAC',
      value: cac,
      unit: 'currency',
      change: calcChange(cac, prevCac),
      status: cac < 100 ? 'success' : 'warning', // Lower is better
      description: 'Custo de Aquisição de Cliente.',
    })

    // 5. Taxa de Conversão
    const conversion =
      current.leads > 0 ? (current.newPatients / current.leads) * 100 : 0
    const prevConversion =
      previous && previous.leads > 0
        ? (previous.newPatients / previous.leads) * 100
        : 0
    kpis.push({
      id: 'conversion',
      name: 'Taxa de Conversão',
      value: conversion,
      unit: 'percent',
      change: conversion - prevConversion,
      status: conversion > 10 ? 'success' : 'warning',
      description: 'Leads convertidos em pacientes.',
    })

    // 6. Taxa de Ocupação
    const occupancy = (current.consultations / current.capacity) * 100
    const prevOccupancy = previous
      ? (previous.consultations / previous.capacity) * 100
      : 0
    kpis.push({
      id: 'occupancy',
      name: 'Taxa de Ocupação',
      value: occupancy,
      unit: 'percent',
      change: occupancy - prevOccupancy,
      status: occupancy > 70 ? 'success' : 'warning',
      description: 'Utilização da capacidade da clínica.',
    })

    // 7. Novos Pacientes
    kpis.push({
      id: 'new_patients',
      name: 'Novos Pacientes',
      value: current.newPatients,
      unit: 'number',
      change: calcChange(current.newPatients, previous?.newPatients),
      status: current.newPatients > 20 ? 'success' : 'warning',
      description: 'Total de pacientes novos.',
    })

    // 8. ROI Marketing
    const roi =
      current.marketingCost > 0
        ? (current.revenue - current.marketingCost) / current.marketingCost
        : 0 // Simplified
    const prevRoi =
      previous && previous.marketingCost > 0
        ? (previous.revenue - previous.marketingCost) / previous.marketingCost
        : 0
    kpis.push({
      id: 'roi',
      name: 'ROI Marketing',
      value: roi,
      unit: 'ratio',
      change: calcChange(roi, prevRoi),
      status: roi > 5 ? 'success' : 'warning',
      description: 'Retorno sobre investimento em marketing.',
    })

    // 9. NPS
    kpis.push({
      id: 'nps',
      name: 'NPS',
      value: current.nps,
      unit: 'number',
      change: current.nps - (previous?.nps || 0),
      status: current.nps > 70 ? 'success' : 'warning',
      description: 'Net Promoter Score.',
    })

    // 10. Custos Fixos
    kpis.push({
      id: 'fixed_costs',
      name: 'Custos Fixos',
      value: current.expenses,
      unit: 'currency',
      change: calcChange(current.expenses, previous?.expenses),
      status: current.expenses < current.revenue * 0.5 ? 'success' : 'danger',
      description: 'Despesas operacionais fixas.',
    })

    // 11. Cancelamentos
    kpis.push({
      id: 'cancellations',
      name: 'Cancelamentos',
      value: current.cancellations,
      unit: 'number',
      change: calcChange(current.cancellations, previous?.cancellations),
      status: current.cancellations < 10 ? 'success' : 'danger', // Lower is better
      description: 'Consultas canceladas.',
    })

    // 12. Consultas Totais
    kpis.push({
      id: 'total_consultations',
      name: 'Consultas Totais',
      value: current.consultations,
      unit: 'number',
      change: calcChange(current.consultations, previous?.consultations),
      status: current.consultations > 200 ? 'success' : 'warning',
      description: 'Volume total de atendimentos.',
    })

    return kpis
  }

  return React.createElement(
    DataContext.Provider,
    {
      value: {
        clinics,
        getClinic,
        getMonthlyData,
        addMonthlyData,
        calculateKPIs,
      },
    },
    children,
  )
}

const useDataStore = () => {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useDataStore must be used within a DataProvider')
  }
  return context
}

export default useDataStore
