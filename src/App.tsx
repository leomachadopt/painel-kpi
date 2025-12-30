import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import Login from '@/pages/Login'
import Clinics from '@/pages/Clinics'
import Dashboard from '@/pages/Dashboard'
import Inputs from '@/pages/Inputs'
import NotFound from '@/pages/NotFound'
import Layout from '@/components/Layout'
import { AuthProvider } from '@/stores/useAuthStore'
import { DataProvider } from '@/stores/useDataStore'

const App = () => (
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

            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/clinicas" element={<Clinics />} />
              <Route path="/dashboard/:clinicId" element={<Dashboard />} />
              <Route path="/lancamentos/:clinicId" element={<Inputs />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </TooltipProvider>
      </BrowserRouter>
    </DataProvider>
  </AuthProvider>
)

export default App
