import { REPORTING_PROXY_URL } from './config'
import type { MarketType } from '../types'

// Helper to check if response is HTML error page
function isHtmlError(text: string): boolean {
  return text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')
}

// Helper to extract clean error message
function getCleanError(text: string, fallback: string): string {
  if (isHtmlError(text)) {
    if (text.includes('404')) return 'API endpoint not found (404) - Backend may be down or URL is incorrect'
    if (text.includes('500')) return 'Server error (500) - Backend service issue'
    if (text.includes('502')) return 'Bad gateway (502) - Backend service unavailable'
    if (text.includes('503')) return 'Service unavailable (503) - Backend is temporarily down'
    return 'Backend service error - Please check if API is running'
  }
  return text || fallback
}

// Fetch submitted trades by market
// Uses: GET /api/v1/trades/{market}?accountId=...&date=...
export async function fetchTrades(
  market: MarketType,
  accountId: string,
  date: string
): Promise<unknown> {
  const params = new URLSearchParams({
    market,
    accountId,
    date,
  })

  const response = await fetch(
    `${REPORTING_PROXY_URL}/trades?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(getCleanError(error, 'Failed to fetch trades'))
  }

  return response.json()
}
