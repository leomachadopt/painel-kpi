import React, { createContext, useContext, useState, useEffect } from 'react'
import { User } from '@/lib/types'
import { authApi } from '@/services/api'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  logout: () => void
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
