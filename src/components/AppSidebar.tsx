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
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
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

export function AppSidebar() {
  const { user, logout } = useAuthStore()
  const { clinics } = useDataStore()
  const location = useLocation()
  const { isMobile } = useSidebar()

  const clinicId = location.pathname.split('/')[2]
  const currentClinic = clinics.find((c) => c.id === clinicId)

  const isMentor = user?.role === 'MENTORA'

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
            </>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Alertas">
              <a href="#">
                <Bell />
                <span>Alertas</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
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
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Perfil
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
