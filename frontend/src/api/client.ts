import axios, { type AxiosError, type AxiosInstance } from 'axios'
import type { TokenPair } from './types'

const ACCESS_TOKEN_KEY = 'talentbridge.accessToken'
const REFRESH_TOKEN_KEY = 'talentbridge.refreshToken'

export const getAccessToken = (): string | null => localStorage.getItem(ACCESS_TOKEN_KEY)

export const getRefreshToken = (): string | null => localStorage.getItem(REFRESH_TOKEN_KEY)

export const storeTokens = ({ accessToken, refreshToken }: TokenPair): void => {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
}

export const clearTokens = (): void => {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: { Accept: 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      clearTokens()
      if (window.location.pathname !== '/login') {
        window.location.assign('/login')
      }
    }
    return Promise.reject(error)
  },
)

export async function saveTokenResponse<T extends TokenPair>(request: Promise<{ data: T }>): Promise<T> {
  const { data } = await request
  storeTokens(data)
  return data
}