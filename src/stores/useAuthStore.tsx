import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, Role } from '@/lib/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, role: Role) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    // Check local storage for persisted session
    const storedUser = localStorage.getItem('kpi_user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const login = async (email: string, role: Role) => {
    // Mock login simulation
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const mockUser: User = {
          id: '1',
          name: role === 'MENTORA' ? 'Dra. Ana Mentora' : 'João Gestor',
          email,
          role,
          clinicId: role === 'GESTOR_CLINICA' ? 'clinic-1' : undefined,
          avatarUrl: `https://img.usecurling.com/ppl/medium?gender=${role === 'MENTORA' ? 'female' : 'male'}`,
        }
        setUser(mockUser)
        localStorage.setItem('kpi_user', JSON.stringify(mockUser))
        resolve()
      }, 1000)
    })
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('kpi_user')
  }

  return React.createElement(
    AuthContext.Provider,
    {
      value: {
        user,
        isAuthenticated: !!user,
        login,
        logout,
      },
    },
    children,
  )
}

const useAuthStore = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthStore must be used within an AuthProvider')
  }
  return context
}

export default useAuthStore
