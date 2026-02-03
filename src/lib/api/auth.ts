import { ENDER_API_URL } from './config'
import type { LoginRequest, AuthTokens, RefreshRequest } from '../types'

export async function login(credentials: LoginRequest): Promise<AuthTokens> {
  const response = await fetch(`${ENDER_API_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Login failed')
  }

  return response.json()
}

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  const response = await fetch(`${ENDER_API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Refresh-Token': refreshToken,
    },
    body: JSON.stringify({ refreshToken } as RefreshRequest),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(error || 'Token refresh failed')
  }

  return response.json()
}
