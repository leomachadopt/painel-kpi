import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Login from '@/pages/Login'
import Clinics from '@/pages/Clinics'
import Dashboard from '@/pages/Dashboard'
import Inputs from '@/pages/Inputs'
import Settings from '@/pages/Settings'
import Reports from '@/pages/Reports'
import Patients from '@/pages/Patients'
import Profile from '@/pages/Profile'
import Collaborators from '@/pages/Collaborators'
import NPSManagement from '@/pages/NPSManagement'
import NPSSurvey from '@/pages/NPSSurvey'
import Alerts from '@/pages/Alerts'
import Suppliers from '@/pages/Suppliers'
import Orders from '@/pages/Orders'
import AccountsPayable from '@/pages/AccountsPayable'
import Tickets from '@/pages/Tickets'
import TicketDetail from '@/pages/TicketDetail'
import Advances from '@/pages/Advances'
import InsuranceProviders from '@/pages/InsuranceProviders'
import ProcedureBaseGlobal from '@/pages/ProcedureBaseGlobal'
import Privacy from '@/pages/Privacy'
import Terms from '@/pages/Terms'
import About from '@/pages/About'
import NotFound from '@/pages/NotFound'
import Layout from '@/components/Layout'
import { AuthProvider } from '@/stores/useAuthStore'
import { DataProvider } from '@/stores/useDataStore'
import { queryClient } from '@/lib/queryClient'
import '@/lib/i18n'

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
            <Routes>
            <Route path="/login" element={<Login />} />

            {/* Public Routes (no authentication) */}
            <Route path="/survey/:token" element={<NPSSurvey />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />

            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/clinicas" element={<Clinics />} />
              <Route path="/dashboard/:clinicId" element={<Dashboard />} />
              <Route path="/lancamentos/:clinicId" element={<Inputs />} />
              <Route path="/relatorios/:clinicId" element={<Reports />} />
              <Route path="/pacientes/:clinicId" element={<Patients />} />
              <Route path="/pedidos/:clinicId" element={<Orders />} />
              <Route path="/fornecedores/:clinicId" element={<Suppliers />} />
              <Route path="/contas-a-pagar/:clinicId" element={<AccountsPayable />} />
              <Route path="/operadoras/:clinicId" element={<InsuranceProviders />} />
              <Route path="/adiantamentos/:clinicId" element={<Advances />} />
              <Route path="/nps/:clinicId" element={<NPSManagement />} />
              <Route path="/alertas/:clinicId" element={<Alerts />} />
              <Route path="/tickets/:clinicId" element={<Tickets />} />
              <Route path="/tickets/:clinicId/:ticketId" element={<TicketDetail />} />
              <Route path="/configuracoes" element={<Settings />} />
              <Route path="/tabela-base-procedimentos" element={<ProcedureBaseGlobal />} />
              <Route path="/colaboradores" element={<Collaborators />} />
              <Route path="/perfil" element={<Profile />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </DataProvider>
  </AuthProvider>
  </QueryClientProvider>
)

export default App
