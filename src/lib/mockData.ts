import { Clinic, MonthlyData, CabinetData } from '@/lib/types'

const DEFAULT_CONFIG = {
  categories: [
    { id: 'cat-1', name: 'Alinhadores' },
    { id: 'cat-2', name: 'Odontopediatria' },
    { id: 'cat-3', name: 'Dentisteria' },
    { id: 'cat-4', name: 'Cirurgia' },
    { id: 'cat-5', name: 'Outros' },
  ],
  cabinets: [
    { id: 'gab-1', name: 'Gabinete 1', standardHours: 8 },
    { id: 'gab-2', name: 'Gabinete 2', standardHours: 8 },
  ],
  doctors: [
    { id: 'doc-1', name: 'Dr. Pedro Santos' },
    { id: 'doc-2', name: 'Dra. Ana Silva' },
  ],
  sources: [
    { id: 'src-1', name: 'Google Ads' },
    { id: 'src-2', name: 'Meta Ads' },
    { id: 'src-3', name: 'Indicação' },
    { id: 'src-4', name: 'Passante' },
    { id: 'src-5', name: 'Pesquisa Orgânica' },
    { id: 'src-6', name: 'Amigo' },
  ],
  campaigns: [
    { id: 'camp-1', name: 'Verão 2024' },
    { id: 'camp-2', name: 'Regresso às Aulas' },
    { id: 'camp-3', name: 'Institucional' },
  ],
  paymentSources: [
    { id: 'pay-1', name: 'CGD' },
    { id: 'pay-2', name: 'Santander' },
    { id: 'pay-3', name: 'Cartões BPI' },
    { id: 'pay-4', name: 'Numerário' },
  ],
}

export const MOCK_CLINICS: Clinic[] = [
  {
    id: 'clinic-1',
    name: 'Clínica Sorriso Radiante',
    ownerName: 'Dr. Pedro Santos',
    active: true,
    lastUpdate: 'Outubro 2023',
    logoUrl: 'https://img.usecurling.com/i?q=tooth&color=azure',
    targetRevenue: 83500,
    targetAlignersRange: { min: 11, max: 12 },
    targetAvgTicket: 1200,
    targetAcceptanceRate: 65,
    targetOccupancyRate: 70,
    targetNPS: 80,
    targetIntegrationRate: 85,
    targetAgendaDistribution: {
      operational: 30,
      planning: 20,
      sales: 30,
      leadership: 20,
    },
    targetAttendanceRate: 80,
    targetFollowUpRate: 100,
    targetWaitTime: 10,
    targetComplaints: 2,
    targetLeadsRange: { min: 80, max: 100 },
    targetRevenuePerCabinet: 25000,
    targetPlansPresented: { adults: 15, kids: 20 },
    configuration: DEFAULT_CONFIG,
  },
  {
    id: 'clinic-2',
    name: 'Centro Médico Vida',
    ownerName: 'Dra. Maria Oliveira',
    active: true,
    lastUpdate: 'Setembro 2023',
    logoUrl: 'https://img.usecurling.com/i?q=heart&color=rose',
    targetRevenue: 100000,
    targetAlignersRange: { min: 15, max: 20 },
    targetAvgTicket: 1500,
    targetAcceptanceRate: 70,
    targetOccupancyRate: 75,
    targetNPS: 85,
    targetIntegrationRate: 85,
    targetAgendaDistribution: {
      operational: 40,
      planning: 10,
      sales: 30,
      leadership: 20,
    },
    targetAttendanceRate: 85,
    targetFollowUpRate: 95,
    targetWaitTime: 8,
    targetComplaints: 1,
    targetLeadsRange: { min: 100, max: 120 },
    targetRevenuePerCabinet: 30000,
    targetPlansPresented: { adults: 20, kids: 25 },
    configuration: DEFAULT_CONFIG,
  },
]

