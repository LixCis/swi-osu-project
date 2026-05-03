import { useState, type ReactNode } from 'react'
import api from '../api/axios'
import type { User } from '../types'
import { AuthContext } from './auth-context'

function readStoredUser(): User | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    return null
  }
}

function readStoredToken(): string | null {
  if (!localStorage.getItem('user')) return null
  return localStorage.getItem('token')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser())
  const [token, setToken] = useState<string | null>(() => readStoredToken())

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    const { token: newToken, ...userData } = response.data
    setUser(userData)
    setToken(newToken)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string,
    dateOfBirth: string
  ) => {
    const response = await api.post('/auth/register', {
      email,
      password,
      firstName,
      lastName,
      phone,
      dateOfBirth
    })
    const { token: newToken, ...userData } = response.data
    setUser(userData)
    setToken(newToken)
    localStorage.setItem('token', newToken)
    localStorage.setItem('user', JSON.stringify(userData))
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        register,
        logout,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
