import type { UserPermissions, ResourcePermissions, PermissionLevel } from './types'

/**
 * Resource configuration with combined actions
 */
export interface ResourceConfig {
  id: string
  name: string
  description: string
  actions: string // Description of combined actions
  mapsTo: {
    view?: (keyof UserPermissions)[]
    edit?: (keyof UserPermissions)[]
    create?: (keyof UserPermissions)[]
    delete?: (keyof UserPermissions)[]
    export?: (keyof UserPermissions)[]
    bill?: (keyof UserPermissions)[]
    manage?: (keyof UserPermissions)[]
  }
}

/**
 * Resource permissions configuration
 */
export const RESOURCE_PERMISSIONS: ResourceConfig[] = [
  {
    id: 'aligners',
    name: 'Alinhadores',
    description: 'Tratamento com alinhadores',
    actions: 'Visualização + Edição',
    mapsTo: {
      view: ['canViewReportAligners'],
      edit: ['canEditAligners'],
    },
  },
  {
    id: 'financial',
    name: 'Financeiro',
    description: 'Lançamentos financeiros',
    actions: 'Visualização + Edição + Exclusão',
    mapsTo: {
      view: ['canViewDashboardFinancial', 'canViewReportFinancial'],
      edit: ['canEditFinancial'],
      delete: ['canEditFinancial'],
    },
  },
  {
    id: 'consultations',
    name: '1.ªs Consultas',
    description: 'Consultas e planos',
    actions: 'Visualização + Edição + Exclusão',
    mapsTo: {
      view: ['canViewReportConsultations'],
      edit: ['canEditConsultations'],
      delete: ['canEditConsultations'],
    },
  },
  {
    id: 'patients',
    name: 'Pacientes',
    description: 'Cadastro de pacientes',
    actions: 'Visualização + Edição + Exclusão',
    mapsTo: {
      edit: ['canEditPatients'],
      delete: ['canEditPatients'],
    },
  },
  {
    id: 'reports',
    name: 'Relatórios',
    description: 'Relatórios detalhados',
    actions: 'Visualização baseada em permissões de recursos',
    mapsTo: {
      view: [
        'canViewReports',
        // Relatórios são controlados pelas permissões de edição dos recursos correspondentes
        // Não mapeamos permissões específicas de relatórios aqui
      ],
      export: ['canViewReports'],
    },
  },
  {
    id: 'advances',
    name: 'Adiantamentos',
    description: 'Contratos e lotes de adiantamento',
    actions: 'Acesso Completo (Ver, Criar, Editar, Excluir, Emitir)',
    mapsTo: {
      view: ['canViewAdvances'],
      create: ['canEditAdvances'],
      edit: ['canEditAdvances'],
      delete: ['canEditAdvances'],
      bill: ['canBillAdvances'],
    },
  },
  {
    id: 'targets',
    name: 'Metas',
    description: 'Metas mensais',
    actions: 'Visualização + Edição',
    mapsTo: {
      view: ['canViewTargets'],
      edit: ['canEditTargets'],
    },
  },
  {
    id: 'tickets',
    name: 'Tickets',
    description: 'Sistema de tickets',
    actions: 'Visualização + Edição',
    mapsTo: {
      view: ['canViewTickets'],
      edit: ['canEditTickets'],
    },
  },
  {
    id: 'nps',
    name: 'NPS',
    description: 'Pesquisas de satisfação',
    actions: 'Visualização + Edição',
    mapsTo: {
      view: ['canViewNPS'],
      edit: ['canEditNPS'],
    },
  },
  {
    id: 'accountsPayable',
    name: 'Contas a Pagar',
    description: 'Contas a pagar',
    actions: 'Visualização + Edição + Exclusão',
    mapsTo: {
      view: ['canViewAccountsPayable'],
      edit: ['canEditAccountsPayable'],
      delete: ['canEditAccountsPayable'],
    },
  },
  {
    id: 'orders',
    name: 'Pedidos',
    description: 'Pedidos aos fornecedores',
    actions: 'Visualização + Edição',
    mapsTo: {
      view: ['canViewOrders'],
      edit: ['canEditOrders'],
    },
  },
  {
    id: 'suppliers',
    name: 'Fornecedores',
    description: 'Cadastro de fornecedores',
    actions: 'Visualização + Edição',
    mapsTo: {
      view: ['canViewSuppliers'],
      edit: ['canEditSuppliers'],
    },
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Campanhas e marketing',
    actions: 'Visualização + Edição',
    mapsTo: {
      view: ['canViewMarketing'],
      edit: ['canEditMarketing'],
    },
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Visão geral e seções do dashboard',
    actions: 'Apenas Visualização',
    mapsTo: {
      view: [
        'canViewDashboardOverview',
        'canViewDashboardFinancial',
        'canViewDashboardCommercial',
        'canViewDashboardOperational',
        'canViewDashboardMarketing',
      ],
    },
  },
  {
    id: 'clinicConfig',
    name: 'Configurações',
    description: 'Configurações da clínica',
    actions: 'Apenas Edição',
    mapsTo: {
      edit: ['canEditClinicConfig'],
    },
  },
  {
    id: 'alerts',
    name: 'Alertas',
    description: 'Sistema de alertas',
    actions: 'Apenas Visualização',
    mapsTo: {
      view: ['canViewAlerts'],
    },
  },
  {
    id: 'insuranceProviders',
    name: 'Operadoras',
    description: 'Gerenciamento de operadoras de seguro',
    actions: 'Acesso Completo',
    mapsTo: {
      view: ['canViewAdvances'],
      manage: ['canManageInsuranceProviders'],
    },
  },
  {
    id: 'prospecting',
    name: 'Prospecção',
    description: 'Leads e contatos',
    actions: 'Visualização + Edição + Exclusão',
    mapsTo: {
      edit: ['canEditProspecting'],
      delete: ['canEditProspecting'],
    },
  },
  {
    id: 'cabinets',
    name: 'Gabinetes',
    description: 'Uso de gabinetes',
    actions: 'Visualização + Edição + Exclusão',
    mapsTo: {
      edit: ['canEditCabinets'],
      delete: ['canEditCabinets'],
    },
  },
  {
    id: 'serviceTime',
    name: 'Tempos',
    description: 'Tempo de atendimento',
    actions: 'Visualização + Edição + Exclusão',
    mapsTo: {
      edit: ['canEditServiceTime'],
      delete: ['canEditServiceTime'],
    },
  },
  {
    id: 'sources',
    name: 'Fontes',
    description: 'Fontes e campanhas',
    actions: 'Visualização + Edição + Exclusão',
    mapsTo: {
      edit: ['canEditSources'],
      delete: ['canEditSources'],
    },
  },
  {
    id: 'consultationControl',
    name: 'Controle de Consultas',
    description: 'Controle de consultas',
    actions: 'Visualização + Edição + Exclusão',
    mapsTo: {
      edit: ['canEditConsultationControl'],
      delete: ['canEditConsultationControl'],
    },
  },
]

