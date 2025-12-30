import React, { createContext, useContext, useState, useEffect } from 'react'
import { User, Role } from '@/lib/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
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

  const login = async (email: string, password: string): Promise<User> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mentor Credentials logic
        if (email === 'mentor@kpipanel.com' && password === 'mentor123') {
          const mentorUser: User = {
            id: 'mentor-1',
            name: 'Dra. Ana Mentora',
            email,
            role: 'MENTORA',
            avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=female',
          }
          setUser(mentorUser)
          localStorage.setItem('kpi_user', JSON.stringify(mentorUser))
          resolve(mentorUser)
          return
        }

        // Clinic Credentials logic
        if (email === 'clinica@kpipanel.com' && password === 'clinica123') {
          const clinicUser: User = {
            id: 'manager-1',
            name: 'Gestor da Clínica',
            email,
            role: 'GESTOR_CLINICA',
            clinicId: 'clinic-1', // Assigned to "Clínica Sorriso Radiante"
            avatarUrl: 'https://img.usecurling.com/ppl/medium?gender=male',
          }
          setUser(clinicUser)
          localStorage.setItem('kpi_user', JSON.stringify(clinicUser))
          resolve(clinicUser)
          return
        }

        // Invalid credentials
        reject(new Error('Credenciais inválidas'))
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
