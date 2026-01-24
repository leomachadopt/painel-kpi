import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  FileInput,
  Bell,
  LogOut,
  ChevronDown,
  User,
  Settings,
  FileText,
  Users,
  UserCog,
  Star,
  Package,
  Truck,
  Ticket,
  CreditCard,
  Receipt,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import useAuthStore from '@/stores/useAuthStore'
import useDataStore from '@/stores/useDataStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useSidebarCounts } from '@/hooks/useSidebarCounts'
import { useTranslation } from '@/hooks/useTranslation'
import { isBrazilClinic } from '@/lib/clinicUtils'

export function AppSidebar() {
  const { user, logout } = useAuthStore()
  const { clinics, calculateAlignersAlerts } = useDataStore()
  const location = useLocation()
  const { isMobile } = useSidebar()
  const { canEditAnyData, canEdit, canView } = usePermissions()
  const { t } = useTranslation()

  const clinicId = location.pathname.split('/')[2]
  const currentClinic = clinics.find((c) => c.id === clinicId)

  const isMentor = user?.role === 'MENTOR'
  const isGestor = user?.role === 'GESTOR_CLINICA'
  const activeClinicId = currentClinic?.id || user?.clinicId

  // ===================================================================
  // OTIMIZAÇÃO FASE 2: React Query com cache automático e refetch inteligente
  // ===================================================================
  // ANTES: setInterval manual, sem cache, sem deduplicate
  // DEPOIS: React Query gerencia polling, cache, retry automático
  // BENEFÍCIOS:
  // - Cache de 60s (não refaz request se já tem dados fresh)
  // - Deduplicate (múltiplos componentes = 1 única request)
  // - Refetch automático a cada 60s (substituindo setInterval)
  // - Retry inteligente em caso de erro
  // ===================================================================
  const { data: counts, error: countsError, isLoading: countsLoading } = useSidebarCounts(activeClinicId, !!user && !!activeClinicId)

  // DEBUG: Log para identificar problema
  console.log('🔍 DEBUG Sidebar:', {
    user: user?.email,
    role: user?.role,
    activeClinicId,
    countsLoading,
    countsError: countsError ? String(countsError) : null,
    counts: counts || 'null'
  })

  if (countsError) {
    console.error('❌ Erro ao buscar sidebar counts:', countsError)
  }
  if (!counts && !countsLoading && user && activeClinicId) {
    console.warn('⚠️ Sidebar counts não retornou dados:', { user: user?.email, activeClinicId, countsError })
  }

  // Calcular número de alertas ativos (apenas se tiver permissão para editar alinhadores)
  const alertsCount = activeClinicId && canEdit('canEditAligners')
    ? calculateAlignersAlerts(activeClinicId).length
    : 0

  // Extrair contadores com fallback para 0
  const pendingOrdersCount = counts?.orders.pending ?? 0
  const paymentPendingOrdersCount = counts?.orders.paymentPending ?? 0
  const invoicePendingOrdersCount = counts?.orders.invoicePending ?? 0
  const ticketsAssignedToMe = counts?.tickets.assignedToMe ?? 0
  const ticketsOthers = counts?.tickets.others ?? 0
  const ticketsCount = ticketsAssignedToMe + ticketsOthers
  const accountsPayableCounts = counts?.accountsPayable ?? { overdue: 0, today: 0, week: 0 }

  // DEBUG: Log dos contadores
  console.log('📊 Contadores extraídos:', {
    tickets: { assignedToMe: ticketsAssignedToMe, others: ticketsOthers, total: ticketsCount },
    accountsPayable: accountsPayableCounts,
    orders: { pending: pendingOrdersCount, paymentPending: paymentPendingOrdersCount }
  })

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border/50"
      style={{
        boxShadow: '2px 0 8px 0 rgba(0, 0, 0, 0.04)',
      }}
    >
      <SidebarHeader className="border-b border-border/50 bg-white/50 backdrop-blur-sm">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-accent/50 transition-all">
              <Link
                to={isMentor ? '/clinicas' : `/dashboard/${user?.clinicId}`}
                className="flex items-center justify-center w-full px-2"
              >
                <img 
                  src="/logo_kpi_horizontal2.jpg" 
                  alt="Dental KPI" 
                  className="h-12 w-auto max-w-full"
                />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {isMentor && (
          <div className="px-3 py-2">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
              {t('clinic.context')}
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-white/50 backdrop-blur-sm p-2.5 text-sm transition-all hover:bg-accent/50 group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">
                    {currentClinic ? currentClinic.name : t('clinic.selectClinic')}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                className="w-56 rounded-xl border-border/50" 
                align="start"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.08)',
                }}
              >
                {clinics.map((clinic) => (
                  <DropdownMenuItem key={clinic.id} asChild className="rounded-lg">
                    <Link to={`/dashboard/${clinic.id}`}>{clinic.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <SidebarMenu>
          {isMentor && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={t('sidebar.clinics')}
                  isActive={location.pathname === '/clinicas'}
                >
                  <Link to="/clinicas">
                    <Building2 />
                    <span>{t('sidebar.clinics')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={t('sidebar.procedureBase')}
                  isActive={location.pathname === '/tabela-base-procedimentos'}
                >
                  <Link to="/tabela-base-procedimentos">
                    <FileText />
                    <span>{t('sidebar.procedureBase')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}

          {(currentClinic || user?.role === 'GESTOR_CLINICA') && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={t('sidebar.dashboard')}
                  isActive={location.pathname.includes('/dashboard')}
                >
                  <Link
                    to={`/dashboard/${currentClinic?.id || user?.clinicId}`}
                  >
                    <LayoutDashboard />
                    <span>{t('sidebar.dashboard')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {canEditAnyData() && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t('sidebar.daily')}
                    isActive={location.pathname.includes('/lancamentos')}
                  >
                    <Link
                      to={`/lancamentos/${currentClinic?.id || user?.clinicId}`}
                    >
                      <FileInput />
                      <span>{t('sidebar.daily')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={t('sidebar.reports')}
                  isActive={location.pathname.includes('/relatorios')}
                >
                  <Link
                    to={`/relatorios/${currentClinic?.id || user?.clinicId}`}
                  >
                    <FileText />
                    <span>{t('sidebar.reports')}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {activeClinicId && canEdit('canEditPatients') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t('sidebar.patients')}
                    isActive={location.pathname.includes('/pacientes')}
                  >
                    <Link to={`/pacientes/${activeClinicId}`}>
                      <Users />
                      <span>{t('sidebar.patients')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {activeClinicId && (canView('canViewOrders') || canEdit('canEditOrders')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t('sidebar.orders')}
                    isActive={location.pathname.includes('/pedidos')}
                  >
                    <Link to={`/pedidos/${activeClinicId}`}>
                      <Package />
                      <span>{t('sidebar.orders')}</span>
                      {isGestor && (pendingOrdersCount > 0 || paymentPendingOrdersCount > 0 || invoicePendingOrdersCount > 0) && (
                        <div className="absolute right-1 flex gap-1">
                          {pendingOrdersCount > 0 && (
                            <SidebarMenuBadge className="bg-orange-500 text-white relative">
                              {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                            </SidebarMenuBadge>
                          )}
                          {paymentPendingOrdersCount > 0 && (
                            <SidebarMenuBadge className="bg-blue-500 text-white relative">
                              {paymentPendingOrdersCount > 99 ? '99+' : paymentPendingOrdersCount}
                            </SidebarMenuBadge>
                          )}
                          {invoicePendingOrdersCount > 0 && (
                            <SidebarMenuBadge className="bg-purple-500 text-white relative">
                              {invoicePendingOrdersCount > 99 ? '99+' : invoicePendingOrdersCount}
                            </SidebarMenuBadge>
                          )}
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {activeClinicId && (canView('canViewSuppliers') || canEdit('canEditOrders')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t('sidebar.suppliers')}
                    isActive={location.pathname.includes('/fornecedores')}
                  >
                    <Link to={`/fornecedores/${activeClinicId}`}>
                      <Truck />
                      <span>{t('sidebar.suppliers')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {activeClinicId && (canView('canViewAccountsPayable') || canEdit('canEditAccountsPayable')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t('sidebar.accountsPayable')}
                    isActive={location.pathname.includes('/contas-a-pagar')}
                  >
                    <Link to={`/contas-a-pagar/${activeClinicId}`}>
                      <CreditCard />
                      <span>{t('sidebar.accountsPayable')}</span>
                      {(accountsPayableCounts.overdue > 0 || accountsPayableCounts.today > 0 || accountsPayableCounts.week > 0) && (
                        <div className="absolute right-1 flex gap-1">
                          {accountsPayableCounts.overdue > 0 && (
                            <SidebarMenuBadge className="bg-purple-500 text-white relative">
                              {accountsPayableCounts.overdue > 99 ? '99+' : accountsPayableCounts.overdue}
                            </SidebarMenuBadge>
                          )}
                          {accountsPayableCounts.today > 0 && (
                            <SidebarMenuBadge className="bg-red-500 text-white relative">
                              {accountsPayableCounts.today > 99 ? '99+' : accountsPayableCounts.today}
                            </SidebarMenuBadge>
                          )}
                          {accountsPayableCounts.week > 0 && (
                            <SidebarMenuBadge className="bg-yellow-500 text-white relative">
                              {accountsPayableCounts.week > 99 ? '99+' : accountsPayableCounts.week}
                            </SidebarMenuBadge>
                          )}
                        </div>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {activeClinicId && (canView('canViewAdvances') || canEdit('canManageInsuranceProviders')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t('sidebar.insuranceProviders')}
                    isActive={location.pathname.includes('/operadoras')}
                  >
                    <Link to={`/operadoras/${activeClinicId}`}>
                      <Building2 />
                      <span>{t('sidebar.insuranceProviders')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {activeClinicId && !isBrazilClinic(currentClinic) && (canView('canViewAdvances') || canEdit('canEditAdvances')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t('sidebar.advances')}
                    isActive={location.pathname.includes('/adiantamentos')}
                  >
                    <Link to={`/adiantamentos/${activeClinicId}`}>
                      <Receipt />
                      <span>{t('sidebar.advances')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {activeClinicId && (user?.role === 'GESTOR_CLINICA' || canView('canViewNPS') || canEdit('canEditNPS')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t('sidebar.nps')}
                    isActive={location.pathname.includes('/nps')}
                  >
                    <Link to={`/nps/${activeClinicId}`}>
                      <Star />
                      <span>{t('sidebar.nps')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {(user?.role === 'GESTOR_CLINICA' || canEdit('canEditClinicConfig')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t('sidebar.settings')}
                    isActive={location.pathname.includes('/configuracoes')}
                  >
                    <Link to="/configuracoes">
                      <Settings />
                      <span>{t('sidebar.settings')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {user?.role === 'GESTOR_CLINICA' && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip={t('sidebar.collaborators')}
                    isActive={location.pathname.includes('/colaboradores')}
                  >
                    <Link to="/colaboradores">
                      <UserCog />
                      <span>{t('sidebar.collaborators')}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </>
          )}

          {(currentClinic || user?.role === 'GESTOR_CLINICA') && canEdit('canEditAligners') && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={t('sidebar.alerts')}
                isActive={location.pathname.includes('/alertas')}
              >
                <Link
                  to={`/alertas/${currentClinic?.id || user?.clinicId}`}
                >
                  <Bell />
                  <span>{t('sidebar.alerts')}</span>
                  {alertsCount > 0 && (
                    <SidebarMenuBadge className="bg-destructive text-destructive-foreground">
                      {alertsCount > 99 ? '99+' : alertsCount}
                    </SidebarMenuBadge>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          {(currentClinic || user?.role === 'GESTOR_CLINICA') && (
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                tooltip={t('sidebar.tickets')}
                isActive={location.pathname.includes('/tickets')}
              >
                <Link to={`/tickets/${currentClinic?.id || user?.clinicId}`}>
                  <Ticket />
                  <span>{t('sidebar.tickets')}</span>
                  {isGestor ? (
                    // Para gestoras, mostrar dois badges separados
                    (ticketsAssignedToMe > 0 || ticketsOthers > 0) && (
                      <div className="absolute right-1 flex gap-1">
                        {ticketsAssignedToMe > 0 && (
                          <SidebarMenuBadge className="bg-orange-500 text-white relative" title="Tickets atribuídos a você">
                            {ticketsAssignedToMe > 99 ? '99+' : ticketsAssignedToMe}
                          </SidebarMenuBadge>
                        )}
                        {ticketsOthers > 0 && (
                          <SidebarMenuBadge className="bg-blue-500 text-white relative" title="Outros tickets abertos">
                            {ticketsOthers > 99 ? '99+' : ticketsOthers}
                          </SidebarMenuBadge>
                        )}
                      </div>
                    )
                  ) : (
                    // Para outros usuários, manter comportamento atual
                    ticketsCount > 0 && (
                      <SidebarMenuBadge className="bg-orange-500 text-white">
                        {ticketsCount > 99 ? '99+' : ticketsCount}
                      </SidebarMenuBadge>
                    )
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 bg-white/50 backdrop-blur-sm">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground transition-all hover:bg-accent/50"
                >
                  <Avatar className="h-8 w-8 rounded-xl ring-2 ring-primary/10">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                    <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                      {user?.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4 opacity-50" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl border-border/50"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 10px 15px -3px rgba(0, 0, 0, 0.08)',
                }}
              >
                <DropdownMenuItem asChild className="rounded-lg">
                  <Link to="/perfil">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <SidebarSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive rounded-lg"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
