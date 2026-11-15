import { createContext, useContext, useState, type ReactNode } from 'react'
import { authApi } from '../api/authApi'
import type { AuthResponse } from '../types'

interface AuthState { username: string; roles: string[] }
interface AuthContextValue {
  user: AuthState | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readUser(): AuthState | null {
  try { return JSON.parse(localStorage.getItem('shoe-store-user') ?? 'null') as AuthState | null }
  catch { return null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState | null>(readUser)

  function acceptSession(session: AuthResponse) {
    localStorage.setItem('shoe-store-token', session.token)
    const nextUser = { username: session.username, roles: session.roles }
    localStorage.setItem('shoe-store-user', JSON.stringify(nextUser))
    setUser(nextUser)
  }

  async function login(username: string, password: string) { acceptSession(await authApi.login(username, password)) }
  async function register(username: string, password: string) { acceptSession(await authApi.register(username, password)) }
  function logout() {
    localStorage.removeItem('shoe-store-token')
    localStorage.removeItem('shoe-store-user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, register, logout, isAdmin: user?.roles.includes('ROLE_ADMIN') ?? false }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used within AuthProvider')
  return value
}