/**
 * Convert resource permissions to legacy UserPermissions format
 */
export function mapResourcePermissionsToLegacy(
  resourcePermissions: ResourcePermissions
): Partial<UserPermissions> {
  // Initialize with all false values to ensure all fields are present
  const result: Partial<UserPermissions> = {
    canViewDashboardOverview: false,
    canViewDashboardFinancial: false,
    canViewDashboardCommercial: false,
    canViewDashboardOperational: false,
    canViewDashboardMarketing: false,
    canViewReports: false,
    canViewReportFinancial: false,
    canViewReportBilling: false,
    canViewReportConsultations: false,
    canViewReportAligners: false,
    canViewReportProspecting: false,
    canViewReportCabinets: false,
    canViewReportServiceTime: false,
    canViewReportSources: false,
    canViewReportConsultationControl: false,
    canViewReportMarketing: false,
    canViewReportAdvanceInvoice: false,
    canViewTargets: false,
    canViewOrders: false,
    canViewSuppliers: false,
    canEditFinancial: false,
    canEditConsultations: false,
    canEditProspecting: false,
    canEditCabinets: false,
    canEditServiceTime: false,
    canEditSources: false,
    canEditConsultationControl: false,
    canEditAligners: false,
    canEditOrders: false,
    canEditAdvanceInvoice: false,
    canEditAccountsPayable: false,
    canViewAccountsPayable: false,
    canEditPatients: false,
    canEditClinicConfig: false,
    canEditTargets: false,
    canViewTickets: false,
    canEditTickets: false,
    canViewNPS: false,
    canEditNPS: false,
    canEditSuppliers: false,
    canViewMarketing: false,
    canEditMarketing: false,
    canViewAlerts: false,
    canViewAdvances: false,
    canEditAdvances: false,
    canBillAdvances: false,
    canManageInsuranceProviders: false,
  }

  for (const [resourceId, level] of Object.entries(resourcePermissions)) {
    const resource = RESOURCE_PERMISSIONS.find((r) => r.id === resourceId)
    if (!resource) continue

    const isAllowed = level === 'ALLOWED'

    // Map each action type to legacy permissions
    resource.mapsTo.view?.forEach((perm) => {
      result[perm] = isAllowed
    })
    resource.mapsTo.edit?.forEach((perm) => {
      result[perm] = isAllowed
    })
    resource.mapsTo.create?.forEach((perm) => {
      result[perm] = isAllowed
    })
    resource.mapsTo.delete?.forEach((perm) => {
      result[perm] = isAllowed
    })
    resource.mapsTo.export?.forEach((perm) => {
      result[perm] = isAllowed
    })
    resource.mapsTo.bill?.forEach((perm) => {
      result[perm] = isAllowed
    })
    resource.mapsTo.manage?.forEach((perm) => {
      result[perm] = isAllowed
    })
  }

  return result
}

