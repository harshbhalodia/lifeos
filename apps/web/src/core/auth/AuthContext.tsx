import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { apiClient, ApiError, getToken, setToken } from '@/lib/apiClient'

export interface AuthUser {
  id: string
  email: string
  created_at: string
}

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      setLoading(false)
      return
    }
    apiClient
      .get<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signInWithPassword: async (email, password) => {
        try {
          const { access_token } = await apiClient.post<{ access_token: string }>('/auth/login', {
            email,
            password,
          })
          setToken(access_token)
          const me = await apiClient.get<AuthUser>('/auth/me')
          setUser(me)
          return { error: null }
        } catch (err) {
          return { error: err instanceof ApiError ? err.message : 'Could not sign in' }
        }
      },
      signOut: () => {
        setToken(null)
        setUser(null)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
