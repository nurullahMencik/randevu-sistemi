import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, refreshSession, tokens } from './api'
import type { RegisterForm } from './schemas'
import type { AuthResponse, User, UserRole } from './types'

type Status = 'restoring' | 'authenticated' | 'anonymous'

interface AuthValue {
  user: User | null
  status: Status
  login: (email: string, password: string) => Promise<User>
  register: (form: RegisterForm) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export const DEMO_PASSWORD = 'Demo123!'
export const DEMO_ACCOUNTS: Record<UserRole, string> = {
  Customer: 'musteri@randevu.demo',
  Staff: 'personel@randevu.demo',
  Admin: 'admin@randevu.demo',
}

export function homeFor(role: UserRole): string {
  switch (role) {
    case 'Admin':
      return '/admin'
    case 'Staff':
      return '/staff'
    default:
      return '/appointments'
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<Status>(() => (tokens.refresh ? 'restoring' : 'anonymous'))

  useEffect(
    () =>
      tokens.subscribe((session) => {
        setUser(session?.user ?? null)
        setStatus(session ? 'authenticated' : 'anonymous')
      }),
    [],
  )

  // Restore the session from the stored refresh token (rotating it in the process).
  useEffect(() => {
    if (status !== 'restoring') return
    refreshSession()
      .then((session) => {
        setUser(session?.user ?? null)
        setStatus(session ? 'authenticated' : 'anonymous')
      })
      .catch(() => setStatus('anonymous'))
  }, [status])

  const login = useCallback(async (email: string, password: string) => {
    const session = await api.post<AuthResponse>('/api/auth/login', { email, password }, { auth: false })
    tokens.set(session)
    return session.user
  }, [])

  const register = useCallback(async (form: RegisterForm) => {
    const session = await api.post<AuthResponse>(
      '/api/auth/register',
      { ...form, phone: form.phone === '' ? null : form.phone },
      { auth: false },
    )
    tokens.set(session)
    return session.user
  }, [])

  const logout = useCallback(async () => {
    const refreshToken = tokens.refresh
    tokens.set(null)
    queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'public' })
    if (refreshToken) {
      await api.post('/api/auth/logout', { refreshToken }, { auth: false }).catch(() => undefined)
    }
  }, [queryClient])

  const value = useMemo(() => ({ user, status, login, register, logout }), [user, status, login, register, logout])
  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthValue {
  const value = use(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
