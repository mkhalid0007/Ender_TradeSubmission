"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  traderToken: string | null
  setToken: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const TOKEN_STORAGE_KEY = 'ender_trader_token'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [traderToken, setTraderToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY)
    if (storedToken) {
      setTraderToken(storedToken)
    }
    setIsLoading(false)
  }, [])

  const setToken = useCallback((token: string) => {
    setTraderToken(token)
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  }, [])

  const logout = useCallback(() => {
    setTraderToken(null)
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }, [])

  const value: AuthContextType = {
    isAuthenticated: !!traderToken,
    isLoading,
    traderToken,
    setToken,
    logout,
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
