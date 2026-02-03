import { REPORTING_PROXY_URL } from './config'

// Leaderboard entry (individual trader in the rows array)
export interface LeaderboardEntry {
  traderEmail: string
  realizedPnl: number
}

// PnL response when leaderboard=true (includes rows array)
export interface LeaderboardPnLResponse {
  startDate?: string
  endDate?: string
  rows: LeaderboardEntry[]
  prelim?: boolean
}

// PnL response when leaderboard=false (personal PnL only)
export interface PersonalPnLResponse {
  traderEmail: string
  startDate?: string
  endDate?: string
  realizedPnl: number
  prelim?: boolean
}

// Combined type for API responses
export type PnLResponse = LeaderboardPnLResponse | PersonalPnLResponse

// Market types
export type MarketType = 'virtuals' | 'utc'

// Helper to check if response is HTML error page
function isHtmlError(text: string): boolean {
  return text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')
}

// Fetch daily PnL
export async function fetchDailyPnL(
  traderToken: string,
  asOf: string,
  market: MarketType = 'virtuals',
  leaderboard: boolean = false
): Promise<PnLResponse> {
  const params = new URLSearchParams({
    period: 'daily',
    market,
    traderToken,
    asOf,
    leaderboard: String(leaderboard),
  })
  
  const response = await fetch(`${REPORTING_PROXY_URL}/pnl?${params}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'gbe-trader-token': traderToken,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    if (isHtmlError(error)) throw new Error('API endpoint not available')
    throw new Error(error || 'Failed to fetch daily PnL')
  }

  return response.json()
}

// Fetch weekly PnL
export async function fetchWeeklyPnL(
  traderToken: string,
  anchorDate: string,
  market: MarketType = 'virtuals',
  leaderboard: boolean = false
): Promise<PnLResponse> {
  const params = new URLSearchParams({
    period: 'weekly',
    market,
    traderToken,
    anchorDate,
    leaderboard: String(leaderboard),
  })
  
  const response = await fetch(`${REPORTING_PROXY_URL}/pnl?${params}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'gbe-trader-token': traderToken,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    if (isHtmlError(error)) throw new Error('API endpoint not available')
    throw new Error(error || 'Failed to fetch weekly PnL')
  }

  return response.json()
}

// Fetch monthly PnL
export async function fetchMonthlyPnL(
  traderToken: string,
  month: string, // YYYY-MM format
  market: MarketType = 'virtuals',
  leaderboard: boolean = false
): Promise<PnLResponse> {
  const params = new URLSearchParams({
    period: 'monthly',
    market,
    traderToken,
    month,
    leaderboard: String(leaderboard),
  })
  
  const response = await fetch(`${REPORTING_PROXY_URL}/pnl?${params}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'gbe-trader-token': traderToken,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    if (isHtmlError(error)) throw new Error('API endpoint not available')
    throw new Error(error || 'Failed to fetch monthly PnL')
  }

  return response.json()
}

// Fetch quarterly PnL
export async function fetchQuarterlyPnL(
  traderToken: string,
  quarter: number,
  year: number,
  market: MarketType = 'virtuals',
  leaderboard: boolean = false
): Promise<PnLResponse> {
  const params = new URLSearchParams({
    period: 'quarterly',
    market,
    traderToken,
    quarter: String(quarter),
    year: String(year),
    leaderboard: String(leaderboard),
  })
  
  const response = await fetch(`${REPORTING_PROXY_URL}/pnl?${params}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'gbe-trader-token': traderToken,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    if (isHtmlError(error)) throw new Error('API endpoint not available')
    throw new Error(error || 'Failed to fetch quarterly PnL')
  }

  return response.json()
}

// Fetch YTD PnL
export async function fetchYTDPnL(
  traderToken: string,
  year: number,
  asOf: string,
  market: MarketType = 'virtuals',
  leaderboard: boolean = false
): Promise<PnLResponse> {
  const params = new URLSearchParams({
    period: 'ytd',
    market,
    traderToken,
    year: String(year),
    asOf,
    leaderboard: String(leaderboard),
  })
  
  const response = await fetch(`${REPORTING_PROXY_URL}/pnl?${params}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'gbe-trader-token': traderToken,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    if (isHtmlError(error)) throw new Error('API endpoint not available')
    throw new Error(error || 'Failed to fetch YTD PnL')
  }

  return response.json()
}

// Fetch all-time PnL
export async function fetchAllTimePnL(
  traderToken: string,
  market: MarketType = 'virtuals',
  leaderboard: boolean = false
): Promise<PnLResponse> {
  const params = new URLSearchParams({
    period: 'alltime',
    market,
    traderToken,
    leaderboard: String(leaderboard),
  })
  
  const response = await fetch(`${REPORTING_PROXY_URL}/pnl?${params}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'gbe-trader-token': traderToken,
    },
  })

  if (!response.ok) {
    const error = await response.text()
    if (isHtmlError(error)) throw new Error('API endpoint not available')
    throw new Error(error || 'Failed to fetch all-time PnL')
  }

  return response.json()
}
