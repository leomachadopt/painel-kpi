import { Outlet, Navigate, useLocation } from 'react-router-dom'
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/AppSidebar'
import { Separator } from '@/components/ui/separator'
import useAuthStore from '@/stores/useAuthStore'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

export default function Layout() {
  const { isAuthenticated, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Helper to generate breadcrumbs based on path
  const pathSegments = location.pathname.split('/').filter(Boolean)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header 
          className="flex h-16 shrink-0 items-center gap-2 border-b border-border/50 px-4"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.03)',
          }}
        >
          <SidebarTrigger className="-ml-1 transition-all hover:bg-accent/50" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="capitalize font-medium">
                  {pathSegments[0] || 'Início'}
                </BreadcrumbPage>
              </BreadcrumbItem>
              {pathSegments.length > 1 && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="capitalize text-muted-foreground">
                      {pathSegments[1]}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto bg-gradient-to-br from-white via-white to-slate-50/30">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
