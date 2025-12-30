import {
  DailyFinancialEntry,
  DailyConsultationEntry,
  DailyProspectingEntry,
  DailyCabinetUsageEntry,
  DailyServiceTimeEntry,
  DailySourceEntry,
} from '@/lib/types'

const CURRENT_DATE = new Date().toISOString().split('T')[0]

export const generateMockEntries = (clinicId: string) => {
  const financialEntries: DailyFinancialEntry[] = Array.from(
    { length: 15 },
    (_, i) => ({
      id: `fin-${i}`,
      date: CURRENT_DATE,
      patientName: `Paciente ${i + 1}`,
      code: `P${100 + i}`,
      categoryId: i % 3 === 0 ? 'cat-1' : 'cat-2',
      value: (i + 1) * 150,
      cabinetId: i % 2 === 0 ? 'gab-1' : 'gab-2',
    }),
  )

  const consultationEntries: DailyConsultationEntry[] = Array.from(
    { length: 10 },
    (_, i) => ({
      id: `cons-${i}`,
      date: CURRENT_DATE,
      patientName: `Paciente Novo ${i + 1}`,
      code: `N${200 + i}`,
      planCreated: true,
      planPresented: true,
      planAccepted: i % 2 === 0,
      planValue: i % 2 === 0 ? 3500 : 0,
    }),
  )

  const prospectingEntries: DailyProspectingEntry[] = Array.from(
    { length: 5 },
    (_, i) => ({
      id: `pros-${i}`,
      date: CURRENT_DATE,
      scheduled: Math.floor(Math.random() * 3),
      email: Math.floor(Math.random() * 5),
      sms: Math.floor(Math.random() * 2),
      whatsapp: Math.floor(Math.random() * 8),
      instagram: Math.floor(Math.random() * 4),
    }),
  )

  const cabinetEntries: DailyCabinetUsageEntry[] = Array.from(
    { length: 4 },
    (_, i) => ({
      id: `cab-${i}`,
      date: CURRENT_DATE,
      cabinetId: i % 2 === 0 ? 'gab-1' : 'gab-2',
      hoursAvailable: 8,
      hoursUsed: 6 + Math.random() * 2,
    }),
  )

  const serviceTimeEntries: DailyServiceTimeEntry[] = Array.from(
    { length: 8 },
    (_, i) => ({
      id: `time-${i}`,
      date: CURRENT_DATE,
      patientName: `Paciente ${i + 10}`,
      code: `P${110 + i}`,
      doctorId: 'doc-1',
      scheduledTime: '09:00',
      actualStartTime: i % 3 === 0 ? '09:15' : '09:00',
      delayReason: i % 3 === 0 ? 'paciente' : undefined,
    }),
  )

  const sourceEntries: DailySourceEntry[] = Array.from(
    { length: 12 },
    (_, i) => ({
      id: `src-${i}`,
      date: CURRENT_DATE,
      patientName: `Lead ${i + 1}`,
      code: `L${300 + i}`,
      isReferral: i % 4 === 0,
      sourceId: i % 4 === 0 ? 'src-3' : 'src-1',
      referralName: i % 4 === 0 ? 'Paciente Antigo' : undefined,
      referralCode: i % 4 === 0 ? 'P001' : undefined,
      campaignId: i % 4 !== 0 ? 'camp-1' : undefined,
    }),
  )

  return {
    financialEntries,
    consultationEntries,
    prospectingEntries,
    cabinetEntries,
    serviceTimeEntries,
    sourceEntries,
  }
}
