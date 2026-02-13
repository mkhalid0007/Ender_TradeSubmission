"use client"

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  traderToken: string | null  // The GBE trader token for API calls
  accessToken: string | null  // The Cognito access token for authentication
  login: (email: string, password: string, traderToken: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshTokens: () => Promise<boolean>
}

interface TokenData {
  accessToken: string
  idToken: string
  refreshToken: string
  traderToken: string
  expiresAt: number  // Timestamp when accessToken expires
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Storage keys
const ACCESS_TOKEN_KEY = 'ender_access_token'
const REFRESH_TOKEN_KEY = 'ender_refresh_token'
const EXPIRY_KEY = 'ender_token_expiry'
const TRADER_TOKEN_KEY = 'ender_trader_token'

// Refresh tokens 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState<string | null>(null)
  const [traderToken, setTraderToken] = useState<string | null>(null)
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Save tokens to state and localStorage
  const saveTokens = useCallback((data: TokenData) => {
    setAccessToken(data.accessToken)
    setRefreshToken(data.refreshToken)
    setTraderToken(data.traderToken)
    setTokenExpiry(data.expiresAt)
    
    localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken)
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken)
    localStorage.setItem(TRADER_TOKEN_KEY, data.traderToken)
    localStorage.setItem(EXPIRY_KEY, data.expiresAt.toString())
  }, [])

  // Clear all tokens
  const clearTokens = useCallback(() => {
    setAccessToken(null)
    setRefreshToken(null)
    setTraderToken(null)
    setTokenExpiry(null)
    
    localStorage.removeItem(ACCESS_TOKEN_KEY)
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    localStorage.removeItem(TRADER_TOKEN_KEY)
    localStorage.removeItem(EXPIRY_KEY)
    
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
  }, [])

  // Refresh tokens using refreshToken
  const refreshTokens = useCallback(async (): Promise<boolean> => {
    const storedRefreshToken = refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY)
    const storedTraderToken = traderToken || localStorage.getItem(TRADER_TOKEN_KEY)
    
    if (!storedRefreshToken || !storedTraderToken) {
      console.log('No refresh token or trader token available')
      return false
    }

    try {
      console.log('Refreshing tokens...')
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      })

      if (!response.ok) {
        console.error('Token refresh failed:', response.status)
        clearTokens()
        return false
      }

      const data = await response.json()
      const expiresAt = Date.now() + (data.expiresIn * 1000)
      
      saveTokens({
        accessToken: data.accessToken,
        idToken: data.idToken,
        refreshToken: data.refreshToken || storedRefreshToken,  // Some refreshes don't return new refreshToken
        traderToken: storedTraderToken,  // Preserve trader token
        expiresAt,
      })
      
      console.log('Tokens refreshed successfully')
      return true
    } catch (error) {
      console.error('Token refresh error:', error)
      clearTokens()
      return false
    }
  }, [refreshToken, traderToken, saveTokens, clearTokens])

  // Schedule automatic token refresh
  const scheduleRefresh = useCallback((expiresAt: number) => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    const timeUntilRefresh = expiresAt - Date.now() - REFRESH_BUFFER_MS
    
    if (timeUntilRefresh > 0) {
      console.log(`Scheduling token refresh in ${Math.round(timeUntilRefresh / 1000 / 60)} minutes`)
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTokens()
      }, timeUntilRefresh)
    }
  }, [refreshTokens])

  // Load tokens from localStorage on mount
  useEffect(() => {
    const storedAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY)
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY)
    const storedTraderToken = localStorage.getItem(TRADER_TOKEN_KEY)
    const storedExpiry = localStorage.getItem(EXPIRY_KEY)

    if (storedAccessToken && storedRefreshToken && storedTraderToken && storedExpiry) {
      const expiresAt = parseInt(storedExpiry, 10)
      
      // Check if token is expired or about to expire
      if (Date.now() >= expiresAt - REFRESH_BUFFER_MS) {
        // Token expired, try to refresh
        setRefreshToken(storedRefreshToken)
        setTraderToken(storedTraderToken)
        refreshTokens().then(success => {
          if (!success) {
            clearTokens()
          }
          setIsLoading(false)
        })
      } else {
        // Token still valid
        setAccessToken(storedAccessToken)
        setRefreshToken(storedRefreshToken)
        setTraderToken(storedTraderToken)
        setTokenExpiry(expiresAt)
        scheduleRefresh(expiresAt)
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }, [refreshTokens, scheduleRefresh, clearTokens])

  // Schedule refresh when tokenExpiry changes
  useEffect(() => {
    if (tokenExpiry) {
      scheduleRefresh(tokenExpiry)
    }
  }, [tokenExpiry, scheduleRefresh])

  // Login with email, password, and trader token
  const login = useCallback(async (email: string, password: string, userTraderToken: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        return { success: false, error: data.message || 'Login failed' }
      }

      const expiresAt = Date.now() + (data.expiresIn * 1000)
      
      saveTokens({
        accessToken: data.accessToken,
        idToken: data.idToken,
        refreshToken: data.refreshToken,
        traderToken: userTraderToken,
        expiresAt,
      })

      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Network error. Please try again.' }
    }
  }, [saveTokens])

  // Logout
  const logout = useCallback(() => {
    clearTokens()
  }, [clearTokens])

  const value: AuthContextType = {
    isAuthenticated: !!accessToken && !!traderToken,
    isLoading,
    traderToken,  // The GBE trader token for API calls
    accessToken,  // The Cognito access token
    login,
    logout,
    refreshTokens,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
