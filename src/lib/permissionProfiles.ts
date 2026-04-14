import type { ResourcePermissions } from './types'

export interface PermissionProfile {
  id: string
  name: string
  nameEn: string
  namePt: string
  description: string
  descriptionEn: string
  descriptionPt: string
  permissions: ResourcePermissions
}

export const PERMISSION_PROFILES: PermissionProfile[] = [
  {
    id: 'secretaria',
    name: 'Secretária',
    nameEn: 'Receptionist',
    namePt: 'Secretária',
    description: 'Acesso completo a lançamentos, pacientes e agenda',
    descriptionEn: 'Full access to entries, patients and appointments',
    descriptionPt: 'Acesso completo a lançamentos, pacientes e agenda',
    permissions: {
      dashboard: 'view',
      inputs: 'edit',
      reports: 'view',
      patients: 'edit',
      appointments: 'edit',
      consultations: 'view',
      prospecting: 'edit',
      sources: 'edit',
    },
  },
  {
    id: 'financeiro',
    name: 'Financeiro',
    nameEn: 'Financial',
    namePt: 'Financeiro',
    description: 'Acesso completo a finanças, faturamento e contas',
    descriptionEn: 'Full access to finances, billing and accounts',
    descriptionPt: 'Acesso completo a finanças, faturamento e contas',
    permissions: {
      dashboard: 'view',
      inputs: 'view',
      reports: 'view',
      financial: 'edit',
      billing: 'edit',
      accountsPayable: 'edit',
      advances: 'edit',
      insuranceProviders: 'edit',
    },
  },
  {
    id: 'contabil',
    name: 'Contábil',
    nameEn: 'Accounting',
    namePt: 'Contábil',
    description: 'Visualização de relatórios financeiros e faturamento',
    descriptionEn: 'View financial and billing reports',
    descriptionPt: 'Visualização de relatórios financeiros e faturamento',
    permissions: {
      dashboard: 'view',
      reports: 'view',
      financial: 'view',
      billing: 'view',
      accountsPayable: 'view',
    },
  },
  {
    id: 'assistente',
    name: 'Assistente',
    nameEn: 'Assistant',
    namePt: 'Assistente',
    description: 'Acesso a lançamentos clínicos, agendamentos e visualização geral',
    descriptionEn: 'Access to clinical entries, appointments and general viewing',
    descriptionPt: 'Acesso a lançamentos clínicos, agendamentos e visualização geral',
    permissions: {
      dashboard: 'view',
      inputs: 'view',
      reports: 'view',
      patients: 'view',
      appointments: 'edit',
      consultations: 'edit',
      cabinets: 'edit',
      serviceTime: 'edit',
    },
  },
]
