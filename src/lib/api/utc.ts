import { ENDER_PROXY_URL, getAuthHeaders } from './config'
import type { UTCTradesRequest, DeleteResponse } from '../types'

// Helper to check if response is HTML error page
function isHtmlError(text: string): boolean {
  return text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')
}

// Helper to extract clean error message
function getCleanError(text: string, fallback: string): string {
  if (isHtmlError(text)) {
    if (text.includes('404')) return 'API endpoint not found (404) - Backend may be down or URL is incorrect'
    if (text.includes('500')) return 'Server error (500) - Backend service issue'
    if (text.includes('401')) return 'Authentication failed (401) - Invalid token'
    if (text.includes('400')) return 'Bad request (400) - Invalid request payload'
    return 'Backend service error - Please check if API is running'
  }
  return text || fallback
}

export async function submitUTCTrades(
  accessToken: string,
  traderToken: string,
  tradeDate: string,
  trades: UTCTradesRequest
): Promise<void> {
  const response = await fetch(`${ENDER_PROXY_URL}/pjm/utc`, {
    method: 'POST',
    headers: getAuthHeaders(accessToken, traderToken, tradeDate),
    body: JSON.stringify(trades),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(getCleanError(error, 'Failed to submit UTC trades'))
  }
}

export async function replaceUTCTrades(
  accessToken: string,
  traderToken: string,
  tradeDate: string,
  trades: UTCTradesRequest
): Promise<void> {
  const response = await fetch(`${ENDER_PROXY_URL}/pjm/utc`, {
    method: 'PUT',
    headers: getAuthHeaders(accessToken, traderToken, tradeDate),
    body: JSON.stringify(trades),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(getCleanError(error, 'Failed to replace UTC trades'))
  }
}

export async function deleteUTCTrades(
  accessToken: string,
  traderToken: string,
  tradeDate: string
): Promise<DeleteResponse> {
  const response = await fetch(`${ENDER_PROXY_URL}/pjm/utc`, {
    method: 'DELETE',
    headers: getAuthHeaders(accessToken, traderToken, tradeDate),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(getCleanError(error, 'Failed to delete UTC trades'))
  }

  return response.json()
}
