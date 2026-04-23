import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/stores/useAuthStore'
import { DataProvider } from '@/stores/useDataStore'
import { queryClient } from '@/lib/queryClient'
import '@/lib/i18n'

// Eager load - páginas críticas
import Login from '@/pages/Login'
import Layout from '@/components/Layout'

// Lazy load - todas as outras páginas
const Clinics = lazy(() => import('@/pages/Clinics'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Inputs = lazy(() => import('@/pages/Inputs'))
const Settings = lazy(() => import('@/pages/Settings'))
const Reports = lazy(() => import('@/pages/Reports'))
const PlansAndConsultations = lazy(() => import('@/pages/PlansAndConsultations'))
const Patients = lazy(() => import('@/pages/Patients'))
const Profile = lazy(() => import('@/pages/Profile'))
const Team = lazy(() => import('@/pages/Team'))
const NPSManagement = lazy(() => import('@/pages/NPSManagement'))
const NPSSurvey = lazy(() => import('@/pages/NPSSurvey'))
const Alerts = lazy(() => import('@/pages/Alerts'))
const Suppliers = lazy(() => import('@/pages/Suppliers'))
const Orders = lazy(() => import('@/pages/Orders'))
const AccountsPayable = lazy(() => import('@/pages/AccountsPayable'))
const Tickets = lazy(() => import('@/pages/Tickets'))
const TicketDetail = lazy(() => import('@/pages/TicketDetail'))
const Advances = lazy(() => import('@/pages/Advances'))
const PettyCash = lazy(() => import('@/pages/PettyCash'))
const InsuranceProviders = lazy(() => import('@/pages/InsuranceProviders'))
const ProcedureBaseGlobal = lazy(() => import('@/pages/ProcedureBaseGlobal'))
const RevenueForecast = lazy(() => import('@/pages/RevenueForecast'))
const Agenda = lazy(() => import('@/pages/Agenda'))
const MarketingDashboard = lazy(() => import('@/pages/MarketingDashboard'))
const Privacy = lazy(() => import('@/pages/Privacy'))
const Terms = lazy(() => import('@/pages/Terms'))
const About = lazy(() => import('@/pages/About'))
const DataDeletion = lazy(() => import('@/pages/DataDeletion'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
)

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataProvider>
        <BrowserRouter
          future={{ v7_startTransition: false, v7_relativeSplatPath: false }}
        >
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />

                {/* Public Routes (no authentication) */}
                <Route path="/survey/:token" element={<NPSSurvey />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/about" element={<About />} />
                <Route path="/data-deletion" element={<DataDeletion />} />

                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/login" replace />} />
                  <Route path="/clinicas" element={<Clinics />} />
                  <Route path="/dashboard/:clinicId" element={<Dashboard />} />
                  <Route path="/lancamentos/:clinicId" element={<Inputs />} />
                  <Route path="/relatorios/:clinicId" element={<Reports />} />
                  <Route path="/planos-consultas/:clinicId" element={<PlansAndConsultations />} />
                  <Route path="/pacientes/:clinicId" element={<Patients />} />
                  <Route path="/pedidos/:clinicId" element={<Orders />} />
                  <Route path="/fornecedores/:clinicId" element={<Suppliers />} />
                  <Route path="/contas-a-pagar/:clinicId" element={<AccountsPayable />} />
                  <Route path="/operadoras/:clinicId" element={<InsuranceProviders />} />
                  <Route path="/adiantamentos/:clinicId" element={<Advances />} />
                  <Route path="/caixa-do-dia/:clinicId" element={<PettyCash />} />
                  <Route path="/previsao-receitas/:clinicId" element={<RevenueForecast />} />
                  <Route path="/agenda/:clinicId" element={<Agenda />} />
                  <Route path="/marketing/:clinicId" element={<MarketingDashboard />} />
                  <Route path="/nps/:clinicId" element={<NPSManagement />} />
                  <Route path="/alertas/:clinicId" element={<Alerts />} />
                  <Route path="/tickets/:clinicId" element={<Tickets />} />
                  <Route path="/tickets/:clinicId/:ticketId" element={<TicketDetail />} />
                  <Route path="/configuracoes" element={<Settings />} />
                  <Route path="/tabela-base-procedimentos" element={<ProcedureBaseGlobal />} />
                  <Route path="/colaboradores" element={<Team />} />
                  <Route path="/perfil" element={<Profile />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </TooltipProvider>
        </BrowserRouter>
        {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
      </DataProvider>
    </AuthProvider>
  </QueryClientProvider>
)

export default App