/**
 * Convert legacy UserPermissions to resource permissions
 */
export function mapLegacyPermissionsToResources(
  legacyPermissions: UserPermissions
): ResourcePermissions {
  const result: ResourcePermissions = {}

  console.log('mapLegacyPermissionsToResources - Input:', legacyPermissions)

  for (const resource of RESOURCE_PERMISSIONS) {
    let hasAnyPermission = false

    // Check if user has any permission for this resource
    // Handle both true and truthy values (in case of null/undefined from DB)
    resource.mapsTo.view?.forEach((perm) => {
      const value = legacyPermissions[perm]
      if (value === true || value === 1) {
        hasAnyPermission = true
        console.log(`Resource ${resource.id}: Found view permission ${perm} = ${value}`)
      }
    })
    resource.mapsTo.edit?.forEach((perm) => {
      const value = legacyPermissions[perm]
      if (value === true || value === 1) {
        hasAnyPermission = true
        console.log(`Resource ${resource.id}: Found edit permission ${perm} = ${value}`)
      }
    })
    resource.mapsTo.create?.forEach((perm) => {
      const value = legacyPermissions[perm]
      if (value === true || value === 1) {
        hasAnyPermission = true
        console.log(`Resource ${resource.id}: Found create permission ${perm} = ${value}`)
      }
    })
    resource.mapsTo.delete?.forEach((perm) => {
      const value = legacyPermissions[perm]
      if (value === true || value === 1) {
        hasAnyPermission = true
        console.log(`Resource ${resource.id}: Found delete permission ${perm} = ${value}`)
      }
    })
    resource.mapsTo.export?.forEach((perm) => {
      const value = legacyPermissions[perm]
      if (value === true || value === 1) {
        hasAnyPermission = true
        console.log(`Resource ${resource.id}: Found export permission ${perm} = ${value}`)
      }
    })
    resource.mapsTo.bill?.forEach((perm) => {
      const value = legacyPermissions[perm]
      if (value === true || value === 1) {
        hasAnyPermission = true
        console.log(`Resource ${resource.id}: Found bill permission ${perm} = ${value}`)
      }
    })
    resource.mapsTo.manage?.forEach((perm) => {
      const value = legacyPermissions[perm]
      if (value === true || value === 1) {
        hasAnyPermission = true
        console.log(`Resource ${resource.id}: Found manage permission ${perm} = ${value}`)
      }
    })

    result[resource.id] = hasAnyPermission ? 'ALLOWED' : 'DENIED'
    console.log(`Resource ${resource.id}: ${hasAnyPermission ? 'ALLOWED' : 'DENIED'}`)
  }

  console.log('mapLegacyPermissionsToResources - Output:', result)
  return result
}

