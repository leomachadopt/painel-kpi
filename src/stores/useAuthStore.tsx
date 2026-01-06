import React, { createContext, useContext, useState, useEffect } from 'react'
import { User } from '@/lib/types'
import { authApi } from '@/services/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
  refreshPermissions?: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check local storage for persisted session
    const storedUser = localStorage.getItem('kpi_user')
    const storedToken = localStorage.getItem('kpi_token')
    // If user exists but token doesn't, treat as logged out (migration from old mock sessions)
    if (storedUser && !storedToken) {
      localStorage.removeItem('kpi_user')
      setUser(null)
      setLoading(false)
      return
    }
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    const { user, token } = await authApi.login(email, password)
    setUser(user)
    localStorage.setItem('kpi_user', JSON.stringify(user))
    localStorage.setItem('kpi_token', token)
    return user
  }

  const refreshPermissions = async () => {
    try {
      const { permissions } = await authApi.getPermissions()
      if (user) {
        const updatedUser = { ...user, permissions }
        setUser(updatedUser)
        localStorage.setItem('kpi_user', JSON.stringify(updatedUser))
      }
    } catch (error) {
      console.error('Failed to refresh permissions:', error)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('kpi_user')
    localStorage.removeItem('kpi_token')
  }

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        refreshPermissions,
      },
    },
    children,
  )
}

const useAuthStore = () => {
  const context = useContext(AuthContext)
  if (!context) {
    // Fallback defensivo: em casos de hot-reload/árvore parcial, não derrubar a app inteira.
    // Em vez disso, trate como "não autenticado" para que o Layout redirecione para /login.
    return {
      user: null,
      isAuthenticated: false,
      loading: true, // Retornar loading: true para evitar tentativas de login durante inicialização
      login: async (email: string, password: string) => {
        // Durante hot-reload, o contexto pode não estar disponível imediatamente
        // Aguardar um pouco e tentar fazer login diretamente via API como fallback
        await new Promise(resolve => setTimeout(resolve, 100))
        
        try {
          // Tentar fazer login diretamente via API como fallback
          const { authApi } = await import('@/services/api')
          const { user, token } = await authApi.login(email, password)
          localStorage.setItem('kpi_user', JSON.stringify(user))
          localStorage.setItem('kpi_token', token)
          // Retornar o usuário - o componente pode decidir se precisa recarregar
          return user
        } catch (apiError: any) {
          // Se a API falhar, lançar o erro original
          throw apiError
        }
      },
      logout: () => {
        localStorage.removeItem('kpi_user')
        localStorage.removeItem('kpi_token')
      },
      refreshPermissions: async () => {},
    } as AuthState
  }
  return context
}

export const useAuth = useAuthStore
export default useAuthStore
