import { Clinic, MonthlyData, CabinetData } from '@/lib/types'

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
  },
  {
    id: 'clinic-2',
    name: 'Centro Médico Vida',
    ownerName: 'Dra. Maria Oliveira',
    active: true,
    lastUpdate: 'Setembro 2023',
    logoUrl: 'https://img.usecurling.com/i?q=heart&color=rose',
    targetRevenue: 100000, // Custom override
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
  },
]

export const generateMockData = (
  clinicId: string,
  year: number,
): MonthlyData[] => {
  return Array.from({ length: 12 }, (_, i) => {
    // Generate varied data to trigger alerts randomly
    const randomFactor = Math.random()
    const revenueTotal = Math.floor(randomFactor * 50000) + 70000 // 70k-120k
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
    // Ticket varied: sometimes low (<1200) sometimes high
    const ticketBase = Math.random() > 0.3 ? 1250 : 1000
    const revenueAcceptedPlans =
      plansAccepted * (Math.random() * 600 + ticketBase)

    const plansNotAccepted =
      plansPresentedAdults + plansPresentedKids - plansAccepted
    const plansNotAcceptedFollowUp = Math.floor(plansNotAccepted * 0.8)

    // NPS and Leads varied
    const nps = Math.random() > 0.2 ? 85 : 75
    const leads = Math.random() > 0.2 ? 90 : 70
    const complaints = Math.random() > 0.8 ? 3 : 1
    const alignersStarted = Math.random() > 0.3 ? 12 : 9

    return {
      id: `${clinicId}-${year}-${i + 1}`,
      clinicId,
      month: i + 1,
      year,
      // Financial
      revenueTotal,
      revenueAligners,
      revenuePediatrics,
      revenueDentistry,
      revenueOthers,
      revenueAcceptedPlans,
      cabinets,
      // Commercial
      plansPresentedAdults,
      plansPresentedKids,
      plansAccepted,
      alignersStarted: alignersStarted,
      appointmentsIntegrated: Math.floor(Math.random() * 50) + 140,
      appointmentsTotal: 200,
      leads: leads,
      firstConsultationsScheduled: 50,
      firstConsultationsAttended: Math.floor(Math.random() * 10) + 35,
      plansNotAccepted: plansNotAccepted > 0 ? plansNotAccepted : 0,
      plansNotAcceptedFollowUp,
      // Operational
      avgWaitTime: Math.floor(Math.random() * 15) + 2,
      agendaOwner: {
        operational: 80,
        planning: 20,
        sales: 40,
        leadership: 20,
      },
      nps: nps,
      referralsSpontaneous: Math.floor(Math.random() * 5) + 5,
      referralsBase2025: 8,
      complaints: complaints,
      // Legacy
      expenses: revenueTotal * 0.6,
      marketingCost: 5000,
    }
  })
}

export const MOCK_DATA: Record<string, MonthlyData[]> = {
  'clinic-1': generateMockData('clinic-1', 2023),
  'clinic-2': generateMockData('clinic-2', 2023),
}