export const generateMockData = (
  clinicId: string,
  year: number,
): MonthlyData[] => {
  return Array.from({ length: 12 }, (_, i) => {
    const randomFactor = Math.random()
    const revenueTotal = Math.floor(randomFactor * 50000) + 70000
    const revenueAligners = revenueTotal * 0.4
    const revenuePediatrics = revenueTotal * 0.2
    const revenueDentistry = revenueTotal * 0.3
    const revenueOthers = revenueTotal * 0.1

    const cabinets: CabinetData[] = [
      {
        id: 'gab-1',
        name: 'Gabinete 1',
        revenue: revenueTotal * 0.6,
        hoursAvailable: 160,
        hoursOccupied: Math.floor(Math.random() * 60) + 90,
      },
      {
        id: 'gab-2',
        name: 'Gabinete 2',
        revenue: revenueTotal * 0.4,
        hoursAvailable: 160,
        hoursOccupied: Math.floor(Math.random() * 50) + 80,
      },
    ]

    const plansAccepted = Math.floor(Math.random() * 15) + 15
    const plansPresentedAdults = Math.floor(Math.random() * 20) + 10
    const plansPresentedKids = Math.floor(Math.random() * 15) + 10
    const ticketBase = Math.random() > 0.3 ? 1250 : 1000
    const revenueAcceptedPlans =
      plansAccepted * (Math.random() * 600 + ticketBase)
    const plansNotAccepted =
      plansPresentedAdults + plansPresentedKids - plansAccepted
    const plansNotAcceptedFollowUp = Math.floor(plansNotAccepted * 0.8)

    const nps = Math.random() > 0.2 ? 85 : 75
    const leads = Math.random() > 0.2 ? 90 : 70
    const complaints = Math.random() > 0.8 ? 3 : 1
    const alignersStarted = Math.random() > 0.3 ? 12 : 9

    // Mock aggregates for charts
    const revenueByCategory = {
      Alinhadores: revenueAligners,
      Odontopediatria: revenuePediatrics,
      Dentisteria: revenueDentistry,
      Outros: revenueOthers,
    }

    const leadsByChannel = {
      Instagram: Math.floor(leads * 0.4),
      Google: Math.floor(leads * 0.3),
      WhatsApp: Math.floor(leads * 0.2),
      Outros: Math.floor(leads * 0.1),
    }

    const sourceDistribution = {
      'Google Ads': Math.floor(Math.random() * 30),
      Indicação: Math.floor(Math.random() * 20),
      Passante: Math.floor(Math.random() * 10),
      'Meta Ads': Math.floor(Math.random() * 15),
    }

    const campaignDistribution = {
      'Verão 2024': Math.floor(Math.random() * 20),
      Institucional: Math.floor(Math.random() * 15),
    }

    const delayReasons = {
      patient: Math.floor(Math.random() * 10),
      doctor: Math.floor(Math.random() * 5),
    }

    const entryCounts = {
      financial: Math.floor(Math.random() * 50) + 50,
      consultations: Math.floor(Math.random() * 20) + 10,
      prospecting: 30, // 1 per day
      cabinets: 60, // 2 per day
      serviceTime: Math.floor(Math.random() * 80) + 20,
      sources: Math.floor(Math.random() * 15) + 5,
    }

    return {
      id: `${clinicId}-${year}-${i + 1}`,
      clinicId,
      month: i + 1,
      year,
      revenueTotal,
      revenueAligners,
      revenuePediatrics,
      revenueDentistry,
      revenueOthers,
      revenueAcceptedPlans,
      cabinets,
      plansPresentedAdults,
      plansPresentedKids,
      plansAccepted,
      alignersStarted,
      appointmentsIntegrated: Math.floor(Math.random() * 50) + 140,
      appointmentsTotal: 200,
      leads,
      firstConsultationsScheduled: 50,
      firstConsultationsAttended: Math.floor(Math.random() * 10) + 35,
      plansNotAccepted: plansNotAccepted > 0 ? plansNotAccepted : 0,
      plansNotAcceptedFollowUp,
      avgWaitTime: Math.floor(Math.random() * 15) + 2,
      agendaOwner: {
        operational: 80,
        planning: 20,
        sales: 40,
        leadership: 20,
      },
      nps,
      referralsSpontaneous: Math.floor(Math.random() * 5) + 5,
      referralsBase2025: 8,
      complaints,
      expenses: revenueTotal * 0.6,
      marketingCost: 5000,
      revenueByCategory,
      leadsByChannel,
      sourceDistribution,
      campaignDistribution,
      delayReasons,
      entryCounts,
    }
  })
}

export const MOCK_DATA: Record<string, MonthlyData[]> = {}
