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
import { dailyEntriesApi } from '@/services/api'

export function AppSidebar() {
  const { user, logout } = useAuthStore()
  const { clinics, calculateAlignersAlerts } = useDataStore()
  const location = useLocation()
  const { isMobile } = useSidebar()
  const { canEditAnyData, canEdit, canView } = usePermissions()
  const [pendingOrdersCount, setPendingOrdersCount] = useState(0)

  const clinicId = location.pathname.split('/')[2]
  const currentClinic = clinics.find((c) => c.id === clinicId)

  const isMentor = user?.role === 'MENTOR'
  const activeClinicId = currentClinic?.id || user?.clinicId

  // Calcular número de alertas ativos (apenas se tiver permissão para editar alinhadores)
  const alertsCount = activeClinicId && canEdit('canEditAligners')
    ? calculateAlignersAlerts(activeClinicId).length
    : 0

  // Buscar contagem de pedidos pendentes (apenas para gestoras)
  useEffect(() => {
    const loadPendingOrdersCount = async () => {
      if (user?.role === 'GESTOR_CLINICA' && activeClinicId) {
        try {
          const result = await dailyEntriesApi.order.getPendingCount(activeClinicId)
          setPendingOrdersCount(result.count)
        } catch (error) {
          console.error('Error loading pending orders count:', error)
        }
      } else {
        setPendingOrdersCount(0)
      }
    }

    loadPendingOrdersCount()
    // Recarregar a cada 30 segundos
    const interval = setInterval(loadPendingOrdersCount, 30000)
    return () => clearInterval(interval)
  }, [user?.role, activeClinicId])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link
                to={isMentor ? '/clinicas' : `/dashboard/${user?.clinicId}`}
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Painel KPI</span>
                  <span className="truncate text-xs">Consultoria Clínica</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {isMentor && (
          <div className="px-3 py-2">
            <h2 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground group-data-[collapsible=icon]:hidden">
              Contexto
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex w-full items-center justify-between rounded-md border p-2 text-sm hover:bg-accent group-data-[collapsible=icon]:hidden">
                  <span className="truncate">
                    {currentClinic ? currentClinic.name : 'Selecionar Clínica'}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                {clinics.map((clinic) => (
                  <DropdownMenuItem key={clinic.id} asChild>
                    <Link to={`/dashboard/${clinic.id}`}>{clinic.name}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <SidebarMenu>
          {isMentor && (
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
                      {user?.role === 'GESTOR_CLINICA' && pendingOrdersCount > 0 && (
                        <SidebarMenuBadge className="bg-orange-500 text-white">
                          {pendingOrdersCount > 99 ? '99+' : pendingOrdersCount}
                        </SidebarMenuBadge>
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

              {activeClinicId && user?.role === 'GESTOR_CLINICA' && (
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

              {user?.role === 'GESTOR_CLINICA' && (
                <>
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
                </>
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
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={user?.avatarUrl} alt={user?.name} />
                    <AvatarFallback className="rounded-lg">
                      {user?.name?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.name}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem asChild>
                  <Link to="/perfil">
                    <User className="mr-2 h-4 w-4" />
                    Perfil
                  </Link>
                </DropdownMenuItem>
                <SidebarSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="text-destructive focus:text-destructive"
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
