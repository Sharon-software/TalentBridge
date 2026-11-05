import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, clearTokens, getAccessToken, getRefreshToken } from '../api'
import type { LoginRequest, MeResponse, RegisterRequest, TokenPair } from '../api/types'

interface AuthContextValue {
  token: string | null
  user: MeResponse | null
  loading: boolean
  login: (credentials: LoginRequest) => Promise<MeResponse>
  register: (details: RegisterRequest) => Promise<MeResponse>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getAccessToken())
  const [user, setUser] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function restoreSession() {
      const currentToken = getAccessToken()
      if (!currentToken) {
        if (active) {
          setUser(null)
          setToken(null)
          setLoading(false)
        }
        return
      }

      try {
        const currentUser = await api.auth.me()
        if (active) {
          setUser(currentUser)
          setToken(currentToken)
        }
      } catch {
        const refreshToken = getRefreshToken()
        if (refreshToken) {
          try {
            const refreshed: TokenPair = await api.auth.refresh()
            const currentUser = await api.auth.me()
            if (active) {
              setUser(currentUser)
              setToken(refreshed.accessToken)
            }
            return
          } catch {
            clearTokens()
          }
        } else {
          clearTokens()
        }
        if (active) {
          setUser(null)
          setToken(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    void restoreSession()
    return () => {
      active = false
    }
  }, [])

  async function login(credentials: LoginRequest): Promise<MeResponse> {
    setLoading(true)
    try {
      const tokens = await api.auth.login(credentials)
      const currentUser = await api.auth.me()
      setToken(tokens.accessToken)
      setUser(currentUser)
      return currentUser
    } catch (error) {
      clearTokens()
      setToken(null)
      setUser(null)
      throw error
    } finally {
      setLoading(false)
    }
  }

  async function register(details: RegisterRequest): Promise<MeResponse> {
    setLoading(true)
    try {
      const tokens = await api.auth.register(details)
      const currentUser = await api.auth.me()
      setToken(tokens.accessToken)
      setUser(currentUser)
      return currentUser
    } catch (error) {
      clearTokens()
      setToken(null)
      setUser(null)
      throw error
    } finally {
      setLoading(false)
    }
  }

  function logout() {
    api.auth.logout()
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ token, user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}