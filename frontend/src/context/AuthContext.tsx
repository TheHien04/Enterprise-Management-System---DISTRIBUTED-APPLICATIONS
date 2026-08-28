import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { AuthUser, UserRole } from '@/types/auth'
import { login as loginRequest } from '@/api/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: UserRole[]) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const STORAGE_KEY = 'udpt_auth_user'

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser)

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isAuthenticated: Boolean(user),
    login: async (username, password) => {
      const response = await loginRequest(username, password)
      localStorage.setItem('access_token', response.access_token)
      const nextUser: AuthUser = {
        username: response.username,
        roles: response.roles,
        fullName: response.full_name,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser))
      setUser(nextUser)
    },
    logout: () => {
      localStorage.removeItem('access_token')
      localStorage.removeItem(STORAGE_KEY)
      setUser(null)
    },
    hasRole: (...roles) => {
      if (!user) return false
      return roles.some((role) => user.roles.includes(role))
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
