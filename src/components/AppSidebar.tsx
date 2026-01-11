import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
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
import { dailyEntriesApi, ticketsApi } from '@/services/api'

export function AppSidebar() {
  const { user, logout } = useAuthStore()
  const { clinics, calculateAlignersAlerts } = useDataStore()
  const location = useLocation()
  const { isMobile } = useSidebar()
  const { canEditAnyData, canEdit, canView } = usePermissions()
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)
  const [paymentPendingOrdersCount, setPaymentPendingOrdersCount] = useState(0)
  const [invoicePendingOrdersCount, setInvoicePendingOrdersCount] = useState(0)
  const [ticketsCount, setTicketsCount] = useState(0)
  const [accountsPayableCounts, setAccountsPayableCounts] = useState({
    overdue: 0,
    today: 0,
    week: 0,
  })

  const clinicId = location.pathname.split('/')[2]
  const currentClinic = clinics.find((c) => c.id === clinicId)

  const isMentor = user?.role === 'MENTOR'
  const isGestor = user?.role === 'GESTOR_CLINICA'
  const activeClinicId = currentClinic?.id || user?.clinicId

  // Calcular número de alertas ativos (apenas se tiver permissão para editar alinhadores)
  const alertsCount = activeClinicId && canEdit('canEditAligners')
    ? calculateAlignersAlerts(activeClinicId).length
    : 0

  // Buscar contagem de pedidos pendentes (apenas para gestoras)
  useEffect(() => {
    const loadPendingOrdersCount = async () => {
      if (isGestor && activeClinicId) {
        try {
          const result = await dailyEntriesApi.order.getPendingCount(activeClinicId)
          const count = result.count || 0
          setPendingOrdersCount(count)
        } catch (error) {
          console.error('Error loading pending orders count:', error)
          setPendingOrdersCount(0)
        }
      } else {
        setPendingOrdersCount(0)
      }
    }

    if (user && activeClinicId) {
      loadPendingOrdersCount()
      // Recarregar a cada 30 segundos
      const interval = setInterval(loadPendingOrdersCount, 30000)
      return () => clearInterval(interval)
    }
  }, [isGestor, activeClinicId, user])

  // Buscar contagem de pedidos aguardando pagamento (apenas para gestoras)
  useEffect(() => {
    const loadPaymentPendingOrdersCount = async () => {
      if (isGestor && activeClinicId) {
        try {
          const result = await dailyEntriesApi.order.getPaymentPendingCount(activeClinicId)
          const count = result.count || 0
          setPaymentPendingOrdersCount(count)
        } catch (error) {
          console.error('Error loading payment pending orders count:', error)
          setPaymentPendingOrdersCount(0)
        }
      } else {
        setPaymentPendingOrdersCount(0)
      }
    }

    if (user && activeClinicId) {
      loadPaymentPendingOrdersCount()
      // Recarregar a cada 30 segundos
      const interval = setInterval(loadPaymentPendingOrdersCount, 30000)
      return () => clearInterval(interval)
    }
  }, [isGestor, activeClinicId, user])

  // Buscar contagem de pedidos com fatura pendente (apenas para gestoras)
  useEffect(() => {
    const loadInvoicePendingOrdersCount = async () => {
      if (isGestor && activeClinicId) {
        try {
          const result = await dailyEntriesApi.order.getInvoicePendingCount(activeClinicId)
          const count = result.count || 0
          setInvoicePendingOrdersCount(count)
        } catch (error) {
          console.error('Error loading invoice pending orders count:', error)
          setInvoicePendingOrdersCount(0)
        }
      } else {
        setInvoicePendingOrdersCount(0)
      }
    }

    if (user && activeClinicId) {
      loadInvoicePendingOrdersCount()
      // Recarregar a cada 30 segundos
      const interval = setInterval(loadInvoicePendingOrdersCount, 30000)
      return () => clearInterval(interval)
    }
  }, [isGestor, activeClinicId, user])

  // Buscar contagem de tickets pendentes
  useEffect(() => {
    const loadTicketsCount = async () => {
      // Verificar permissão antes de fazer a requisição
      const hasPermission = canView('canViewTickets')
      if (activeClinicId && hasPermission) {
        try {
          const result = await ticketsApi.getCount(activeClinicId)
          const count = result.count || 0
          setTicketsCount(count)
        } catch (error) {
          console.error('Error loading tickets count:', error)
          setTicketsCount(0)
        }
      } else {
        setTicketsCount(0)
      }
    }

    if (user && activeClinicId) {
      const hasPermission = canView('canViewTickets')
      loadTicketsCount()
      // Recarregar a cada 30 segundos apenas se tiver permissão
      if (hasPermission) {
        const interval = setInterval(loadTicketsCount, 30000)
        return () => clearInterval(interval)
      }
    }
  }, [activeClinicId, user])

  // Buscar contagem de contas a pagar
  useEffect(() => {
    const loadAccountsPayableCounts = async () => {
      // Verificar permissão antes de fazer a requisição
      const hasPermission = canView('canViewAccountsPayable') || canEdit('canEditAccountsPayable')
      if (activeClinicId && hasPermission) {
        try {
          const result = await dailyEntriesApi.accountsPayable.getCounts(activeClinicId)
          setAccountsPayableCounts({
            overdue: result.overdue || 0,
            today: result.today || 0,
            week: result.week || 0,
          })
        } catch (error) {
          console.error('Error loading accounts payable counts:', error)
          setAccountsPayableCounts({ overdue: 0, today: 0, week: 0 })
        }
      } else {
        setAccountsPayableCounts({ overdue: 0, today: 0, week: 0 })
      }
    }

    if (user && activeClinicId) {
      const hasPermission = canView('canViewAccountsPayable') || canEdit('canEditAccountsPayable')
      loadAccountsPayableCounts()
      // Recarregar a cada 30 segundos apenas se tiver permissão
      if (hasPermission) {
        const interval = setInterval(loadAccountsPayableCounts, 30000)
        return () => clearInterval(interval)
      }
    }
  }, [activeClinicId, user])

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
              >
                <div 
                  className="flex aspect-square size-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                  style={{
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                >
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Painel KPI</span>
                  <span className="truncate text-xs text-muted-foreground">Consultoria Clínica</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {isMentor && (
          <div className="px-3 py-2">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground group-data-[collapsible=icon]:hidden">
              Contexto
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-lg border border-border/50 bg-white/50 backdrop-blur-sm p-2.5 text-sm transition-all hover:bg-accent/50 group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-medium">
                    {currentClinic ? currentClinic.name : 'Selecionar Clínica'}
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
                  tooltip="Clínicas"
                  isActive={location.pathname === '/clinicas'}
                >
                  <Link to="/clinicas">
                    <Building2 />
                    <span>Clínicas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Tabela Base de Procedimentos"
                  isActive={location.pathname === '/tabela-base-procedimentos'}
                >
                  <Link to="/tabela-base-procedimentos">
                    <FileText />
                    <span>Tabela Base de Procedimentos</span>
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
                  tooltip="Dashboard"
                  isActive={location.pathname.includes('/dashboard')}
                >
                  <Link
                    to={`/dashboard/${currentClinic?.id || user?.clinicId}`}
                  >
                    <LayoutDashboard />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {canEditAnyData() && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Diário"
                    isActive={location.pathname.includes('/lancamentos')}
                  >
                    <Link
                      to={`/lancamentos/${currentClinic?.id || user?.clinicId}`}
                    >
                      <FileInput />
                      <span>Diário</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Relatórios"
                  isActive={location.pathname.includes('/relatorios')}
                >
                  <Link
                    to={`/relatorios/${currentClinic?.id || user?.clinicId}`}
                  >
                    <FileText />
                    <span>Relatórios</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {activeClinicId && canEdit('canEditPatients') && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Pacientes"
                    isActive={location.pathname.includes('/pacientes')}
                  >
                    <Link to={`/pacientes/${activeClinicId}`}>
                      <Users />
                      <span>Pacientes</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {activeClinicId && (canView('canViewOrders') || canEdit('canEditOrders')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Pedidos"
                    isActive={location.pathname.includes('/pedidos')}
                  >
                    <Link to={`/pedidos/${activeClinicId}`}>
                      <Package />
                      <span>Pedidos</span>
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
                    tooltip="Fornecedores"
                    isActive={location.pathname.includes('/fornecedores')}
                  >
                    <Link to={`/fornecedores/${activeClinicId}`}>
                      <Truck />
                      <span>Fornecedores</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {activeClinicId && (canView('canViewAccountsPayable') || canEdit('canEditAccountsPayable')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Contas a Pagar"
                    isActive={location.pathname.includes('/contas-a-pagar')}
                  >
                    <Link to={`/contas-a-pagar/${activeClinicId}`}>
                      <CreditCard />
                      <span>Contas a Pagar</span>
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
                    tooltip="Operadoras"
                    isActive={location.pathname.includes('/operadoras')}
                  >
                    <Link to={`/operadoras/${activeClinicId}`}>
                      <Building2 />
                      <span>Operadoras</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {activeClinicId && (canView('canViewAdvances') || canEdit('canEditAdvances')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Adiantamentos"
                    isActive={location.pathname.includes('/adiantamentos')}
                  >
                    <Link to={`/adiantamentos/${activeClinicId}`}>
                      <Receipt />
                      <span>Adiantamentos</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {activeClinicId && (user?.role === 'GESTOR_CLINICA' || canView('canViewNPS') || canEdit('canEditNPS')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="NPS"
                    isActive={location.pathname.includes('/nps')}
                  >
                    <Link to={`/nps/${activeClinicId}`}>
                      <Star />
                      <span>NPS</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {(user?.role === 'GESTOR_CLINICA' || canEdit('canEditClinicConfig')) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Configurações"
                    isActive={location.pathname.includes('/configuracoes')}
                  >
                    <Link to="/configuracoes">
                      <Settings />
                      <span>Configurações</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}

              {user?.role === 'GESTOR_CLINICA' && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    tooltip="Colaboradores"
                    isActive={location.pathname.includes('/colaboradores')}
                  >
                    <Link to="/colaboradores">
                      <UserCog />
                      <span>Colaboradores</span>
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
                tooltip="Alertas"
                isActive={location.pathname.includes('/alertas')}
              >
                <Link
                  to={`/alertas/${currentClinic?.id || user?.clinicId}`}
                >
                  <Bell />
                  <span>Alertas</span>
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
                tooltip="Tickets"
                isActive={location.pathname.includes('/tickets')}
              >
                <Link to={`/tickets/${currentClinic?.id || user?.clinicId}`}>
                  <Ticket />
                  <span>Tickets</span>
                  {ticketsCount > 0 && (
                    <SidebarMenuBadge className="bg-orange-500 text-white">
                      {ticketsCount > 99 ? '99+' : ticketsCount}
                    </SidebarMenuBadge>
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
